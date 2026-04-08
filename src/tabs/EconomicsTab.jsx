// ─────────────────────────────────────────────────────────────────
// Вкладка 3: Экономика
// • Стоимость платформы + модулей
// • Операционные расходы (энергия, обслуживание)
// • Выручка и ROI
// • Период окупаемости
// • TCO на N лет
// ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { computeAll } from '../core/physics'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES } from '../data/missions'
import { MODULES } from '../data/modules'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

const C = {
  bg:'#1a2035', bg2:'#1f2a42', bg3:'#263347',
  border:'#2e4060', border2:'#3a5278',
  text:'#d8e4f0', text2:'#8aaac8', text3:'#5a7a9a',
  accent:'#4fc3f7', accent2:'#81d4fa',
  green:'#66bb6a', orange:'#ffb74d', red:'#ef5350',
  purple:'#ce93d8',
}

function Row({ label, value, color = C.text, bold, border = true }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'5px 0', borderBottom: border ? `1px solid ${C.border}` : 'none' }}>
      <span style={{ color:C.text3, fontSize:10 }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 500, fontSize:10 }}>{value}</span>
    </div>
  )
}

function Card({ title, icon, children, accentColor = C.accent }) {
  return (
    <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10,
      padding:'10px 14px', display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ fontSize:15 }}>{icon}</span>
        <span style={{ color:accentColor, fontWeight:700, fontSize:11 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function KPI({ label, value, sub, color = C.accent }) {
  return (
    <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8,
      padding:'8px 12px', flex:'1 1 140px', minWidth:140 }}>
      <div style={{ color:C.text3, fontSize:9, marginBottom:3 }}>{label}</div>
      <div style={{ color, fontSize:18, fontWeight:700, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ color:C.text3, fontSize:8, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

// Слайдер
function Slider({ label, value, min, max, step=1, unit, onChange }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
        <span style={{ color:C.text3, fontSize:9 }}>{label}</span>
        <span style={{ color:C.accent, fontSize:9, fontWeight:600 }}>{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width:'100%', accentColor:C.accent, cursor:'pointer' }}
      />
    </div>
  )
}

export default function EconomicsTab({ params, setParam, selectedMods, modPrices }) {
  // ── Экономические допущения ────────────────────────────────────
  const [electricityPrice, setElectricityPrice] = useState(8)     // руб/кВт·ч
  const [revenuePerHa,     setRevenuePerHa]     = useState(12000) // руб/га
  const [workDaysPerYear,  setWorkDaysPerYear]   = useState(150)   // дней в году
  const [hoursPerDay,      setHoursPerDay]       = useState(8)     // ч/день
  const [maintenanceRate,  setMaintenanceRate]   = useState(5)     // % от стоимости в год
  const [tcaYears,         setTcaYears]          = useState(5)

  // ── Расчёт ────────────────────────────────────────────────────
  const res     = useMemo(() => computeAll(params), [params])
  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType) || ROBOT_TYPES[0]
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)

  // Стоимость железа
  const platformCostUSD = robot.basePriceUSD
  const modulesCostUSD  = useMemo(() =>
    [...selectedMods].reduce((sum, id) => {
      const m = MODULES.find(m => m.id === id)
      return m ? sum + (modPrices[id] ?? Math.round((m.priceMin + m.priceMax) / 2)) : sum
    }, 0)
  , [selectedMods, modPrices])

  const USD_RUB = 92
  const hardwareCostRUB = (platformCostUSD + modulesCostUSD) * USD_RUB

  // Операционные расходы в день
  const energyKWhPerDay   = (res.drivePowerW / 1000) * hoursPerDay      // кВт·ч
  const energyCostPerDay  = energyKWhPerDay * electricityPrice            // руб
  const maintCostPerDay   = (hardwareCostRUB * maintenanceRate / 100) / workDaysPerYear
  const totalOpCostPerDay = energyCostPerDay + maintCostPerDay

  // Производительность
  const prodHaPerDay      = res.productivityHa * hoursPerDay             // га/день
  const revenuePerDay     = prodHaPerDay * revenuePerHa                  // руб/день
  const profitPerDay      = revenuePerDay - totalOpCostPerDay

  // Годовые
  const annualRevenue     = revenuePerDay    * workDaysPerYear
  const annualOpCost      = totalOpCostPerDay * workDaysPerYear
  const annualProfit      = profitPerDay      * workDaysPerYear

  // Период окупаемости
  const paybackDays       = profitPerDay > 0 ? Math.ceil(hardwareCostRUB / profitPerDay) : Infinity
  const paybackYears      = paybackDays / workDaysPerYear

  // Стоимость ед. продукции
  const costPerHa         = prodHaPerDay > 0 ? totalOpCostPerDay / prodHaPerDay : 0

  // TCO по годам
  const tcaData = useMemo(() => {
    const years = []
    let cumInvest = hardwareCostRUB
    let cumRevenue = 0
    for (let y = 0; y <= tcaYears; y++) {
      cumRevenue += y === 0 ? 0 : annualRevenue
      years.push({
        year: `${y} г`,
        Инвестиции:   Math.round(cumInvest / 1000),
        Выручка:      Math.round(cumRevenue / 1000),
        Прибыль:      Math.round((cumRevenue - cumInvest - annualOpCost * y) / 1000),
      })
    }
    return years
  }, [hardwareCostRUB, annualRevenue, annualOpCost, tcaYears])

  // Структура расходов
  const costStructure = [
    { name:'Обслуживание', value: Math.round(maintCostPerDay),   fill: C.orange  },
    { name:'Энергия',      value: Math.round(energyCostPerDay),  fill: C.accent  },
  ]

  // Сравнение сценариев по платформам
  const platformsCompare = useMemo(() => ROBOT_TYPES.map(r => {
    const fakeCost    = r.basePriceUSD * USD_RUB
    const fakePayback = annualProfit > 0 ? fakeCost / annualProfit : 0
    return { name: r.label.split('-')[0].substring(0,9), payback: +fakePayback.toFixed(1), color: r.color }
  }), [annualProfit])

  const fmt = (n, decimals = 0) =>
    isFinite(n) ? n.toLocaleString('ru-RU', { maximumFractionDigits: decimals }) : '∞'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, overflow:'hidden' }}>

      {/* ── KPI-строка ── */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', borderBottom:`1px solid ${C.border}`,
        background:C.bg2, flexShrink:0, flexWrap:'wrap' }}>
        <KPI label="Стоимость железа"     value={`${fmt(hardwareCostRUB/1000)} тыс. ₽`} sub={`${fmt(platformCostUSD+modulesCostUSD)} USD`} />
        <KPI label="Выручка в год"        value={`${fmt(annualRevenue/1000)} тыс. ₽`}    sub={`${fmt(prodHaPerDay*workDaysPerYear,1)} га/год`} color={C.green} />
        <KPI label="Операц. расходы/год"  value={`${fmt(annualOpCost/1000)} тыс. ₽`}     sub={`${fmt(costPerHa)} ₽/га`}  color={C.orange} />
        <KPI label="Чистая прибыль/год"   value={`${fmt(annualProfit/1000)} тыс. ₽`}     sub={annualProfit>0 ? 'прибыль' : 'убыток'} color={annualProfit>0?C.green:C.red} />
        <KPI label="Срок окупаемости"     value={isFinite(paybackYears) ? `${fmt(paybackYears,1)} лет` : '∞'} sub={`${isFinite(paybackDays)?fmt(paybackDays):' ∞'} раб.дней`} color={paybackYears<3?C.green:paybackYears<5?C.orange:C.red} />
        <KPI label="Себ/ть ₽/га"          value={`${fmt(costPerHa)} ₽`}                  sub="операционная" color={C.purple} />
      </div>

      {/* ── Основной контент ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ЛЕВАЯ: допущения */}
        <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${C.border}`,
          padding:'10px 12px', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>

          <div style={{ color:C.accent, fontWeight:700, fontSize:11 }}>⚙ Допущения</div>

          <Slider label="Цена эл-энергии" value={electricityPrice} min={3} max={30}   step={0.5} unit="₽/кВт·ч" onChange={setElectricityPrice} />
          <Slider label="Выручка с 1 га"  value={revenuePerHa}     min={1000} max={80000} step={500}  unit="₽/га"     onChange={setRevenuePerHa}     />
          <Slider label="Рабочих дней"    value={workDaysPerYear}  min={30}   max={300}   step={5}    unit="дней/год" onChange={setWorkDaysPerYear}  />
          <Slider label="Часов в день"    value={hoursPerDay}      min={2}    max={16}    step={0.5}  unit="ч"        onChange={setHoursPerDay}      />
          <Slider label="Обслуживание"    value={maintenanceRate}  min={1}    max={20}    step={0.5}  unit="% в год"  onChange={setMaintenanceRate}  />
          <Slider label="Горизонт TCO"    value={tcaYears}         min={1}    max={10}    step={1}    unit="лет"      onChange={setTcaYears}         />

          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
            <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:6 }}>💰 Структура затрат</div>
            <div style={{ minHeight:130 }}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={costStructure} layout="vertical" margin={{ top:0,right:30,bottom:0,left:0 }}>
                  <XAxis type="number" tick={{ fill:C.text3, fontSize:8 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={75} tick={{ fill:C.text2, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }}
                    formatter={v=>[`${v} ₽/день`]} />
                  <Bar dataKey="value" radius={3} barSize={16}>
                    {costStructure.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Card title="Состав инвестиций" icon="🏗" accentColor={C.text2}>
            <Row label="Платформа (базовая)"     value={`${fmt(platformCostUSD*USD_RUB/1000,1)} тыс. ₽`} />
            <Row label="Модули и компоненты"     value={`${fmt(modulesCostUSD*USD_RUB/1000,1)} тыс. ₽`} />
            <Row label="Кол-во модулей"          value={selectedMods.size} />
            <Row label="Итого (железо)"          value={`${fmt(hardwareCostRUB/1000,1)} тыс. ₽`} color={C.accent} bold border={false}/>
          </Card>
        </div>

        {/* ПРАВАЯ: графики */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, padding:'10px 14px', overflowY:'auto' }}>

          {/* TCO / ROI площадной график */}
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
            <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:8 }}>
              📈 Динамика окупаемости (горизонт {tcaYears} лет)
            </div>
            <div style={{ height:220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tcaData} margin={{ top:10,right:20,bottom:0,left:0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green}   stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.green}   stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}     stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.red}     stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent}  stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.accent}  stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill:C.text3, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:C.text3, fontSize:9 }} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${v}к`}/>
                  <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }}
                    formatter={v=>[`${v} тыс. ₽`]}/>
                  <Legend wrapperStyle={{ fontSize:10, color:C.text3 }}/>
                  <ReferenceLine y={0} stroke={C.border2} strokeDasharray="4 4"/>
                  <Area type="monotone" dataKey="Выручка"    stroke={C.green}  fill="url(#revGrad)"  strokeWidth={2}/>
                  <Area type="monotone" dataKey="Инвестиции" stroke={C.red}    fill="url(#invGrad)"  strokeWidth={2}/>
                  <Area type="monotone" dataKey="Прибыль"    stroke={C.accent} fill="url(#profGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Сравнение платформ по окупаемости */}
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
            <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:8 }}>
              🏆 Сравнение платформ: срок окупаемости (при текущих допущениях)
            </div>
            <div style={{ height:160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformsCompare} margin={{ top:5,right:20,bottom:0,left:0 }}>
                  <CartesianGrid stroke={C.border} vertical={false}/>
                  <XAxis dataKey="name" tick={{ fill:C.text3, fontSize:9 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:C.text3, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}г`}/>
                  <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }}
                    formatter={v=>[`${v} лет`,'Окупаемость']}/>
                  <Bar dataKey="payback" name="Срок окупаемости" radius={[3,3,0,0]} barSize={26}>
                    {platformsCompare.map((d,i) => <Cell key={i} fill={d.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Детальная таблица год → год */}
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 14px' }}>
            <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:8 }}>
              📋 Финансовая модель (тыс. ₽)
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                <thead>
                  <tr style={{ background:C.bg2 }}>
                    {['Год','Выручка','Опер. затраты','Прибыль','Нарастающий итог'].map(h => (
                      <th key={h} style={{ padding:'5px 10px', textAlign:'right', color:C.text2,
                        fontSize:9, fontWeight:700, borderBottom:`1px solid ${C.border}`,
                        textAlign: h==='Год'?'left':'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:tcaYears}, (_,i)=>i+1).map(y => {
                    const rev   = annualRevenue  * y
                    const costs = annualOpCost   * y + hardwareCostRUB
                    const cum   = rev - costs
                    const yr    = annualRevenue/1000
                    const yop   = annualOpCost/1000
                    const ypr   = (annualRevenue-annualOpCost)/1000
                    return (
                      <tr key={y} style={{ background: y%2===0 ? C.bg3 : 'transparent' }}>
                        <td style={{ padding:'4px 10px', color:C.text2, fontSize:10 }}>Год {y}</td>
                        <td style={{ padding:'4px 10px', color:C.green,  fontSize:10, textAlign:'right' }}>{fmt(yr,0)}</td>
                        <td style={{ padding:'4px 10px', color:C.orange, fontSize:10, textAlign:'right' }}>{fmt(yop,0)}</td>
                        <td style={{ padding:'4px 10px', color: ypr>0?C.green:C.red, fontSize:10, textAlign:'right', fontWeight:700 }}>{fmt(ypr,0)}</td>
                        <td style={{ padding:'4px 10px', color: cum>0?C.green:C.red, fontSize:10, textAlign:'right', fontWeight: cum>0?700:400 }}>
                          {cum>0?'+':''}{fmt(cum/1000,0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
