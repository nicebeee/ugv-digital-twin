import { useRef, Suspense, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES } from '../data/missions'

// ─────────────────────────────────────────────────────────────────
// 3D ROBOT MODELS
// ─────────────────────────────────────────────────────────────────

function Wheel({ pos, r = 0.12, w = 0.07, color = '#1a1a1a' }) {
  return (
    <group position={pos}>
      {/* Шина */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, w, 24]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Диск */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.65, r * 0.65, w * 0.5, 8]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Болты */}
      {[0,1,2,3,4].map(i => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[w * 0.3, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42]}
            rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.015, 6]} />
            <meshStandardMaterial color="#888" metalness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

function Track({ side, L, W, gc }) {
  const sz = side * (W / 2 + 0.06)
  const sprocketR = 0.1
  const idlerR    = 0.08
  const trackH    = 0.09
  const nLinks    = 14

  return (
    <group>
      {/* Корпус гусеницы */}
      <mesh position={[0, -0.03, sz]} castShadow>
        <boxGeometry args={[L + 0.08, trackH, 0.11]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>
      {/* Звенья */}
      {Array.from({ length: nLinks }, (_, i) => {
        const t = i / nLinks
        const x = (t - 0.5) * (L + 0.06)
        return (
          <mesh key={i} position={[x, -0.03, sz]}>
            <boxGeometry args={[L / nLinks - 0.005, trackH + 0.015, 0.115]} />
            <meshStandardMaterial color="#333" metalness={0.4} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Ведущее колесо (заднее) */}
      <mesh position={[L / 2, 0, sz]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[sprocketR, sprocketR, 0.12, 8]} />
        <meshStandardMaterial color="#555" metalness={0.7} />
      </mesh>
      {/* Направляющее колесо (переднее) */}
      <mesh position={[-L / 2, 0, sz]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[idlerR, idlerR, 0.12, 12]} />
        <meshStandardMaterial color="#666" metalness={0.6} />
      </mesh>
      {/* Опорные катки */}
      {[-0.3, 0, 0.3].map((ox, i) => (
        <mesh key={i} position={[ox, -trackH / 2, sz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 10]} />
          <meshStandardMaterial color="#444" metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function WheelRobot({ params, color }) {
  const L = params.length, W = params.width, H = 0.18
  const wR = 0.12, gc = params.groundClearance
  const wPositions = [
    [-params.wheelBase / 2, 0, -params.trackWidth / 2],
    [-params.wheelBase / 2, 0,  params.trackWidth / 2],
    [ params.wheelBase / 2, 0, -params.trackWidth / 2],
    [ params.wheelBase / 2, 0,  params.trackWidth / 2],
  ]
  return (
    <group position={[0, gc + wR, 0]}>
      {/* Рама */}
      <mesh castShadow>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Кабина */}
      <mesh position={[0, H * 0.85, 0]} castShadow>
        <boxGeometry args={[L * 0.5, H * 0.8, W * 0.7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Отсек АКБ сзади */}
      <mesh position={[-L * 0.32, H * 0.55, 0]} castShadow>
        <boxGeometry args={[L * 0.28, H * 0.6, W * 0.85]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      {/* Колёса */}
      {wPositions.map((pos, i) => (
        <Wheel key={i} pos={[pos[0], -gc - wR + 0.01, pos[2]]} r={wR} color="#1c1c1c" />
      ))}
      {/* Антенна RTK */}
      <mesh position={[L * 0.3, H * 1.6, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.28, 6]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
      <mesh position={[L * 0.3, H * 1.6 + 0.14, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#ff9800" metalness={0.6} />
      </mesh>
      {/* Камера */}
      <mesh position={[L * 0.52, H * 0.5, 0]} castShadow>
        <boxGeometry args={[0.05, 0.045, 0.065]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[L * 0.56, H * 0.5, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.02, 12]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}

function TrackedRobot({ params, color }) {
  const L = params.length, W = params.width, gc = params.groundClearance
  return (
    <group position={[0, gc + 0.1, 0]}>
      {/* Корпус */}
      <mesh castShadow>
        <boxGeometry args={[L, 0.22, W]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Надстройка */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[L * 0.6, 0.24, W * 0.7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Гусеницы */}
      <Track side={-1} L={L} W={W} gc={gc} />
      <Track side={ 1} L={L} W={W} gc={gc} />
      {/* Антенна */}
      <mesh position={[L * 0.25, 0.42, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.32, 6]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
      {/* LiDAR */}
      <mesh position={[L * 0.35, 0.35, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
        <meshStandardMaterial color="#333" metalness={0.7} />
      </mesh>
    </group>
  )
}

function LeggedRobot({ params, color, legs = 4 }) {
  const bodyR = Math.min(params.length, params.width) * 0.32
  const legAngleOffset = legs === 6 ? 0 : Math.PI / legs
  const legPositions = Array.from({ length: legs }, (_, i) => {
    const angle = (i / legs) * Math.PI * 2 + legAngleOffset
    return [Math.cos(angle) * bodyR, Math.sin(angle) * bodyR, angle]
  })
  return (
    <group position={[0, params.groundClearance + 0.35, 0]}>
      {/* Тело */}
      <mesh castShadow>
        <cylinderGeometry args={[bodyR, bodyR * 0.85, 0.16, Math.max(legs, 6)]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Верхняя панель */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[bodyR * 0.7, bodyR * 0.7, 0.04, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      {/* Ноги */}
      {legPositions.map(([lx, lz, ang], i) => {
        const ext = 1.15
        return (
          <group key={i}>
            {/* Бедро */}
            <mesh position={[lx * 0.7, -0.05, lz * 0.7]}
              rotation={[Math.atan2(lz, lx) * 0.3, 0, -0.5]}>
              <cylinderGeometry args={[0.02, 0.016, 0.3, 6]} />
              <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Голень */}
            <mesh position={[lx * ext, -0.28, lz * ext]}
              rotation={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.014, 0.01, 0.26, 6]} />
              <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Стопа */}
            <mesh position={[lx * ext * 1.15, -params.groundClearance - 0.2, lz * ext * 1.15]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#222" metalness={0.7} />
            </mesh>
          </group>
        )
      })}
      {/* Голова с камерой */}
      <mesh position={[bodyR * 0.55, 0.08, 0]}>
        <boxGeometry args={[0.11, 0.09, 0.11]} />
        <meshStandardMaterial color="#111" roughness={0.4} />
      </mesh>
      {/* Линза */}
      <mesh position={[bodyR * 0.62, 0.08, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.018, 12]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1565c0" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

function StraddleRobot({ params, color }) {
  const L = params.length, W = params.width * 2.2, gc = params.groundClearance + 0.45
  const wR = 0.15
  return (
    <group>
      {/* Поперечная балка */}
      <mesh position={[0, gc + 0.08, 0]} castShadow>
        <boxGeometry args={[L * 0.5, 0.13, W]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Стойки */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[0, gc / 2 + 0.04, side * W / 2]}>
          <boxGeometry args={[L * 0.38, gc, 0.09]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Колёса */}
      {[[-L * 0.14, -1], [L * 0.14, -1], [-L * 0.14, 1], [L * 0.14, 1]].map(([x, side], i) => (
        <Wheel key={i} pos={[x, wR, side * (W / 2)]} r={wR} w={0.09} color="#222" />
      ))}
      {/* Направляющие */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[L * 0.18, gc + 0.05, side * W / 2.2]}>
          <boxGeometry args={[0.04, 0.06, 0.04]} />
          <meshStandardMaterial color="#888" metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function ToolAttachment({ missionType, robotPos }) {
  const mission = MISSION_TYPES.find(m => m.id === missionType)
  if (!mission) return null
  const toolColor = mission.color || '#4caf50'
  return (
    <group position={[robotPos[0] - 0.45, robotPos[1], robotPos[2]]}>
      {missionType === 'seeding' && (
        <group>
          <mesh><boxGeometry args={[0.1, 0.28, 0.55]} /><meshStandardMaterial color={toolColor} /></mesh>
          {[-0.15, 0, 0.15].map((z, i) => (
            <mesh key={i} position={[-0.06, -0.18, z]}>
              <cylinderGeometry args={[0.01, 0.008, 0.22, 6]} />
              <meshStandardMaterial color="#888" />
            </mesh>
          ))}
        </group>
      )}
      {missionType.includes('spray') && (
        <group>
          <mesh><boxGeometry args={[0.06, 0.09, 0.85]} /><meshStandardMaterial color={toolColor} /></mesh>
          {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
            <mesh key={i} position={[0, -0.07, z]}>
              <cylinderGeometry args={[0.005, 0.005, 0.12, 5]} />
              <meshStandardMaterial color="#1e88e5" />
            </mesh>
          ))}
        </group>
      )}
      {missionType.includes('harvest') && (
        <group>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.18, 0.12, 0.45]} /><meshStandardMaterial color={toolColor} /></mesh>
          <mesh position={[-0.13, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.35, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} />
          </mesh>
        </group>
      )}
      {missionType.includes('monitoring') && (
        <group>
          <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.12, 0.09, 0.12]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.07, 0.22, 0]}><cylinderGeometry args={[0.02, 0.02, 0.018, 10]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial color="#1565c0" /></mesh>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.018, 0.018, 0.16, 6]} /><meshStandardMaterial color="#888" /></mesh>
        </group>
      )}
      {missionType === 'fertilizing_solid' && (
        <mesh><boxGeometry args={[0.12, 0.22, 0.45]} /><meshStandardMaterial color={toolColor} /></mesh>
      )}
      {missionType === 'weeding_laser' && (
        <group>
          <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.1, 0.08, 0.1]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.006, 0.006, 0.22, 6]} /><meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={0.5} /></mesh>
        </group>
      )}
    </group>
  )
}

function RobotModel({ params }) {
  const groupRef = useRef()
  const robot = ROBOT_TYPES.find(r => r.id === params.robotType)
  const color = robot?.color || '#4caf50'

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.22
  })

  const getRobotMesh = () => {
    const id = params.robotType
    if (id === 'tracked' || id === 'tracked_rubber')
      return <TrackedRobot params={params} color={color} />
    if (id === 'legged_4' || id === 'hybrid_wheel_leg')
      return <LeggedRobot  params={params} color={color} legs={4} />
    if (id === 'legged_6')
      return <LeggedRobot  params={params} color={color} legs={6} />
    if (id === 'straddle')
      return <StraddleRobot params={params} color={color} />
    return <WheelRobot params={params} color={color} />
  }

  return (
    <group ref={groupRef}>
      {getRobotMesh()}
      <ToolAttachment missionType={params.missionType} robotPos={[0, params.groundClearance + 0.18, 0]} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────
// SVG SCHEMATICS
// ─────────────────────────────────────────────────────────────────

function SchematicTopView({ params, color }) {
  const S = 180 // px
  const L = params.length, W = params.width
  const scale = Math.min((S - 20) / L, (S - 20) / W)
  const lpx = L * scale, wpx = W * scale
  const ox = (S - lpx) / 2, oy = (S - wpx) / 2
  const wR = 0.12 * scale, wW = 0.07 * scale

  const isTracked = params.robotType === 'tracked' || params.robotType === 'tracked_rubber'
  const wb = params.wheelBase * scale
  const tw = params.trackWidth * scale

  return (
    <svg width={S} height={S} style={{ display: 'block' }}>
      {/* Подпись */}
      <text x={S/2} y={11} textAnchor="middle" fontSize={9} fill="#555">ВИД СВЕРХУ</text>
      {/* Габарит */}
      <rect x={ox} y={oy} width={lpx} height={wpx} fill={color + '22'} stroke={color} strokeWidth={1.5} rx={3} />

      {/* Колёсная база */}
      <line x1={S/2 - wb/2} y1={oy - 8} x2={S/2 + wb/2} y2={oy - 8} stroke="#444" strokeWidth={0.8} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={S/2} y={oy - 11} textAnchor="middle" fontSize={7} fill="#555">{params.wheelBase}м</text>

      {isTracked ? (
        <>
          {[-1, 1].map(side => (
            <rect key={side}
              x={S/2 - wb/2 - wW/2}
              y={S/2 + side * tw/2 - wW * 3}
              width={wb + wW}
              height={wW * 6}
              fill="#1a1a1a" stroke="#444" strokeWidth={1} rx={2} />
          ))}
        </>
      ) : (
        [
          [S/2 - wb/2, S/2 - tw/2],
          [S/2 - wb/2, S/2 + tw/2],
          [S/2 + wb/2, S/2 - tw/2],
          [S/2 + wb/2, S/2 + tw/2],
        ].map(([cx, cy], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={wW * 0.8} ry={wR} fill="#1c1c1c" stroke="#444" strokeWidth={1} />
        ))
      )}

      {/* Колея */}
      <line x1={ox - 8} y1={S/2 - tw/2} x2={ox - 8} y2={S/2 + tw/2} stroke="#444" strokeWidth={0.8} />
      <text x={ox - 12} y={S/2 + 3} textAnchor="end" fontSize={7} fill="#555">{params.trackWidth}м</text>

      {/* Размерные стрелки L и W */}
      <line x1={ox} y1={oy + wpx + 10} x2={ox + lpx} y2={oy + wpx + 10} stroke="#555" strokeWidth={0.8} />
      <text x={S/2} y={oy + wpx + 20} textAnchor="middle" fontSize={7} fill="#555">Длина {params.length}м</text>
      <line x1={ox + lpx + 10} y1={oy} x2={ox + lpx + 10} y2={oy + wpx} stroke="#555" strokeWidth={0.8} />
      <text x={ox + lpx + 18} y={S/2 + 3} fontSize={7} fill="#555">Ш {params.width}м</text>
    </svg>
  )
}

function SchematicSideView({ params, color }) {
  const S = 180
  const L = params.length, H_total = params.groundClearance + 0.4 + 0.18
  const scale = Math.min((S - 24) / L, (S - 24) / H_total)
  const lpx = L * scale
  const gcpx = params.groundClearance * scale
  const wR = 0.12 * scale
  const bodyH = 0.18 * scale
  const cabH  = 0.16 * scale
  const ground = S - 12

  const isTracked = params.robotType === 'tracked' || params.robotType === 'tracked_rubber'
  const ox = (S - lpx) / 2

  return (
    <svg width={S} height={S} style={{ display: 'block' }}>
      <text x={S/2} y={11} textAnchor="middle" fontSize={9} fill="#555">ВИД СБОКУ</text>

      {/* Земля */}
      <line x1={0} y1={ground} x2={S} y2={ground} stroke="#2a4a1a" strokeWidth={2} />

      {isTracked ? (
        <>
          {/* Гусеница */}
          <rect x={ox - 4} y={ground - wR * 1.2} width={lpx + 8} height={wR * 1.1}
            fill="#1a1a1a" stroke="#444" strokeWidth={1} rx={5} />
          {/* Звёздочки */}
          <circle cx={ox + 4}    cy={ground - wR * 0.7} r={wR * 0.5} fill="#555" stroke="#666" strokeWidth={1} />
          <circle cx={ox + lpx - 4} cy={ground - wR * 0.7} r={wR * 0.4} fill="#555" stroke="#666" strokeWidth={1} />
        </>
      ) : (
        [ox + 8, ox + lpx - 8].map((cx, i) => (
          <ellipse key={i} cx={cx} cy={ground - wR} rx={wR * 0.55} ry={wR}
            fill="#1c1c1c" stroke="#444" strokeWidth={1} />
        ))
      )}

      {/* Клиренс */}
      <line x1={ox - 14} y1={ground - wR * 2} x2={ox - 14} y2={ground} stroke="#2196f3" strokeWidth={0.8} />
      <text x={ox - 18} y={ground - wR} textAnchor="end" fontSize={7} fill="#2196f3">{(params.groundClearance * 100).toFixed(0)}см</text>

      {/* Корпус */}
      <rect x={ox} y={ground - wR * 2 - gcpx - bodyH} width={lpx} height={bodyH}
        fill={color + '44'} stroke={color} strokeWidth={1.5} rx={2} />
      {/* Кабина */}
      <rect x={ox + lpx * 0.25} y={ground - wR * 2 - gcpx - bodyH - cabH}
        width={lpx * 0.5} height={cabH}
        fill={color + '33'} stroke={color} strokeWidth={1} rx={2} />

      {/* Антенна */}
      <line x1={ox + lpx * 0.75} y1={ground - wR * 2 - gcpx - bodyH - cabH}
            x2={ox + lpx * 0.75} y2={ground - wR * 2 - gcpx - bodyH - cabH - 18}
        stroke="#ff9800" strokeWidth={1.5} />
      <circle cx={ox + lpx * 0.75} cy={ground - wR * 2 - gcpx - bodyH - cabH - 20} r={3} fill="#ff9800" />

      {/* Размер высоты */}
      <line x1={ox + lpx + 10} y1={ground} x2={ox + lpx + 10} y2={ground - wR * 2 - gcpx - bodyH - cabH - 22}
        stroke="#555" strokeWidth={0.8} />
      <text x={ox + lpx + 14} y={ground - (wR * 2 + gcpx + bodyH) / 2} fontSize={7} fill="#555">
        ~{(H_total + 0.3).toFixed(2)}м
      </text>
    </svg>
  )
}

function DetailComponents({ params, color }) {
  const robot = ROBOT_TYPES.find(r => r.id === params.robotType)
  const isTracked = params.robotType === 'tracked' || params.robotType === 'tracked_rubber'
  const isLegged  = params.robotType.includes('legged') || params.robotType === 'hybrid_wheel_leg'

  const details = [
    {
      label: 'Ходовая часть',
      draw: (svg) => isTracked ? (
        <g>
          {/* Гусеничное звено */}
          <rect x={10} y={30} width={60} height={20} rx={3} fill="#1a1a1a" stroke="#555" strokeWidth={1.5} />
          {[20,30,40,50,60].map(x => (
            <rect key={x} x={x} y={28} width={8} height={24} rx={1} fill="#333" stroke="#444" strokeWidth={1} />
          ))}
          <circle cx={14} cy={40} r={11} fill="#444" stroke="#666" strokeWidth={1.5} />
          <circle cx={68} cy={40} r={8}  fill="#555" stroke="#666" strokeWidth={1} />
          <text x={40} y={62} textAnchor="middle" fontSize={8} fill="#666">Гусеничный модуль</text>
        </g>
      ) : isLegged ? (
        <g>
          <line x1={40} y1={15} x2={20} y2={40} stroke="#666" strokeWidth={3} strokeLinecap="round" />
          <line x1={20} y1={40} x2={30} y2={62} stroke="#555" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={40} cy={15} r={6}  fill={color} />
          <circle cx={20} cy={40} r={4}  fill="#666" />
          <circle cx={30} cy={62} r={5}  fill="#333" stroke="#555" strokeWidth={1} />
          <text x={40} y={75} textAnchor="middle" fontSize={8} fill="#666">Шарнирная нога</text>
        </g>
      ) : (
        <g>
          <ellipse cx={40} cy={38} rx={18} ry={25} fill="#1c1c1c" stroke="#444" strokeWidth={2} />
          <ellipse cx={40} cy={38} rx={12} ry={18} fill="#555" stroke="#666" strokeWidth={1.5} />
          {[0,72,144,216,288].map((a, i) => {
            const rad = a * Math.PI / 180
            return <line key={i} x1={40 + Math.cos(rad)*8} y1={38 + Math.sin(rad)*10}
              x2={40 + Math.cos(rad)*11} y2={38 + Math.sin(rad)*14}
              stroke="#888" strokeWidth={2} strokeLinecap="round" />
          })}
          <text x={40} y={72} textAnchor="middle" fontSize={8} fill="#666">Колесо (разрез)</text>
        </g>
      ),
    },
    {
      label: 'Навигация RTK',
      draw: () => (
        <g>
          <rect x={20} y={10} width={40} height={30} rx={4} fill="#1a1a1a" stroke="#ff9800" strokeWidth={1.5} />
          <line x1={40} y1={10} x2={40} y2={2} stroke="#ff9800" strokeWidth={2} />
          <circle cx={40} cy={2} r={3} fill="#ff9800" />
          {[[-10,-8],[10,-8],[-10,8],[10,8]].map(([dx,dy],i) => (
            <line key={i} x1={40} y1={25} x2={40+dx*2} y2={2+dy} stroke="#ff980066" strokeWidth={1} strokeDasharray="2,2" />
          ))}
          <rect x={27} y={42} width={26} height={14} rx={3} fill="#222" stroke="#555" strokeWidth={1} />
          <text x={40} y={52} textAnchor="middle" fontSize={7} fill="#ff9800">RTK</text>
          <text x={40} y={72} textAnchor="middle" fontSize={8} fill="#666">GPS-антенна ±2см</text>
        </g>
      ),
    },
    {
      label: 'АКБ блок',
      draw: () => (
        <g>
          <rect x={8} y={8} width={64} height={42} rx={4} fill="#1a1a1a" stroke="#4caf50" strokeWidth={1.5} />
          {[16, 28, 40, 52].map((x, i) => (
            <rect key={i} x={x} y={14} width={10} height={30} rx={2}
              fill={i < 3 ? '#2e7d32' : '#1a2e1a'} stroke="#4caf50" strokeWidth={0.8} />
          ))}
          <line x1={8} y1={50} x2={8} y2={56} stroke="#4caf50" strokeWidth={2} />
          <line x1={72} y1={50} x2={72} y2={56} stroke="#f44336" strokeWidth={2} />
          <text x={40} y={68} textAnchor="middle" fontSize={7} fill="#4caf50">{params.batteryCapacity} Вт·ч</text>
          <text x={40} y={78} textAnchor="middle" fontSize={8} fill="#666">Li-Ion модуль</text>
        </g>
      ),
    },
    {
      label: 'Рабочий орган',
      draw: () => {
        const mid = params.missionType
        if (mid.includes('spray')) return (
          <g>
            <rect x={28} y={8} width={24} height={16} rx={3} fill="#1a1a1a" stroke="#2196f3" strokeWidth={1.5} />
            <line x1={8} y1={24} x2={72} y2={24} stroke="#2196f3" strokeWidth={2} />
            {[16,32,48,64].map((x,i) => (
              <g key={i}>
                <line x1={x} y1={24} x2={x} y2={44} stroke="#555" strokeWidth={1.5} />
                <circle cx={x} cy={46} r={3} fill="#1e88e5" />
              </g>
            ))}
            <text x={40} y={62} textAnchor="middle" fontSize={8} fill="#666">Штанговый опрыскиватель</text>
          </g>
        )
        if (mid === 'seeding') return (
          <g>
            <rect x={20} y={8} width={40} height={20} rx={3} fill="#1a1a1a" stroke="#8bc34a" strokeWidth={1.5} />
            {[28,40,52].map((x, i) => (
              <g key={i}>
                <line x1={x} y1={28} x2={x} y2={50} stroke="#555" strokeWidth={2} />
                <polygon points={`${x},52 ${x-4},46 ${x+4},46`} fill="#8bc34a" />
              </g>
            ))}
            <text x={40} y={68} textAnchor="middle" fontSize={8} fill="#666">Сошники посевные</text>
          </g>
        )
        return (
          <g>
            <rect x={15} y={15} width={50} height={30} rx={4} fill="#1a1a1a" stroke={color} strokeWidth={1.5} />
            <circle cx={40} cy={30} r={8} fill={color + '44'} stroke={color} strokeWidth={1} />
            <text x={40} y={33} textAnchor="middle" fontSize={8} fill={color}>{MISSION_TYPES.find(m=>m.id===mid)?.icon}</text>
            <text x={40} y={62} textAnchor="middle" fontSize={8} fill="#666">{MISSION_TYPES.find(m=>m.id===mid)?.tool || 'Орудие'}</text>
          </g>
        )
      },
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {details.map((d, i) => (
        <div key={i} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{d.label}</div>
          <svg width={80} height={80} viewBox="0 0 80 80" style={{ display: 'block', margin: '0 auto' }}>
            {d.draw()}
          </svg>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN TAB
// ─────────────────────────────────────────────────────────────────

export default function Model3DTab({ params }) {
  const [view, setView] = useState('3d')
  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType)
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)
  const color   = robot?.color || '#4caf50'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>

      {/* Верхняя строка */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#9ccc65', fontWeight: 700, fontSize: 13 }}>{robot?.icon} {robot?.label}</span>
        <span style={{ color: '#666' }}>+</span>
        <span style={{ fontSize: 13 }}>{mission?.icon} {mission?.label}</span>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[['3d','🎮 3D'], ['top','⬆ Сверху'], ['side','➡ Сбоку'], ['detail','🔩 Деталировка']].map(([k, lbl]) => (
            <button key={k} onClick={() => setView(k)}
              style={{ padding: '3px 10px', borderRadius: 8, border: 'none', fontSize: 11, cursor: 'pointer',
                background: view === k ? color : '#2a2a2a', color: view === k ? '#fff' : '#888' }}>
              {lbl}
            </button>
          ))}
        </div>

        <span style={{ color: '#444', fontSize: 10 }}>ЛКМ — вращение · Колесо — масштаб</span>
      </div>

      {/* Контент */}
      <div style={{ flex: 1, background: '#0e1a0e', borderRadius: 8, border: '1px solid #1e3a1e', overflow: 'hidden', display: 'flex' }}>

        {view === '3d' && (
          <Canvas camera={{ position: [2, 1.5, 2], fov: 50 }} shadows style={{ flex: 1 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
            <directionalLight position={[-2, 2, -2]} intensity={0.4} color="#90caf9" />
            <pointLight position={[0, 3, 0]} intensity={0.6} color="#a5d6a7" />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[6, 6]} />
              <meshStandardMaterial color="#1a2e0a" roughness={0.9} />
            </mesh>
            {Array.from({ length: 10 }, (_, i) => (
              <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(i - 5) * 0.4, 0.002, 0]}>
                <planeGeometry args={[0.05, 6]} />
                <meshStandardMaterial color="#0d1a06" />
              </mesh>
            ))}
            <Suspense fallback={null}>
              <RobotModel params={params} />
              <Grid args={[6, 6]} cellColor="#1a2e0a" sectionColor="#2a4a1a" position={[0, -0.005, 0]} />
            </Suspense>
            <OrbitControls enableDamping dampingFactor={0.07} />
          </Canvas>
        )}

        {(view === 'top' || view === 'side') && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {view === 'top' ? 'Вид сверху' : 'Вид сбоку'}
              </div>
              <div style={{ background: '#111', borderRadius: 8, padding: 12, border: '1px solid #222' }}>
                {view === 'top'
                  ? <SchematicTopView  params={params} color={color} />
                  : <SchematicSideView params={params} color={color} />
                }
              </div>
            </div>

            {/* Таблица размеров рядом */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#9ccc65', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Габариты</div>
              {[
                ['Длина',         `${params.length} м`],
                ['Ширина',        `${params.width} м`],
                ['Клиренс',       `${(params.groundClearance * 100).toFixed(0)} см`],
                ['Колёсная база', `${params.wheelBase} м`],
                ['Колея',         `${params.trackWidth} м`],
                ['Масса',         `${params.mass} кг`],
                ['Нагрузка',      `${params.maxPayload} кг`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#1a1a1a', borderRadius: 5, padding: '4px 10px', fontSize: 11 }}>
                  <span style={{ color: '#555' }}>{l}: </span>
                  <span style={{ color: '#e0e0e0', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'detail' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: 320 }}>
              <div style={{ color: '#9ccc65', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🔩 Деталировка узлов</div>
              <DetailComponents params={params} color={color} />
            </div>
          </div>
        )}
      </div>

      {/* Нижняя строка параметров */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['📐', 'Размер',  `${params.length}×${params.width} м`],
          ['⚖', 'Масса',   `${params.mass} кг`],
          ['📏', 'Клиренс', `${(params.groundClearance * 100).toFixed(0)} см`],
          ['⚙', 'Привод',  params.motorType?.toUpperCase() || params.driveType],
          ['🌾', 'Задание', mission?.tool || '—'],
        ].map(([ic, lbl, val]) => (
          <div key={lbl} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
            <span style={{ color: '#555' }}>{ic} {lbl}: </span>
            <span style={{ color: '#9ccc65', fontWeight: 700 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
