import { useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { DEFAULT_PARAMS } from './core/defaults'
import PlatformTab from './tabs/PlatformTab'

// Импортируем картинки чтобы vite-plugin-singlefile их заинлайнил
import imgWheel4wd      from '../public/images/wheel_4wd.png'
import imgWheel6wd      from '../public/images/wheel_6wd.png'
import imgTrackedRubber from '../public/images/tracked_rubber.png'
import imgTracked       from '../public/images/tracked.png'
import imgLegged4       from '../public/images/legged_4.png'
import imgOmni          from '../public/images/omni.png'

// Импортируем упрощённые 3D-модели (2.4 МБ каждая вместо 24 МБ)
import stlWheel4wd      from '../public/models-small/wheel_4wd.stl?url'
import stlWheel6wd      from '../public/models-small/wheel_6wd.stl?url'
import stlTrackedRubber from '../public/models-small/tracked_rubber.stl?url'
import stlTracked       from '../public/models-small/tracked.stl?url'
import stlLegged4       from '../public/models-small/legged_4.stl?url'
import stlOmni          from '../public/models-small/omni.stl?url'

window.__PLATFORM_IMAGES__ = {
  wheel_4wd:      imgWheel4wd,
  wheel_6wd:      imgWheel6wd,
  tracked_rubber: imgTrackedRubber,
  tracked:        imgTracked,
  legged_4:       imgLegged4,
  omni:           imgOmni,
}

window.__STL_URLS__ = {
  wheel_4wd:      stlWheel4wd,
  wheel_6wd:      stlWheel6wd,
  tracked_rubber: stlTrackedRubber,
  tracked:        stlTracked,
  legged_4:       stlLegged4,
  omni:           stlOmni,
}

const C = {
  bg:'#1a2035', bg2:'#1f2a42', border:'#2e4060',
  accent:'#4fc3f7', text:'#d8e4f0', text3:'#5a7a9a',
}

function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const setParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg }}>
      <div style={{ background:C.bg2, borderBottom:`1px solid ${C.border}`,
        padding:'6px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <span style={{ fontSize:20 }}>🚜</span>
        <div>
          <div style={{ color:C.accent, fontWeight:700, fontSize:14, lineHeight:1 }}>UGV Digital Twin</div>
          <div style={{ color:C.text3, fontSize:10 }}>Цифровой двойник сельскохозяйственного робота — Платформы</div>
        </div>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <PlatformTab params={params} setParam={setParam} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
