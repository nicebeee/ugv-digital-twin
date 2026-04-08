// ─────────────────────────────────────────────────────────────
// Физические модели агро-робота
// Источники: ГОСТ Р ИСО 11684, IEEE RAS Mobile Robotics
// ─────────────────────────────────────────────────────────────
import { MISSION_TYPES } from '../data/missions'

const SOIL_RESISTANCE = { sand: 0.12, loam: 0.18, clay: 0.28, peat: 0.09 }

// ── 1. Тяговое усилие (Н) ─────────────────────────────────
export function tractionForce(p) {
  const g       = 9.81
  const totalM  = p.mass + p.maxPayload * 0.5
  const f       = SOIL_RESISTANCE[p.soilType] || 0.18
  const sinA    = Math.sin((p.slopeDeg * Math.PI) / 180)
  const cosA    = Math.cos((p.slopeDeg * Math.PI) / 180)
  return totalM * g * (f * cosA + sinA)
}

// ── 2. Мощность привода (Вт) ──────────────────────────────
export function drivePower(p) {
  const F = tractionForce(p)
  const v = p.workSpeed / 3.6
  return (F * v) / p.efficiency
}

// ── 3. Ток потребления (А) ────────────────────────────────
export function currentDraw(p) {
  const missionPower = missionExtraPower(p)
  const totalW = drivePower(p) + missionPower
  return totalW / p.batteryVoltage
}

// ── 4. Дополнительная мощность на задание (Вт) ───────────
export function missionExtraPower(p) {
  const mission = MISSION_TYPES.find(m => m.id === p.missionType)
  const coeff   = mission?.powerCoeff || 1.0
  return p.motorPower * 0.15 * coeff
}

// ── 5. Время работы от батареи (ч) ───────────────────────
export function operationTime(p) {
  const I       = currentDraw(p)
  const Ah      = (p.batteryCapacity * 1000) / p.batteryVoltage
  const solarA  = p.solarPanel ? p.solarPower / p.batteryVoltage : 0
  const netI    = Math.max(0.1, I - solarA)
  return Ah / netI
}

// ── 6. Производительность (га/ч) ─────────────────────────
export function productivity(p) {
  const mission = MISSION_TYPES.find(m => m.id === p.missionType)
  const vMax    = Math.min(p.workSpeed, mission?.speedMax || p.workSpeed)
  const B       = p.workWidth * (1 - p.overlap)
  return 0.1 * B * vMax
}

// ── 7. Площадь за цикл (га) ──────────────────────────────
export function areaCovered(p) {
  const T = operationTime(p)
  const W = productivity(p)
  return T * W
}

// ── 8. Давление на почву (кПа) ───────────────────────────
export function groundPressure(p) {
  const g      = 9.81
  const totalM = p.mass + p.maxPayload * 0.5
  // Контактная площадь (приближение)
  const contactArea = p.length * p.width * 0.35 * 1e6  // мм²
  return (totalM * g / contactArea) * 1000
}

// ── 9. Устойчивость (угол опрокидывания, °) ───────────────
export function tipoverAngle(p) {
  const h = (p.groundClearance + 0.3)        // приближение ЦТ по высоте
  const halfTrack = p.trackWidth / 2
  return (Math.atan2(halfTrack, h) * 180) / Math.PI
}

// ── 10. Расход расходника (л/га или кг/га) ────────────────
export function consumableRate(p) {
  const mission = MISSION_TYPES.find(m => m.id === p.missionType)
  if (!mission?.consumable) return 0
  // Нормы внесения — типовые значения
  const rates = {
    'Вода':             3000, // л/га
    'Семена':           5,    // кг/га
    'Луковицы':         500,  // кг/га
    'Клубни':           2000, // кг/га
    'Пестициды':        3,    // л/га
    'Фунгицид':         2,    // л/га
    'NPK-гранулы':      300,  // кг/га
    'Жидкие удобрения': 200,  // л/га
    'Гербицид':         0.1,  // л/га
    'Рассада':          20000,// шт/га
    'Пыльца':           0.5,  // кг/га
    'Вода + удобрения': 500,  // л/га
    'Мульчирующий материал': 5000, // кг/га
    'Реагенты':         1,    // л/га
    'Гель':             50,   // л/га
    'Биоагенты':        1,    // ед/га
    'Топливо / гель':   20,   // л/га
    'Метки / бирки':    20000,// шт/га
  }
  return rates[mission.consumable] || 0
}

// ── 11. Потребление расходника за цикл ───────────────────
export function consumablePerCycle(p) {
  return consumableRate(p) * areaCovered(p)
}

// ── 12. Скорость зарядки / заправки ─────────────────────
export function refillTime(p) {
  return p.chargeTime
}

// ── 13. Точность навигации (м) ───────────────────────────
export function navAccuracyM(p) {
  const acc = { gps: 2.0, rtk: 0.02, lidar: 0.05, vision: 0.1, fusion: 0.02 }
  return acc[p.navSystem] || 0.5
}

// ── Всё сразу ─────────────────────────────────────────────
export function computeAll(p) {
  return {
    tractionF:     tractionForce(p),
    drivePowerW:   drivePower(p),
    currentA:      currentDraw(p),
    operationH:    operationTime(p),
    productivityHa:productivity(p),
    areaCoveredHa: areaCovered(p),
    groundPressKPa:groundPressure(p),
    tipoverDeg:    tipoverAngle(p),
    navAccM:       navAccuracyM(p),
    consumRate:    consumableRate(p),
    consumCycle:   consumablePerCycle(p),
  }
}

// ── Оптимизация: скорость × ширина захвата ────────────────
export function runOptimization(p) {
  const speeds = [1,2,3,4,5,6,7,8,9,10]
  const widths  = [0.3,0.5,0.6,0.8,1.0,1.2,1.5,1.8,2.0,2.5]
  const prodGrid = [], timeGrid = []
  let best = null

  for (const w of widths) {
    const rowP = [], rowT = []
    for (const v of speeds) {
      const pp = { ...p, workWidth: w, workSpeed: v }
      const W  = productivity(pp)
      const T  = operationTime(pp)
      rowP.push(W); rowT.push(T)
      if (!best || W > best.W) best = { v, w, W, T }
    }
    prodGrid.push(rowP)
    timeGrid.push(rowT)
  }
  return { speeds, widths, prodGrid, timeGrid, optimal: best }
}
