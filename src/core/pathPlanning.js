// ─────────────────────────────────────────────────────────────────
// Алгоритмы планирования маршрутов
// Все алгоритмы возвращают плотный массив точек без «прыжков»
// ─────────────────────────────────────────────────────────────────

// Интерполяция отрезка: добавляет промежуточные точки
// так что максимальный шаг между соседними точками ≤ res
function interp(a, b, res) {
  const dx   = b.x - a.x, dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1e-6) return []
  const n    = Math.max(1, Math.ceil(dist / res))
  const pts  = []
  for (let i = 1; i <= n; i++) {
    pts.push({ x: a.x + dx * i / n, y: a.y + dy * i / n })
  }
  return pts
}

// Превращает массив «узловых» точек в плотный полилайн с шагом res
function densify(raw, res) {
  if (raw.length === 0) return []
  const out = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    out.push(...interp(raw[i - 1], raw[i], res))
  }
  return out
}

// ── 1. Змейка (boustrophedon) ─────────────────────────────────────
// Классическое покрытие: полосы слева → направо, затем назад.
// Разворот добавляется явной точкой у поворотной полосы.
export function boustrophedon(fieldW, fieldH, workWidth, overlap = 0.1) {
  const step = workWidth * (1 - overlap)
  const res  = Math.min(step * 0.4, 1.0)
  const raw  = []

  let x    = workWidth / 2
  let down = true

  while (x <= fieldW - workWidth / 2 + 1e-6) {
    const y0 = down ? 0      : fieldH
    const y1 = down ? fieldH : 0
    raw.push({ x, y: y0 })
    raw.push({ x, y: y1 })

    const nx = x + step
    if (nx <= fieldW - workWidth / 2 + 1e-6) {
      // Headland — горизонтальная перемычка
      raw.push({ x: nx, y: y1 })
    }
    x    = nx
    down = !down
  }
  return densify(raw, res)
}

// ── 2. Спираль (прямоугольная, снаружи → внутрь) ─────────────────
// Алгоритм:
//   Итерация: верхний край →, правый ↓, нижний ←, затем
//   поднимаемся по старому левому краю до нового T и
//   шагаем вправо к новому кольцу.
// Нет диагоналей — каждый сегмент строго горизонтальный или вертикальный.
export function spiral(fieldW, fieldH, workWidth, overlap = 0.1) {
  const step = workWidth * (1 - overlap)
  const res  = Math.min(step * 0.4, 1.0)
  const raw  = []

  let L = 0, R = fieldW, T = 0, B = fieldH

  raw.push({ x: L, y: T })   // старт — верхний левый

  while (R - L > step * 0.5 && B - T > step * 0.5) {
    // Верхний край  →
    raw.push({ x: R, y: T })
    // Правый край   ↓
    raw.push({ x: R, y: B })
    // Нижний край   ←
    raw.push({ x: L, y: B })

    // Сужаем кольцо
    const oldL = L, oldT = T
    L += step; T += step; R -= step; B -= step

    if (R - L > step * 0.5 && B - T > step * 0.5) {
      // Левый край ↑ (от нижнего до нового T по СТАРОЙ левой стороне)
      raw.push({ x: oldL, y: T })
      // Переход к новому кольцу →
      raw.push({ x: L, y: T })
    } else {
      // Финиш — дотягиваемся до центра
      raw.push({ x: oldL, y: (T + B + step) * 0.5 })
      if (R > L && B > T) {
        raw.push({ x: (L + R) * 0.5, y: (T + B) * 0.5 })
      }
    }
  }
  return densify(raw, res)
}

// ── 3. По контуру (против часовой стрелки, снаружи → внутрь) ──────
// Зеркальное зеркало спирали: старт — нижний левый,
// движение вверх по левому → верхний → правый → нижний → внутрь.
export function contour(fieldW, fieldH, workWidth, overlap = 0.1) {
  const step = workWidth * (1 - overlap)
  const res  = Math.min(step * 0.4, 1.0)
  const raw  = []

  let L = 0, R = fieldW, T = 0, B = fieldH

  raw.push({ x: L, y: B })   // старт — нижний левый

  while (R - L > step * 0.5 && B - T > step * 0.5) {
    // Левый край   ↑
    raw.push({ x: L, y: T })
    // Верхний край →
    raw.push({ x: R, y: T })
    // Правый край  ↓
    raw.push({ x: R, y: B })

    const oldB = B, oldR = R
    L += step; T += step; R -= step; B -= step

    if (R - L > step * 0.5 && B - T > step * 0.5) {
      // Нижний край ← (по СТАРОЙ нижней строке до нового L)
      raw.push({ x: L, y: oldB })
      // Шаг вверх к новому кольцу
      raw.push({ x: L, y: B })
    } else {
      raw.push({ x: (L + R) * 0.5, y: (T + B) * 0.5 })
    }
  }
  return densify(raw, res)
}

// ── 4. A* — покрытие змейкой + обход препятствий ──────────────────
// Строится сетка, блокируются клетки у препятствий.
// Ряды обходятся змейкой; переход между рядами через A* если
// прямой путь пересекает заблокированную клетку.
export function astar(fieldW, fieldH, obstacles, workWidth) {
  const cell = workWidth * 0.9
  const cols  = Math.ceil(fieldW / cell)
  const rows  = Math.ceil(fieldH / cell)
  const total = cols * rows
  const key   = (c, r) => r * cols + c
  const cc    = (c, r) => ({ x: c * cell + cell * 0.5, y: r * cell + cell * 0.5 })

  // Карта препятствий
  const blocked = new Uint8Array(total)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = cc(c, r)
      if (obstacles.some(o => Math.hypot(p.x - o.x, p.y - o.y) < o.r + cell * 0.6)) {
        blocked[key(c, r)] = 1
      }
    }
  }

  // Мини-A* между двумя узлами сетки (не более MAX_ITER итераций)
  const MAX_ITER = 3000
  function runAstar(sc, sr, ec, er) {
    if (sc === ec && sr === er) return [cc(sc, sr)]
    const h    = (c, r) => Math.abs(ec - c) + Math.abs(er - r)
    const open = new Map([[key(sc, sr), { c: sc, r: sr, g: 0, f: h(sc, sr), par: null }]])
    const closed = new Set()
    const DIRS  = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    let iters   = 0

    while (open.size > 0 && iters++ < MAX_ITER) {
      let best = null
      for (const v of open.values()) {
        if (!best || v.f < best.f) best = v
      }
      const bk = key(best.c, best.r)
      if (best.c === ec && best.r === er) {
        const path = []
        let cur    = best
        while (cur) { path.unshift(cc(cur.c, cur.r)); cur = cur.par }
        return path
      }
      open.delete(bk)
      closed.add(bk)

      for (const [dc, dr] of DIRS) {
        const nc = best.c + dc, nr = best.r + dr
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
        const nk = key(nc, nr)
        if (closed.has(nk) || blocked[nk]) continue
        const g  = best.g + 1
        const ex = open.get(nk)
        if (!ex || g < ex.g) {
          open.set(nk, { c: nc, r: nr, g, f: g + h(nc, nr), par: best })
        }
      }
    }
    // Если путь не найден — прямая
    return [cc(sc, sr), cc(ec, er)]
  }

  const points = []
  let prevC = -1, prevR = -1

  for (let r = 0; r < rows; r++) {
    const fwd     = r % 2 === 0
    const rowFree = []

    for (let ci = 0; ci < cols; ci++) {
      const c = fwd ? ci : cols - 1 - ci
      if (!blocked[key(c, r)]) rowFree.push(c)
    }
    if (rowFree.length === 0) continue

    const firstC = rowFree[0]

    if (prevC >= 0) {
      // Соединяем конец предыдущей строки с началом текущей через A*
      const path = runAstar(prevC, prevR, firstC, r)
      // Пропускаем первую точку (она уже добавлена)
      points.push(...path.slice(1))
    } else {
      points.push(cc(firstC, r))
    }

    // Добавляем все свободные клетки ряда
    for (let i = prevC >= 0 && rowFree[0] === firstC ? 1 : 0; i < rowFree.length; i++) {
      points.push(cc(rowFree[i], r))
    }

    prevC = rowFree[rowFree.length - 1]
    prevR = r
  }

  return points.length > 2 ? points : boustrophedon(fieldW, fieldH, workWidth, 0)
}

// ── 5. «Вороной» — смещённая змейка (hex-like) ───────────────────
// Нечётные ряды смещены на step/2, что даёт шахматный (Вороной-подобный)
// порядок обработки. Явные headland-перемычки исключают прыжки.
export function voronoi(fieldW, fieldH, workWidth, overlap = 0.1) {
  const step = workWidth * (1 - overlap)
  const res  = Math.min(step * 0.4, 1.0)
  const rows  = Math.ceil(fieldH / step)
  const raw   = []

  for (let ri = 0; ri < rows; ri++) {
    const y      = ri * step + step * 0.5
    const offset = ri % 2 === 0 ? 0 : step * 0.5          // смещение через ряд
    const fwd    = ri % 2 === 0
    const maxX   = fieldW
    const nCols  = Math.ceil((maxX - offset) / step)

    // Точки ряда
    const rowPts = []
    for (let ci = 0; ci < nCols; ci++) {
      const xi = ci * step + step * 0.5 + offset
      if (xi <= maxX + 1e-6) rowPts.push({ x: xi, y })
    }
    if (!fwd) rowPts.reverse()
    if (rowPts.length === 0) continue

    // Headland-соединение с предыдущим рядом
    if (raw.length > 0) {
      const lastPt  = raw[raw.length - 1]
      const firstPt = rowPts[0]
      // Вертикальный переход (по краю поля)
      const edgeX = fwd ? 0 : fieldW
      raw.push({ x: lastPt.x, y: lastPt.y })
      raw.push({ x: edgeX,    y: lastPt.y })
      raw.push({ x: edgeX,    y: firstPt.y })
    }

    raw.push(...rowPts)
  }
  return densify(raw, res)
}

// ── Диспетчер ─────────────────────────────────────────────────────
export function planPath(algorithm, fieldW, fieldH, workWidth, overlap, obstacles) {
  switch (algorithm) {
    case 'boustrophedon': return boustrophedon(fieldW, fieldH, workWidth, overlap)
    case 'spiral':        return spiral(fieldW, fieldH, workWidth, overlap)
    case 'contour':       return contour(fieldW, fieldH, workWidth, overlap)
    case 'astar':         return astar(fieldW, fieldH, obstacles || [], workWidth)
    case 'voronoi':       return voronoi(fieldW, fieldH, workWidth, overlap)
    default:              return boustrophedon(fieldW, fieldH, workWidth, overlap)
  }
}

// ── Метрики ───────────────────────────────────────────────────────

export function pathLength(points) {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return len
}

// Считаем повороты > 15° (исключаем шум от плотной интерполяции)
export function countTurns(points) {
  const THRESH = 15 * Math.PI / 180
  let turns    = 0
  for (let i = 1; i < points.length - 1; i++) {
    const dx1 = points[i].x - points[i - 1].x, dy1 = points[i].y - points[i - 1].y
    const dx2 = points[i + 1].x - points[i].x,  dy2 = points[i + 1].y - points[i].y
    if (Math.hypot(dx1, dy1) < 1e-6 || Math.hypot(dx2, dy2) < 1e-6) continue
    const a1 = Math.atan2(dy1, dx1), a2 = Math.atan2(dy2, dx2)
    let da   = Math.abs(a2 - a1)
    if (da > Math.PI) da = 2 * Math.PI - da
    if (da > THRESH) turns++
  }
  return turns
}
