import { useMemo, useState, useRef, useCallback } from 'react'
import { planPath, pathLength, countTurns } from '../core/pathPlanning'
import { Btn, SectionTitle, Badge } from '../components/UI'
import { ROBOT_TYPES } from '../data/robots'

const SCALE = 6   // пикселей на метр

export default function MapTab({ params, setParam }) {
  const [obstacles,    setObstacles]    = useState([])
  const [addingObs,    setAddingObs]    = useState(false)
  const [showGrid,     setShowGrid]     = useState(true)
  const [showPath,     setShowPath]     = useState(true)
  const [showCoverage, setShowCoverage] = useState(true)
  const [animPt,       setAnimPt]       = useState(0)
  const animRef = useRef(null)

  const W = params.fieldWidth  * SCALE
  const H = params.fieldHeight * SCALE

  const path = useMemo(() =>
    planPath(params.pathAlgorithm, params.fieldWidth, params.fieldHeight,
             params.workWidth, params.overlap, obstacles),
    [params.pathAlgorithm, params.fieldWidth, params.fieldHeight,
     params.workWidth, params.overlap, obstacles]
  )

  const pLen   = useMemo(() => pathLength(path),   [path])
  const pTurns = useMemo(() => countTurns(path),   [path])

  // SVG-путь строки
  const svgPath = path.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x * SCALE} ${p.y * SCALE}`
  ).join(' ')

  // Полосы покрытия (boustrophedon)
  const coverageStripes = useMemo(() => {
    if (params.pathAlgorithm !== 'boustrophedon') return []
    const step = params.workWidth * (1 - params.overlap) * SCALE
    const strips = []
    for (let x = 0; x < W; x += step) {
      strips.push(x)
    }
    return strips
  }, [params, W])

  const robot = ROBOT_TYPES.find(r => r.id === params.robotType)

  const handleCanvasClick = useCallback((e) => {
    if (!addingObs) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / SCALE
    const my = (e.clientY - rect.top)  / SCALE
    const newObs = [...obstacles, { x: mx, y: my, r: 3 }]
    setObstacles(newObs)
    setParam('obstacles', newObs)
  }, [addingObs, obstacles, setParam])

  const startAnim = () => {
    setAnimPt(0)
    let i = 0
    const tick = () => {
      i = (i + 1) % path.length
      setAnimPt(i)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }
  const stopAnim = () => {
    cancelAnimationFrame(animRef.current)
    setAnimPt(0)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>

      {/* Панель управления */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn onClick={() => setAddingObs(!addingObs)} color={addingObs ? 'red' : 'ghost'}>
          {addingObs ? '🚫 Стоп (препятствия)' : '🪨 Добавить препятствие'}
        </Btn>
        <Btn onClick={() => { setObstacles([]); setParam('obstacles', []) }} color="ghost">
          🗑 Очистить
        </Btn>
        <Btn onClick={startAnim} color="green">▶ Анимация маршрута</Btn>
        <Btn onClick={stopAnim}  color="ghost">⏹ Стоп</Btn>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {[['showGrid', showGrid, setShowGrid, '⊞ Сетка'],
            ['showPath', showPath, setShowPath, '〰 Маршрут'],
            ['showCoverage', showCoverage, setShowCoverage, '▓ Покрытие']
          ].map(([k, val, set, lbl]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: val ? '#4caf50' : '#555', fontSize: 11 }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* SVG-карта */}
      <div style={{ flex: 1, background: '#141414', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'auto', position: 'relative' }}>
        <svg
          width={W + 60} height={H + 60}
          style={{ cursor: addingObs ? 'crosshair' : 'default', display: 'block', padding: '20px 10px 10px 30px' }}
          onClick={handleCanvasClick}
        >
          {/* Фоновая сетка */}
          {showGrid && Array.from({ length: Math.ceil(params.fieldWidth / 10) + 1 }, (_, i) => (
            <g key={`g${i}`}>
              <line x1={i * 10 * SCALE} y1={0} x2={i * 10 * SCALE} y2={H} stroke="#1e1e1e" strokeWidth={1} />
              <text x={i * 10 * SCALE} y={H + 14} fontSize={9} fill="#444" textAnchor="middle">{i * 10}м</text>
            </g>
          ))}
          {showGrid && Array.from({ length: Math.ceil(params.fieldHeight / 10) + 1 }, (_, i) => (
            <g key={`gr${i}`}>
              <line x1={0} y1={i * 10 * SCALE} x2={W} y2={i * 10 * SCALE} stroke="#1e1e1e" strokeWidth={1} />
              <text x={-4} y={i * 10 * SCALE + 4} fontSize={9} fill="#444" textAnchor="end">{i * 10}</text>
            </g>
          ))}

          {/* Покрытие */}
          {showCoverage && coverageStripes.map((x, i) => (
            <rect key={i} x={x} y={0}
              width={Math.min(params.workWidth * SCALE, W - x)} height={H}
              fill={i % 2 === 0 ? '#4caf5010' : '#2196f308'} />
          ))}

          {/* Граница поля */}
          <rect x={0} y={0} width={W} height={H}
            fill="none" stroke="#4caf50" strokeWidth={2} strokeDasharray="8,4" rx={4} />

          {/* Маршрут */}
          {showPath && path.length > 0 && (
            <path d={svgPath} fill="none" stroke="#2196f3" strokeWidth={1.5} opacity={0.7} />
          )}

          {/* Точки поворота */}
          {showPath && path.filter((_, i) => i % Math.max(1, Math.floor(path.length / 30)) === 0).map((pt, i) => (
            <circle key={i} cx={pt.x * SCALE} cy={pt.y * SCALE} r={2} fill="#4caf50" opacity={0.6} />
          ))}

          {/* Препятствия */}
          {obstacles.map((obs, i) => (
            <g key={i}>
              <circle cx={obs.x * SCALE} cy={obs.y * SCALE} r={obs.r * SCALE}
                fill="#f4433633" stroke="#f44336" strokeWidth={1.5} />
              <text x={obs.x * SCALE} y={obs.y * SCALE + 4} textAnchor="middle" fontSize={10} fill="#f44336">🪨</text>
            </g>
          ))}

          {/* Анимация робота */}
          {animPt < path.length && path[animPt] && (() => {
            const pt  = path[animPt]
            const npt = path[Math.min(animPt + 1, path.length - 1)]
            const angle = Math.atan2(npt.y - pt.y, npt.x - pt.x) * 180 / Math.PI
            return (
              <g transform={`translate(${pt.x * SCALE},${pt.y * SCALE}) rotate(${angle})`}>
                <rect x={-10} y={-6} width={20} height={12} rx={3} fill={robot?.color || '#4caf50'} opacity={0.9} />
                <polygon points="10,0 6,-4 6,4" fill="#fff" opacity={0.7} />
                <circle cx={0} cy={0} r={3} fill="#fff" opacity={0.5} />
              </g>
            )
          })()}

          {/* Старт / финиш */}
          {path[0] && <circle cx={path[0].x * SCALE} cy={path[0].y * SCALE} r={6} fill="#4caf50" stroke="#fff" strokeWidth={2} />}
          {path[path.length - 1] && <circle cx={path[path.length-1].x * SCALE} cy={path[path.length-1].y * SCALE} r={6} fill="#f44336" stroke="#fff" strokeWidth={2} />}
          {path[0] && <text x={path[0].x * SCALE + 10} y={path[0].y * SCALE + 4} fontSize={9} fill="#4caf50">СТАРТ</text>}
        </svg>
      </div>

      {/* Метрики маршрута */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['📏', 'Длина маршрута',   `${(pLen / 1000).toFixed(2)} км`],
          ['🔄', 'Разворотов',        pTurns],
          ['📐', 'Площадь поля',      `${(params.fieldWidth * params.fieldHeight / 10000).toFixed(2)} га`],
          ['🤖', 'Точек маршрута',    path.length],
          ['🪨', 'Препятствий',       obstacles.length],
          ['📡', 'Алгоритм',          params.pathAlgorithm],
        ].map(([ic, lbl, val]) => (
          <div key={lbl} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>{ic}</span>
            <div>
              <div style={{ color: '#555', fontSize: 10 }}>{lbl}</div>
              <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 12 }}>{val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
