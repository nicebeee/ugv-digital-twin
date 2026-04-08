import { useMemo, useState } from 'react'
import { computeAll, runOptimization } from '../core/physics'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES } from '../data/missions'
import { StatCard } from '../components/UI'
import {
  BarChart, Bar, Cell, RadarChart as RChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const SOIL_TYPES = [
  { value: 'sand',  label: 'Песчаная' },
  { value: 'loam',  label: 'Суглинок' },
  { value: 'clay',  label: 'Глина'    },
  { value: 'peat',  label: 'Торфяная' },
]

// Цвет по значению 0→1: синий → зелёный → жёлтый → красный
function heatColor(t) {
  if (t < 0.5) {
    const s = t * 2
    return `rgb(${Math.round(33 + s*178)},${Math.round(150 + s*55)},${Math.round(243 - s*173)})`
  }
  const s = (t - 0.5) * 2
  return `rgb(${Math.round(211 + s*33)},${Math.round(205 - s*138)},${Math.round(70 - s*16)})`
}

function HeatmapGrid({ opt }) {
  const { speeds, widths, prodGrid, optimal } = opt
  const allVals = prodGrid.flat()
  const maxVal  = Math.max(...allVals)
  const minVal  = Math.min(...allVals)
  const range   = maxVal - minVal || 1

  const [hovered, setHovered] = useState(null)

  const cellW = 44
  const cellH = 28

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, userSelect: 'none' }}>
      <div style={{ color: '#888', fontSize: 11 }}>
        Производительность (га/ч): Скорость (км/ч) × Ширина захвата (м) &nbsp;|&nbsp;
        Оптимум: <span style={{ color: '#4caf50', fontWeight: 700 }}>
          {optimal?.v} км/ч × {optimal?.w} м → {optimal?.W?.toFixed(2)} га/ч
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block' }}>
          {/* Заголовок — скорости */}
          <div style={{ display: 'flex', marginLeft: 40 }}>
            {speeds.map(v => (
              <div key={v} style={{ width: cellW, textAlign: 'center', color: '#555', fontSize: 9, paddingBottom: 3 }}>{v}</div>
            ))}
          </div>
          {/* Строки — ширины */}
          {widths.map((w, wi) => (
            <div key={w} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 36, color: '#555', fontSize: 9, textAlign: 'right', paddingRight: 4 }}>{w}м</div>
              {speeds.map((v, vi) => {
                const val = prodGrid[wi][vi]
                const t   = (val - minVal) / range
                const isOpt = optimal?.v === v && optimal?.w === w
                const isHov = hovered?.wi === wi && hovered?.vi === vi
                return (
                  <div key={v}
                    onMouseEnter={() => setHovered({ wi, vi, v, w, val })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: cellW, height: cellH,
                      background: heatColor(t),
                      opacity: isHov ? 1 : 0.85,
                      border: isOpt ? '2px solid #fff' : isHov ? '1px solid #fff' : '1px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: isOpt ? 700 : 400,
                      color: t > 0.6 ? '#000' : '#fff',
                      cursor: 'default',
                      position: 'relative',
                    }}>
                    {val.toFixed(2)}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Подпись оси X */}
          <div style={{ marginLeft: 40, color: '#444', fontSize: 9, paddingTop: 4, textAlign: 'center' }}>
            Рабочая скорость (км/ч)
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#555', fontSize: 9 }}>мин {minVal.toFixed(2)}</span>
        <div style={{ flex: 1, maxWidth: 200, height: 8, borderRadius: 4, background: 'linear-gradient(to right,rgb(33,150,243),rgb(76,175,80),rgb(255,235,59),rgb(244,67,54))' }} />
        <span style={{ color: '#555', fontSize: 9 }}>макс {maxVal.toFixed(2)} га/ч</span>
        {hovered && (
          <div style={{ marginLeft: 12, background: '#222', border: '1px solid #333', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>
            {hovered.v} км/ч × {hovered.w} м = <span style={{ color: '#4caf50', fontWeight: 700 }}>{hovered.val.toFixed(3)} га/ч</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalcTab({ params }) {
  const [soilType,    setSoilType]    = useState(params.soilType || 'loam')
  const [activeChart, setActiveChart] = useState('heatmap')

  const p   = useMemo(() => ({ ...params, soilType }), [params, soilType])
  const res = useMemo(() => computeAll(p), [p])
  const opt = useMemo(() => runOptimization(p), [p])

  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType)
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)

  const soilCompare = useMemo(() => SOIL_TYPES.map(s => {
    const pp = { ...p, soilType: s.value }
    const r  = computeAll(pp)
    return {
      name:         s.label,
      productivity: +r.productivityHa.toFixed(2),
      power:        +(r.drivePowerW / 1000).toFixed(2),
      time:         +r.operationH.toFixed(1),
    }
  }), [p])

  const radarData = [
    { axis: 'Производительность', value: Math.min(100, res.productivityHa * 20) },
    { axis: 'Автономность',       value: Math.min(100, res.operationH * 10) },
    { axis: 'Манёвренность',      value: Math.min(100, robot ? (1 - Math.min(1, robot.specs.turnRadius / 4)) * 100 : 50) },
    { axis: 'Устойчивость',       value: Math.min(100, res.tipoverDeg * 1.5) },
    { axis: 'Точность',           value: (res.navAccM || 1) < 0.05 ? 99 : (res.navAccM || 1) < 0.1 ? 90 : (res.navAccM || 1) < 1 ? 70 : 40 },
    { axis: 'КПД',                value: (params.motorEfficiency || 0.85) * 100 },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>

      {/* Метрики */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard icon="⚡" label="Мощность привода"    value={`${(res.drivePowerW/1000).toFixed(2)} кВт`}  unit="потребляемая" />
        <StatCard icon="🔋" label="Ток потребления"     value={`${res.currentA.toFixed(1)} А`}              unit="при работе"  />
        <StatCard icon="⏱" label="Время работы"        value={`${res.operationH.toFixed(1)} ч`}            unit="от АКБ"      />
        <StatCard icon="🌾" label="Производительность"  value={`${res.productivityHa.toFixed(2)} га/ч`}     unit="за смену"    />
        <StatCard icon="📐" label="Площадь за цикл"    value={`${res.areaCoveredHa.toFixed(2)} га`}        unit="один заряд"  />
        <StatCard icon="⚖" label="Давление на почву"   value={`${res.groundPressKPa.toFixed(1)} кПа`}      unit="удельное"    />
        <StatCard icon="🔄" label="Угол опрокидывания"  value={`${res.tipoverDeg.toFixed(1)}°`}             unit="критический" />
        <StatCard icon="🎯" label="Тяговое усилие"      value={`${res.tractionF.toFixed(0)} Н`}             unit="с нагрузкой" />
      </div>

      {/* Переключатели */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#555', fontSize: 11 }}>Почва:</span>
        {SOIL_TYPES.map(s => (
          <button key={s.value} onClick={() => setSoilType(s.value)}
            style={{ padding: '3px 10px', borderRadius: 10, border: 'none', fontSize: 11, cursor: 'pointer',
              background: soilType === s.value ? '#4caf50' : '#2a2a2a',
              color:      soilType === s.value ? '#fff'    : '#888' }}>
            {s.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[['heatmap','🌡 Карта скорость×ширина'],['bar','📊 Сравнение почв'],['radar','🎯 Радар']].map(([k, lbl]) => (
            <button key={k} onClick={() => setActiveChart(k)}
              style={{ padding: '3px 10px', borderRadius: 10, border: 'none', fontSize: 11, cursor: 'pointer',
                background: activeChart === k ? '#2196f3' : '#2a2a2a',
                color:      activeChart === k ? '#fff'    : '#888' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* График */}
      <div style={{ flex: 1, background: '#141414', borderRadius: 8, border: '1px solid #1e1e1e', padding: 14, overflow: 'auto' }}>

        {activeChart === 'heatmap' && <HeatmapGrid opt={opt} />}

        {activeChart === 'bar' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#888', fontSize: 11 }}>Сравнение показателей по типу почвы</div>
            <div style={{ flex: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soilCompare} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#1e1e1e" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                  <Bar dataKey="productivity" name="Производ. га/ч" radius={[3,3,0,0]}>
                    {soilCompare.map((_, i) => <Cell key={i} fill={['#4caf50','#8bc34a','#cddc39','#ffeb3b'][i]} />)}
                  </Bar>
                  <Bar dataKey="power" name="Мощность кВт" fill="#2196f3" radius={[3,3,0,0]} />
                  <Bar dataKey="time"  name="Время ч"      fill="#ff9800" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeChart === 'radar' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#888', fontSize: 11 }}>Комплексная оценка: {robot?.label} + {mission?.label}</div>
            <div style={{ flex: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RChart data={radarData}>
                  <PolarGrid stroke="#1e1e1e" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#666', fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#444', fontSize: 9 }} />
                  <Radar name="Показатели" dataKey="value"
                    stroke={robot?.color || '#4caf50'} fill={robot?.color || '#4caf50'} fillOpacity={0.3} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', fontSize: 11 }} />
                </RChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Строка итогов */}
      <div style={{ background: '#1a1a1a', borderRadius: 8, border: '1px solid #252525', padding: '6px 12px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['🚜 Платформа', robot?.label],
            ['🌾 Задание',   mission?.label],
            ['🌱 Расходник', mission?.consumable ? `${res.consumRate} ед/га` : 'нет'],
            ['📦 За цикл',   mission?.consumable ? `${res.consumCycle?.toFixed(0)} ед` : '—'],
            ['🔩 Тяга',      `${res.tractionF?.toFixed(0)} Н`],
            ['📡 Навигация', `±${res.navAccM?.toFixed(2)} м`],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ fontSize: 11 }}>
              <span style={{ color: '#555' }}>{lbl}: </span>
              <span style={{ color: '#9ccc65', fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
