import { PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { pollDown } from '../lib/status.js'
import Num from './Num.jsx'

function Stat({ label, tone, children }) {
  return (
    <div className={`stat${tone ? ` stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{children}</span>
    </div>
  )
}

export default function StatStrip({ pve, updates, summary, now }) {
  const p = !pollDown(pve, PVE_MS, now) ? pve.data : null
  const u = !pollDown(updates, UPDATES_MS, now) ? updates.data : null
  const pool = p?.pools[0]
  const level = pool && pool.level !== 'ok' ? (pool.level === 'crit' ? 'bad' : 'warn') : null
  return (
    <div className="stats">
      <Stat label="CPU">{p ? <Num value={p.cpuPct} suffix="%" /> : '—'}</Stat>
      <Stat label="RAM">{p ? <Num value={Math.round((p.memUsed / p.memTotal) * 100)} suffix="%" /> : '—'}</Stat>
      <Stat label="LXC">{p ? `${p.lxcRunning}/${p.lxcTotal}` : '—'}</Stat>
      <Stat label={pool ? `Storage · ${pool.name}` : 'Storage'} tone={level}>{pool ? <Num value={pool.usedPct} suffix="%" /> : '—'}</Stat>
      <Stat label="Services up" tone={summary.total && summary.up < summary.total ? 'bad' : null}>
        {summary.total ? <><Num value={summary.up} />/{summary.total}</> : '—'}
      </Stat>
      <Stat label="Updates" tone={u && u.status !== 'success' ? 'warn' : null}>
        {u ? (u.status === 'success' ? '✓ ok' : u.status) : '—'}
      </Stat>
    </div>
  )
}
