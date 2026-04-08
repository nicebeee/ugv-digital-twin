import { useRef, useEffect, useState, useCallback } from 'react'
import { planPath } from '../core/pathPlanning'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES } from '../data/missions'
import { Btn } from '../components/UI'

const SCALE   = 4   // px per meter
const STEP_MS = 16  // ~60fps

export default function AnimationTab({ params }) {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const stateRef   = useRef({ running: false, ptIdx: 0, t: 0, trail: [] })

  const [running,  setRunning]  = useState(false)
  const [ptIdx,    setPtIdx]    = useState(0)
  const [speed,    setSpeed]    = useState(1)
  const [showPath, setShowPath] = useState(true)
  const [showTrail,setShowTrail]= useState(true)
  const [info,     setInfo]     = useState({ dist: 0, time: 0 })

  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType)
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)

  const path = planPath(
    params.pathAlgorithm, params.fieldWidth, params.fieldHeight,
    params.workWidth, params.overlap, params.obstacles || []
  )

  const W = params.fieldWidth  * SCALE
  const H = params.fieldHeight * SCALE

  // Рисование кадра
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    const s      = stateRef.current
    const idx    = Math.min(s.ptIdx, path.length - 1)
    const pt     = path[idx]

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Фон поля
    ctx.fillStyle = '#1a2e0a'
    ctx.fillRect(0, 0, W, H)

    // Борозды
    ctx.fillStyle = '#111f08'
    for (let x = 0; x < W; x += 14) {
      ctx.fillRect(x, 0, 3, H)
    }

    // Граница
    ctx.strokeStyle = '#4caf50'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.strokeRect(1, 1, W - 2, H - 2)
    ctx.setLineDash([])

    // Маршрут
    if (showPath && path.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#2196f388'
      ctx.lineWidth = 1.5
      path.forEach((p, i) => {
        const x = p.x * SCALE, y = p.y * SCALE
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Покрытый след
    if (showTrail && s.trail.length > 1) {
      const ww = params.workWidth * SCALE / 2
      ctx.fillStyle = (robot?.color || '#4caf50') + '33'
      for (let i = 1; i < s.trail.length; i++) {
        const a = s.trail[i - 1], b = s.trail[i]
        const dx = b.x - a.x, dy = b.y - a.y
        const len = Math.sqrt(dx*dx + dy*dy) || 1
        const nx = -dy / len * ww, ny = dx / len * ww
        ctx.beginPath()
        ctx.moveTo(a.x + nx, a.y + ny)
        ctx.lineTo(b.x + nx, b.y + ny)
        ctx.lineTo(b.x - nx, b.y - ny)
        ctx.lineTo(a.x - nx, a.y - ny)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Старт / финиш
    ctx.fillStyle = '#4caf50'
    ctx.beginPath()
    ctx.arc(path[0].x * SCALE, path[0].y * SCALE, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f44336'
    ctx.beginPath()
    ctx.arc(path[path.length - 1].x * SCALE, path[path.length - 1].y * SCALE, 6, 0, Math.PI * 2)
    ctx.fill()

    // Робот
    if (pt) {
      const rx = pt.x * SCALE, ry = pt.y * SCALE
      const npt = path[Math.min(idx + 1, path.length - 1)]
      const angle = Math.atan2(npt.y - pt.y, npt.x - pt.x)

      ctx.save()
      ctx.translate(rx, ry)
      ctx.rotate(angle)

      // Тело
      const bw = params.length * SCALE * 0.8
      const bh = params.width  * SCALE * 0.8
      ctx.fillStyle = robot?.color || '#4caf50'
      ctx.beginPath()
      ctx.roundRect(-bw/2, -bh/2, bw, bh, 4)
      ctx.fill()

      // Колёса
      ctx.fillStyle = '#111'
      const wr = Math.min(bh * 0.3, 8)
      for (const [sx, sy] of [[-bw*0.35, -bh*0.55], [-bw*0.35, bh*0.55], [bw*0.35, -bh*0.55], [bw*0.35, bh*0.55]]) {
        ctx.beginPath()
        ctx.ellipse(sx, sy, wr * 0.6, wr, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Стрелка направления
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(bw * 0.55, 0)
      ctx.lineTo(bw * 0.3, -bh * 0.25)
      ctx.lineTo(bw * 0.3, bh * 0.25)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1

      // Рабочий орган (символ)
      if (mission) {
        ctx.fillStyle = mission.color || '#ff9800'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(mission.icon, -bw * 0.7, 0)
      }

      ctx.restore()

      // Иконка задания
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#aaa'
      ctx.textAlign = 'left'
      ctx.fillText(`${robot?.icon || ''} ${Math.round(s.ptIdx / path.length * 100)}%`, 4, H - 6)
    }
  }, [path, params, robot, mission, showPath, showTrail, W, H])

  // Анимационный цикл
  const tick = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return

    s.t += STEP_MS * speed
    const newIdx = Math.min(Math.floor(s.t / 80), path.length - 1)
    s.ptIdx = newIdx
    if (path[newIdx]) s.trail.push({ x: path[newIdx].x * SCALE, y: path[newIdx].y * SCALE })
    if (s.trail.length > 2000) s.trail.shift()

    draw()
    setPtIdx(newIdx)

    const dist = newIdx * (params.workWidth * (1 - params.overlap))
    const time = newIdx / (params.workSpeed / 3.6 / 5)
    setInfo({ dist: dist.toFixed(0), time: (time / 60).toFixed(1) })

    if (newIdx >= path.length - 1) {
      s.running = false
      setRunning(false)
      return
    }

    animRef.current = requestAnimationFrame(tick)
  }, [path, speed, draw, params])

  const start = () => {
    stateRef.current = { running: true, ptIdx: 0, t: 0, trail: [] }
    setRunning(true)
    setPtIdx(0)
    animRef.current = requestAnimationFrame(tick)
  }

  const pause = () => {
    stateRef.current.running = false
    setRunning(false)
    cancelAnimationFrame(animRef.current)
  }

  const resume = () => {
    stateRef.current.running = true
    setRunning(true)
    animRef.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    cancelAnimationFrame(animRef.current)
    stateRef.current = { running: false, ptIdx: 0, t: 0, trail: [] }
    setRunning(false)
    setPtIdx(0)
    setInfo({ dist: 0, time: 0 })
    draw()
  }

  // Перерисовка при смене параметров
  useEffect(() => { draw() }, [draw])
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  const progress = path.length > 0 ? Math.round(ptIdx / (path.length - 1) * 100) : 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>

      {/* Панель управления */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!running && ptIdx === 0 && <Btn onClick={start} color="green">▶ Старт</Btn>}
        {running  && <Btn onClick={pause}  color="orange">⏸ Пауза</Btn>}
        {!running && ptIdx > 0 && <Btn onClick={resume} color="green">▶ Продолжить</Btn>}
        <Btn onClick={stop} color="ghost">⏹ Сброс</Btn>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#555', fontSize: 11 }}>Скорость:</span>
          {[1, 2, 5, 10].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              style={{ padding: '3px 8px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
                background: speed === s ? '#4caf50' : '#2a2a2a', color: speed === s ? '#fff' : '#888' }}>
              ×{s}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {[['showPath', showPath, setShowPath, '〰 Маршрут'],
            ['showTrail', showTrail, setShowTrail, '▓ Покрытие']
          ].map(([k, val, set, lbl]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: val ? '#4caf50' : '#555', fontSize: 11 }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Прогресс-бар */}
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#4caf50', transition: 'width .05s', borderRadius: 3 }} />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, background: '#111', borderRadius: 8, overflow: 'auto', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', imageRendering: 'crisp-edges' }} />
      </div>

      {/* Метрики */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['🤖', 'Платформа',    robot?.label || '—'],
          ['🌾', 'Задание',      mission?.label || '—'],
          ['📍', 'Прогресс',     `${progress}%`],
          ['📏', 'Пройдено',     `${info.dist} м`],
          ['⏱', 'Время работы', `${info.time} мин`],
          ['🔄', 'Точек всего',  path.length],
        ].map(([ic, lbl, val]) => (
          <div key={lbl} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '5px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
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
