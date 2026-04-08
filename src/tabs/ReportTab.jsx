import { useState } from 'react'
import { computeAll } from '../core/physics'
import { pathLength, countTurns, planPath } from '../core/pathPlanning'
import { ROBOT_TYPES } from '../data/robots'
import { MISSION_TYPES } from '../data/missions'
import { Btn, SectionTitle } from '../components/UI'

function fmt(v, dec = 2) { return (typeof v === 'number' ? v.toFixed(dec) : v) ?? '—' }

export default function ReportTab({ params }) {
  const [exported, setExported] = useState(false)

  const robot   = ROBOT_TYPES.find(r => r.id === params.robotType)
  const mission = MISSION_TYPES.find(m => m.id === params.missionType)
  const res     = computeAll(params)
  const path    = planPath(params.pathAlgorithm, params.fieldWidth, params.fieldHeight, params.workWidth, params.overlap, params.obstacles || [])
  const pLen    = pathLength(path)
  const pTurns  = countTurns(path)

  const sections = [
    {
      title: '🤖 Платформа',
      rows: [
        ['Тип платформы',    robot?.label || params.robotType],
        ['Тип привода',      params.motorType?.toUpperCase() || '—'],
        ['Масса снаряжённая', `${params.mass} кг`],
        ['Макс. нагрузка',   `${params.maxPayload} кг`],
        ['Длина × Ширина',   `${params.length} × ${params.width} м`],
        ['Колёсная база',    `${params.wheelBase} м`],
        ['Колея',            `${params.trackWidth} м`],
        ['Клиренс',          `${params.groundClearance * 100} см`],
      ],
    },
    {
      title: '⚡ Силовая установка',
      rows: [
        ['Кол-во моторов',     `${params.motorCount} шт`],
        ['Мощность (1 мотор)', `${params.motorPower} Вт`],
        ['Суммарная мощность', `${params.motorCount * params.motorPower} Вт`],
        ['Тип АКБ',            params.batteryType?.toUpperCase() || '—'],
        ['Ёмкость АКБ',        `${params.batteryCapacity} Вт·ч`],
        ['Напряжение',         `${params.batteryVoltage} В`],
        ['Зарядка',            params.chargeMode || '—'],
        ['Мощность зарядки',   `${params.chargeRate} Вт`],
      ],
    },
    {
      title: '📊 Рабочие характеристики (расчёт)',
      rows: [
        ['Тяговое усилие',      `${fmt(res.tractionF, 0)} Н`],
        ['Мощность привода',    `${fmt(res.drivePowerW / 1000)} кВт`],
        ['Ток потребления',     `${fmt(res.currentA, 1)} А`],
        ['Время работы (АКБ)', `${fmt(res.operationH, 1)} ч`],
        ['Производительность',  `${fmt(res.productivityHa)} га/ч`],
        ['Площадь за цикл',    `${fmt(res.areaCoveredHa)} га`],
        ['Давление на почву',  `${fmt(res.groundPressKPa, 1)} кПа`],
        ['Угол опрокидывания', `${fmt(res.tipoverDeg, 1)}°`],
      ],
    },
    {
      title: '🌾 Задание',
      rows: [
        ['Тип задания',         mission?.label || params.missionType],
        ['Инструмент',          mission?.tool || '—'],
        ['Расходник',           mission?.consumable || 'нет'],
        ['Скорость работы',     `${params.workSpeed} км/ч`],
        ['Ширина захвата',      `${params.workWidth} м`],
        ['Перекрытие',          `${Math.round(params.overlap * 100)}%`],
        ['Норма внесения',      res.consumRate ? `${fmt(res.consumRate, 0)} ед/га` : '—'],
        ['Всего за цикл',       res.consumCycle ? `${fmt(res.consumCycle, 0)} ед` : '—'],
      ],
    },
    {
      title: '🗺 Маршрут',
      rows: [
        ['Поле',             `${params.fieldWidth} × ${params.fieldHeight} м`],
        ['Площадь поля',     `${(params.fieldWidth * params.fieldHeight / 10000).toFixed(2)} га`],
        ['Алгоритм',         params.pathAlgorithm],
        ['Длина маршрута',   `${(pLen / 1000).toFixed(2)} км`],
        ['Точек маршрута',   path.length],
        ['Разворотов',       pTurns],
        ['Препятствий',      (params.obstacles || []).length],
      ],
    },
    {
      title: '🧭 Навигация',
      rows: [
        ['Система навигации', params.navSystem],
        ['Точность',          `±${params.navAccuracy || params.gpsAccuracy} м`],
        ['LiDAR',             params.hasLidar ? 'Да' : 'Нет'],
        ['Стерео-камера',     params.hasStereoCamera ? 'Да' : 'Нет'],
        ['IMU',               params.hasIMU ? 'Да' : 'Нет'],
        ['4G/LTE',            params.has4G ? 'Да' : 'Нет'],
        ['LoRa',              params.hasLoRa ? 'Да' : 'Нет'],
        ['Автовозврат',       params.autoReturn ? 'Да' : 'Нет'],
      ],
    },
  ]

  const exportHTML = () => {
    const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const tableRows = sections.flatMap(sec => [
      `<tr><th colspan="2" style="background:#1a3a1a;color:#4caf50;padding:8px 12px;text-align:left;font-size:13px">${sec.title}</th></tr>`,
      ...sec.rows.map(([lbl, val]) =>
        `<tr><td style="color:#888;padding:5px 12px;border-bottom:1px solid #2a2a2a">${lbl}</td><td style="color:#e0e0e0;padding:5px 12px;border-bottom:1px solid #2a2a2a;font-weight:bold">${val}</td></tr>`
      )
    ]).join('')

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>UGV Digital Twin — Отчёт</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background:#0d0d0d; color:#e0e0e0; margin:0; padding:20px; }
  h1 { color:#4caf50; margin-bottom:4px; }
  .subtitle { color:#555; font-size:13px; margin-bottom:20px; }
  table { width:100%; max-width:800px; border-collapse:collapse; background:#1a1a1a; border-radius:8px; overflow:hidden; }
  th,td { text-align:left; }
  .footer { margin-top:20px; color:#333; font-size:11px; }
</style>
</head>
<body>
<h1>🚜 UGV Digital Twin — Технический отчёт</h1>
<div class="subtitle">Сформировано: ${date} | Платформа: ${robot?.label} | Задание: ${mission?.label}</div>
<table><tbody>${tableRows}</tbody></table>
<div class="footer">UGV Digital Twin v1.0 — автоматически сформированный отчёт</div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `ugv_report_${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const exportCSV = () => {
    const rows = sections.flatMap(sec => [
      [`# ${sec.title}`, ''],
      ...sec.rows.map(([lbl, val]) => [lbl, String(val)]),
      ['', ''],
    ])
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `ugv_report_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = {
      generated: new Date().toISOString(),
      params,
      results: res,
      path: { length: pLen, turns: pTurns, points: path.length },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `ugv_params_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadJSON = () => {
    const input = document.createElement('input')
    input.type  = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result)
          alert('Загрузка параметров из JSON в разработке')
        } catch { alert('Ошибка чтения файла') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>

      {/* Заголовок + кнопки */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SectionTitle>📄 Технический отчёт</SectionTitle>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn onClick={exportHTML}  color="green"  >{exported ? '✅ Сохранено!' : '📄 HTML отчёт'}</Btn>
          <Btn onClick={exportCSV}   color="blue"   >📊 CSV</Btn>
          <Btn onClick={exportJSON}  color="orange" >💾 JSON (параметры)</Btn>
          <Btn onClick={loadJSON}    color="ghost"  >📂 Загрузить JSON</Btn>
        </div>
      </div>

      {/* Шапка отчёта */}
      <div style={{ background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 36 }}>{robot?.icon || '🤖'}</span>
        <div>
          <div style={{ color: '#4caf50', fontWeight: 700, fontSize: 16 }}>{robot?.label || '—'}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{mission?.icon} {mission?.label}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4caf50', fontWeight: 700, fontSize: 18 }}>{fmt(res.productivityHa)} га/ч</div>
            <div style={{ color: '#555', fontSize: 10 }}>производительность</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#2196f3', fontWeight: 700, fontSize: 18 }}>{fmt(res.operationH, 1)} ч</div>
            <div style={{ color: '#555', fontSize: 10 }}>автономность</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff9800', fontWeight: 700, fontSize: 18 }}>{fmt(res.areaCoveredHa)} га</div>
            <div style={{ color: '#555', fontSize: 10 }}>за цикл</div>
          </div>
        </div>
      </div>

      {/* Таблицы секций */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sections.map(sec => (
            <div key={sec.title} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#1a2e1a', padding: '6px 12px', color: '#9ccc65', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #252525' }}>
                {sec.title}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <tbody>
                  {sec.rows.map(([lbl, val]) => (
                    <tr key={lbl} style={{ borderBottom: '1px solid #1e1e1e' }}>
                      <td style={{ padding: '4px 12px', color: '#666', width: '55%' }}>{lbl}</td>
                      <td style={{ padding: '4px 12px', color: '#e0e0e0', fontWeight: 700 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Сноска */}
        <div style={{ color: '#333', fontSize: 10, textAlign: 'center', padding: '4px 0' }}>
          UGV Digital Twin v1.0 · Все расчёты приближённые и предназначены для предварительного проектирования
        </div>
      </div>
    </div>
  )
}
