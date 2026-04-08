// Переиспользуемые UI-компоненты

export function GroupBox({ title, children, color = '#9ccc65' }) {
  return (
    <div style={{ border: '1px solid #2e2e2e', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10, borderBottom: '1px solid #2e2e2e', paddingBottom: 5 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
        <span style={{ color: '#4caf50', fontWeight: 700, fontSize: 11 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  )
}

export function NumberInput({ label, value, min, max, step = 1, unit, onChange, width = 100 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 9 }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width, background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 4, padding: '3px 6px', fontSize: 11 }} />
        {unit && <span style={{ color: '#555', fontSize: 10, whiteSpace: 'nowrap' }}>{unit}</span>}
      </div>
    </div>
  )
}

export function Select({ label, value, options, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 9 }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
      <span style={{ color: '#888', fontSize: 11 }}>{label}</span>
      <div onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 10, background: value ? '#4caf50' : '#333', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left .2s' }} />
      </div>
    </div>
  )
}

export function Btn({ children, onClick, color = 'green', disabled, style }) {
  const colors = {
    green:  { bg: '#4caf50', hover: '#45a049' },
    blue:   { bg: '#2196f3', hover: '#1976d2' },
    orange: { bg: '#ff9800', hover: '#f57c00' },
    red:    { bg: '#f44336', hover: '#d32f2f' },
    ghost:  { bg: '#333',    hover: '#444'    },
  }
  const c = colors[color] || colors.green
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 5, border: 'none', fontWeight: 600, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#333' : c.bg, color: disabled ? '#666' : '#fff', transition: 'background .15s', ...style }}>
      {children}
    </button>
  )
}

export function StatCard({ label, value, unit, color = '#4caf50', icon }) {
  return (
    <div style={{ background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 120 }}>
      <div style={{ color: '#666', fontSize: 10, marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{unit}</div>
    </div>
  )
}

export function Badge({ children, color = '#4caf50' }) {
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
      {children}
    </span>
  )
}

export function SectionTitle({ children }) {
  return (
    <div style={{ color: '#9ccc65', fontWeight: 700, fontSize: 12, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #2a2a2a' }}>
      {children}
    </div>
  )
}
