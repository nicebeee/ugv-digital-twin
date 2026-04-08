// ─────────────────────────────────────────────────────────────────
// Каталог модулей / компонентов для сборки UGV
// priceMin/Max — USD, weightKg — кг, powerW — потребляемая мощность Вт
// ─────────────────────────────────────────────────────────────────

export const MODULE_CATEGORIES = [
  { id: 'chassis',  label: 'Шасси',        icon: '🏗' },
  { id: 'drive',    label: 'Привод',        icon: '⚙' },
  { id: 'nav',      label: 'Навигация',     icon: '📡' },
  { id: 'sensors',  label: 'Сенсоры',       icon: '👁' },
  { id: 'compute',  label: 'Вычисления',    icon: '💻' },
  { id: 'power',    label: 'Энергетика',    icon: '🔋' },
  { id: 'comms',    label: 'Связь',         icon: '📶' },
  { id: 'misc',     label: 'Прочее',        icon: '🔧' },
]

export const MODULES = [
  // ── ШАССИ ───────────────────────────────────────────────────────
  { id: 'frame_alu',      cat: 'chassis',  label: 'Рама алюминиевая',          priceMin: 150,  priceMax: 400,  weightKg: 1.8, powerW: 0,   icon: '🔩', desc: 'Сварная рама из аллюминиевого профиля 40×40 мм' },
  { id: 'frame_steel',    cat: 'chassis',  label: 'Рама стальная',             priceMin: 100,  priceMax: 250,  weightKg: 3.2, powerW: 0,   icon: '🔩', desc: 'Сварная рама из стальной профильной трубы' },
  { id: 'wheels_set',     cat: 'chassis',  label: 'Колёса пневматические ×4',  priceMin: 60,   priceMax: 150,  weightKg: 4.0, powerW: 0,   icon: '🛞', desc: 'Пневматические колёса 10" с шиповым протектором' },
  { id: 'wheels_omni',    cat: 'chassis',  label: 'Меканум-колёса ×4',         priceMin: 120,  priceMax: 300,  weightKg: 3.2, powerW: 0,   icon: '🛞', desc: 'Всенаправленные роликовые колёса 8"' },
  { id: 'tracks_rubber',  cat: 'chassis',  label: 'Гусеницы резиновые',        priceMin: 200,  priceMax: 500,  weightKg: 5.5, powerW: 0,   icon: '🎗', desc: 'Резиновые гусеничные ленты с грунтозацепами' },
  { id: 'tracks_metal',   cat: 'chassis',  label: 'Гусеницы металлические',    priceMin: 350,  priceMax: 900,  weightKg: 8.0, powerW: 0,   icon: '⛓', desc: 'Стальные гусеницы со сменными башмаками' },
  { id: 'legs_kit',       cat: 'chassis',  label: 'Комплект шагающих ног ×4',  priceMin: 800,  priceMax: 2500, weightKg: 3.0, powerW: 0,   icon: '🦿', desc: 'Сервоприводные ноги 3-DOF для сложного рельефа' },
  { id: 'suspension',     cat: 'chassis',  label: 'Независимая подвеска',      priceMin: 120,  priceMax: 400,  weightKg: 2.5, powerW: 0,   icon: '🔧', desc: 'Двойные поперечные рычаги, ход 60 мм' },

  // ── ПРИВОД ──────────────────────────────────────────────────────
  { id: 'motor_bldc',     cat: 'drive',    label: 'Мотор BLDC 500 Вт',         priceMin: 80,   priceMax: 200,  weightKg: 0.8, powerW: 500,  icon: '⚡', desc: 'Бесщёточный двигатель постоянного тока 24–48 В' },
  { id: 'motor_bldc_1k',  cat: 'drive',    label: 'Мотор BLDC 1 кВт',          priceMin: 150,  priceMax: 350,  weightKg: 1.2, powerW: 1000, icon: '⚡', desc: 'Высокомощный BLDC для тяжёлых платформ' },
  { id: 'servo_leg',      cat: 'drive',    label: 'Серво-привод ноги 40 кг·см',priceMin: 60,   priceMax: 150,  weightKg: 0.25,powerW: 25,   icon: '⚙', desc: 'Цифровой сервопривод DS3235 для шагающих платформ' },
  { id: 'esc_50a',        cat: 'drive',    label: 'ESC контроллер 50 А',       priceMin: 30,   priceMax: 100,  weightKg: 0.1, powerW: 3,    icon: '🖥', desc: 'Регулятор скорости BLDC с тормозом и реверсом' },
  { id: 'esc_100a',       cat: 'drive',    label: 'ESC контроллер 100 А',      priceMin: 70,   priceMax: 180,  weightKg: 0.15,powerW: 5,    icon: '🖥', desc: 'Мощный ESC для токов до 100 А пиковых' },
  { id: 'gearbox',        cat: 'drive',    label: 'Редуктор планетарный i=20', priceMin: 40,   priceMax: 100,  weightKg: 0.3, powerW: 0,    icon: '⚙', desc: 'Планетарный редуктор i=20, КПД 95%' },

  // ── НАВИГАЦИЯ ────────────────────────────────────────────────────
  { id: 'rtk_gnss',       cat: 'nav',      label: 'RTK-GNSS модуль',           priceMin: 500,  priceMax: 2000, weightKg: 0.2, powerW: 3,    icon: '📡', desc: 'Дифференциальный GPS/ГЛОНАСС, точность ±2 см' },
  { id: 'gps_basic',      cat: 'nav',      label: 'GPS/GNSS базовый',          priceMin: 50,   priceMax: 300,  weightKg: 0.1, powerW: 1,    icon: '📍', desc: 'Спутниковый приёмник u-blox M9N, точность ±1 м' },
  { id: 'imu',            cat: 'nav',      label: 'IMU 9DOF',                  priceMin: 10,   priceMax: 100,  weightKg: 0.02,powerW: 0.5,  icon: '🎯', desc: 'Акселерометр + гироскоп + магнитометр ICM-42688' },
  { id: 'compass',        cat: 'nav',      label: 'Магнитный компас',          priceMin: 8,    priceMax: 40,   weightKg: 0.01,powerW: 0.2,  icon: '🧭', desc: 'Цифровой компас HMC5983 с компенсацией наклона' },

  // ── СЕНСОРЫ ──────────────────────────────────────────────────────
  { id: 'lidar_2d',       cat: 'sensors',  label: 'LiDAR 2D (360°)',           priceMin: 500,  priceMax: 3000, weightKg: 0.3, powerW: 8,    icon: '🔴', desc: 'Лазерный дальномер RPLiDAR A3, 25 м, 16 000 т/с' },
  { id: 'lidar_3d',       cat: 'sensors',  label: 'LiDAR 3D',                  priceMin: 3000, priceMax: 30000,weightKg: 0.8, powerW: 15,   icon: '🔴', desc: 'Velodyne VLP-16, 100 м, 300 000 точек/с' },
  { id: 'cam_rgb',        cat: 'sensors',  label: 'RGB-камера HD',             priceMin: 40,   priceMax: 200,  weightKg: 0.1, powerW: 3,    icon: '📷', desc: 'Модуль камеры Sony IMX219, 8 МПикс, 120° FOV' },
  { id: 'cam_stereo',     cat: 'sensors',  label: 'Стереокамера',              priceMin: 150,  priceMax: 600,  weightKg: 0.2, powerW: 4,    icon: '📷', desc: 'Intel RealSense D435i, глубина до 10 м' },
  { id: 'cam_multispect', cat: 'sensors',  label: 'Мультиспектральная камера', priceMin: 2000, priceMax: 10000,weightKg: 0.3, powerW: 6,    icon: '🌈', desc: 'MicaSense RedEdge-MX, NDVI / NDRE, 5 каналов' },
  { id: 'cam_thermal',    cat: 'sensors',  label: 'Тепловизионная камера',     priceMin: 300,  priceMax: 3000, weightKg: 0.2, powerW: 5,    icon: '🌡', desc: 'FLIR Lepton 3.5, 160×120 пикс, -20…+150 °C' },
  { id: 'ultrasonic',     cat: 'sensors',  label: 'УЗ-датчики препятствий ×4', priceMin: 20,   priceMax: 80,   weightKg: 0.1, powerW: 2,    icon: '〰', desc: 'HC-SR04, дальность 0.02–4 м, угол 15°' },
  { id: 'ir_sensors',     cat: 'sensors',  label: 'ИК-датчики ×4',            priceMin: 10,   priceMax: 60,   weightKg: 0.08,powerW: 1,    icon: '🔆', desc: 'GP2Y0A21, аналоговые, 10–80 см' },
  { id: 'soil_sensor',    cat: 'sensors',  label: 'Датчик влажности почвы',    priceMin: 15,   priceMax: 80,   weightKg: 0.05,powerW: 0.5,  icon: '🌱', desc: 'Ёмкостной датчик влажности и температуры почвы' },

  // ── ВЫЧИСЛЕНИЯ ───────────────────────────────────────────────────
  { id: 'pixhawk',        cat: 'compute',  label: 'Pixhawk 6C',                priceMin: 250,  priceMax: 400,  weightKg: 0.07,powerW: 3,    icon: '🖥', desc: 'Автопилот с двойным резервированием, 400 МГц Cortex-M7' },
  { id: 'rpi5',           cat: 'compute',  label: 'Raspberry Pi 5',            priceMin: 80,   priceMax: 120,  weightKg: 0.05,powerW: 8,    icon: '💻', desc: '4-ядерный ARM Cortex-A76 2.4 ГГц, 8 ГБ RAM' },
  { id: 'jetson_nano',    cat: 'compute',  label: 'NVIDIA Jetson Nano',        priceMin: 150,  priceMax: 500,  weightKg: 0.14,powerW: 10,   icon: '🤖', desc: '128-ядерный GPU Maxwell + 4-ядра CPU, 4 ГБ RAM' },
  { id: 'jetson_orin',    cat: 'compute',  label: 'NVIDIA Jetson Orin NX',     priceMin: 500,  priceMax: 2000, weightKg: 0.2, powerW: 20,   icon: '🤖', desc: '1024-ядра Ampere GPU, 100 TOPS AI, 16 ГБ RAM' },
  { id: 'arduino',        cat: 'compute',  label: 'Arduino Mega (I/O-хаб)',    priceMin: 10,   priceMax: 40,   weightKg: 0.04,powerW: 1,    icon: '🔌', desc: 'Управление периферией, 54 цифровых I/O' },

  // ── ЭНЕРГЕТИКА ───────────────────────────────────────────────────
  { id: 'cell_liion',     cat: 'power',    label: 'Ячейка Li-Ion 18650 (3.7В)', priceMin: 4,   priceMax: 8,    weightKg: 0.047,powerW: 0,   icon: '🔋', desc: 'Samsung INR18650-35E, 3500 мАч, C_max=8A' },
  { id: 'bms',            cat: 'power',    label: 'BMS контроллер',            priceMin: 20,   priceMax: 150,  weightKg: 0.1, powerW: 2,    icon: '🛡', desc: 'Защита от перезаряда, переразряда, КЗ, балансировка' },
  { id: 'charger',        cat: 'power',    label: 'Зарядное устройство 10А',   priceMin: 50,   priceMax: 200,  weightKg: 0.5, powerW: 0,    icon: '🔌', desc: 'Умное зарядное CC/CV, 0.1–10А, 12–60В' },
  { id: 'solar_panel',    cat: 'power',    label: 'Солнечная панель 50 Вт',    priceMin: 40,   priceMax: 120,  weightKg: 0.6, powerW: -50,  icon: '☀', desc: 'Монокристаллическая, КПД 22%, 50 Вт' },
  { id: 'pdb',            cat: 'power',    label: 'Плата распределения питания',priceMin: 15,  priceMax: 60,   weightKg: 0.08,powerW: 1,    icon: '⚡', desc: 'PDB с защитой 5V/12V BEC, токовые шунты' },

  // ── СВЯЗЬ ────────────────────────────────────────────────────────
  { id: 'radio_rc',       cat: 'comms',    label: 'Радиомодуль RC 915 МГц',    priceMin: 20,   priceMax: 100,  weightKg: 0.05,powerW: 1,    icon: '📻', desc: 'SiK Telemetry Radio 915 МГц, до 300 м' },
  { id: 'lora',           cat: 'comms',    label: 'LoRa модем 915 МГц',        priceMin: 30,   priceMax: 150,  weightKg: 0.03,powerW: 0.5,  icon: '📡', desc: 'LoRa SX1276, до 15 км, скорость до 250 кбит/с' },
  { id: 'wifi',           cat: 'comms',    label: 'Wi-Fi / Bluetooth модуль',  priceMin: 10,   priceMax: 50,   weightKg: 0.02,powerW: 1,    icon: '📶', desc: 'ESP32-WROVER, 2.4/5 ГГц Wi-Fi + BT 5.0' },
  { id: 'lte_4g',         cat: 'comms',    label: '4G/LTE модем',              priceMin: 60,   priceMax: 200,  weightKg: 0.05,powerW: 2,    icon: '📱', desc: 'Quectel EC25, LTE Cat.4, 150/50 Мбит/с' },
  { id: 'gcs',            cat: 'comms',    label: 'Наземная станция (GCS)',     priceMin: 200,  priceMax: 800,  weightKg: 1.5, powerW: 0,    icon: '🖥', desc: 'Портативная GCS с планшетом и джойстиком' },

  // ── ПРОЧЕЕ ───────────────────────────────────────────────────────
  { id: 'cables',         cat: 'misc',     label: 'Кабели и разъёмы',          priceMin: 10,   priceMax: 100,  weightKg: 0.3, powerW: 0,    icon: '🔌', desc: 'Силовые XT60, XT90, сигнальные JST, AWG16/18' },
  { id: 'enclosure',      cat: 'misc',     label: 'Корпус / крепления',        priceMin: 20,   priceMax: 200,  weightKg: 0.8, powerW: 0,    icon: '📦', desc: 'Водозащищённый корпус IP65, крепёж M3/M4' },
  { id: 'sdcard',         cat: 'misc',     label: 'SD-карта / SSD 256 ГБ',     priceMin: 10,   priceMax: 60,   weightKg: 0.01,powerW: 0.3,  icon: '💾', desc: 'Samsung PRO Endurance, для непрерывной записи' },
  { id: 'tools',          cat: 'misc',     label: 'Набор инструментов',        priceMin: 30,   priceMax: 150,  weightKg: 1.0, powerW: 0,    icon: '🔧', desc: 'Паяльник, мультиметр, отвёртки, термоусадка' },
  { id: 'cooling',        cat: 'misc',     label: 'Система охлаждения',        priceMin: 15,   priceMax: 80,   weightKg: 0.2, powerW: 3,    icon: '❄', desc: 'Активное охлаждение CPU/ESC, вентиляторы 40 мм' },
]

// ── Стандартная комплектация по типу платформы ────────────────────
export const DEFAULT_KITS = {
  wheel_4wd:       ['frame_alu','wheels_set','motor_bldc','esc_50a','gearbox','rtk_gnss','imu','lidar_2d','cam_rgb','pixhawk','rpi5','cell_liion','bms','radio_rc','wifi','cables','enclosure'],
  wheel_6wd:       ['frame_alu','wheels_set','motor_bldc','esc_50a','gearbox','suspension','rtk_gnss','imu','lidar_2d','cam_rgb','cam_stereo','pixhawk','rpi5','cell_liion','bms','radio_rc','wifi','cables','enclosure'],
  tracked_rubber:  ['frame_steel','tracks_rubber','motor_bldc_1k','esc_100a','gearbox','rtk_gnss','imu','lidar_2d','cam_rgb','pixhawk','rpi5','cell_liion','bms','radio_rc','cables','enclosure'],
  tracked:         ['frame_steel','tracks_metal','motor_bldc_1k','esc_100a','gearbox','rtk_gnss','imu','lidar_3d','cam_rgb','cam_thermal','pixhawk','jetson_nano','cell_liion','bms','radio_rc','lora','cables','enclosure'],
  legged_4:        ['frame_alu','legs_kit','servo_leg','pixhawk','jetson_orin','rtk_gnss','imu','lidar_2d','cam_stereo','cell_liion','bms','wifi','lora','cables','enclosure'],
  omni:            ['frame_alu','wheels_omni','motor_bldc','esc_50a','rtk_gnss','imu','ultrasonic','cam_rgb','cam_stereo','pixhawk','rpi5','cell_liion','bms','wifi','cables','enclosure'],
}
