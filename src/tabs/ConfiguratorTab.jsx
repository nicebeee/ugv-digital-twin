// ─────────────────────────────────────────────────────────────────
// Вкладка 4: Конфигуратор
// • Каталог модулей по категориям
// • Переключение / снятие выбора модулей
// • Регулировка цены ползунком
// • Итог: стоимость, масса, потребление
// ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { MODULES, MODULE_CATEGORIES, DEFAULT_KITS } from '../data/modules'
import { ROBOT_TYPES } from '../data/robots'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts'

const C = {
  bg:'#1a2035', bg2:'#1f2a42', bg3:'#263347',
  border:'#2e4060', border2:'#3a5278',
  text:'#d8e4f0', text2:'#8aaac8', text3:'#5a7a9a',
  accent:'#4fc3f7', accent2:'#81d4fa',
  green:'#66bb6a', orange:'#ffb74d', red:'#ef5350',
  purple:'#ce93d8', teal:'#4db6ac',
}

const CAT_COLORS = {
  chassis:  '#ff8a65',
  drive:    '#ffd54f',
  nav:      '#4fc3f7',
  sensors:  '#ce93d8',
  compute:  '#80cbc4',
  power:    '#aed581',
  comms:    '#81d4fa',
  misc:     '#bcaaa4',
}

const USD_RUB = 92

// ─── Компоненты ──────────────────────────────────────────────────
function ModuleCard({ mod, selected, price, onToggle, onPrice }) {
  const catColor = CAT_COLORS[mod.cat] || C.accent
  return (
    <div onClick={onToggle} style={{
      borderRadius:8, border:`1px solid ${selected ? catColor : C.border}`,
      background: selected ? '#243050' : C.bg3,
      boxShadow: selected ? `0 0 10px ${catColor}33` : 'none',
      padding:'8px 10px', cursor:'pointer', transition:'all .15s',
      display:'flex', flexDirection:'column', gap:4,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
        <span style={{ fontSize:15, flexShrink:0 }}>{mod.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color: selected ? catColor : C.text2, fontWeight: selected?700:500,
            fontSize:10, lineHeight:1.3, wordBreak:'break-word' }}>{mod.label}</div>
          <div style={{ display:'flex', gap:8, marginTop:2, flexWrap:'wrap' }}>
            {mod.weightKg > 0 && (
              <span style={{ color:C.text3, fontSize:8 }}>⚖ {mod.weightKg} кг</span>
            )}
            {mod.powerW > 0 && (
              <span style={{ color:C.text3, fontSize:8 }}>⚡ {mod.powerW} Вт</span>
            )}
            {mod.powerW < 0 && (
              <span style={{ color:C.green, fontSize:8 }}>☀ +{-mod.powerW} Вт</span>
            )}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ color: selected ? C.green : C.text3, fontSize:10, fontWeight:600 }}>
            {(price * USD_RUB / 1000).toFixed(0)}к ₽
          </div>
          <div style={{ color:C.text3, fontSize:8 }}>${price}</div>
        </div>
      </div>

      {/* Слайдер цены — останавливаем propagation, чтобы не переключал карточку */}
      {selected && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop:2 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:1 }}>
            <span style={{ color:C.text3, fontSize:7 }}>${mod.priceMin}</span>
            <span style={{ color:catColor,  fontSize:8, fontWeight:600 }}>${price}</span>
            <span style={{ color:C.text3, fontSize:7 }}>${mod.priceMax}</span>
          </div>
          <input type="range"
            min={mod.priceMin} max={mod.priceMax}
            step={Math.max(1, Math.round((mod.priceMax - mod.priceMin) / 20))}
            value={price}
            onChange={e => onPrice(+e.target.value)}
            style={{ width:'100%', accentColor:catColor, cursor:'pointer' }}
          />
        </div>
      )}

      <div style={{ color:C.text3, fontSize:8, lineHeight:1.4, display: selected?'block':'none' }}>
        {mod.desc}
      </div>
    </div>
  )
}

export default function ConfiguratorTab({
  params, setParam,
  selectedMods, setSelectedMods,
  modPrices, setModPrices,
}) {
  const [activeCat, setActiveCat] = useState('all')
  const [search,    setSearch]    = useState('')
  const [activeChart, setActiveChart] = useState('cost')

  const robot = ROBOT_TYPES.find(r => r.id === params.robotType) || ROBOT_TYPES[0]

  // Фильтрованный каталог
  const filtered = useMemo(() => {
    let list = MODULES
    if (activeCat !== 'all') list = list.filter(m => m.cat === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))
    }
    return list
  }, [activeCat, search])

  // Выбранные модули — список с данными
  const selectedList = useMemo(() =>
    MODULES.filter(m => selectedMods.has(m.id))
  , [selectedMods])

  // Итоговые суммы
  const totalUSD    = useMemo(() =>
    selectedList.reduce((s,m) => s + (modPrices[m.id] ?? Math.round((m.priceMin+m.priceMax)/2)), 0)
  , [selectedList, modPrices])
  const totalRUB    = totalUSD * USD_RUB
  const totalWeight = useMemo(() => selectedList.reduce((s,m) => s + m.weightKg, 0), [selectedList])
  const totalPower  = useMemo(() =>
    selectedList.reduce((s,m) => s + (m.powerW > 0 ? m.powerW : 0), 0)
  , [selectedList])
  const solarPower  = useMemo(() =>
    selectedList.reduce((s,m) => s + (m.powerW < 0 ? -m.powerW : 0), 0)
  , [selectedList])

  const toggle = (id) => {
    setSelectedMods(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const setPrice = (id, v) => setModPrices(prev => ({ ...prev, [id]: v }))

  const applyKit = () => {
    const kit = DEFAULT_KITS[params.robotType]
    if (kit) setSelectedMods(new Set(kit))
  }
  const clearAll = () => setSelectedMods(new Set())

  // Данные для диаграмм
  const costByCat = useMemo(() => {
    const map = {}
    selectedList.forEach(m => {
      const p   = modPrices[m.id] ?? Math.round((m.priceMin+m.priceMax)/2)
      map[m.cat] = (map[m.cat] || 0) + p
    })
    return MODULE_CATEGORIES
      .filter(c => map[c.id])
      .map(c => ({ name:c.label, value:map[c.id], fill:CAT_COLORS[c.id]||C.accent }))
  }, [selectedList, modPrices])

  const weightByCat = useMemo(() => {
    const map = {}
    selectedList.forEach(m => { map[m.cat] = +(((map[m.cat]||0)+m.weightKg).toFixed(2)) })
    return MODULE_CATEGORIES
      .filter(c => map[c.id])
      .map(c => ({ name:c.label, value:map[c.id], fill:CAT_COLORS[c.id]||C.accent }))
  }, [selectedList])

  const powerByCat = useMemo(() => {
    const map = {}
    selectedList.filter(m=>m.powerW>0).forEach(m => { map[m.cat] = (map[m.cat]||0)+m.powerW })
    return MODULE_CATEGORIES
      .filter(c => map[c.id])
      .map(c => ({ name:c.label, value:map[c.id], fill:CAT_COLORS[c.id]||C.accent }))
  }, [selectedList])

  const chartData   = activeChart==='cost' ? costByCat : activeChart==='weight' ? weightByCat : powerByCat
  const chartUnit   = activeChart==='cost' ? 'USD' : activeChart==='weight' ? 'кг' : 'Вт'
  const chartTotal  = activeChart==='cost' ? totalUSD : activeChart==='weight' ? totalWeight : totalPower

  return (
    <div style={{ display:'flex', height:'100%', background:C.bg, overflow:'hidden' }}>

      {/* ═══ ЛЕВАЯ: каталог ═══ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden',
        borderRight:`1px solid ${C.border}` }}>

        {/* Фильтры + поиск */}
        <div style={{ padding:'8px 10px', borderBottom:`1px solid ${C.border}`,
          background:C.bg2, flexShrink:0 }}>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
            <button onClick={() => setActiveCat('all')} style={{
              padding:'3px 10px', borderRadius:6, border:'none', fontSize:9, cursor:'pointer',
              background: activeCat==='all' ? C.accent : C.bg3,
              color:      activeCat==='all' ? '#0d1525' : C.text3,
              fontWeight: activeCat==='all' ? 700 : 400,
            }}>🌐 Все ({MODULES.length})</button>
            {MODULE_CATEGORIES.map(c => {
              const count = MODULES.filter(m => m.cat === c.id).length
              const sel   = activeCat === c.id
              return (
                <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
                  padding:'3px 10px', borderRadius:6, border:'none', fontSize:9, cursor:'pointer',
                  background: sel ? CAT_COLORS[c.id] : C.bg3,
                  color:      sel ? '#0d1525'         : C.text3,
                  fontWeight: sel ? 700 : 400,
                }}>{c.icon} {c.label} ({count})</button>
              )
            })}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Поиск модуля..."
            style={{ width:'100%', boxSizing:'border-box', padding:'5px 10px', borderRadius:6,
              border:`1px solid ${C.border2}`, background:C.bg3, color:C.text, fontSize:10,
              outline:'none' }}
          />
        </div>

        {/* Сетка карточек */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 10px',
          display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))', gap:6,
          alignContent:'start' }}>
          {filtered.map(m => (
            <ModuleCard key={m.id}
              mod={m}
              selected={selectedMods.has(m.id)}
              price={modPrices[m.id] ?? Math.round((m.priceMin+m.priceMax)/2)}
              onToggle={() => toggle(m.id)}
              onPrice={v => setPrice(m.id, v)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', color:C.text3, fontSize:11, textAlign:'center', padding:20 }}>
              Ничего не найдено
            </div>
          )}
        </div>
      </div>

      {/* ═══ ПРАВАЯ: итоги ═══ */}
      <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column',
        overflowY:'auto', padding:'10px 12px', gap:10 }}>

        {/* Кнопки управления */}
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={applyKit} style={{
            flex:1, padding:'6px 0', borderRadius:7, border:`1px solid ${robot.color}`,
            background:'transparent', color:robot.color, fontSize:10, cursor:'pointer', fontWeight:700,
          }}>⚡ Набор {robot.label}</button>
          <button onClick={clearAll} style={{
            padding:'6px 10px', borderRadius:7, border:`1px solid ${C.red}`,
            background:'transparent', color:C.red, fontSize:10, cursor:'pointer',
          }}>✕ Сбросить</button>
        </div>

        {/* Итоговые метрики */}
        <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px' }}>
          <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:8 }}>
            📦 Конфигурация: {selectedMods.size} модулей
          </div>
          {[
            ['💰 Стоимость (USD)',   `$${totalUSD.toLocaleString('ru-RU')}`,    C.green],
            ['💵 Стоимость (₽)',     `${(totalRUB/1000).toFixed(0)} тыс. ₽`,   C.green],
            ['⚖ Масса модулей',     `${totalWeight.toFixed(1)} кг`,            C.orange],
            ['⚡ Потребление',       `${totalPower} Вт`,                         C.accent],
            ['☀ Генерация (солн.)', `${solarPower} Вт`,                         C.teal],
            ['🔋 Баланс мощности',  `${(totalPower-solarPower)} Вт`,
              totalPower-solarPower < params.motorPower*0.3 ? C.green : C.orange],
          ].map(([l,v,c]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between',
              borderBottom:`1px solid ${C.border}`, padding:'4px 0' }}>
              <span style={{ color:C.text3, fontSize:9 }}>{l}</span>
              <span style={{ color:c, fontWeight:700, fontSize:10 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Переключатели диаграмм */}
        <div style={{ display:'flex', gap:4 }}>
          {[['cost','💰 Стоимость'],['weight','⚖ Масса'],['power','⚡ Мощность']].map(([k,lbl]) => (
            <button key={k} onClick={() => setActiveChart(k)} style={{
              flex:1, padding:'4px 0', borderRadius:6, border:'none', fontSize:8,
              cursor:'pointer',
              background: activeChart===k ? C.accent : C.bg3,
              color:      activeChart===k ? '#0d1525' : C.text3,
              fontWeight: activeChart===k ? 700 : 400,
            }}>{lbl}</button>
          ))}
        </div>

        {/* Круговая диаграмма */}
        {chartData.length > 0 ? (
          <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:'8px' }}>
            <div style={{ color:C.text3, fontSize:9, textAlign:'center', marginBottom:4 }}>
              Итого: {chartTotal.toFixed(activeChart==='weight'?1:0)} {chartUnit}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={65} innerRadius={28}
                  paddingAngle={2} strokeWidth={0}>
                  {chartData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:10 }}
                  formatter={v=>[`${v} ${chartUnit}`]}/>
                <Legend iconSize={8} wrapperStyle={{ fontSize:9, color:C.text3 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color:C.text3, fontSize:10, textAlign:'center', padding:16,
            background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10 }}>
            Выберите модули для отображения диаграммы
          </div>
        )}

        {/* Список выбранных */}
        <div style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10,
          padding:'8px 10px', flex:1 }}>
          <div style={{ color:C.accent, fontWeight:700, fontSize:11, marginBottom:6 }}>
            ✅ Выбранные модули
          </div>
          {selectedList.length === 0 ? (
            <div style={{ color:C.text3, fontSize:9 }}>Ничего не выбрано</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {selectedList.map(m => {
                const price = modPrices[m.id] ?? Math.round((m.priceMin+m.priceMax)/2)
                return (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:6,
                    padding:'3px 6px', borderRadius:5,
                    background:'#1a2035', border:`1px solid ${CAT_COLORS[m.cat]||C.border}22` }}>
                    <span style={{ fontSize:11 }}>{m.icon}</span>
                    <span style={{ flex:1, color:C.text2, fontSize:9, lineHeight:1.3 }}>{m.label}</span>
                    <span style={{ color:C.green, fontSize:9, fontWeight:700 }}>${price}</span>
                    <button onClick={() => toggle(m.id)} style={{
                      width:16, height:16, borderRadius:3, border:'none', cursor:'pointer',
                      background:C.red, color:'#fff', fontSize:9, lineHeight:1,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
