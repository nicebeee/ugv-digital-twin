import { useState, useCallback } from 'react'
import { DEFAULT_PARAMS } from './core/defaults'
import { MODULES, DEFAULT_KITS } from './data/modules'
import PlatformTab     from './tabs/PlatformTab'
import AnalysisTab     from './tabs/AnalysisTab'
import EconomicsTab    from './tabs/EconomicsTab'
import ConfiguratorTab from './tabs/ConfiguratorTab'

const TABS = [
  { id: 'platform',     icon: '🤖', label: 'Платформы'     },
  { id: 'analysis',     icon: '📈', label: 'Эффективность'  },
  { id: 'economics',    icon: '💰', label: 'Экономика'      },
  { id: 'configurator', icon: '🔧', label: 'Конфигуратор'   },
]

const C = {
  bg:     '#1a2035',
  bg2:    '#1f2a42',
  border: '#2e4060',
  accent: '#4fc3f7',
  text:   '#d8e4f0',
  text2:  '#8aaac8',
  text3:  '#5a7a9a',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('platform')
  const [params, setParams] = useState(DEFAULT_PARAMS)

  // Поднимаем state модулей наверх — нужен в Конфигураторе и Экономике
  const [selectedMods, setSelectedMods] = useState(
    () => new Set(DEFAULT_KITS[DEFAULT_PARAMS.robotType] || [])
  )
  const [modPrices, setModPrices] = useState(
    () => Object.fromEntries(MODULES.map(m => [m.id, Math.round((m.priceMin + m.priceMax) / 2)]))
  )

  const setParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  const sharedProps = { params, setParam, selectedMods, setSelectedMods, modPrices, setModPrices }

  const renderTab = () => {
    switch (activeTab) {
      case 'platform':     return <PlatformTab     {...sharedProps} />
      case 'analysis':     return <AnalysisTab      {...sharedProps} />
      case 'economics':    return <EconomicsTab     {...sharedProps} />
      case 'configurator': return <ConfiguratorTab  {...sharedProps} />
      default: return null
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background: C.bg }}>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom:`1px solid ${C.border}`,
        padding:'6px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <span style={{ fontSize:20 }}>🚜</span>
        <div>
          <div style={{ color: C.accent, fontWeight:700, fontSize:14, lineHeight:1 }}>UGV Digital Twin</div>
          <div style={{ color: C.text3, fontSize:10 }}>Цифровой двойник сельскохозяйственного робота</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:20, alignItems:'center' }}>
          <Badge label="Платформа" value={params.robotType}  />
          <Badge label="Поле"      value={`${params.fieldWidth}×${params.fieldHeight} м`} />
          <Badge label="АКБ"       value={`${params.batteryCapacity} Вт·ч`} />
          <Badge label="Модулей"   value={selectedMods.size} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Sidebar */}
        <div style={{ width:136, background: C.bg2, borderRight:`1px solid ${C.border}`,
          display:'flex', flexDirection:'column', padding:'8px 0', flexShrink:0 }}>
          {TABS.map(t => {
            const active = activeTab === t.id
            return (
              <div key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding:'12px 14px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:9,
                borderLeft:`3px solid ${active ? C.accent : 'transparent'}`,
                background: active ? '#243050' : 'transparent',
                color: active ? C.accent : C.text3,
                transition:'all .15s', userSelect:'none',
              }}>
                <span style={{ fontSize:17 }}>{t.icon}</span>
                <span style={{ fontSize:11, fontWeight: active ? 700 : 400 }}>{t.label}</span>
              </div>
            )
          })}
          <div style={{ marginTop:'auto', padding:'8px 14px', borderTop:`1px solid ${C.border}` }}>
            <div style={{ color: C.text3, fontSize:9 }}>v2.0 · 2025</div>
            <div style={{ color: C.text3, fontSize:9, marginTop:2 }}>4 модуля анализа</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'hidden' }}>
          {renderTab()}
        </div>
      </div>
    </div>
  )
}

function Badge({ label, value }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ color: C.text3, fontSize:9 }}>{label}</div>
      <div style={{ color: C.text, fontSize:11, fontWeight:600 }}>{value}</div>
    </div>
  )
}
