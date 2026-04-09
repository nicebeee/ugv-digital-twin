import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet'
import { Joystick } from 'react-joystick-component'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const robotIcon = L.divIcon({
  html: `<div style="width:24px;height:24px;background:#4fc3f7;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px #4fc3f7aa;display:flex;align-items:center;justify-content:center;font-size:12px">🚜</div>`,
  iconSize: [24, 24], iconAnchor: [12, 12], className: ''
})

const waypointIcon = (n) => L.divIcon({
  html: `<div style="width:20px;height:20px;background:#ff9800;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">${n}</div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: ''
})

// ----- Palette -----
const C = {
  bg: '#1a2035', bg2: '#1f2a42', border: '#2e4060',
  accent: '#4fc3f7', text: '#d8e4f0', text2: '#8aaac8', text3: '#5a7a9a',
  green: '#66bb6a', orange: '#ffa726', red: '#ef5350',
}

// ----- Boustrophedon path planner -----
function boustrophedon(polygon, widthM) {
  if (polygon.length < 3) return []
  // Simple grid over polygon bounding box
  const lats = polygon.map(p => p[0])
  const lngs = polygon.map(p => p[1])
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  // 1 deg lat ≈ 111 000 m
  const stepLat = widthM / 111000
  const waypoints = []
  let row = 0
  for (let lat = minLat + stepLat / 2; lat < maxLat; lat += stepLat, row++) {
    const left  = [lat, minLng]
    const right = [lat, maxLng]
    waypoints.push(row % 2 === 0 ? left  : right)
    waypoints.push(row % 2 === 0 ? right : left)
  }
  return waypoints
}

// ----- Click handler component -----
function MapClickHandler({ mode, onAddWaypoint, onAddPolygonPoint }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (mode === 'waypoint') onAddWaypoint([lat, lng])
      if (mode === 'polygon')  onAddPolygonPoint([lat, lng])
    }
  })
  return null
}

// ----- Telemetry sparkline -----
function MiniChart({ data, dataKey, color, unit, label }) {
  return (
    <div style={{ background: '#141e30', borderRadius: 6, padding: '6px 8px', flex: 1, minWidth: 130 }}>
      <div style={{ color: C.text3, fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>
        {data.length ? data[data.length - 1][dataKey]?.toFixed(2) : '--'}
        <span style={{ fontSize: 10, color: C.text3, marginLeft: 3 }}>{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={36}>
        <LineChart data={data.slice(-40)}>
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis dataKey="t" hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===============================================================
export default function ControlTab({ params }) {
  // --- WebSocket ---
  const [ip, setIp]           = useState('192.168.4.1')
  const [wsStatus, setWsStatus] = useState('disconnected') // connected/disconnected/connecting
  const [latency, setLatency]   = useState(null)
  const wsRef = useRef(null)
  const pingTs = useRef(0)

  // --- Telemetry history ---
  const [telem, setTelem]     = useState(null)
  const [history, setHistory] = useState([]) // [{t, battery_v, battery_pct, current_a, roll, pitch, yaw, temp, humidity, pressure, speed}]

  // --- Map ---
  const [robotPos, setRobotPos] = useState(null) // [lat, lng]
  const [mapCenter, setMapCenter] = useState([51.5, 31.3])
  const [waypoints, setWaypoints] = useState([])
  const [mapMode, setMapMode]     = useState('idle') // idle / waypoint / polygon
  const [polygon, setPolygon]     = useState([])
  const [captureWidth, setCaptureWidth] = useState(params?.workWidth || 0.8)
  const [missionPath, setMissionPath]   = useState([])
  const [missionActive, setMissionActive] = useState(false)

  // ----- Connect / disconnect -----
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

          // ping response
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

          // telemetry packet
          setTelem(d)
          if (d.gps?.lat && d.gps?.lng) {
            setRobotPos([d.gps.lat, d.gps.lng])
            setMapCenter([d.gps.lat, d.gps.lng])
          }
          setHistory(prev => {
            const next = [...prev, {
              t: Date.now(),
              battery_v:   d.battery_v   ?? 0,
              battery_pct: d.battery_pct ?? 0,
              current_a:   d.current_a   ?? 0,
              roll:  d.imu?.roll  ?? 0,
              pitch: d.imu?.pitch ?? 0,
              yaw:   d.imu?.yaw   ?? 0,
              temp:     d.env?.temp     ?? 0,
              humidity: d.env?.humidity ?? 0,
              pressure: d.env?.pressure ?? 0,
              speed: d.gps?.speed ?? 0,
            }]
            return next.slice(-200)
          })
        } catch {}
      }
    } catch {
      setWsStatus('disconnected')
    }
  }, [ip])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setWsStatus('disconnected')
    setLatency(null)
  }, [])

  const sendCmd = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj))
    }
  }, [])

  // ----- Joystick -----
  const joystickRef = useRef({ vx: 0, vy: 0 })
  const joystickInterval = useRef(null)

  const handleJoystickMove = (e) => {
    // e.x / e.y in [-1, 1]
    const vx = (e.y ?? 0)         // forward/back
    const vy = -(e.x ?? 0)        // strafe (negative for intuitive)
    joystickRef.current = { vx, vy }
  }
  const handleJoystickStop = () => {
    joystickRef.current = { vx: 0, vy: 0 }
    sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })
  }

  useEffect(() => {
    joystickInterval.current = setInterval(() => {
      const { vx, vy } = joystickRef.current
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        sendCmd({ cmd: 'move', vx, vy, omega: 0 })
      }
    }, 100)
    return () => clearInterval(joystickInterval.current)
  }, [sendCmd])

  useEffect(() => () => wsRef.current?.close(), [])

  // ----- Map actions -----
  const addWaypoint = (latlng) => setWaypoints(prev => [...prev, latlng])
  const clearWaypoints = () => setWaypoints([])
  const addPolygonPoint = (latlng) => setPolygon(prev => [...prev, latlng])
  const clearPolygon = () => { setPolygon([]); setMissionPath([]) }

  const calcMission = () => {
    if (polygon.length < 3) return
    const path = boustrophedon(polygon, captureWidth)
    setMissionPath(path)
  }

  const startMission = () => {
    const wps = missionPath.length ? missionPath : waypoints
    if (!wps.length) return
    sendCmd({ cmd: 'mission', waypoints: wps.map(([lat, lng]) => ({ lat, lng })) })
    setMissionActive(true)
  }

  const stopMission = () => {
    sendCmd({ cmd: 'stop' })
    setMissionActive(false)
  }

  // ----- Status badge -----
  const statusColor = wsStatus === 'connected' ? C.green : wsStatus === 'connecting' ? C.orange : C.red
  const statusLabel = wsStatus === 'connected' ? 'Подключено' : wsStatus === 'connecting' ? 'Подключение…' : 'Отключено'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: C.bg }}>

      {/* ===== LEFT PANEL ===== */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg2, flexShrink: 0 }}>

        {/* Connection */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🔌 ПОДКЛЮЧЕНИЕ ESP32</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              value={ip} onChange={e => setIp(e.target.value)}
              placeholder="192.168.4.1"
              style={{ flex: 1, background: '#141e30', border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: '5px 8px', fontSize: 12 }}
            />
            {wsStatus === 'disconnected'
              ? <button onClick={connect} style={btnStyle(C.accent)}>Подключить</button>
              : <button onClick={disconnect} style={btnStyle(C.red)}>Откл.</button>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 600 }}>{statusLabel}</span>
            {latency != null && <span style={{ color: C.text3, fontSize: 10, marginLeft: 'auto' }}>{latency} мс</span>}
          </div>
        </div>

        {/* Joystick */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🕹 РУЧНОЕ УПРАВЛЕНИЕ</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <Joystick
              size={120} sticky={false}
              baseColor="#1a2e4a" stickColor="#4fc3f7"
              move={handleJoystickMove} stop={handleJoystickStop}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[['↑', 1, 0], ['↓', -1, 0], ['←', 0, 1], ['→', 0, -1]].map(([label, vx, vy]) => (
              <button key={label}
                onMouseDown={() => sendCmd({ cmd: 'move', vx, vy, omega: 0 })}
                onMouseUp={() => sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })}
                onTouchStart={() => sendCmd({ cmd: 'move', vx, vy, omega: 0 })}
                onTouchEnd={() => sendCmd({ cmd: 'move', vx: 0, vy: 0, omega: 0 })}
                style={{ ...btnStyle('#2e4060'), width: 36, height: 36, fontSize: 14, padding: 0 }}
              >{label}</button>
            ))}
            <button onClick={() => sendCmd({ cmd: 'stop' })} style={{ ...btnStyle(C.red), fontSize: 10, padding: '4px 8px' }}>СТОП</button>
          </div>
        </div>

        {/* Waypoints */}
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📍 МАРШРУТ</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setMapMode(mapMode === 'waypoint' ? 'idle' : 'waypoint')}
              style={btnStyle(mapMode === 'waypoint' ? C.orange : '#2e4060')}>
              {mapMode === 'waypoint' ? '● Кликни карту' : '+ Waypoint'}
            </button>
            <button onClick={clearWaypoints} style={btnStyle('#2e4060')}>Очистить</button>
          </div>
          <div style={{ maxHeight: 80, overflowY: 'auto' }}>
            {waypoints.map((wp, i) => (
              <div key={i} style={{ color: C.text3, fontSize: 10, padding: '1px 0' }}>
                {i + 1}. {wp[0].toFixed(5)}, {wp[1].toFixed(5)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={startMission} disabled={missionActive || !waypoints.length}
              style={btnStyle(missionActive ? C.green : C.accent)}>
              {missionActive ? '▶ Миссия' : '▶ Старт'}
            </button>
            <button onClick={stopMission} style={btnStyle(C.red)}>■ Стоп</button>
          </div>
        </div>

        {/* Field polygon */}
        <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
          <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🌾 ПОЛЕ (ЗМЕЙКА)</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setMapMode(mapMode === 'polygon' ? 'idle' : 'polygon')}
              style={btnStyle(mapMode === 'polygon' ? C.orange : '#2e4060')}>
              {mapMode === 'polygon' ? '● Рисуй' : '✏ Полигон'}
            </button>
            <button onClick={clearPolygon} style={btnStyle('#2e4060')}>Сброс</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: C.text3, fontSize: 10 }}>Ширина захвата:</span>
            <input type="number" value={captureWidth} min={0.1} max={5} step={0.1}
              onChange={e => setCaptureWidth(parseFloat(e.target.value) || 0.8)}
              style={{ width: 55, background: '#141e30', border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: '3px 6px', fontSize: 11 }}
            />
            <span style={{ color: C.text3, fontSize: 10 }}>м</span>
          </div>
          <div style={{ color: C.text3, fontSize: 10, marginBottom: 6 }}>
            Точек полигона: {polygon.length} | Маршрут: {missionPath.length} точек
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={calcMission} disabled={polygon.length < 3} style={btnStyle('#2e4060')}>
              Рассчитать
            </button>
            <button onClick={startMission} disabled={!missionPath.length || missionActive}
              style={btnStyle(C.accent)}>
              ▶ Миссия
            </button>
          </div>
        </div>
      </div>

      {/* ===== CENTER: MAP ===== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '6px 10px', background: C.bg2, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>🗺 КАРТА</span>
          <span style={{ color: C.text3, fontSize: 10 }}>
            Режим: <b style={{ color: mapMode !== 'idle' ? C.orange : C.text }}>{mapMode === 'idle' ? 'просмотр' : mapMode === 'waypoint' ? 'добавление точек' : 'рисование поля'}</b>
          </span>
          <button onClick={() => setMapMode('idle')} style={{ ...btnStyle('#2e4060'), fontSize: 10, padding: '3px 8px', marginLeft: 'auto' }}>
            Сброс режима
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={mapCenter} zoom={16}
            style={{ width: '100%', height: '100%', background: '#141e30' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler mode={mapMode} onAddWaypoint={addWaypoint} onAddPolygonPoint={addPolygonPoint} />

            {/* Robot marker */}
            {robotPos && <Marker position={robotPos} icon={robotIcon} />}

            {/* Waypoints */}
            {waypoints.map((wp, i) => (
              <Marker key={i} position={wp} icon={waypointIcon(i + 1)} />
            ))}
            {waypoints.length > 1 && (
              <Polyline positions={waypoints} color={C.orange} weight={2} dashArray="6 4" />
            )}

            {/* Field polygon */}
            {polygon.length > 1 && (
              <Polyline positions={[...polygon, polygon[0]]} color={C.green} weight={2} />
            )}

            {/* Boustrophedon mission path */}
            {missionPath.length > 1 && (
              <Polyline positions={missionPath} color="#ce93d8" weight={1.5} dashArray="4 3" />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ===== RIGHT PANEL: TELEMETRY ===== */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${C.border}`, background: C.bg2, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.accent, fontSize: 11, fontWeight: 700 }}>📡 ТЕЛЕМЕТРИЯ</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Battery */}
          <Section title="🔋 Питание">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="battery_v" color={C.accent} unit="В" label="Напряжение" />
              <MiniChart data={history} dataKey="battery_pct" color={C.green} unit="%" label="Заряд" />
            </div>
            <MiniChart data={history} dataKey="current_a" color={C.orange} unit="А" label="Ток" />
          </Section>

          {/* IMU */}
          <Section title="🧭 IMU (гироскоп)">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="roll"  color="#ef5350" unit="°" label="Roll" />
              <MiniChart data={history} dataKey="pitch" color="#ab47bc" unit="°" label="Pitch" />
            </div>
            <MiniChart data={history} dataKey="yaw" color="#26c6da" unit="°" label="Yaw" />
          </Section>

          {/* Environment */}
          <Section title="🌡 Окружение">
            <div style={{ display: 'flex', gap: 4 }}>
              <MiniChart data={history} dataKey="temp"     color="#ff7043" unit="°C" label="Темп." />
              <MiniChart data={history} dataKey="humidity" color="#42a5f5" unit="%"  label="Влажн." />
            </div>
            <MiniChart data={history} dataKey="pressure" color="#8d6e63" unit="гПа" label="Давление" />
          </Section>

          {/* GPS */}
          <Section title="📡 GPS">
            <MiniChart data={history} dataKey="speed" color="#9ccc65" unit="км/ч" label="Скорость" />
            <div style={{ padding: '4px 0', color: C.text3, fontSize: 10 }}>
              {telem?.gps ? (
                <>Lat: {telem.gps.lat?.toFixed(6)} | Lng: {telem.gps.lng?.toFixed(6)}</>
              ) : '— нет сигнала GPS —'}
            </div>
          </Section>

          {/* Obstacles */}
          <Section title="⚠ Препятствия">
            {['front', 'back', 'left', 'right'].map(dir => {
              const val = telem?.obstacles?.[dir]
              const label = { front: 'Перед', back: 'Зад', left: 'Лево', right: 'Право' }[dir]
              const danger = val != null && val < 30
              return (
                <div key={dir} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.text3, fontSize: 10 }}>{label}</span>
                  <span style={{ color: danger ? C.red : C.green, fontSize: 11, fontWeight: 700 }}>
                    {val != null ? `${val} см` : '—'}
                  </span>
                </div>
              )
            })}
          </Section>

          {/* Motor temps */}
          <Section title="🔩 Темп. моторов">
            {telem?.temp_motors ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {telem.temp_motors.map((t, i) => (
                  <div key={i} style={{ flex: '1 1 60px', background: '#141e30', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ color: C.text3, fontSize: 9 }}>М{i + 1}</div>
                    <div style={{ color: t > 60 ? C.red : C.orange, fontSize: 14, fontWeight: 700 }}>{t.toFixed(0)}°</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: C.text3, fontSize: 10 }}>— нет данных —</div>}
          </Section>
        </div>
      </div>
    </div>
  )
}

// ----- Small helpers -----
function Section({ title, children }) {
  return (
    <div style={{ background: '#141e30', borderRadius: 7, padding: '8px 8px', border: `1px solid ${C.border}` }}>
      <div style={{ color: C.text2, fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}

function btnStyle(color) {
  return {
    background: color + '22',
    border: `1px solid ${color}`,
    color: color,
    borderRadius: 5, padding: '5px 10px',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
