import { emptyScores, lookupMapping, Mapping, Muscle, MUSCLES, Scores } from './muscles'

export interface SetRow {
  type: string
  weight: number
  reps: number
  distance: number
  duration: number
}
export interface ExerciseLog {
  name: string
  sets: SetRow[]
}
export interface Workout {
  id: string
  title: string
  start: Date
  end: Date
  exercises: ExerciseLog[]
}

export type Overrides = Record<string, Mapping>

// ---------- CSV ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

// Hevy format: "Oct 27, 2026 at 4:32 PM"
export function parseHevyDate(s: string): Date {
  const m = s.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s+(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i)
  if (!m) return new Date(s)
  let h = m[4] ? parseInt(m[4], 10) : 0
  const ap = m[6]?.toUpperCase()
  if (ap === 'PM' && h < 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return new Date(+m[3], MONTHS.indexOf(m[1].toLowerCase()), +m[2], h, m[5] ? +m[5] : 0)
}

export function parseWorkouts(csv: string): Workout[] {
  const rows = parseCsv(csv)
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim())
  const col = (n: string) => head.indexOf(n)
  const iTitle = col('title'), iStart = col('start_time'), iEnd = col('end_time')
  const iEx = col('exercise_title'), iType = col('set_type')
  const iW = col('weight_kg'), iR = col('reps'), iD = col('distance_km'), iDur = col('duration_seconds')
  if (iStart < 0 || iEx < 0) throw new Error('This does not look like a Hevy workouts export (missing start_time / exercise_title).')

  const byKey = new Map<string, Workout>()
  for (const r of rows.slice(1)) {
    const key = `${r[iTitle]}|${r[iStart]}`
    let w = byKey.get(key)
    if (!w) {
      w = { id: key, title: r[iTitle], start: parseHevyDate(r[iStart]), end: parseHevyDate(r[iEnd] || r[iStart]), exercises: [] }
      byKey.set(key, w)
    }
    let ex = w.exercises[w.exercises.length - 1]
    if (!ex || ex.name !== r[iEx]) {
      ex = { name: r[iEx], sets: [] }
      w.exercises.push(ex)
    }
    ex.sets.push({
      type: r[iType] || 'normal',
      weight: parseFloat(r[iW]) || 0,
      reps: parseFloat(r[iR]) || 0,
      distance: parseFloat(r[iD]) || 0,
      duration: parseFloat(r[iDur]) || 0,
    })
  }
  return [...byKey.values()].sort((a, b) => a.start.getTime() - b.start.getTime())
}

// ---------- Muscle mapping ----------
export function mappingFor(name: string, overrides: Overrides): Mapping | null {
  return overrides[name] ?? lookupMapping(name)
}

export function unmappedExercises(ws: Workout[], overrides: Overrides): string[] {
  const out = new Set<string>()
  for (const w of ws) for (const e of w.exercises) if (!mappingFor(e.name, overrides)) out.add(e.name)
  return [...out].sort()
}

export interface Opts { overrides: Overrides; warmups: boolean }

const counted = (s: SetRow, o: Opts) => o.warmups || s.type !== 'warmup'

export interface MuscleStat { primary: number; secondary: number }
export type MuscleStats = Record<Muscle, MuscleStat>

export function muscleStats(ws: Workout[], o: Opts): MuscleStats {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, { primary: 0, secondary: 0 }])) as MuscleStats
  for (const w of ws)
    for (const e of w.exercises) {
      const map = mappingFor(e.name, o.overrides)
      if (!map) continue
      const n = e.sets.filter((s) => counted(s, o)).length
      map.primary.forEach((m) => (out[m].primary += n))
      map.secondary.forEach((m) => (out[m].secondary += n))
    }
  return out
}

// Weighted "stimulus": a set is 1.0 for primary muscles, 0.5 for secondary.
export function toScores(s: MuscleStats): Scores {
  const out = emptyScores()
  for (const m of MUSCLES) out[m] = s[m].primary + s[m].secondary * 0.5
  return out
}

export const scoresFor = (ws: Workout[], o: Opts) => toScores(muscleStats(ws, o))

// ---------- Periods ----------
export type Period = 'day' | 'week' | 'month' | 'year' | 'all'

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)) // Monday

export function rangeFor(p: Period, anchor: Date): [Date, Date] {
  const a = startOfDay(anchor)
  switch (p) {
    case 'day': return [a, addDays(a, 1)]
    case 'week': { const s = startOfWeek(a); return [s, addDays(s, 7)] }
    case 'month': return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 1)]
    case 'year': return [new Date(a.getFullYear(), 0, 1), new Date(a.getFullYear() + 1, 0, 1)]
    default: return [new Date(1970, 0, 1), new Date(2200, 0, 1)]
  }
}

export function shiftAnchor(p: Period, anchor: Date, dir: 1 | -1): Date {
  switch (p) {
    case 'day': return addDays(anchor, dir)
    case 'week': return addDays(anchor, 7 * dir)
    case 'month': return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)
    case 'year': return new Date(anchor.getFullYear() + dir, 0, 1)
    default: return anchor
  }
}

// Can the anchor move one period forward without starting after today?
export function canGoForward(p: Period, anchor: Date): boolean {
  if (p === 'all') return false
  return rangeFor(p, shiftAnchor(p, anchor, 1))[0] <= new Date()
}

export function inRange(ws: Workout[], [s, e]: [Date, Date]) {
  return ws.filter((w) => w.start >= s && w.start < e)
}

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o)
export function periodLabel(p: Period, anchor: Date): string {
  const [s, e] = rangeFor(p, anchor)
  switch (p) {
    case 'day': return fmt(s, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    case 'week': return `${fmt(s, { month: 'short', day: 'numeric' })} – ${fmt(addDays(e, -1), { month: 'short', day: 'numeric', year: 'numeric' })}`
    case 'month': return fmt(s, { month: 'long', year: 'numeric' })
    case 'year': return String(s.getFullYear())
    default: return 'All time'
  }
}

// ---------- Exercise stats ----------
export interface ExerciseSummary {
  name: string
  sessions: number
  sets: number
  volume: number
  best1RM: number
  bestSet: string
}

export function exerciseSummaries(ws: Workout[], o: Opts): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>()
  for (const w of ws)
    for (const e of w.exercises) {
      const sets = e.sets.filter((s) => counted(s, o))
      if (!sets.length) continue
      let x = map.get(e.name)
      if (!x) { x = { name: e.name, sessions: 0, sets: 0, volume: 0, best1RM: 0, bestSet: '' }; map.set(e.name, x) }
      x.sessions++
      x.sets += sets.length
      for (const s of sets) {
        x.volume += s.weight * s.reps
        const rm = s.weight > 0 ? s.weight * (1 + s.reps / 30) : 0 // Epley
        if (rm > x.best1RM) { x.best1RM = rm; x.bestSet = `${s.weight} kg × ${s.reps}` }
        else if (!x.bestSet && s.reps) x.bestSet = `${s.reps} reps`
      }
    }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions || b.sets - a.sets)
}

export function summarize(ws: Workout[], o: Opts) {
  let sets = 0, volume = 0, minutes = 0
  for (const w of ws) {
    minutes += Math.max(0, (w.end.getTime() - w.start.getTime()) / 60000)
    for (const e of w.exercises)
      for (const s of e.sets) if (counted(s, o)) { sets++; volume += s.weight * s.reps }
  }
  return { workouts: ws.length, sets, volume, minutes }
}

// ---------- Demo data ----------
export function demoWorkouts(): Workout[] {
  const split: Record<string, string[]> = {
    Push: ['Bench Press (Barbell)', 'Incline Bench Press (Dumbbell)', 'Overhead Press (Barbell)', 'Lateral Raise (Dumbbell)', 'Triceps Pushdown (Cable)', 'Chest Fly (Machine)'],
    Pull: ['Pull Up', 'Bent Over Row (Barbell)', 'Lat Pulldown (Cable)', 'Face Pull (Cable)', 'Bicep Curl (Dumbbell)', 'Hammer Curl (Dumbbell)', 'Shrug (Dumbbell)'],
    Legs: ['Squat (Barbell)', 'Romanian Deadlift (Barbell)', 'Leg Press (Machine)', 'Leg Curl (Machine)', 'Standing Calf Raise (Machine)', 'Hip Thrust (Barbell)', 'Leg Extension (Machine)'],
    Core: ['Crunch', 'Plank', 'Hanging Leg Raise', 'Back Extension'],
  }
  const order = ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Core']
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const out: Workout[] = []
  const today = startOfDay(new Date())
  let k = 0
  for (let d = -540; d <= 0; d++) {
    const date = addDays(today, d)
    if (rnd() > 0.55) continue // ~4 sessions a week
    // a couple of month-long skips so the lifetime view has gaps
    if (d > -300 && d < -270) continue
    const kind = order[k++ % order.length]
    const pool = split[kind]
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 30)
    const exs: ExerciseLog[] = pool
      .filter(() => rnd() > 0.25)
      .map((name) => ({
        name,
        sets: Array.from({ length: 3 + Math.floor(rnd() * 2) }, (_, i) => ({
          type: i === 0 && rnd() > 0.7 ? 'warmup' : 'normal',
          weight: Math.round((20 + rnd() * 60 + (d + 540) / 20) / 2.5) * 2.5,
          reps: 6 + Math.floor(rnd() * 7),
          distance: 0,
          duration: 0,
        })),
      }))
    if (!exs.length) continue
    out.push({ id: `demo-${d}`, title: `${kind} day`, start, end: new Date(start.getTime() + (45 + rnd() * 30) * 60000), exercises: exs })
  }
  return out
}
