// ─────────────────────────────────────────────────────────────────
// Вкладка 2: Эффективность
// • Выбор миссии
// • Ключевые метрики (computeAll)
// • Тепловая карта производительности
// • Сравнение по типам почвы
// • Радар-диаграмма
// ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { computeAll, runOptimization } from '../core/physics'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES, MISSION_CATEGORIES } from '../data/missions'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

const C = {
  bg:'#1a2035', bg2:'#1f2a42', bg3:'#263347',
  border:'#2e4060', border2:'#3a5278',
  text:'#d8e4f0', text2:'#8aaac8', text3:'#5a7a9a',
  accent:'#4fc3f7', accent2:'#81d4fa',
  green:'#66bb6a', orange:'#ffb74d', red:'#ef5350',
}

const SOIL_TYPES = [
  { value:'sand', label:'Песчаная' },
  { value:'loam', label:'Суглинок' },
  { value:'clay', label:'Глина'    },
  { value:'peat', label:'Торф'     },
]

// ─── Heatmap ──────────────────────────────────────────────────────
function heatColor(t) {
  if (t < 0.33) {
    const s = t / 0.33
    return `rgb(${Math.round(79+s*64)},${Math.round(195-s*60)},${Math.round(247-s*100)})`
  }
  if (t < 0.66) {
    const s = (t-0.33)/0.33
    return `rgb(${Math.round(143+s*62)},${Math.round(135+s*91)},${Math.round(147-s*80)})`
  }
  const s = (t-0.66)/0.34
  return `rgb(${Math.round(205+s*38)},${Math.round(226-s*164)},${Math.round(67-s*15)})`
}

function HeatmapGrid({ opt }) {
  const { speeds, widths, prodGrid, optimal } = opt
  const allVals = prodGrid.flat()
  const maxVal  = Math.max(...allVals)
  const minVal  = Math.min(...allVals)
  const range   = maxVal - minVal || 1
  const [hovered, setHovered] = useState(null)
  const cellW = 42, cellH = 26

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ color:C.text3, fontSize:10 }}>
        Производительность (га/ч): скорость × ширина захвата &nbsp;|&nbsp;
        Оптимум: <span style={{ color:C.green, fontWeight:700 }}>
          {optimal?.v} км/ч × {optimal?.w} м → {optimal?.W?.toFixed(2)} га/ч
        </span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'inline-block' }}>
          <div style={{ display:'flex', marginLeft:42 }}>
            {speeds.map(v => (
              <div key={v} style={{ width:cellW, textAlign:'center', color:C.text3, fontSize:9 }}>{v}</div>
            ))}
          </div>
          {widths.map((w, wi) => (
            <div key={w} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ width:38, color:C.text3, fontSize:9, textAlign:'right', paddingRight:4 }}>{w}м</div>
              {speeds.map((v, vi) => {
                const val  = prodGrid[wi][vi]
                const t    = (val - minVal) / range
                const isOpt = optimal?.v===v && optimal?.w===w
                const isHov = hovered?.wi===wi && hovered?.vi===vi
                return (
                  <div key={v}
                    onMouseEnter={() => setHovered({wi,vi,v,w,val})}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width:cellW, height:cellH, background:heatColor(t),
                      opacity: isHov ? 1 : 0.82,
                      border: isOpt ? `2px solid ${C.accent}` : isHov ? `1px solid ${C.text}` : '1px solid transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight: isOpt ? 700 : 400,
                      color: t > 0.55 ? '#0d1525' : C.text, cursor:'default',
                    }}>
                    {val.toFixed(2)}
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ marginLeft:42, color:C.text3, fontSize:9, paddingTop:4, textAlign:'center' }}>
            Рабочая скорость (км/ч)
          </div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ color:C.text3, fontSize:9 }}>мин {minVal.toFixed(2)}</span>
        <div style={{ flex:1, maxWidth:220, height:8, borderRadius:4,
          background:`linear-gradient(to right,${heatColor(0)},${heatColor(0.5)},${heatColor(1)})` }} />
        <span style={{ color:C.text3, fontSize:9 }}>макс {maxVal.toFixed(2)} га/ч</span>
        {hovered && (
          <div style={{ marginLeft:8, background:C.bg3, border:`1px solid ${C.border}`,
            borderRadius:6, padding:'3px 8px', fontSize:10 }}>
            {hovered.v} км/ч × {hovered.w} м = <span style={{ color:C.green, fontWeight:700 }}>{hovered.val.toFixed(3)} га/ч</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, color = C.accent }) {
  return (
    <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8,
      padding:'8px 12px', minWidth:130, flex:'1 1 130px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
        <span style={{ fontSize:14 }}>{icon}</span>
        <span style={{ color:C.text3, fontSize:9 }}>{label}</span>
      </div>
      <div style={{ color, fontSize:16, fontWeight:700, lineHeight:1 }}>{value}</div>
      {unit && <div style={{ color:C.text3, fontSize:9, marginTop:2 }}>{unit}</div>}
    </div>
  )
}

// ─── Главный компонент ───────────────────────────────────────────
export default function AnalysisTab({ params, setParam }) {
  const [missionCat,  setMissionCat]  = useState('all')
  const [soilType,    setSoilType]    = useState(params.soilType || 'loam')
  const [activeChart, setActiveChart] = useState('heatmap')

  const p      = useMemo(() => ({ ...params, soilType }), [params, soilType])
  const res    = useMemo(() => computeAll(p),             [p])
  const opt    = useMemo(() => runOptimization(p),        [p])

  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType) || ROBOT_TYPES[0]
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)

  const filteredMissions = useMemo(() =>
    missionCat === 'all' ? MISSION_TYPES : MISSION_TYPES.filter(m => m.category === missionCat)
  , [missionCat])

  const soilCompare = useMemo(() => SOIL_TYPES.map(s => {
    const r = computeAll({ ...p, soilType: s.value })
    return {
      name:         s.label,
      productivity: +r.productivityHa.toFixed(2),
      power:        +(r.drivePowerW / 1000).toFixed(2),
      time:         +r.operationH.toFixed(1),
    }
  }), [p])

  const radarData = [
    { axis:'Производит.',   value: Math.min(100, res.productivityHa * 20) },
    { axis:'Автономность',  value: Math.min(100, res.operationH * 10) },
    { axis:'Манёвренность', value: robot ? Math.round((1 - Math.min(1, robot.specs.turnRadius / 4)) * 100) : 50 },
    { axis:'Устойчивость',  value: Math.min(100, res.tipoverDeg * 1.5) },
    { axis:'Точность',      value: res.navAccM < 0.03 ? 98 : res.navAccM < 0.1 ? 88 : res.navAccM < 1 ? 65 : 35 },
    { axis:'КПД',           value: Math.round((params.motorEfficiency || 0.85) * 100) },
  ]

  const CHART_BTNS = [
    ['heatmap', '🌡 Карта скор.×ширина'],
    ['soil',    '📊 Сравнение почв'],
    ['radar',   '🎯 Радар'],
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, overflow:'hidden' }}>

      {/* ── Верхняя панель: статкарточки ── */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', borderBottom:`1px solid ${C.border}`,
        background:C.bg2, flexShrink:0, flexWrap:'wrap' }}>
        <StatCard icon="⚡" label="Мощность привода"   value={`${(res.drivePowerW/1000).toFixed(2)} кВт`}  unit="потребляемая" />
        <StatCard icon="🔋" label="Ток потребления"    value={`${res.currentA.toFixed(1)} А`}              unit="при работе"  color={C.orange} />
        <StatCard icon="⏱" label="Время работы"       value={`${res.operationH.toFixed(1)} ч`}            unit="от АКБ"      color={C.green} />
        <StatCard icon="🌾" label="Производит."        value={`${res.productivityHa.toFixed(2)} га/ч`}     unit="рабочая"     color={C.green} />
        <StatCard icon="📐" label="Площадь за цикл"   value={`${res.areaCoveredHa.toFixed(2)} га`}        unit="один заряд"  />
        <StatCard icon="⚖" label="Давл. на почву"     value={`${res.groundPressKPa.toFixed(1)} кПа`}      unit="удельное"    color={C.text2} />
        <StatCard icon="🔄" label="Угол опрокидыв."   value={`${res.tipoverDeg.toFixed(1)}°`}             unit="критический" color={C.orange} />
        <StatCard icon="🎯" label="Тяговое усилие"     value={`${res.tractionF.toFixed(0)} Н`}             unit="с нагрузкой" color={C.accent2} />
      </div>

      {/* ── Основной контент ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ЛЕВАЯ: выбор миссии */}
        <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${C.border}`,
          display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:6 }}>🌾 Тип миссии</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              {MISSION_CATEGORIES.map(mc => (
                <button key={mc.id} onClick={() => setMissionCat(mc.id)} style={{
                  padding:'2px 7px', borderRadius:6, border:'none', fontSize:8, cursor:'pointer',
                  background: missionCat===mc.id ? C.accent : C.bg3,
                  color:      missionCat===mc.id ? '#0d1525' : C.text3,
                  fontWeight: missionCat===mc.id ? 700 : 400,
                }}>{mc.icon} {mc.label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'4px 6px' }}>
            {filteredMissions.map(m => {
              const sel = m.id === params.missionType
              return (
                <div key={m.id} onClick={() => setParam('missionType', m.id)} style={{
                  padding:'5px 8px', cursor:'pointer', borderRadius:6, marginBottom:2,
                  background: sel ? '#243050' : 'transparent',
                  border:`1px solid ${sel ? m.color : 'transparent'}`,
                  display:'flex', alignItems:'center', gap:6,
                  transition:'all .12s',
                }}>
                  <span style={{ fontSize:13 }}>{m.icon}</span>
                  <div>
                    <div style={{ color: sel ? m.color : C.text2, fontSize:10, fontWeight: sel?700:400 }}>
                      {m.label}
                    </div>
                    <div style={{ color:C.text3, fontSize:8, lineHeight:1.3 }}>{m.tool}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Параметры почвы */}
          <div style={{ padding:'8px 10px', borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
            <div style={{ color:C.text3, fontSize:9, marginBottom:5 }}>Тип почвы</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              {SOIL_TYPES.map(s => (
                <button key={s.value} onClick={() => setSoilType(s.value)} style={{
                  padding:'3px 8px', borderRadius:6, border:'none', fontSize:9, cursor:'pointer',
                  background: soilType===s.value ? C.green : C.bg3,
                  color:      soilType===s.value ? '#0d1525' : C.text3,
                  fontWeight: soilType===s.value ? 700 : 400,
                }}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ: графики */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'10px 14px' }}>
          {/* Переключатели */}
          <div style={{ display:'flex', gap:6, marginBottom:10, alignItems:'center', flexShrink:0 }}>
            {CHART_BTNS.map(([k,lbl]) => (
              <button key={k} onClick={() => setActiveChart(k)} style={{
                padding:'4px 14px', borderRadius:8, border:'none', fontSize:10, cursor:'pointer',
                background: activeChart===k ? C.accent : C.bg3,
                color:      activeChart===k ? '#0d1525' : C.text3,
                fontWeight: activeChart===k ? 700 : 400,
              }}>{lbl}</button>
            ))}
            <div style={{ marginLeft:'auto', fontSize:10, color:C.text3 }}>
              <span style={{ color:robot.color, fontWeight:700 }}>{robot.label}</span>
              {' · '}
              <span style={{ color:mission?.color || C.text2 }}>{mission?.label}</span>
              {' · '}
              <span>{SOIL_TYPES.find(s=>s.value===soilType)?.label}</span>
            </div>
          </div>

          {/* График */}
          <div style={{ flex:1, background:C.bg3, borderRadius:10, border:`1px solid ${C.border}`,
            padding:14, overflow:'auto' }}>

            {activeChart === 'heatmap' && <HeatmapGrid opt={opt} />}

            {activeChart === 'soil' && (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ color:C.text3, fontSize:10 }}>Сравнение показателей по типу почвы</div>
                <div style={{ flex:1, minHeight:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={soilCompare} margin={{ top:10, right:20, bottom:10, left:0 }}>
                      <CartesianGrid stroke={C.border} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill:C.text3, fontSize:10 }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fill:C.text3, fontSize:9 }} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }} />
                      <Legend wrapperStyle={{ fontSize:10, color:C.text3 }} />
                      <Bar dataKey="productivity" name="Производит. га/ч" radius={[3,3,0,0]}>
                        {soilCompare.map((_,i) => (
                          <Cell key={i} fill={[C.green,'#8bc34a','#cddc39',C.orange][i]} />
                        ))}
                      </Bar>
                      <Bar dataKey="power" name="Мощность кВт" fill={C.accent}  radius={[3,3,0,0]} />
                      <Bar dataKey="time"  name="Время ч"      fill={C.orange} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeChart === 'radar' && (
              <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ color:C.text3, fontSize:10 }}>
                  Комплексная оценка: {robot?.label} · {mission?.label}
                </div>
                <div style={{ flex:1, minHeight:240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top:10,right:30,bottom:10,left:30 }}>
                      <PolarGrid stroke={C.border} />
                      <PolarAngleAxis dataKey="axis" tick={{ fill:C.text3, fontSize:10 }} />
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
                      <Radar name="Показатели" dataKey="value"
                        stroke={robot?.color || C.accent} fill={robot?.color || C.accent} fillOpacity={0.28}
                        strokeWidth={2} />
                      <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Строка итогов */}
          <div style={{ flexShrink:0, background:C.bg2, borderRadius:8, border:`1px solid ${C.border}`,
            padding:'6px 12px', marginTop:8 }}>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {[
                ['🚜 Платформа',  robot?.label],
                ['🌾 Миссия',     mission?.label],
                ['🌱 Расходник',  mission?.consumable ? `${res.consumRate} ед/га` : 'нет'],
                ['📦 За цикл',    mission?.consumable ? `${res.consumCycle?.toFixed(0)} ед` : '—'],
                ['🔩 Тяга',       `${res.tractionF?.toFixed(0)} Н`],
                ['📡 Навигация',  `±${res.navAccM?.toFixed(2)} м`],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ fontSize:10 }}>
                  <span style={{ color:C.text3 }}>{lbl}: </span>
                  <span style={{ color:C.green, fontWeight:700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
