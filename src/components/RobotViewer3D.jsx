// ─────────────────────────────────────────────────────────────────
// 3D-просмотрщик: STL как основная модель, процедурная — фолбэк
// ─────────────────────────────────────────────────────────────────
import { useRef, Suspense, useMemo, Component } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'

// CDN для полных моделей (GitHub Releases)
const CDN_BASE = 'https://github.com/nicebeee/ugv-digital-twin/releases/download/models-v1'

const STL_PATHS = {
  wheel_4wd:      `${CDN_BASE}/wheel_4wd.stl`,
  wheel_6wd:      `${CDN_BASE}/wheel_6wd.stl`,
  tracked_rubber: `${CDN_BASE}/tracked_rubber.stl`,
  tracked:        `${CDN_BASE}/tracked.stl`,
  legged_4:       `${CDN_BASE}/legged_4.stl`,
  omni:           `${CDN_BASE}/omni.stl`,
}

function getStlUrl(id) {
  return (window.__STL_URLS__ && window.__STL_URLS__[id]) || STL_PATHS[id]
}

// Цвета для процедурных моделей
const BODY_COLOR  = '#1e3a5f'
const WHEEL_COLOR = '#d0d8e0'
const TRACK_COLOR = '#c8d4dc'
const LEG_COLOR   = '#a8b8c4'
const DISC_COLOR  = '#90a4ae'
const ACCENT      = '#ff9800'

// ── ErrorBoundary для обработки ошибки загрузки STL ──────────────
class STLErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

// ── STL модель ────────────────────────────────────────────────────
function STLMesh({ url, params, color }) {
  const geometry = useLoader(STLLoader, url)

  useMemo(() => {
    geometry.computeBoundingBox()
    geometry.center()
    geometry.computeVertexNormals()
  }, [geometry])

  const { scale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim    = Math.max(size.x, size.y, size.z)
    const targetDim = Math.max(params.length || 1.2, params.width || 0.8) * 1.1
    const s = maxDim > 0 ? targetDim / maxDim : 1
    // После rotation=[-PI/2,0,0]: геом. Z → мировой Y (высота)
    const heightDim = size.z > size.y ? size.z : size.y
    return { scale: s, yOffset: (heightDim * s) / 2 + 0.02 }
  }, [geometry, params])

  return (
    <mesh geometry={geometry} scale={scale} position={[0, yOffset, 0]}
      castShadow rotation={[-Math.PI/2, 0, 0]}>
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.35}
        envMapIntensity={0.8}
      />
    </mesh>
  )
}

// ── Процедурные модели (фолбэк) ───────────────────────────────────

function Wheel({ pos, r = 0.12, w = 0.07 }) {
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI/2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, w, 28]} />
        <meshStandardMaterial color={WHEEL_COLOR} roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[r*0.6, r*0.6, w*0.45, 8]} />
        <meshStandardMaterial color={DISC_COLOR} metalness={0.9} roughness={0.2} />
      </mesh>
      {[0,1,2,3,4].map(i => {
        const a = (i/5)*Math.PI*2
        return (
          <mesh key={i} position={[Math.cos(a)*r*0.4, Math.sin(a)*r*0.4, w*0.28]}
            rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.013, 6]} />
            <meshStandardMaterial color="#bbb" metalness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

function MecanumWheel({ pos, r = 0.1, w = 0.08 }) {
  return (
    <group position={pos} rotation={[Math.PI/2, 0, 0]}>
      <mesh><torusGeometry args={[r, 0.015, 8, 28]} /><meshStandardMaterial color={WHEEL_COLOR} /></mesh>
      <mesh><torusGeometry args={[r*0.55, 0.012, 8, 28]} /><meshStandardMaterial color={DISC_COLOR} metalness={0.7} /></mesh>
      {Array.from({length:9},(_,i)=>{
        const a=(i/9)*Math.PI*2
        return <mesh key={i} position={[0,Math.cos(a)*r,Math.sin(a)*r]} rotation={[0,Math.PI/4,0]}>
          <cylinderGeometry args={[0.025,0.025,w*0.7,8]} />
          <meshStandardMaterial color={WHEEL_COLOR} roughness={0.9} />
        </mesh>
      })}
    </group>
  )
}

function TrackModule({ side, L, W }) {
  const sz = side*(W/2+0.065)
  return (
    <group>
      <mesh position={[0,-0.04,sz]} castShadow>
        <boxGeometry args={[L+0.1, 0.1, 0.12]} />
        <meshStandardMaterial color={TRACK_COLOR} roughness={0.75} />
      </mesh>
      {Array.from({length:16},(_,i)=>{
        const x=((i/16)-0.5)*(L+0.08)
        return <mesh key={i} position={[x,-0.04,sz]}>
          <boxGeometry args={[L/16-0.004, 0.115, 0.128]} />
          <meshStandardMaterial color={i%2===0?TRACK_COLOR:'#c0ccd4'} metalness={0.3} roughness={0.75} />
        </mesh>
      })}
      <mesh position={[L/2,-0.01,sz]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[0.08,0.08,0.13,10]} /><meshStandardMaterial color={DISC_COLOR} metalness={0.7} />
      </mesh>
      <mesh position={[-L/2,-0.01,sz]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[0.07,0.07,0.13,12]} /><meshStandardMaterial color={WHEEL_COLOR} metalness={0.6} />
      </mesh>
      {[-0.25,0,0.25].map((ox,i)=>(
        <mesh key={i} position={[ox,-0.06,sz]} rotation={[Math.PI/2,0,0]}>
          <cylinderGeometry args={[0.04,0.04,0.1,10]} /><meshStandardMaterial color={WHEEL_COLOR} />
        </mesh>
      ))}
    </group>
  )
}

function Wheel4WD({ p }) {
  const {length:L, width:W, wheelBase:wb, trackWidth:tw, groundClearance:gc} = p
  const wR=0.13, wW=0.08
  return (
    <group position={[0,gc+wR,0]}>
      <mesh castShadow><boxGeometry args={[L,0.16,W]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0,0.14,0]} castShadow><boxGeometry args={[L*0.52,0.14,W*0.72]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[-L*0.3,0.08,0]}><boxGeometry args={[L*0.3,0.1,W*0.88]} /><meshStandardMaterial color="#0d1b3e" roughness={0.6} /></mesh>
      {[[-wb/2,0,-tw/2],[-wb/2,0,tw/2],[wb/2,0,-tw/2],[wb/2,0,tw/2]].map((pos,i)=>(
        <Wheel key={i} pos={[pos[0],-gc-wR+0.01,pos[2]]} r={wR} w={wW} />
      ))}
      <mesh position={[L*0.3,0.28,0]}><cylinderGeometry args={[0.005,0.005,0.3,6]} /><meshStandardMaterial color={ACCENT} /></mesh>
      <mesh position={[L*0.3,0.43,0]}><sphereGeometry args={[0.018,8,8]} /><meshStandardMaterial color={ACCENT} metalness={0.5} /></mesh>
      <mesh position={[L*0.54,0.08,0]}><boxGeometry args={[0.05,0.045,0.06]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
  )
}

function Wheel6WD({ p }) {
  const {length:L, width:W, wheelBase:wb, trackWidth:tw, groundClearance:gc} = p
  const wR=0.13, wW=0.08
  return (
    <group position={[0,gc+wR,0]}>
      <mesh castShadow><boxGeometry args={[L,0.17,W]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0,0.15,0]}><boxGeometry args={[L*0.55,0.15,W*0.7]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[-L*0.28,0.09,0]}><boxGeometry args={[L*0.28,0.11,W*0.86]} /><meshStandardMaterial color="#0d1b3e" roughness={0.6} /></mesh>
      {[-1,1].map(s=><mesh key={s} position={[0,-gc*0.5,s*(tw/2+0.02)]}><boxGeometry args={[wb*0.9,0.025,0.025]} /><meshStandardMaterial color={LEG_COLOR} metalness={0.6} /></mesh>)}
      {[[-wb/2,0,-tw/2],[-wb/2,0,tw/2],[0,0,-tw/2],[0,0,tw/2],[wb/2,0,-tw/2],[wb/2,0,tw/2]].map((pos,i)=>(
        <Wheel key={i} pos={[pos[0],-gc-wR+0.01,pos[2]]} r={wR} w={wW} />
      ))}
      <mesh position={[L*0.32,0.3,0]}><cylinderGeometry args={[0.005,0.005,0.32,6]} /><meshStandardMaterial color={ACCENT} /></mesh>
    </group>
  )
}

function SemiTracked({ p }) {
  const {length:L, width:W, wheelBase:wb, trackWidth:tw, groundClearance:gc} = p
  return (
    <group position={[0,gc+0.13,0]}>
      <mesh castShadow><boxGeometry args={[L,0.18,W]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0.05,0.15,0]}><boxGeometry args={[L*0.5,0.15,W*0.7]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} /></mesh>
      {[-1,1].map(s=><Wheel key={s} pos={[wb/2,-gc-0.13+0.01,s*tw/2]} r={0.13} w={0.09} />)}
      <TrackModule side={-1} L={wb*0.55} W={W} />
      <TrackModule side={ 1} L={wb*0.55} W={W} />
      <mesh position={[L*0.32,0.28,0]}><cylinderGeometry args={[0.005,0.005,0.28,6]} /><meshStandardMaterial color={ACCENT} /></mesh>
    </group>
  )
}

function FullTracked({ p }) {
  const {length:L, width:W, groundClearance:gc} = p
  return (
    <group position={[0,gc+0.1,0]}>
      <mesh castShadow><boxGeometry args={[L,0.22,W]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0,0.2,0]}><boxGeometry args={[L*0.62,0.24,W*0.72]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} /></mesh>
      <TrackModule side={-1} L={L} W={W} />
      <TrackModule side={ 1} L={L} W={W} />
      <mesh position={[L*0.25,0.42,0]}><cylinderGeometry args={[0.038,0.038,0.065,16]} /><meshStandardMaterial color="#222" metalness={0.7} /></mesh>
      <mesh position={[L*0.28,0.47,0]}><cylinderGeometry args={[0.006,0.006,0.34,6]} /><meshStandardMaterial color={ACCENT} /></mesh>
    </group>
  )
}

function Quadruped({ p }) {
  const bR=0.22, {groundClearance:gc}=p
  const legAngles=[Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]
  return (
    <group position={[0,gc+0.35,0]}>
      <mesh castShadow><cylinderGeometry args={[bR,bR*0.85,0.17,8]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0,0.11,0]}><cylinderGeometry args={[bR*0.65,bR*0.65,0.04,16]} /><meshStandardMaterial color="#0d1b3e" roughness={0.5} /></mesh>
      {legAngles.map((a,i)=>{
        const lx=Math.cos(a)*bR, lz=Math.sin(a)*bR
        return <group key={i}>
          <mesh position={[lx*0.8,-0.04,lz*0.8]} rotation={[Math.atan2(lz,lx)*0.2,0,-0.55]}>
            <cylinderGeometry args={[0.022,0.016,0.32,6]} /><meshStandardMaterial color={LEG_COLOR} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[lx*1.1,-0.18,lz*1.1]}><sphereGeometry args={[0.026,8,8]} /><meshStandardMaterial color={WHEEL_COLOR} metalness={0.7} /></mesh>
          <mesh position={[lx*1.3,-0.34,lz*1.3]} rotation={[0,0,0.45]}>
            <cylinderGeometry args={[0.015,0.01,0.28,6]} /><meshStandardMaterial color={LEG_COLOR} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[lx*1.45,-gc-0.18,lz*1.45]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color={WHEEL_COLOR} metalness={0.7} /></mesh>
        </group>
      })}
      <mesh position={[bR*0.58,0.08,0]}><boxGeometry args={[0.12,0.1,0.12]} /><meshStandardMaterial color="#0d1b3e" roughness={0.4} /></mesh>
      <mesh position={[bR*0.67,0.08,0]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.02,0.02,0.016,12]} /><meshStandardMaterial color="#1565c0" metalness={0.9} emissive="#1565c0" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

function OmniRobot({ p }) {
  const {length:L, width:W, wheelBase:wb, trackWidth:tw, groundClearance:gc}=p, wR=0.1
  return (
    <group position={[0,gc+wR,0]}>
      <mesh castShadow><boxGeometry args={[L,0.13,W]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0,0.1,0]}><cylinderGeometry args={[Math.min(L,W)*0.38,Math.min(L,W)*0.38,0.12,12]} /><meshStandardMaterial color={BODY_COLOR} metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0,0.18,0]}><cylinderGeometry args={[0.05,0.05,0.07,16]} /><meshStandardMaterial color="#111" metalness={0.7} /></mesh>
      {[[-wb/2,0,-tw/2],[-wb/2,0,tw/2],[wb/2,0,-tw/2],[wb/2,0,tw/2]].map((pos,i)=>(
        <MecanumWheel key={i} pos={[pos[0],-gc-wR+0.01,pos[2]]} r={wR} w={0.07} />
      ))}
    </group>
  )
}

function ProceduralModel({ robotId, params }) {
  switch (robotId) {
    case 'wheel_4wd':      return <Wheel4WD    p={params} />
    case 'wheel_6wd':      return <Wheel6WD    p={params} />
    case 'tracked_rubber': return <SemiTracked p={params} />
    case 'tracked':        return <FullTracked p={params} />
    case 'legged_4':       return <Quadruped   p={params} />
    case 'omni':           return <OmniRobot   p={params} />
    default:               return <Wheel4WD    p={params} />
  }
}

// ── STL-загрузчик с авто-фолбэком ────────────────────────────────
function STLWithFallback({ robotId, params, color }) {
  const stlPath = getStlUrl(robotId)
  const Fallback = <ProceduralModel robotId={robotId} params={params} />

  if (!stlPath) return Fallback

  return (
    <STLErrorBoundary fallback={Fallback}>
      <Suspense fallback={Fallback}>
        <STLMesh url={stlPath} params={params} color={color} />
      </Suspense>
    </STLErrorBoundary>
  )
}

// ── Авто-вращение ─────────────────────────────────────────────────
function AutoRotateGroup({ children, autoRotate }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (autoRotate && ref.current) ref.current.rotation.y += dt * 0.28
  })
  return <group ref={ref}>{children}</group>
}

// ── Главный компонент ─────────────────────────────────────────────
export default function RobotViewer3D({ robotId, params, color = '#1e3a5f', stlUrl, autoRotate = true }) {
  // stlUrl — если пользователь загрузил свой STL (переопределяет авто)
  const finalColor = color

  return (
    <Canvas
      camera={{ position: [2.5, 2.4, 2.5], fov: 46 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#1a2744' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1} shadow-camera-far={20}
        shadow-camera-left={-3} shadow-camera-right={3}
        shadow-camera-top={3}   shadow-camera-bottom={-3}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.8} color="#d0e8ff" />
      <pointLight position={[0, 5, 0]} intensity={0.9} color="#ffffff" />
      <hemisphereLight skyColor="#d0e8ff" groundColor="#223355" intensity={0.5} />

      <AutoRotateGroup autoRotate={autoRotate}>
        {stlUrl ? (
          // Пользовательский STL — приоритет
          <STLErrorBoundary fallback={<ProceduralModel robotId={robotId} params={params} />}>
            <Suspense fallback={<ProceduralModel robotId={robotId} params={params} />}>
              <STLMesh url={stlUrl} params={params} color={finalColor} />
            </Suspense>
          </STLErrorBoundary>
        ) : (
          // Авто-загрузка STL из /models/ или процедурная
          <STLWithFallback robotId={robotId} params={params} color={finalColor} />
        )}
      </AutoRotateGroup>

      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={5} blur={2} far={2} color="#000033" />

      {/* Пол — светлее */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1e2e4a" roughness={0.9} />
      </mesh>
      {Array.from({length:14},(_,i)=>(
        <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[(i-7)*0.38, 0.002, 0]}>
          <planeGeometry args={[0.04, 10]} />
          <meshStandardMaterial color="#162240" />
        </mesh>
      ))}

      <OrbitControls enableDamping dampingFactor={0.08} minDistance={0.8} maxDistance={7} />
    </Canvas>
  )
}
