import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend as RLegend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Body, { BodyMode } from './components/Body'
import { Card, fmtSets, Legend, MuscleList, Seg, Stat } from './components/ui'
import {
  addDays, canGoForward, exerciseSummaries, inRange, mappingFor, muscleStats, Opts, Period, rangeFor,
  scoresFor, shiftAnchor, startOfDay, summarize, unmappedExercises, Workout, Overrides, periodLabel, parseWorkouts,
} from './lib/data'
import { Muscle, MUSCLES, Mapping } from './lib/muscles'

interface Common { workouts: Workout[]; opts: Opts; period: Period; anchor: Date }

const tip = { background: '#161a22', border: '1px solid #2a303c', borderRadius: 8, color: '#e8ebf0' }

// ---------- Body map (home) ----------
export function BodyMapView({ workouts, opts, period, anchor }: Common) {
  const [mode, setMode] = useState<BodyMode>('2d')
  const [spin, setSpin] = useState(false)
  const [sel, setSel] = useState<Muscle | null>(null)
  const [hover, setHover] = useState<Muscle | null>(null)
  const ws = useMemo(() => inRange(workouts, rangeFor(period, anchor)), [workouts, period, anchor])
  const scores = useMemo(() => scoresFor(ws, opts), [ws, opts])
  const stats = useMemo(() => muscleStats(ws, opts), [ws, opts])
  const sum = summarize(ws, opts)
  const focus = hover ?? sel
  return (
    <div className="split">
      <Card
        right={
          <div className="row">
            {mode === '3d' && <label className="chk"><input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} />Auto-rotate</label>}
            <Seg value={mode} options={[['2d', '2D'], ['3d', '3D']]} onChange={setMode} />
          </div>
        }
      >
        <div className="stage">
          <Body scores={scores} mode={mode} autoRotate={spin} onHover={setHover} onSelect={(m) => setSel((s) => (s === m ? null : m))} selected={sel} />
          {focus && (
            <div className="float">
              <b>{focus}</b>
              <div>{stats[focus].primary} primary sets · {stats[focus].secondary} secondary</div>
            </div>
          )}
        </div>
        <div className="foot"><Legend /><span className="hint">{mode === '3d' ? 'Drag to rotate · scroll to zoom · click a muscle' : 'Hover or click a muscle'}</span></div>
      </Card>
      <div className="col">
        <Card>
          <div className="stats">
            <Stat label="Workouts" value={String(sum.workouts)} />
            <Stat label="Sets" value={String(sum.sets)} />
            <Stat label="Volume" value={`${Math.round(sum.volume / 1000 * 10) / 10}t`} />
            <Stat label="Time" value={`${Math.round(sum.minutes / 60 * 10) / 10}h`} />
          </div>
        </Card>
        <Card title="Muscles worked (weighted sets)">
          {sum.sets === 0 ? <p className="empty">No workouts in this period.</p> : <MuscleList scores={scores} selected={sel} onSelect={(m) => setSel((s) => (s === m ? null : m))} />}
          <p className="hint">Primary muscle = 1 set, secondary = ½ set.</p>
        </Card>
      </div>
    </div>
  )
}

// ---------- Set count per muscle group ----------
export function SetCountView({ workouts, opts, period, anchor }: Common) {
  const ws = inRange(workouts, rangeFor(period, anchor))
  const stats = muscleStats(ws, opts)
  const data = MUSCLES.map((m) => ({ name: m, Primary: stats[m].primary, Secondary: stats[m].secondary })).sort((a, b) => b.Primary + b.Secondary - (a.Primary + a.Secondary))
  return (
    <Card title="Set count per muscle group">
      <div style={{ height: 520 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid stroke="#222834" horizontal={false} />
            <XAxis type="number" stroke="#8a93a6" allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke="#c4cad6" width={100} />
            <Tooltip contentStyle={tip} cursor={{ fill: '#ffffff10' }} />
            <RLegend />
            <Bar dataKey="Primary" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Secondary" stackId="a" fill="#22d3ee" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ---------- Muscle distribution (chart) ----------
export function DistributionChartView({ workouts, opts, period, anchor }: Common) {
  const cur = scoresFor(inRange(workouts, rangeFor(period, anchor)), opts)
  const [showPrev, setShowPrev] = useState(true)
  const hasPrev = period !== 'all' && showPrev
  const prev = hasPrev ? scoresFor(inRange(workouts, rangeFor(period, shiftAnchor(period, anchor, -1))), opts) : null
  const norm = (s: typeof cur) => { const t = Object.values(s).reduce((a, b) => a + b, 0) || 1; return s && ((m: Muscle) => Math.round((s[m] / t) * 1000) / 10) }
  const c = norm(cur), p = prev ? norm(prev) : null
  const data = MUSCLES.map((m) => ({ muscle: m, Current: c(m), ...(p ? { Previous: p(m) } : {}) }))
  return (
    <Card
      title="Muscle distribution (% of weighted sets)"
      right={period !== 'all' && <label className="chk"><input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} />Show previous</label>}
    >
      <div style={{ height: 540 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#2a303c" />
            <PolarAngleAxis dataKey="muscle" stroke="#c4cad6" tick={{ fill: '#c4cad6', fontSize: 12 }} />
            <PolarRadiusAxis stroke="#444c5c" tick={{ fill: '#6b7385', fontSize: 10 }} />
            {p && <Radar name={`Previous (${periodLabel(period, shiftAnchor(period, anchor, -1))})`} dataKey="Previous" stroke="#8a93a6" fill="#8a93a6" fillOpacity={0.2} />}
            <Radar name={`Current (${periodLabel(period, anchor)})`} dataKey="Current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
            <Tooltip contentStyle={tip} />
            <RLegend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ---------- Muscle distribution (body): last 7 days ----------
export function WeekBodyView({ workouts, opts }: { workouts: Workout[]; opts: Opts }) {
  const [end, setEnd] = useState(() => startOfDay(new Date()))
  const [selDay, setSelDay] = useState<number | 'all'>(6)
  const [mode, setMode] = useState<BodyMode>('2d')
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6))
  const dayWs = days.map((d) => inRange(workouts, rangeFor('day', d)))
  const ws = selDay === 'all' ? dayWs.flat() : dayWs[selDay]
  const scores = scoresFor(ws, opts)
  return (
    <Card
      title="Last 7 days body graph"
      right={<div className="row"><Seg value={mode} options={[['2d', '2D'], ['3d', '3D']]} onChange={setMode} /></div>}
    >
      <div className="days">
        <button className="dnav" onClick={() => setEnd(addDays(end, -7))}>‹</button>
        {days.map((d, i) => (
          <button key={i} className={'day' + (selDay === i ? ' on' : '')} onClick={() => setSelDay(i)}>
            <small>{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</small>
            <b>{d.getDate()}</b>
            <i style={{ opacity: dayWs[i].length ? 1 : 0.15 }} />
          </button>
        ))}
        <button className={'day wide' + (selDay === 'all' ? ' on' : '')} onClick={() => setSelDay('all')}>All 7</button>
        <button className="dnav" disabled={addDays(end, 7) > startOfDay(new Date())} onClick={() => setEnd(addDays(end, 7))}>›</button>
      </div>
      <div className="stage tall"><Body scores={scores} mode={mode} /></div>
      <div className="foot"><Legend /><span className="hint">{ws.length} workout{ws.length === 1 ? '' : 's'}</span></div>
    </Card>
  )
}

// ---------- Main exercises ----------
export function ExercisesView({ workouts, opts, period, anchor }: Common) {
  const rows = exerciseSummaries(inRange(workouts, rangeFor(period, anchor)), opts)
  const max = Math.max(1, ...rows.map((r) => r.sessions))
  return (
    <Card title="Main exercises">
      {!rows.length ? <p className="empty">No exercises in this period.</p> : (
        <table className="tbl">
          <thead><tr><th>Exercise</th><th>Sessions</th><th>Sets</th><th>Volume (kg)</th><th>Best set</th><th>Est. 1RM</th></tr></thead>
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.name}>
                <td>{r.name}<span className="mbar thin"><i style={{ width: `${(r.sessions / max) * 100}%` }} /></span></td>
                <td>{r.sessions}</td><td>{r.sets}</td><td>{Math.round(r.volume).toLocaleString()}</td>
                <td>{r.bestSet || '—'}</td><td>{r.best1RM ? `${Math.round(r.best1RM)} kg` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ---------- Monthly report ----------
export function MonthlyReportView({ workouts, opts, anchor, setAnchor }: { workouts: Workout[]; opts: Opts; anchor: Date; setAnchor: (d: Date) => void }) {
  const ws = inRange(workouts, rangeFor('month', anchor))
  const prevRange = rangeFor('month', shiftAnchor('month', anchor, -1))
  const pw = inRange(workouts, prevRange)
  const s = summarize(ws, opts), p = summarize(pw, opts)
  const d = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null)
  const scores = scoresFor(ws, opts)
  const top = [...MUSCLES].sort((a, b) => scores[b] - scores[a]).slice(0, 3).filter((m) => scores[m] > 0)
  const neglected = [...MUSCLES].sort((a, b) => scores[a] - scores[b]).slice(0, 3)
  const before = exerciseSummaries(workouts.filter((w) => w.start < rangeFor('month', anchor)[0]), opts)
  const prs = exerciseSummaries(ws, opts).filter((e) => e.best1RM > 0 && e.best1RM > (before.find((b) => b.name === e.name)?.best1RM ?? 0)).slice(0, 8)
  return (
    <div className="col">
      <Card title={`Monthly report — ${periodLabel('month', anchor)}`} right={
        <div className="nav">
          <button onClick={() => setAnchor(shiftAnchor('month', anchor, -1))}>‹</button>
          <button disabled={!canGoForward('month', anchor)} onClick={() => setAnchor(shiftAnchor('month', anchor, 1))}>›</button>
        </div>
      }>
        <div className="stats">
          <Stat label="Workouts" value={String(s.workouts)} delta={d(s.workouts, p.workouts)} />
          <Stat label="Sets" value={String(s.sets)} delta={d(s.sets, p.sets)} />
          <Stat label="Volume" value={`${Math.round(s.volume / 100) / 10}t`} delta={d(s.volume, p.volume)} />
          <Stat label="Time" value={`${Math.round(s.minutes / 6) / 10}h`} delta={d(s.minutes, p.minutes)} />
        </div>
      </Card>
      <div className="split">
        <Card title="Body heat map"><div className="stage"><Body scores={scores} mode="2d" /></div><div className="foot"><Legend /></div></Card>
        <div className="col">
          <Card title="Highlights">
            <p>Most trained: <b>{top.join(', ') || '—'}</b></p>
            <p>Needs attention: <b>{s.sets ? neglected.join(', ') : '—'}</b></p>
          </Card>
          <Card title="New estimated 1RM bests">
            {prs.length ? <ul className="plain">{prs.map((e) => <li key={e.name}><span>{e.name}</span><b>{Math.round(e.best1RM)} kg</b></li>)}</ul> : <p className="empty">None this month.</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------- Data / import ----------
export function DataView({ workouts, demo, overrides, setOverrides, onCsv, onDemo, onClear, warmups, setWarmups }: {
  workouts: Workout[]; demo: boolean; overrides: Overrides; setOverrides: (o: Overrides) => void
  onCsv: (text: string) => string | null; onDemo: () => void; onClear: () => void; warmups: boolean; setWarmups: (b: boolean) => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const unmapped = unmappedExercises(workouts, overrides)
  const names = useMemo(() => [...new Set(workouts.flatMap((w) => w.exercises.map((e) => e.name)))].sort(), [workouts])
  const [q, setQ] = useState('')
  const setMap = (name: string, m: Mapping | null) => {
    const next = { ...overrides }
    if (m) next[name] = m; else delete next[name]
    setOverrides(next)
  }
  return (
    <div className="col">
      <Card title="Your data">
        <p>{workouts.length} workouts loaded{demo && ' (demo data)'}. Export from Hevy: <i>Profile → Settings → Export &amp; Import Data → Export workouts</i>, then pick the <code>workouts.csv</code>.</p>
        <div className="row">
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            setErr(onCsv(await f.text())); e.target.value = ''
          }} />
          <button className="btn primary" onClick={() => file.current?.click()}>Import workouts.csv</button>
          <button className="btn" onClick={onDemo}>Load demo data</button>
          <button className="btn" onClick={onClear}>Clear</button>
          <label className="chk"><input type="checkbox" checked={warmups} onChange={(e) => setWarmups(e.target.checked)} />Count warm-up sets</label>
        </div>
        {err && <p className="err">{err}</p>}
        <p className="hint">Data stays in this browser (localStorage). Nothing is uploaded.</p>
      </Card>
      <Card title={`Exercise → muscle mapping${unmapped.length ? ` (${unmapped.length} unmapped)` : ''}`}>
        <p className="hint">Hevy's export only has exercise names, so muscles come from a built-in lookup. Fix or add any below.</p>
        <input className="search" placeholder="Filter exercises…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="maplist">
          {[...unmapped, ...names.filter((n) => !unmapped.includes(n))].filter((n) => n.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map((n) => (
            <MapRow key={n} name={n} map={mappingFor(n, overrides)} custom={!!overrides[n]} onChange={(m) => setMap(n, m)} />
          ))}
        </div>
      </Card>
    </div>
  )
}

function MapRow({ name, map, custom, onChange }: { name: string; map: Mapping | null; custom: boolean; onChange: (m: Mapping | null) => void }) {
  const cur = map ?? { primary: [], secondary: [] }
  const toggle = (kind: 'primary' | 'secondary', m: Muscle) => {
    const other = kind === 'primary' ? 'secondary' : 'primary'
    const has = cur[kind].includes(m)
    onChange({
      ...cur,
      [kind]: has ? cur[kind].filter((x) => x !== m) : [...cur[kind], m],
      [other]: cur[other].filter((x) => x !== m),
    } as Mapping)
  }
  return (
    <details className={'maprow' + (!map ? ' bad' : '')}>
      <summary>
        <span>{name}</span>
        <small>{map?.cardio ? 'cardio' : map ? `${map.primary.join(', ') || '—'}` : 'unmapped'}{custom && ' ✎'}</small>
      </summary>
      <div className="chips">
        {MUSCLES.map((m) => (
          <span key={m} className="chipgrp">
            <button className={cur.primary.includes(m) ? 'p' : cur.secondary.includes(m) ? 's' : ''} onClick={() => toggle(cur.primary.includes(m) || cur.secondary.includes(m) ? 'secondary' : 'primary', m)}>{m}</button>
          </span>
        ))}
      </div>
      <p className="hint">Click once = primary, again = secondary, again = off.</p>
      {custom && <button className="btn" onClick={() => onChange(null)}>Reset to default</button>}
    </details>
  )
}

export { parseWorkouts }
