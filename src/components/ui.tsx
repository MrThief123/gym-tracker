import { ReactNode } from 'react'
import { heatColor, Muscle, MUSCLES, Scores } from '../lib/muscles'
import { Period, periodLabel, shiftAnchor } from '../lib/data'

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  )
}

export function PeriodBar({ period, setPeriod, anchor, setAnchor, hideAll }: {
  period: Period; setPeriod: (p: Period) => void; anchor: Date; setAnchor: (d: Date) => void; hideAll?: boolean
}) {
  const opts: [Period, string][] = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']]
  if (!hideAll) opts.push(['all', 'All time'])
  return (
    <div className="periodbar">
      <Seg value={period} options={opts} onChange={setPeriod} />
      <div className="nav">
        <button disabled={period === 'all'} onClick={() => setAnchor(shiftAnchor(period, anchor, -1))} aria-label="Previous">‹</button>
        <span className="lbl">{periodLabel(period, anchor)}</span>
        <button disabled={period === 'all'} onClick={() => setAnchor(shiftAnchor(period, anchor, 1))} aria-label="Next">›</button>
        <button className="today" disabled={period === 'all'} onClick={() => setAnchor(new Date())}>Today</button>
      </div>
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      <span>none</span>
      <div className="ramp" style={{ background: `linear-gradient(90deg, ${[0, 0.02, 0.35, 0.65, 1].map(heatColor).join(',')})` }} />
      <span>most</span>
    </div>
  )
}

export function MuscleList({ scores, selected, onSelect }: { scores: Scores; selected?: Muscle | null; onSelect?: (m: Muscle) => void }) {
  const max = Math.max(0.0001, ...Object.values(scores))
  const rows = [...MUSCLES].sort((a, b) => scores[b] - scores[a])
  return (
    <div className="mlist">
      {rows.map((m) => (
        <button key={m} className={'mrow' + (selected === m ? ' sel' : '')} onClick={() => onSelect?.(m)}>
          <span className="mname">{m}</span>
          <span className="mbar"><i style={{ width: `${(scores[m] / max) * 100}%`, background: heatColor(scores[m] / max) }} /></span>
          <span className="mval">{fmtSets(scores[m])}</span>
        </button>
      ))}
    </div>
  )
}

export const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card">
      {(title || right) && <header><h3>{title}</h3>{right}</header>}
      {children}
    </section>
  )
}

export function Stat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="stat">
      <div className="sv">{value}</div>
      <div className="sl">{label}</div>
      {delta != null && isFinite(delta) && (
        <div className={'sd ' + (delta >= 0 ? 'up' : 'down')}>{delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% vs last</div>
      )}
    </div>
  )
}
