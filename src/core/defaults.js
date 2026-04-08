export const DEFAULT_PARAMS = {
  // Платформа
  robotType:       'wheel_4wd',
  wheelBase:       1.2,       // м
  trackWidth:      0.9,       // м
  groundClearance: 0.25,      // м
  mass:            120,       // кг
  maxPayload:      80,        // кг
  length:          1.4,       // м
  width:           0.9,       // м

  // Двигатели
  driveType:        'electric',
  motorType:        'bldc',
  motorPower:       600,       // Вт (один мотор)
  motorTorque:      45,        // Н·м (на колесо)
  motorCount:       4,
  motorRpm:         3000,
  motorEfficiency:  0.85,
  gearRatio:        12,
  efficiency:       0.82,

  // Аккумулятор
  batteryType:      'liion',
  batteryCapacity:  2000,     // Вт·ч
  batteryVoltage:   48,       // В
  batteryDischarge: 1.5,      // C
  batteryCells:     13,       // 13S
  batteryCooling:   false,
  chargeTime:       3,        // ч
  chargeMode:       'cable',
  chargeRate:       500,      // Вт
  solarPanel:       false,
  solarPower:       200,      // Вт
  solarArea:        0.5,      // м²
  solarEfficiency:  0.21,

  // Навигация
  navSystem:         'rtk_gps',
  navAccuracy:       0.02,    // м
  navHz:             10,      // Гц
  gpsAccuracy:       2,       // см
  hasLidar:          true,
  lidarRange:        30,      // м
  hasCamera:         true,
  cameraFov:         110,     // °
  hasUltrasonic:     true,
  ultrasonicRange:   3,       // м
  hasObstacleSensor: true,
  hasStereoCamera:   false,
  hasIMU:            true,
  rtkOnline:         true,
  pathAlgorithm:     'boustrophedon',

  // Связь
  commsRange:  500,   // м
  telemHz:     10,    // Гц
  has4G:       false,
  hasLoRa:     true,
  autoReturn:  true,
  swarmMode:   false,

  // Безопасность
  hasEStop:    true,
  hasFallDet:  false,
  isWaterproof:true,
  maxSlopeDeg: 20,
  tempMin:     -20,
  tempMax:     50,

  // Поле
  fieldWidth:  80,        // м
  fieldHeight: 60,        // м
  rowSpacing:  0.6,       // м
  rowCount:    8,
  obstacles:   [],        // [{x,y,r}]

  // Миссия
  missionType:  'monitoring_visual',
  workSpeed:    5,         // км/ч
  workWidth:    0.8,       // м ширина захвата инструмента
  tankCapacity: 50,        // л
  overlap:      0.1,       // 10% перекрытие рядов

  // Почва
  soilType:    'loam',    // sand | loam | clay | peat
  slopeDeg:    3,         // °
  soilMoisture:22,        // %
}

export const DRIVE_TYPES = [
  { value: 'electric',    label: '⚡ Электрический (BLDC)' },
  { value: 'hydraulic',   label: '🔧 Гидравлический' },
  { value: 'combustion',  label: '🔥 ДВС (бензин/дизель)' },
  { value: 'hybrid',      label: '🔋 Гибридный (ДВС + электро)' },
]

export const NAV_SYSTEMS = [
  { value: 'gps',    label: 'GPS (±1–3 м)' },
  { value: 'rtk',    label: 'RTK GPS (±2 см)' },
  { value: 'lidar',  label: 'LiDAR SLAM' },
  { value: 'vision', label: 'Visual SLAM' },
  { value: 'fusion', label: 'Sensor Fusion (RTK + LiDAR + IMU)' },
]

export const PATH_ALGORITHMS = [
  { value: 'boustrophedon', label: '〰 Змейка (boustrophedon)' },
  { value: 'spiral',        label: '🌀 Спираль' },
  { value: 'contour',       label: '〽 По контуру' },
  { value: 'astar',         label: '⭐ A* (обход препятствий)' },
  { value: 'voronoi',       label: '⬡ Диаграмма Вороного' },
]

export const SOIL_TYPES = [
  { value: 'sand',  label: 'Песчаная' },
  { value: 'loam',  label: 'Суглинок' },
  { value: 'clay',  label: 'Глина' },
  { value: 'peat',  label: 'Торф' },
]
