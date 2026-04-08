import { GroupBox, NumberInput, Select, Toggle, SectionTitle, StatCard, Badge } from '../components/UI'

const MOTOR_TYPES = [
  { value: 'bldc',      label: 'BLDC (бесщёточный DC)' },
  { value: 'brushed',   label: 'Щёточный DC' },
  { value: 'stepper',   label: 'Шаговый' },
  { value: 'servo',     label: 'Серво AC' },
  { value: 'hydraulic', label: 'Гидравлика' },
]

const BATTERY_TYPES = [
  { value: 'liion',  label: 'Li-Ion (высокая ёмкость)' },
  { value: 'lipo',   label: 'LiPo (высокая мощность)' },
  { value: 'lifep4', label: 'LiFePO4 (безопасность)' },
  { value: 'lead',   label: 'Свинцово-кислотная' },
  { value: 'nimh',   label: 'NiMH' },
]

const NAV_SYSTEMS = [
  { value: 'rtk_gps',   label: 'RTK-GPS (±2 см)' },
  { value: 'gps',       label: 'GPS (±3 м)' },
  { value: 'lidar',     label: 'LiDAR SLAM (±1 см)' },
  { value: 'visual',    label: 'Visual SLAM' },
  { value: 'imu_wheel', label: 'IMU + одометрия' },
  { value: 'combined',  label: 'Комбинированная' },
]

const CHARGE_MODES = [
  { value: 'cable',    label: 'Кабельная' },
  { value: 'wireless', label: 'Беспроводная (Qi)' },
  { value: 'solar',    label: 'Солнечные панели' },
  { value: 'swap',     label: 'Замена АКБ' },
]

export default function DriveTab({ params, setParam }) {
  // Оценочные расчёты
  const totalPowerW = params.motorPower * params.motorCount
  const maxRangeKm  = ((params.batteryCapacity / totalPowerW) * (params.workSpeed / 3.6) * params.motorEfficiency).toFixed(1)
  const maxTimeH    = ((params.batteryCapacity / totalPowerW) * params.motorEfficiency).toFixed(1)
  const torqueNm    = ((params.motorPower * params.motorEfficiency * 9.55) / (params.motorRpm / 60)).toFixed(0)
  const chargeMins  = Math.round(params.batteryCapacity / params.chargeRate * 60)

  return (
    <div style={{ display: 'flex', height: '100%', gap: 10, overflow: 'hidden' }}>

      {/* Левая колонка */}
      <div style={{ width: 340, overflowY: 'auto', padding: '10px 0 10px 10px' }}>
        <SectionTitle>⚡ Силовая установка</SectionTitle>

        <GroupBox title="Двигатели">
          <Select label="Тип двигателя" value={params.motorType}
            options={MOTOR_TYPES} onChange={v => setParam('motorType', v)} />
          <NumberInput label="Мощность (1 мотор)"  value={params.motorPower}      min={10}   max={5000} step={10}   unit="Вт"    onChange={v => setParam('motorPower', v)} />
          <NumberInput label="Количество моторов"  value={params.motorCount}      min={1}    max={8}    step={1}             onChange={v => setParam('motorCount', v)} />
          <NumberInput label="Номинальные обороты" value={params.motorRpm}        min={100}  max={6000} step={50}   unit="об/мин" onChange={v => setParam('motorRpm', v)} />
          <NumberInput label="КПД трансмиссии"     value={Math.round(params.motorEfficiency*100)} min={50} max={99} step={1} unit="%" onChange={v => setParam('motorEfficiency', v/100)} />
          <NumberInput label="Передаточное число"  value={params.gearRatio}       min={1}    max={50}   step={0.5}           onChange={v => setParam('gearRatio', v)} />
        </GroupBox>

        <GroupBox title="Аккумулятор">
          <Select label="Тип АКБ" value={params.batteryType}
            options={BATTERY_TYPES} onChange={v => setParam('batteryType', v)} />
          <NumberInput label="Ёмкость"          value={params.batteryCapacity}  min={100}  max={20000} step={100}  unit="Вт·ч"  onChange={v => setParam('batteryCapacity', v)} />
          <NumberInput label="Напряжение"        value={params.batteryVoltage}   min={12}   max={96}    step={4}    unit="В"     onChange={v => setParam('batteryVoltage', v)} />
          <NumberInput label="Ток разряда"       value={params.batteryDischarge} min={1}    max={10}    step={0.5}  unit="C"     onChange={v => setParam('batteryDischarge', v)} />
          <NumberInput label="Число ячеек"       value={params.batteryCells}     min={3}    max={28}    step={1}    unit="S"     onChange={v => setParam('batteryCells', v)} />
          <Toggle label="Активное охлаждение АКБ" value={params.batteryCooling} onChange={v => setParam('batteryCooling', v)} />
        </GroupBox>

        <GroupBox title="Зарядка">
          <Select label="Режим зарядки" value={params.chargeMode}
            options={CHARGE_MODES} onChange={v => setParam('chargeMode', v)} />
          <NumberInput label="Мощность зарядки"    value={params.chargeRate}    min={100}  max={5000} step={100}  unit="Вт"    onChange={v => setParam('chargeRate', v)} />
          {params.chargeMode === 'solar' && (
            <NumberInput label="Площадь панелей"   value={params.solarArea}     min={0.1}  max={4.0}  step={0.1}  unit="м²"    onChange={v => setParam('solarArea', v)} />
          )}
          {params.chargeMode === 'solar' && (
            <NumberInput label="КПД панелей"       value={Math.round(params.solarEfficiency*100)} min={10} max={25} step={1} unit="%" onChange={v => setParam('solarEfficiency', v/100)} />
          )}
        </GroupBox>
      </div>

      {/* Правая колонка */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 10px 0' }}>
        <SectionTitle>🧭 Навигация и управление</SectionTitle>

        <GroupBox title="Система навигации">
          <Select label="Навигационная система" value={params.navSystem}
            options={NAV_SYSTEMS} onChange={v => setParam('navSystem', v)} />
          <NumberInput label="Точность позиции" value={params.navAccuracy}  min={0.01} max={500} step={0.01} unit="м"   onChange={v => setParam('navAccuracy', v)} />
          <NumberInput label="Частота обновления" value={params.navHz}      min={1}    max={100} step={1}    unit="Гц"   onChange={v => setParam('navHz', v)} />
          <Toggle label="Датчик препятствий (LiDAR/Sonar)" value={params.hasObstacleSensor} onChange={v => setParam('hasObstacleSensor', v)} />
          <Toggle label="Стереокамера"     value={params.hasStereoCamera}   onChange={v => setParam('hasStereoCamera', v)} />
          <Toggle label="IMU (гироскоп)"  value={params.hasIMU}             onChange={v => setParam('hasIMU', v)} />
          <Toggle label="RTK-база онлайн" value={params.rtkOnline}          onChange={v => setParam('rtkOnline', v)} />
        </GroupBox>

        <GroupBox title="Управление и связь">
          <NumberInput label="Дальность связи"    value={params.commsRange}  min={50}   max={5000} step={50}   unit="м"   onChange={v => setParam('commsRange', v)} />
          <NumberInput label="Частота телеметрии" value={params.telemHz}     min={1}    max={50}   step={1}    unit="Гц"  onChange={v => setParam('telemHz', v)} />
          <Toggle label="4G/LTE модуль"           value={params.has4G}       onChange={v => setParam('has4G', v)} />
          <Toggle label="LoRa резервный канал"    value={params.hasLoRa}     onChange={v => setParam('hasLoRa', v)} />
          <Toggle label="Автовозврат на базу"     value={params.autoReturn}  onChange={v => setParam('autoReturn', v)} />
          <Toggle label="Роевой режим (Multi-UGV)" value={params.swarmMode} onChange={v => setParam('swarmMode', v)} />
        </GroupBox>

        <GroupBox title="Безопасность">
          <Toggle label="Аварийная остановка (E-Stop)" value={params.hasEStop}   onChange={v => setParam('hasEStop', v)} />
          <Toggle label="Детектор падения"           value={params.hasFallDet}   onChange={v => setParam('hasFallDet', v)} />
          <Toggle label="Водозащита IP65+"           value={params.isWaterproof} onChange={v => setParam('isWaterproof', v)} />
          <NumberInput label="Макс. уклон работы"   value={params.maxSlopeDeg} min={5} max={45} step={1} unit="°" onChange={v => setParam('maxSlopeDeg', v)} />
          <NumberInput label="Темп. диапазон (мин)" value={params.tempMin}     min={-30} max={0}   step={5} unit="°C" onChange={v => setParam('tempMin', v)} />
          <NumberInput label="Темп. диапазон (макс)" value={params.tempMax}    min={30}  max={60}  step={5} unit="°C" onChange={v => setParam('tempMax', v)} />
        </GroupBox>

        {/* Ключевые показатели */}
        <div style={{ padding: '4px 0' }}>
          <div style={{ color: '#9ccc65', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 10 }}>📈 Расчётные показатели</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatCard icon="⚡" label="Суммарная мощность" value={totalPowerW} unit="Вт" />
            <StatCard icon="🔋" label="Дальность (расч.)" value={`${maxRangeKm} км`} unit="без заряда" />
            <StatCard icon="⏱" label="Время работы" value={`${maxTimeH} ч`} unit="расчётное" />
            <StatCard icon="🔩" label="Макс. момент" value={`${torqueNm} Н·м`} unit="суммарный" />
            <StatCard icon="⚡" label="Время зарядки" value={`${chargeMins} мин`} unit="до 100%" />
          </div>
        </div>

        {/* Визуализация батареи */}
        <div style={{ marginTop: 12, background: '#1a1a1a', borderRadius: 8, padding: '10px 14px', border: '1px solid #252525' }}>
          <div style={{ color: '#666', fontSize: 10, marginBottom: 8 }}>Распределение мощности</div>
          {[
            { label: 'Движение',      pct: 60, color: '#4caf50' },
            { label: 'Навигация',     pct: 10, color: '#2196f3' },
            { label: 'Рабочий орган', pct: 25, color: '#ff9800' },
            { label: 'Прочее',        pct: 5,  color: '#9e9e9e' },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#888', fontSize: 10 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: 10, fontWeight: 700 }}>{row.pct}%</span>
              </div>
              <div style={{ height: 5, background: '#222', borderRadius: 3 }}>
                <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
