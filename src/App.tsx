import { useEffect, useMemo, useState } from 'react'
import { demoWorkouts, Overrides, parseWorkouts, Period, Workout } from './lib/data'
import { PeriodBar } from './components/ui'
import {
  BodyMapView, DataView, DistributionChartView, ExercisesView, MonthlyReportView, SetCountView, WeekBodyView,
} from './views'

type View = 'body' | 'sets' | 'chart' | 'week' | 'exercises' | 'report' | 'data'

const NAV: [View, string, string][] = [
  ['body', 'Body map', '🧍'],
  ['sets', 'Set count per muscle', '📊'],
  ['chart', 'Muscle distribution (chart)', '🕸'],
  ['week', 'Muscle distribution (body)', '🗓'],
  ['exercises', 'Main exercises', '🏋️'],
  ['report', 'Monthly report', '📋'],
  ['data', 'Data & mapping', '⚙️'],
]
const PERIOD_VIEWS: View[] = ['body', 'sets', 'chart', 'exercises']

const load = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota / private mode */ } }

export default function App() {
  const [csv, setCsv] = useState<string>(() => load('gt.csv', ''))
  const [demo, setDemo] = useState<boolean>(() => load('gt.demo', true))
  const [overrides, setOverrides] = useState<Overrides>(() => load('gt.overrides', {}))
  const [warmups, setWarmups] = useState<boolean>(() => load('gt.warmups', false))
  const [view, setView] = useState<View>('body')
  const [period, setPeriod] = useState<Period>('month')
  const [anchor, setAnchor] = useState(() => new Date())

  const workouts: Workout[] = useMemo(() => {
    if (demo || !csv) return demoWorkouts()
    try { return parseWorkouts(csv) } catch { return [] }
  }, [csv, demo])
  const opts = useMemo(() => ({ overrides, warmups }), [overrides, warmups])

  useEffect(() => save('gt.overrides', overrides), [overrides])
  useEffect(() => save('gt.warmups', warmups), [warmups])
  useEffect(() => save('gt.demo', demo), [demo])
  useEffect(() => save('gt.csv', csv), [csv])

  const common = { workouts, opts, period, anchor }
  const onCsv = (text: string): string | null => {
    try {
      const w = parseWorkouts(text)
      if (!w.length) return 'No workouts found in that file.'
      setCsv(text); setDemo(false)
      setAnchor(w[w.length - 1].start)
      return null
    } catch (e) { return (e as Error).message }
  }

  return (
    <div className="app">
      <aside>
        <h1>Gym Tracker</h1>
        <nav>
          {NAV.map(([v, label, icon]) => (
            <button key={v} className={v === view ? 'on' : ''} onClick={() => setView(v)}><span>{icon}</span>{label}</button>
          ))}
        </nav>
        <div className="side-foot">{demo ? 'Showing demo data' : `${workouts.length} workouts`}</div>
      </aside>
      <main>
        {PERIOD_VIEWS.includes(view) && <PeriodBar period={period} setPeriod={setPeriod} anchor={anchor} setAnchor={setAnchor} />}
        {view === 'body' && <BodyMapView {...common} />}
        {view === 'sets' && <SetCountView {...common} />}
        {view === 'chart' && <DistributionChartView {...common} />}
        {view === 'week' && <WeekBodyView workouts={workouts} opts={opts} />}
        {view === 'exercises' && <ExercisesView {...common} />}
        {view === 'report' && <MonthlyReportView workouts={workouts} opts={opts} anchor={anchor} setAnchor={setAnchor} />}
        {view === 'data' && (
          <DataView
            workouts={workouts} demo={demo} overrides={overrides} setOverrides={setOverrides} onCsv={onCsv}
            onDemo={() => setDemo(true)} onClear={() => { setCsv(''); setDemo(false) }}
            warmups={warmups} setWarmups={setWarmups}
          />
        )}
      </main>
    </div>
  )
}
