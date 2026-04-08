import { useState } from 'react'
import { MISSION_TYPES, MISSION_CATEGORIES } from '../data/missions'
import { GroupBox, NumberInput, Select, SectionTitle, Badge } from '../components/UI'
import { PATH_ALGORITHMS } from '../core/defaults'

export default function MissionTab({ params, setParam }) {
  const [catFilter, setCatFilter] = useState('all')

  const filtered = catFilter === 'all'
    ? MISSION_TYPES
    : MISSION_TYPES.filter(m => m.category === catFilter)

  const selected = MISSION_TYPES.find(m => m.id === params.missionType)

  return (
    <div style={{ display: 'flex', height: '100%', gap: 10, overflow: 'hidden' }}>

      {/* Каталог задач */}
      <div style={{ width: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 0 10px 10px' }}>
        <SectionTitle>🌾 Выбор задания / миссии</SectionTitle>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {MISSION_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              style={{ padding: '3px 9px', borderRadius: 12, border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: catFilter === c.id ? 700 : 400,
                background: catFilter === c.id ? '#4caf50' : '#2a2a2a', color: catFilter === c.id ? '#fff' : '#888' }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 4 }}>
          {filtered.map(mission => {
            const isSelected = params.missionType === mission.id
            return (
              <div key={mission.id} onClick={() => setParam('missionType', mission.id)}
                style={{
                  background: isSelected ? '#1a1f2e' : '#1a1a1a',
                  border: `2px solid ${isSelected ? mission.color : '#252525'}`,
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer', transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20, minWidth: 26 }}>{mission.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: isSelected ? mission.color : '#d0d0d0', fontWeight: 700, fontSize: 12 }}>
                      {mission.label}
                    </div>
                    <div style={{ color: '#555', fontSize: 10, marginTop: 1 }}>{mission.desc}</div>
                  </div>
                  {isSelected && <span style={{ color: mission.color }}>✓</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Badge color={mission.color}>{MISSION_CATEGORIES.find(c => c.id === mission.category)?.label}</Badge>
                  <Badge color="#555">⚡ ×{mission.powerCoeff}</Badge>
                  <Badge color="#555">🚗 ≤{mission.speedMax} км/ч</Badge>
                  {mission.consumable && <Badge color="#8d6e63">💧 {mission.consumable}</Badge>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Параметры задания */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 10px 4px' }}>

        {selected && (
          <div style={{ background: '#1a1a1a', border: `1px solid ${selected.color}44`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 32 }}>{selected.icon}</span>
              <div>
                <div style={{ color: selected.color, fontWeight: 700, fontSize: 14 }}>{selected.label}</div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{selected.desc}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Badge color={selected.color}>Инструмент: {selected.tool}</Badge>
                  {selected.consumable && <Badge color="#8d6e63">Расходник: {selected.consumable}</Badge>}
                </div>
              </div>
            </div>
          </div>
        )}

        <GroupBox title="Рабочие параметры">
          <NumberInput label="Рабочая скорость" value={params.workSpeed}  min={0.5} max={15} step={0.5} unit="км/ч" onChange={v => setParam('workSpeed', v)} />
          <NumberInput label="Ширина захвата"   value={params.workWidth}  min={0.1} max={5}  step={0.1}  unit="м"    onChange={v => setParam('workWidth', v)} />
          <NumberInput label="Перекрытие рядов" value={Math.round(params.overlap * 100)} min={0} max={30} step={1} unit="%"
            onChange={v => setParam('overlap', v / 100)} />
          {selected?.consumable && (
            <NumberInput label="Объём бака / ёмкости" value={params.tankCapacity} min={10} max={500} step={10} unit="л / кг"
              onChange={v => setParam('tankCapacity', v)} />
          )}
        </GroupBox>

        <GroupBox title="Параметры поля">
          <NumberInput label="Ширина поля"  value={params.fieldWidth}  min={10} max={500} step={5}  unit="м" onChange={v => setParam('fieldWidth', v)} />
          <NumberInput label="Длина поля"   value={params.fieldHeight} min={10} max={500} step={5}  unit="м" onChange={v => setParam('fieldHeight', v)} />
          <NumberInput label="Шаг рядов"    value={params.rowSpacing}  min={0.2} max={3.0} step={0.1} unit="м" onChange={v => setParam('rowSpacing', v)} />
        </GroupBox>

        <GroupBox title="Алгоритм маршрута">
          <Select label="Алгоритм" value={params.pathAlgorithm}
            options={PATH_ALGORITHMS} onChange={v => setParam('pathAlgorithm', v)} />

          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PATH_ALGORITHMS.map(alg => (
              <div key={alg.value} onClick={() => setParam('pathAlgorithm', alg.value)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${params.pathAlgorithm === alg.value ? '#4caf50' : '#252525'}`,
                  background: params.pathAlgorithm === alg.value ? '#1a2e1a' : '#1a1a1a',
                  color: params.pathAlgorithm === alg.value ? '#4caf50' : '#888',
                  fontSize: 12, fontWeight: params.pathAlgorithm === alg.value ? 700 : 400,
                  textAlign: 'center',
                }}>
                {alg.label}
              </div>
            ))}
          </div>
        </GroupBox>
      </div>
    </div>
  )
}
