// ─────────────────────────────────────────────────────────────────
// Вкладка 1: Платформы
// • Выбор платформы (фото-карточки)
// • 3D-просмотрщик
// • Матрица пригодности для агрозадач
// • Сравнительный бар-чарт по критериям
// • Рекомендация оптимальной платформы
// ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { ROBOT_TYPES } from '../data/robots'
import RobotViewer3D from '../components/RobotViewer3D'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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

// ─── Агрозадачи ───────────────────────────────────────────────────
const TASKS = [
  { id:'spray',   label:'Опрыскивание',     icon:'💧', desc:'Внесение СЗР, фунгициды' },
  { id:'seed',    label:'Посев',            icon:'🌱', desc:'Точный высев, удобрения' },
  { id:'map',     label:'Картографирование', icon:'🗺', desc:'Создание карт урожайности' },
  { id:'monitor', label:'Мониторинг NDVI',  icon:'📡', desc:'Мультиспектральный анализ' },
  { id:'weed',    label:'Прополка',         icon:'🌿', desc:'Точечная прополка рядов' },
  { id:'harvest', label:'Уборка',           icon:'🌾', desc:'Сбор малых культур' },
]

// Веса критериев для каждой задачи [payload, climbAngle, turnRadius, efficiency, groundPress, maxSpeed]
const TASK_WEIGHTS = {
  spray:   [0.30, 0.10, 0.15, 0.15, 0.25, 0.05],
  seed:    [0.35, 0.15, 0.10, 0.15, 0.20, 0.05],
  map:     [0.05, 0.10, 0.20, 0.20, 0.05, 0.40],
  monitor: [0.05, 0.10, 0.25, 0.25, 0.05, 0.30],
  weed:    [0.10, 0.10, 0.30, 0.15, 0.30, 0.05],
  harvest: [0.40, 0.15, 0.10, 0.20, 0.10, 0.05],
}

function normSpec(robot) {
  const s = robot.specs
  return [
    Math.min(1, s.payload / 120),
    Math.min(1, s.climbAngle / 45),
    1 - Math.min(1, s.turnRadius / 5),  // меньше радиус = лучше
    s.efficiency,
    1 - Math.min(1, s.groundPress / 30), // меньше давление = лучше
    Math.min(1, s.maxSpeed / 15),
  ]
}

function taskScore(robot, taskId) {
  const w = TASK_WEIGHTS[taskId]
  const n = normSpec(robot)
  return w.reduce((s, wi, i) => s + wi * n[i], 0)
}

const CRITERIA = [
  { id:'maxSpeed',    label:'Скорость',        unit:'км/ч', max:15  },
  { id:'climbAngle',  label:'Уклон',           unit:'°',    max:45  },
  { id:'turnRadius',  label:'Радиус поворота', unit:'м',    max:5, invert:true },
  { id:'efficiency',  label:'КПД',             unit:'',     max:1,  isPercent:true },
  { id:'groundPress', label:'Давл. почвы',     unit:'кПа',  max:30, invert:true },
  { id:'payload',     label:'Нагрузка',        unit:'кг',   max:120 },
]

// ─── Компоненты ──────────────────────────────────────────────────
function ScoreCell({ score }) {
  const pct = score * 100
  const color = pct >= 70 ? C.green : pct >= 45 ? C.orange : C.red
  const bars = Math.round(score * 5)
  return (
    <td style={{ padding:'5px 8px', textAlign:'center', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', gap:2, justifyContent:'center', marginBottom:2 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width:6, height:10, borderRadius:2,
            background: i <= bars ? color : C.border,
          }}/>
        ))}
      </div>
      <div style={{ color, fontSize:11, fontWeight:700 }}>{Math.round(pct)}%</div>
    </td>
  )
}

function RadarComp({ robot }) {
  const data = [
    { axis:'Скорость',  value: robot.specs.maxSpeed/15*100 },
    { axis:'Уклон',     value: robot.specs.climbAngle/45*100 },
    { axis:'Манёвр',    value: (1-Math.min(1,robot.specs.turnRadius/5))*100 },
    { axis:'КПД',       value: robot.specs.efficiency*100 },
    { axis:'Нагрузка',  value: robot.specs.payload/120*100 },
    { axis:'↓Давление', value: (1-robot.specs.groundPress/30)*100 },
  ]
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data} margin={{ top:10, right:20, bottom:10, left:20 }}>
        <PolarGrid stroke={C.border} />
        <PolarAngleAxis dataKey="axis" tick={{ fill:C.text3, fontSize:11 }} />
        <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={robot.color} fill={robot.color} fillOpacity={0.25} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── Главный компонент ───────────────────────────────────────────
export default function PlatformTab({ params, setParam }) {
  const [selectedCrit, setSelectedCrit] = useState('maxSpeed')
  const [selectedTask, setSelectedTask] = useState('spray')
  const [autoRotate, setAutoRotate]     = useState(true)

  const robot = ROBOT_TYPES.find(r => r.id === params.robotType) || ROBOT_TYPES[0]

  const selectRobot = (r) => {
    setParam('robotType', r.id)
    if (r.defaultParams) Object.entries(r.defaultParams).forEach(([k,v]) => setParam(k,v))
  }

  // Скоры для матрицы
  const matrix = useMemo(() =>
    ROBOT_TYPES.map(r => ({
      robot: r,
      scores: Object.fromEntries(TASKS.map(t => [t.id, taskScore(r, t.id)]))
    }))
  , [])

  // Лучшая платформа для выбранной задачи
  const bestForTask = useMemo(() => {
    return [...matrix].sort((a,b) => b.scores[selectedTask] - a.scores[selectedTask])[0].robot
  }, [matrix, selectedTask])

  // Данные для bar chart
  const crit = CRITERIA.find(c => c.id === selectedCrit)
  const barData = ROBOT_TYPES.map(r => ({
    name: r.label.split('-')[0].substring(0,8),
    value: crit.isPercent
      ? Math.round(r.specs[selectedCrit] * 100)
      : r.specs[selectedCrit],
    color: r.color,
    full:  r.label,
  }))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, overflow:'hidden' }}>

      {/* ── Строка выбора платформ ── */}
      <div style={{ display:'flex', gap:6, padding:'12px 14px', borderBottom:`1px solid ${C.border}`,
        background:C.bg2, flexShrink:0 }}>
        {ROBOT_TYPES.map(r => {
          const sel = r.id === params.robotType
          return (
            <div key={r.id} onClick={() => selectRobot(r)} style={{
              flex:1, cursor:'pointer', borderRadius:10, overflow:'hidden',
              border:`2px solid ${sel ? r.color : C.border}`,
              background: sel ? '#243050' : C.bg,
              boxShadow: sel ? `0 0 12px ${r.color}44` : 'none',
              transition:'all .18s',
            }}>
              <div style={{ padding:'10px 5% 0', background: sel ? '#1a2540' : '#161e30' }}>
                <img src={(window.__PLATFORM_IMAGES__?.[r.id]) || `/images/${r.id}.png`} alt={r.label}
                  style={{ width:'100%', height:100, objectFit:'contain', display:'block' }}
                  onError={e => { e.target.parentElement.style.display='none' }}
                />
              </div>
              <div style={{ padding:'6px 8px' }}>
                <div style={{ color: sel ? r.color : C.text2, fontWeight: sel?700:500,
                  fontSize:13, textAlign:'center', lineHeight:1.3 }}>{r.label}</div>
                <div style={{ color: sel ? C.accent : C.text3, fontSize:12, textAlign:'center' }}>
                  {r.specs.maxSpeed} км/ч · {r.specs.payload} кг
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Основной контент ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* ЛЕВАЯ: 3D + радар */}
        <div style={{ width:400, flexShrink:0, display:'flex', flexDirection:'column',
          borderRight:`1px solid ${C.border}` }}>
          <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
            <RobotViewer3D
              robotId={params.robotType} params={params}
              color={robot.color} autoRotate={autoRotate}
            />
            <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-50%)',
              background:'#00000077', borderRadius:6, padding:'3px 10px', pointerEvents:'none' }}>
              <span style={{ color:robot.color, fontWeight:700, fontSize:13 }}>{robot.label}</span>
            </div>
          </div>
          <div style={{ padding:'6px 10px', background:C.bg2, borderTop:`1px solid ${C.border}` }}>
            <div style={{ color:C.text3, fontSize:10, textAlign:'center', marginBottom:4 }}>
              Нормализованные характеристики [0–100%]
            </div>
            <RadarComp robot={robot} />
            <button onClick={() => setAutoRotate(v=>!v)} style={{
              width:'100%', marginTop:4, padding:'3px 0', borderRadius:6, fontSize:11,
              border:`1px solid ${autoRotate ? C.accent : C.border}`,
              background:'transparent', color: autoRotate ? C.accent : C.text3, cursor:'pointer',
            }}>
              {autoRotate ? '⏸ Пауза' : '▶ Вращение'}
            </button>
          </div>
        </div>

        {/* ЦЕНТР: Матрица пригодности */}
        <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
          <div style={{ color:C.accent, fontWeight:700, fontSize:16, marginBottom:6 }}>
            📋 Матрица пригодности платформ для агрозадач
          </div>
          <div style={{ color:C.text3, fontSize:13, marginBottom:12 }}>
            Оценка рассчитана по формуле взвешенной суммы нормализованных характеристик:
            &nbsp;<span style={{ fontFamily:'monospace', color:C.accent2 }}>S(p,t) = Σ wᵢ · xᵢ</span>
            , где wᵢ — вес критерия для задачи t, xᵢ ∈ [0,1]
          </div>

          {/* Фильтр задачи для рекомендации */}
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {TASKS.map(t => (
              <button key={t.id} onClick={() => setSelectedTask(t.id)} style={{
                padding:'5px 12px', borderRadius:8, border:'none', fontSize:13,
                cursor:'pointer', fontWeight: selectedTask===t.id ? 700 : 400,
                background: selectedTask===t.id ? C.accent : C.bg3,
                color:      selectedTask===t.id ? '#0d1525' : C.text3,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          {/* Рекомендация */}
          <div style={{ background:`${bestForTask.color}18`, border:`1px solid ${bestForTask.color}55`,
            borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
            <span style={{ color:bestForTask.color, fontWeight:700, fontSize:15 }}>
              ✓ Оптимально для «{TASKS.find(t=>t.id===selectedTask)?.label}»:
            </span>
            <span style={{ color:C.text, fontSize:15, marginLeft:8 }}>{bestForTask.label}</span>
            <span style={{ color:C.text3, fontSize:13, marginLeft:8 }}>
              — рейтинг {Math.round(matrix.find(m=>m.robot.id===bestForTask.id)?.scores[selectedTask]*100)}%
            </span>
          </div>

          {/* Таблица */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <thead>
                <tr style={{ background:C.bg3 }}>
                  <th style={{ padding:'8px 12px', textAlign:'left', color:C.text2,
                    fontSize:13, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>
                    Платформа
                  </th>
                  {TASKS.map(t => (
                    <th key={t.id} style={{
                      padding:'8px 10px', textAlign:'center', color: selectedTask===t.id ? C.accent : C.text2,
                      fontSize:13, fontWeight:700, borderBottom:`1px solid ${C.border}`,
                      background: selectedTask===t.id ? '#243050' : 'transparent',
                    }}>
                      {t.icon}<br/>{t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(({ robot: r, scores }) => (
                  <tr key={r.id} style={{
                    background: r.id === params.robotType ? '#243050' : 'transparent',
                  }}>
                    <td style={{ padding:'7px 12px', borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:r.color, flexShrink:0 }}/>
                        <span style={{ color: r.id===params.robotType ? r.color : C.text, fontSize:14 }}>
                          {r.label}
                        </span>
                      </div>
                    </td>
                    {TASKS.map(t => <ScoreCell key={t.id} score={scores[t.id]} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Легенда */}
          <div style={{ display:'flex', gap:16, marginTop:10 }}>
            {[[C.green,'≥70% — отлично'],[C.orange,'45–69% — пригодно'],[C.red,'<45% — ограничено']].map(([c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                <span style={{ color:C.text3, fontSize:13 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ПРАВАЯ: Сравнение по критерию */}
        <div style={{ width:300, flexShrink:0, borderLeft:`1px solid ${C.border}`,
          padding:'12px 14px', display:'flex', flexDirection:'column', overflowY:'auto' }}>
          <div style={{ color:C.accent, fontWeight:700, fontSize:15, marginBottom:10 }}>
            📊 Сравнение платформ
          </div>

          {/* Выбор критерия */}
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
            {CRITERIA.map(c => (
              <button key={c.id} onClick={() => setSelectedCrit(c.id)} style={{
                padding:'6px 10px', borderRadius:6, border:'none', textAlign:'left',
                fontSize:13, cursor:'pointer',
                background: selectedCrit===c.id ? C.accent : C.bg3,
                color:      selectedCrit===c.id ? '#0d1525' : C.text3,
                fontWeight: selectedCrit===c.id ? 700 : 400,
              }}>{c.label} {c.unit && `[${c.unit}]`}</button>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ flex:1, minHeight:200 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical"
                margin={{ top:0, right:30, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                <XAxis type="number" tick={{ fill:C.text3, fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fill:C.text2, fontSize:10 }}
                  width={55} axisLine={false} tickLine={false}/>
                <Tooltip
                  formatter={(v, _, p) => [`${v} ${crit.unit}`, p.payload.full]}
                  contentStyle={{ background:C.bg2, border:`1px solid ${C.border}`, fontSize:12 }}
                  labelStyle={{ display:'none' }}
                />
                <Bar dataKey="value" radius={3} barSize={14}>
                  {barData.map((d,i) => <Cell key={i} fill={d.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Текущая платформа: ключевые параметры */}
          <div style={{ background:C.bg3, borderRadius:8, padding:'10px 12px',
            border:`1px solid ${robot.color}44`, marginTop:8 }}>
            <div style={{ color:robot.color, fontWeight:700, fontSize:16, marginBottom:8 }}>
              {robot.label}
            </div>
            {[
              ['Макс. скорость',  `${robot.specs.maxSpeed} км/ч`],
              ['Уклон',          `${robot.specs.climbAngle}°`],
              ['Радиус поворота', robot.specs.turnRadius===0 ? 'на месте' : `${robot.specs.turnRadius} м`],
              ['КПД привода',    `${Math.round(robot.specs.efficiency*100)}%`],
              ['Давл. на почву', `${robot.specs.groundPress} кПа`],
              ['Нагрузка',       `${robot.specs.payload} кг`],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between',
                borderBottom:`1px solid ${C.border}`, padding:'5px 0' }}>
                <span style={{ color:C.text3, fontSize:13 }}>{l}</span>
                <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ color:C.text3, fontSize:12, marginTop:10, lineHeight:1.6 }}>
            {robot.desc}
          </div>
        </div>
      </div>
    </div>
  )
}
