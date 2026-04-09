import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet'
import { Joystick } from 'react-joystick-component'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// ── Fix leaflet icons ──────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const robotIcon = L.divIcon({
  html: `<div style="width:26px;height:26px;background:#4fc3f7;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px #4fc3f7cc;display:flex;align-items:center;justify-content:center;font-size:13px">🚜</div>`,
  iconSize: [26, 26], iconAnchor: [13, 13], className: '',
})
const makePinIcon = (n, color = '#ff9800') => L.divIcon({
  html: `<div style="width:20px;height:20px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">${n}</div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: '',
})
const startIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#ffd54f;border:2px solid #fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 6px #ffd54faa">▶</div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], className: '',
})

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg: '#1a2035', bg2: '#1f2a42', border: '#2e4060',
  accent: '#4fc3f7', text: '#d8e4f0', text2: '#8aaac8', text3: '#5a7a9a',
  green: '#66bb6a', orange: '#ffa726', red: '#ef5350', purple: '#ce93d8',
  yellow: '#ffd54f',
}

// ── Geometry helpers ──────────────────────────────────────────

// Пересечение горизонтального сканлайна (lat=const) с ребром p1→p2 → lng
function latScanCross(p1, p2, lat) {
  const [lat1, lng1] = p1, [lat2, lng2] = p2
  if ((lat1 <= lat && lat < lat2) || (lat2 <= lat && lat < lat1)) {
    return lng1 + (lat - lat1) / (lat2 - lat1) * (lng2 - lng1)
  }
  return null
}

// Пересечение вертикального сканлайна (lng=const) с ребром p1→p2 → lat
function lngScanCross(p1, p2, lng) {
  const [lat1, lng1] = p1, [lat2, lng2] = p2
  if ((lng1 <= lng && lng < lng2) || (lng2 <= lng && lng < lng1)) {
    return lat1 + (lng - lng1) / (lng2 - lng1) * (lat2 - lat1)
  }
  return null
}

// Boustrophedon — возвращает ТОЛЬКО ключевые точки маршрута:
//   по 2 точки на полосу (начало и конец), переходы между полосами — прямые.
//   Итого: 2 × N точек вместо тысяч.
//
// sweepDir: 'auto' | 'ew' | 'ns'
// startPoint: [lat, lng] — ближайший угол поля с которого начать (необязателен)
function boustrophedon(polygon, widthM, sweepDir = 'auto', startPoint = null) {
  if (polygon.length < 3) return []
  const lats = polygon.map(p => p[0])
  const lngs = polygon.map(p => p[1])
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const avgLat = (minLat + maxLat) / 2
  const cosLat = Math.cos(avgLat * Math.PI / 180)
  const n = polygon.length

  // Собрать полосы: каждая = [pointA, pointB] — концы отрезка внутри полигона
  const strips = [] // [{a:[lat,lng], b:[lat,lng]}]

  const useEW = sweepDir === 'ew' ||
    (sweepDir === 'auto' && (maxLng - minLng) * cosLat >= (maxLat - minLat))

  if (useEW) {
    const stepLat = widthM / 111000
    if (stepLat <= 0) return []
    for (let lat = minLat + stepLat * 0.5; lat < maxLat; lat += stepLat) {
      const xs = []
      for (let i = 0; i < n; i++) {
        const x = latScanCross(polygon[i], polygon[(i + 1) % n], lat)
        if (x !== null) xs.push(x)
      }
      xs.sort((a, b) => a - b)
      for (let k = 0; k + 1 < xs.length; k += 2)
        strips.push({ a: [lat, xs[k]], b: [lat, xs[k + 1]] })
    }
  } else {
    const stepLng = widthM / (111000 * cosLat)
    if (stepLng <= 0) return []
    for (let lng = minLng + stepLng * 0.5; lng < maxLng; lng += stepLng) {
      const ys = []
      for (let i = 0; i < n; i++) {
        const y = lngScanCross(polygon[i], polygon[(i + 1) % n], lng)
        if (y !== null) ys.push(y)
      }
      ys.sort((a, b) => a - b)
      for (let k = 0; k + 1 < ys.length; k += 2)
        strips.push({ a: [ys[k], lng], b: [ys[k + 1], lng] })
    }
  }

  if (!strips.length) return []

  // Если задана точка старта — найти ближайший конец первой полосы и
  // переупорядочить полосы так, чтобы начать с ближайшей к startPoint.
  if (startPoint) {
    const dist2 = ([la, lo]) =>
      (la - startPoint[0]) ** 2 + (lo - startPoint[1]) ** 2
    let bestIdx = 0, bestDist = Infinity
    strips.forEach(({ a, b }, i) => {
      const d = Math.min(dist2(a), dist2(b))
      if (d < bestDist) { bestDist = d; bestIdx = i }
    })
    // Ротируем массив полос так, чтобы ближайшая была первой
    const rotated = [...strips.slice(bestIdx), ...strips.slice(0, bestIdx)]
    // Проверяем — если b ближе к startPoint, чем a — переворачиваем первую полосу
    if (dist2(rotated[0].b) < dist2(rotated[0].a)) {
      rotated[0] = { a: rotated[0].b, b: rotated[0].a }
    }
    strips.length = 0
    strips.push(...rotated)
  }

  // Строим маршрут-змейку: чередуем направление полос
  const waypoints = []
  let flip = false
  for (const strip of strips) {
    waypoints.push(flip ? strip.b : strip.a)
    waypoints.push(flip ? strip.a : strip.b)
    flip = !flip
  }
  return waypoints  // только ключевые точки — 2 × N
}

// ── Ramer–Douglas–Peucker: упрощение пути для отрисовки ──────
function rdp(points, epsilon) {
  if (points.length < 3) return points
  let maxDist = 0, maxIdx = 0
  const [lat1, lng1] = points[0]
  const [lat2, lng2] = points[points.length - 1]
  const denom = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2)

  for (let i = 1; i < points.length - 1; i++) {
    const [lat, lng] = points[i]
    let dist
    if (denom === 0) {
      dist = Math.sqrt((lat - lat1) ** 2 + (lng - lng1) ** 2)
    } else {
      dist = Math.abs((lat2 - lat1) * (lng1 - lng) - (lat1 - lat) * (lng2 - lng1)) / denom
    }
    if (dist > maxDist) { maxDist = dist; maxIdx = i }
  }

  if (maxDist > epsilon) {
    const left  = rdp(points.slice(0, maxIdx + 1), epsilon)
    const right = rdp(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [points[0], points[points.length - 1]]
}

// Центроид полигона
function polygonCentroid(polygon) {
  const lat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length
  const lng = polygon.reduce((s, p) => s + p[1], 0) / polygon.length
  return [lat, lng]
}

// ── Demo telemetry generator ──────────────────────────────────
function genDemoTelem(tick, basePos) {
  const t = tick * 0.2 // секунды
  const r = () => (Math.random() - 0.5) * 0.5
  return {
    battery_v:   parseFloat((48 + Math.sin(t / 30) * 0.5).toFixed(2)),
    battery_pct: parseFloat(Math.max(0, 85 - t / 600).toFixed(1)),
    current_a:   parseFloat((2.1 + Math.sin(t / 5) * 0.3 + r() * 0.1).toFixed(3)),
    temp_motors: [42 + r(), 39 + r(), 40 + r(), 38 + r()].map(v => parseFloat(v.toFixed(1))),
    imu: {
      roll:  parseFloat((Math.sin(t / 10) * 3 + r()).toFixed(2)),
      pitch: parseFloat((Math.cos(t / 8)  * 2 + r()).toFixed(2)),
      yaw:   parseFloat(((t * 2) % 360).toFixed(2)),
    },
    env: { temp: 22.5, humidity: 58.0, pressure: 1013.2 },
    gps: {
      lat:   basePos[0],
      lng:   basePos[1],
      speed: parseFloat((2.4 + r() * 0.2).toFixed(1)),
    },
    obstacles: {
      front: Math.round(120 + r() * 20),
      back:  200,
      left:  Math.round(80  + r() * 10),
      right: Math.round(150 + r() * 10),
    },
  }
}

// ── Map click handler ─────────────────────────────────────────
function MapClickHandler({ mode, onWaypoint, onPolygon, onStartPoint }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (mode === 'waypoint')    onWaypoint([lat, lng])
      if (mode === 'polygon')     onPolygon([lat, lng])
      if (mode === 'startpoint')  onStartPoint([lat, lng])
    },
  })
  return null
}

// ── Telemetry sparkline ───────────────────────────────────────
function MiniChart({ data, dataKey, color, unit, label }) {
  const last = data.length ? data[data.length - 1][dataKey] : null
  return (
    <div style={{ background: '#141e30', borderRadius: 6, padding: '6px 8px', flex: 1, minWidth: 120 }}>
      <div style={{ color: C.text3, fontSize: 9, marginBottom: 1 }}>{label}</div>
      <div style={{ color, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>
        {last != null ? Number(last).toFixed(2) : '--'}
        <span style={{ fontSize: 9, color: C.text3, marginLeft: 3 }}>{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={data.slice(-50)}>
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis dataKey="t" hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ControlTab({ params }) {
  // WebSocket
  const [ip, setIp]           = useState('192.168.4.1')
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [latency, setLatency]   = useState(null)
  const wsRef  = useRef(null)
  const pingTs = useRef(0)

  // Demo mode
  const [demoMode, setDemoMode] = useState(false)
  const demoTick        = useRef(0)
  const demoPathIdx     = useRef(0)     // индекс СЛЕДУЮЩЕЙ целевой точки
  const demoRafRef      = useRef(null)  // RAF handle для движения маркера
  const demoIntervalRef = useRef(null)  // setInterval для телеметрии

  // Начальная точка маршрута (ручная установка на карте)
  const [startPoint, setStartPoint] = useState(null)

  // Telemetry
  const [telem,   setTelem]   = useState(null)
  const [history, setHistory] = useState([])

  // Map
  const [robotPos,   setRobotPos]   = useState(null)
  const [mapCenter,  setMapCenter]  = useState([46.8403, 29.6433])
  const [waypoints,  setWaypoints]  = useState([])
  const [mapMode,    setMapMode]    = useState('idle')
  const [polygon,    setPolygon]    = useState([])
  const [captureWidth, setCaptureWidth] = useState(params?.workWidth || 0.8)
  const [missionPath,  setMissionPath]  = useState([])
  const [missionActive, setMissionActive] = useState(false)

  // Sweep direction for boustrophedon
  const [sweepDir, setSweepDir] = useState('auto') // 'auto' | 'ew' | 'ns'

  // Sprinkler
  const [sprinklerOn, setSprinklerOn] = useState(false)

  // Gamepad
  const [gamepadName, setGamepadName] = useState(null) // имя подключённого геймпада
  const gamepadRafRef   = useRef(null)
  const gamepadMoving   = useRef(false) // true когда стик не в нуле

  // ── sendCmd (no-op in demo) ───────────────────────────────
  const sendCmd = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj))
    }
  }, [])

  // ── Push telemetry packet into history ───────────────────
  const pushTelem = useCallback((d) => {
    setTelem(d)
    setHistory(prev => [...prev, {
      t:           Date.now(),
      battery_v:   d.battery_v   ?? 0,
      battery_pct: d.battery_pct ?? 0,
      current_a:   d.current_a   ?? 0,
      roll:        d.imu?.roll   ?? 0,
      pitch:       d.imu?.pitch  ?? 0,
      yaw:         d.imu?.yaw    ?? 0,
      temp:        d.env?.temp   ?? 0,
      humidity:    d.env?.humidity ?? 0,
      pressure:    d.env?.pressure ?? 0,
      speed:       d.gps?.speed  ?? 0,
    }].slice(-200))
  }, [])

  // ── Demo mode ─────────────────────────────────────────────
  const startDemo = useCallback(() => {
    setDemoMode(true)
    demoTick.current    = 0
    demoPathIdx.current = 0

    // Telemetry ticker every 200 ms
    demoIntervalRef.current = setInterval(() => {
      demoTick.current++
      // current robot pos comes from robotPos ref below
      pushTelem(genDemoTelem(demoTick.current, demoRobotPosRef.current))
    }, 200)
  }, [pushTelem])

  const stopDemo = useCallback(() => {
    setDemoMode(false)
    clearInterval(demoIntervalRef.current)
    cancelAnimationFrame(demoRafRef.current)
    demoIntervalRef.current = null
    demoRafRef.current      = null
  }, [])

  // Ref для текущей позиции робота — читается из RAF без stale closure
  const demoRobotPosRef = useRef([46.8403, 29.6433])
  useEffect(() => { if (robotPos) demoRobotPosRef.current = robotPos }, [robotPos])

  // Ref для missionPath — RAF читает его без stale closure
  const missionPathRef = useRef([])
  useEffect(() => { missionPathRef.current = missionPath }, [missionPath])

  // When demo activates: RAF-анимация от точки к точке по missionPath
  useEffect(() => {
    if (!demoMode) {
      cancelAnimationFrame(demoRafRef.current)
      demoRafRef.current = null
      return
    }

    const path = missionPathRef.current
    if (path.length < 2) {
      const startPos = polygon.length >= 3 ? polygonCentroid(polygon) : mapCenter
      setRobotPos(startPos)
      demoRobotPosRef.current = startPos
      return
    }

    // Стартуем с первой точки маршрута
    demoPathIdx.current = 1  // idx следующей ЦЕЛЕВОЙ точки
    setRobotPos(path[0])
    demoRobotPosRef.current = path[0]

    // Скорость: ~3 м/с = 3/111000 градусов/сек по lat
    const SPEED_DEG = 3 / 111000

    let lastTs = null
    const step = (ts) => {
      demoRafRef.current = requestAnimationFrame(step)
      if (!lastTs) { lastTs = ts; return }
      const dt = Math.min((ts - lastTs) / 1000, 0.1)
      lastTs = ts

      const route = missionPathRef.current
      if (!route.length) return

      let idx = demoPathIdx.current
      if (idx >= route.length) { demoPathIdx.current = 0; return }

      const cur = demoRobotPosRef.current
      const tgt = route[idx]
      const dLat = tgt[0] - cur[0]
      const dLng = tgt[1] - cur[1]
      const dist  = Math.sqrt(dLat * dLat + dLng * dLng)
      const step_ = SPEED_DEG * dt

      if (dist < step_ * 0.5) {
        // Достигли цели — переходим к следующей точке
        demoRobotPosRef.current = tgt
        setRobotPos(tgt)
        demoPathIdx.current = idx + 1 < route.length ? idx + 1 : 0
      } else {
        // Двигаемся к цели
        const t = step_ / dist
        const next = [cur[0] + dLat * t, cur[1] + dLng * t]
        demoRobotPosRef.current = next
        setRobotPos(next)
      }
    }
    demoRafRef.current = requestAnimationFrame(step)

    return () => cancelAnimationFrame(demoRafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, missionPath])

  // Cleanup on unmount
  useEffect(() => () => {
    wsRef.current?.close()
    clearInterval(demoIntervalRef.current)
    cancelAnimationFrame(demoRafRef.current)
    cancelAnimationFrame(gamepadRafRef.current)
  }, [])

  // ── Gamepad polling (rAF loop) ────────────────────────────
  // Скорость движения маркера в демо-режиме: ~3 м/с при полном стике
  const DEMO_SPEED_LAT = 3 / 111000  // градусы/сек за 1.0 стика
  const DEMO_SPEED_LNG_REF = useRef(3 / (111000 * Math.cos(46.84 * Math.PI / 180)))
  const lastFrameTs = useRef(null)
  const demoModeRef = useRef(false)
  useEffect(() => { demoModeRef.current = demoMode }, [demoMode])
  const wsStatusRef = useRef('disconnected')
  useEffect(() => { wsStatusRef.current = wsStatus }, [wsStatus])

  useEffect(() => {
    const gpConnected = (e) => setGamepadName(e.gamepad.id)
    const gpDisconnected = () => setGamepadName(null)
    window.addEventListener('gamepadconnected',    gpConnected)
    window.addEventListener('gamepaddisconnected', gpDisconnected)

    const poll = (ts) => {
      gamepadRafRef.current = requestAnimationFrame(poll)
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = [...pads].find(p => p)
      if (!gp) { lastFrameTs.current = ts; return }

      setGamepadName(prev => prev ?? gp.id)

      const dt = lastFrameTs.current ? Math.min((ts - lastFrameTs.current) / 1000, 0.1) : 0.016
      lastFrameTs.current = ts

      // Стандартная раскладка:
      // axes[0] = левый стик X, axes[1] = левый стик Y
      // axes[2] = правый стик X (поворот), axes[3] = правый стик Y
      const DEAD = 0.12
      const ax = (v) => Math.abs(v) > DEAD ? v : 0
      const vx    =  -ax(gp.axes[1] ?? 0)  // вперёд/назад (инверт Y)
      const vy    =   ax(gp.axes[0] ?? 0)  // влево/вправо
      const omega =   ax(gp.axes[2] ?? 0)  // поворот правым стиком

      const moving = Math.abs(vx) > 0 || Math.abs(vy) > 0 || Math.abs(omega) > 0
      gamepadMoving.current = moving

      if (wsStatusRef.current === 'connected') {
        // Реальный режим — отправляем команду на ESP32
        if (moving) {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ cmd: 'move', vx, vy, omega }))
          }
        }
      } else if (demoModeRef.current && moving) {
        // Демо-режим — двигаем маркер по карте
        setRobotPos(prev => {
          if (!prev) return prev
          const cosLat = Math.cos(prev[0] * Math.PI / 180)
          const newLat = prev[0] + vx * DEMO_SPEED_LAT * dt
          const newLng = prev[1] + vy * (3 / (111000 * cosLat)) * dt
          const pos = [newLat, newLng]
          demoRobotPosRef.current = pos
          return pos
        })
      }
    }

    gamepadRafRef.current = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(gamepadRafRef.current)
      window.removeEventListener('gamepadconnected',    gpConnected)
      window.removeEventListener('gamepaddisconnected', gpDisconnected)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── WebSocket connect / disconnect ────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    setWsStatus('connecting')
    try {
      const ws = new WebSocket(`ws://${ip}/ws`)
      wsRef.current = ws
      ws.onopen = () => {
        setWsStatus('connected')
        pingTs.current = Date.now()
        ws.send(JSON.stringify({ cmd: 'ping' }))
      }
      ws.onclose = () => { setWsStatus('disconnected'); setLatency(null) }
      ws.onerror = () => { setWsStatus('disconnected') }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (d.type === 'pong') {
            setLatency(Date.now() - pingTs.current)
            setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                pingTs.current = Date.now()
                wsRef.current.send(JSON.stringify({ cmd: 'ping' }))
              }
            }, 2000)
            return
          }
          if (d.gps?.lat && d.gps?.lng) {
            setRobotPos([d.gps.lat, d.gps.lng])
            setMapCenter([d.gps.lat, d.gps.lng])
          }
          pushTelem(d)
        } catch {}
      }
    } catch { setWsStatus('disconnected') }
  }, [ip, pushTelem])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setWsStatus('disconnected')
    setLatency(null)
  }, [])

  // ── Joystick ──────────────────────────────────────────────
  const joystickRef     = useRef({ vx: 0, vy: 0 })
  const joystickInterval = useRef(null)
  const handleJoystickMove = (e) => {
    joystickRef.current = { vx: e.y ?? 0, vy: -(e.x ?? 0) }
  }
  const handleJoystickStop = () => {
    joystickRef.current = { vx: 0, vy: 0 }
    sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })
  }
  useEffect(() => {
    joystickInterval.current = setInterval(() => {
      const { vx, vy } = joystickRef.current
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) sendCmd({ cmd: 'move', vx, vy, omega: 0 })
    }, 100)
    return () => clearInterval(joystickInterval.current)
  }, [sendCmd])

  // ── Map helpers ───────────────────────────────────────────
  const addWaypoint    = (p) => setWaypoints(prev => [...prev, p])
  const clearWaypoints = ()  => setWaypoints([])
  const addPolygon     = (p) => setPolygon(prev => [...prev, p])
  const clearPolygon   = ()  => { setPolygon([]); setMissionPath([]) }

  const calcMission = useCallback(() => {
    if (polygon.length < 3) return
    const path = boustrophedon(polygon, captureWidth, sweepDir, startPoint)
    setMissionPath(path)
  }, [polygon, captureWidth, sweepDir, startPoint])

  const startMission = () => {
    const wps = missionPath.length ? missionPath : waypoints
    if (!wps.length) return
    sendCmd({ cmd: 'mission', waypoints: wps.map(([lat, lng]) => ({ lat, lng })) })
    setMissionActive(true)
  }
  const stopMission = () => { sendCmd({ cmd: 'stop' }); setMissionActive(false) }

  // ── Sprinkler ─────────────────────────────────────────────
  const toggleSprinkler = () => {
    const next = !sprinklerOn
    setSprinklerOn(next)
    if (!demoMode) sendCmd({ cmd: 'sprinkler', state: next })
  }

  // ── Optimised render path (RDP simplified) ────────────────
  const renderPath = useMemo(() => {
    if (missionPath.length < 2) return missionPath
    return rdp(missionPath, 0.000004) // ~0.4 м точность
  }, [missionPath])

  // ── Status ────────────────────────────────────────────────
  const isDemo = demoMode
  const statusColor = isDemo
    ? C.yellow
    : wsStatus === 'connected' ? C.green : wsStatus === 'connecting' ? C.orange : C.red
  const statusLabel = isDemo
    ? 'Демо-режим'
    : wsStatus === 'connected' ? 'Подключено' : wsStatus === 'connecting' ? 'Подключение…' : 'Отключено'

  const showWpMarkers = waypoints.length <= 20

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: C.bg }}>

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div style={{ width: 294, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg2, flexShrink: 0, overflowY: 'auto' }}>

        {/* Connection */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🔌 ПОДКЛЮЧЕНИЕ ESP32</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.4.1"
              style={{ flex: 1, background: '#141e30', border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: '5px 8px', fontSize: 12 }} />
            {wsStatus !== 'connected'
              ? <button onClick={connect} style={btn(C.accent)}>Подкл.</button>
              : <button onClick={disconnect} style={btn(C.red)}>Откл.</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 600 }}>{statusLabel}</span>
            {latency != null && !isDemo && <span style={{ color: C.text3, fontSize: 10, marginLeft: 'auto' }}>{latency} мс</span>}
            {/* Demo button — only when disconnected */}
            {wsStatus === 'disconnected' && (
              <button
                onClick={isDemo ? stopDemo : startDemo}
                style={{ ...btn(isDemo ? C.orange : C.yellow), marginLeft: 'auto', fontSize: 10, padding: '3px 8px' }}>
                {isDemo ? 'Стоп демо' : 'Демо'}
              </button>
            )}
          </div>
        </div>

        {/* Sprinkler */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>💧 ПОЛИВ</div>
          <button onClick={toggleSprinkler} style={{
            width: '100%', padding: '10px 0', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: sprinklerOn ? C.green + '33' : '#141e30',
            border: `2px solid ${sprinklerOn ? C.green : C.border}`,
            color: sprinklerOn ? C.green : C.text2,
            transition: 'all .2s',
          }}>
            {sprinklerOn ? '💧 Полив ВКЛЮЧЁН' : '💧 Полив ВЫКЛ'}
          </button>
          {telem?.sprinkler_pressure != null && (
            <div style={{ color: C.text3, fontSize: 10, marginTop: 5 }}>
              Давление: <b style={{ color: C.text }}>{telem.sprinkler_pressure} бар</b> &nbsp;
              Расход: <b style={{ color: C.text }}>{telem.sprinkler_flow} л/мин</b>
            </div>
          )}
        </div>

        {/* Joystick */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>🕹 РУЧНОЕ УПРАВЛЕНИЕ</span>
            {gamepadName
              ? <span style={{ color: C.green, fontSize: 9, background: C.green + '22', border: `1px solid ${C.green}`, borderRadius: 4, padding: '1px 6px' }}>🎮 Геймпад</span>
              : <span style={{ color: C.text3, fontSize: 9 }}>геймпад не подкл.</span>
            }
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <Joystick size={110} sticky={false} baseColor="#1a2e4a" stickColor={C.accent}
              move={handleJoystickMove} stop={handleJoystickStop} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[['↑', 1, 0], ['↓', -1, 0], ['←', 0, 1], ['→', 0, -1]].map(([lbl, vx, vy]) => (
              <button key={lbl}
                onMouseDown={() => sendCmd({ cmd: 'move', vx, vy, omega: 0 })}
                onMouseUp={()   => sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })}
                onTouchStart={() => sendCmd({ cmd: 'move', vx, vy, omega: 0 })}
                onTouchEnd={()   => sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })}
                style={{ ...btn('#2e4060'), width: 34, height: 34, fontSize: 14, padding: 0 }}>{lbl}</button>
            ))}
            <button onClick={() => sendCmd({ cmd: 'stop' })} style={{ ...btn(C.red), fontSize: 10, padding: '4px 8px' }}>СТОП</button>
          </div>
        </div>

        {/* Waypoints */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📍 МАРШРУТ</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button onClick={() => setMapMode(mapMode === 'waypoint' ? 'idle' : 'waypoint')}
              style={btn(mapMode === 'waypoint' ? C.orange : '#2e4060')}>
              {mapMode === 'waypoint' ? '● Кликни карту' : '+ Waypoint'}
            </button>
            <button onClick={clearWaypoints} style={btn('#2e4060')}>Очистить</button>
          </div>
          {waypoints.length > 0 && (
            <div style={{ maxHeight: 70, overflowY: 'auto', marginBottom: 6 }}>
              {waypoints.map((wp, i) => (
                <div key={i} style={{ color: C.text3, fontSize: 10, padding: '1px 0' }}>
                  {i + 1}. {wp[0].toFixed(5)}, {wp[1].toFixed(5)}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={startMission} disabled={missionActive || !waypoints.length}
              style={btn(missionActive ? C.green : C.accent)}>
              {missionActive ? '▶ Активна' : '▶ Старт'}
            </button>
            <button onClick={stopMission} style={btn(C.red)}>■ Стоп</button>
          </div>
        </div>

        {/* Field polygon + boustrophedon */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🌾 ПОЛЕ (ЗМЕЙКА)</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <button onClick={() => setMapMode(mapMode === 'polygon' ? 'idle' : 'polygon')}
              style={btn(mapMode === 'polygon' ? C.orange : '#2e4060')}>
              {mapMode === 'polygon' ? '● Рисуй' : '✏ Полигон'}
            </button>
            <button onClick={clearPolygon} style={btn('#2e4060')}>Сброс</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: C.text3, fontSize: 10 }}>Ширина захвата:</span>
            <input type="number" value={captureWidth} min={0.1} max={10} step={0.1}
              onChange={e => setCaptureWidth(parseFloat(e.target.value) || 0.8)}
              style={{ width: 52, background: '#141e30', border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: '3px 6px', fontSize: 11 }} />
            <span style={{ color: C.text3, fontSize: 10 }}>м</span>
          </div>
          {/* Направление полос */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: C.text3, fontSize: 10, marginBottom: 4 }}>Направление движения:</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'auto', label: '⟳ Авто' },
                { id: 'ew',   label: '↔ E-W'  },
                { id: 'ns',   label: '↕ N-S'  },
              ].map(d => (
                <button key={d.id} onClick={() => setSweepDir(d.id)} style={{
                  flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700, borderRadius: 5, cursor: 'pointer',
                  background: sweepDir === d.id ? C.accent + '33' : '#141e30',
                  border: `1px solid ${sweepDir === d.id ? C.accent : C.border}`,
                  color: sweepDir === d.id ? C.accent : C.text3,
                }}>{d.label}</button>
              ))}
            </div>
          </div>
          {/* Точка старта */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: C.text3, fontSize: 10, marginBottom: 4 }}>Точка старта (откуда начать):</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setMapMode(mapMode === 'startpoint' ? 'idle' : 'startpoint')}
                style={{ ...btn(mapMode === 'startpoint' ? C.yellow : '#2e4060'), flex: 1, fontSize: 10 }}>
                {mapMode === 'startpoint' ? '● Кликни на карте' : '▶ Задать старт'}
              </button>
              {startPoint && (
                <button onClick={() => setStartPoint(null)} style={{ ...btn('#2e4060'), fontSize: 10 }}>✕</button>
              )}
            </div>
            {startPoint && (
              <div style={{ color: C.yellow, fontSize: 9, marginTop: 3 }}>
                ▶ {startPoint[0].toFixed(5)}, {startPoint[1].toFixed(5)}
              </div>
            )}
          </div>
          <div style={{ color: C.text3, fontSize: 10, marginBottom: 6 }}>
            Полигон: {polygon.length} т. | Маршрут: {missionPath.length} т.
            {renderPath.length !== missionPath.length && ` (рендер: ${renderPath.length})`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={calcMission} disabled={polygon.length < 3} style={btn('#2e4060')}>Рассчитать</button>
            <button onClick={startMission} disabled={!missionPath.length || missionActive} style={btn(C.accent)}>▶ Миссия</button>
          </div>
        </div>
      </div>

      {/* ═══════════ MAP ═══════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Map toolbar */}
        <div style={{ padding: '5px 10px', background: C.bg2, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>🗺 КАРТА</span>
          <span style={{ color: C.text3, fontSize: 10 }}>
            Режим: <b style={{ color: mapMode !== 'idle' ? C.orange : C.text }}>
              {{ idle: 'просмотр', waypoint: 'добавление точек', polygon: 'рисование поля', startpoint: 'точка старта' }[mapMode] ?? mapMode}
            </b>
          </span>
          {isDemo && (
            <span style={{ background: C.yellow + '22', border: `1px solid ${C.yellow}`, color: C.yellow, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
              ДЕМО
            </span>
          )}
          <button onClick={() => setMapMode('idle')} style={{ ...btn('#2e4060'), fontSize: 10, padding: '3px 8px', marginLeft: 'auto' }}>
            Сброс режима
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={mapCenter} zoom={16} style={{ width: '100%', height: '100%' }} zoomControl>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              mode={mapMode}
              onWaypoint={addWaypoint}
              onPolygon={addPolygon}
              onStartPoint={(p) => { setStartPoint(p); setMapMode('idle') }}
            />

            {/* Robot */}
            {robotPos && <Marker position={robotPos} icon={robotIcon} />}

            {/* Waypoints — markers only if ≤20 */}
            {showWpMarkers && waypoints.map((wp, i) => (
              <Marker key={i} position={wp} icon={makePinIcon(i + 1)} />
            ))}
            {waypoints.length > 1 && (
              <Polyline positions={waypoints} color={C.orange} weight={2} dashArray="6 4" />
            )}

            {/* Field polygon */}
            {polygon.length > 1 && (
              <Polyline positions={[...polygon, polygon[0]]} color={C.green} weight={2.5} />
            )}

            {/* Boustrophedon path — simplified for render */}
            {renderPath.length > 1 && (
              <Polyline positions={renderPath} color={C.purple} weight={1.5} dashArray="5 3" />
            )}

            {/* Start point marker */}
            {startPoint && <Marker position={startPoint} icon={startIcon} />}

            {/* Start/end markers for mission */}
            {missionPath.length > 0 && (
              <Marker position={missionPath[0]} icon={makePinIcon('S', C.green)} />
            )}
            {missionPath.length > 1 && (
              <Marker position={missionPath[missionPath.length - 1]} icon={makePinIcon('F', C.red)} />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ═══════════ RIGHT: TELEMETRY ═══════════ */}
      <div style={{ width: 272, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${C.border}`, background: C.bg2, overflow: 'hidden' }}>
        <div style={{ padding: '7px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>📡 ТЕЛЕМЕТРИЯ</span>
          {isDemo && <span style={{ color: C.yellow, fontSize: 9, fontWeight: 700 }}>● СИМУЛЯЦИЯ</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>

          <Sect title="🔋 Питание">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="battery_v"   color={C.accent} unit="В"  label="Напряжение" />
              <MiniChart data={history} dataKey="battery_pct" color={C.green}  unit="%"  label="Заряд" />
            </div>
            <MiniChart data={history} dataKey="current_a" color={C.orange} unit="А" label="Ток" />
          </Sect>

          <Sect title="🧭 IMU">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="roll"  color="#ef5350" unit="°" label="Roll" />
              <MiniChart data={history} dataKey="pitch" color="#ab47bc" unit="°" label="Pitch" />
            </div>
            <MiniChart data={history} dataKey="yaw" color="#26c6da" unit="°/с" label="Yaw" />
          </Sect>

          <Sect title="🌡 Окружение">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="temp"     color="#ff7043" unit="°C" label="Темп." />
              <MiniChart data={history} dataKey="humidity" color="#42a5f5" unit="%"  label="Влажн." />
            </div>
            <MiniChart data={history} dataKey="pressure" color="#8d6e63" unit="гПа" label="Давление" />
          </Sect>

          <Sect title="📡 GPS">
            <MiniChart data={history} dataKey="speed" color="#9ccc65" unit="км/ч" label="Скорость" />
            <div style={{ color: C.text3, fontSize: 10, paddingTop: 3 }}>
              {telem?.gps?.lat
                ? `${telem.gps.lat.toFixed(6)}, ${telem.gps.lng.toFixed(6)}`
                : '— нет сигнала GPS —'}
            </div>
          </Sect>

          <Sect title="⚠ Препятствия">
            {['front', 'back', 'left', 'right'].map(dir => {
              const v = telem?.obstacles?.[dir]
              const lbl = { front: 'Перед', back: 'Зад', left: 'Лево', right: 'Право' }[dir]
              return (
                <div key={dir} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, padding: '2px 0' }}>
                  <span style={{ color: C.text3, fontSize: 10 }}>{lbl}</span>
                  <span style={{ color: v != null && v < 30 ? C.red : C.green, fontSize: 11, fontWeight: 700 }}>
                    {v != null ? `${v} см` : '—'}
                  </span>
                </div>
              )
            })}
          </Sect>

          <Sect title="🔩 Темп. моторов">
            {telem?.temp_motors?.length ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {telem.temp_motors.map((t, i) => (
                  <div key={i} style={{ flex: '1 1 55px', background: '#141e30', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ color: C.text3, fontSize: 9 }}>М{i + 1}</div>
                    <div style={{ color: t > 60 ? C.red : C.orange, fontSize: 14, fontWeight: 700 }}>{Number(t).toFixed(0)}°</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: C.text3, fontSize: 10 }}>— нет данных —</div>}
          </Sect>

        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function Sect({ title, children }) {
  return (
    <div style={{ background: '#141e30', borderRadius: 7, padding: '7px 8px', border: `1px solid ${C.border}` }}>
      <div style={{ color: C.text2, fontSize: 10, fontWeight: 700, marginBottom: 5 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}

function btn(color) {
  return {
    background: color + '22', border: `1px solid ${color}`, color,
    borderRadius: 5, padding: '5px 10px',
    fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  }
}
