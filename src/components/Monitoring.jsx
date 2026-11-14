import { PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { fmtBytes, isStale, serviceStatus } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Panel from './Panel.jsx'

const BEAT = ['down', 'up', 'pending', 'maintenance']
const when = (iso) => (iso ? new Date(iso).toLocaleString([], { hour12: false }) : '—')
const down = (poll, ms, now) =>
  poll.error != null || (poll.updatedAt != null && isStale(poll.updatedAt, ms, now))

function Beats({ beats }) {
  return (
    <span className="beats" aria-hidden="true">
      {beats.map((b, i) => <i key={i} className={`beat beat-${BEAT[b] ?? 'pending'}`} />)}
    </span>
  )
}

function Row({ k, v, cls }) {
  return <div className="kv"><span className="s">{k}</span><span className={cls}>{v}</span></div>
}

function Monitors({ groups, monitors, kuma, now }) {
  const bad = kuma.error != null || (kuma.updatedAt != null && isStale(kuma.updatedAt, 60000, now))
  const services = groups.flatMap((g) => g.services)
  const found = []
  const missing = []
  for (const s of services) {
    const m = monitors && serviceStatus(s, monitors).state !== 'none' && monitors.get(s.monitor.trim().toLowerCase())
    if (m) found.push({ s, m })
    else missing.push(s)
  }
  return (
    <>
      <Panel label="Monitors" unavailable={bad} updatedAt={kuma.updatedAt} now={now}>
        {found.map(({ s, m }) => (
          <div key={s.id} className="mon">
            <span className="nm">{s.name}</span>
            <span className="s">{m.uptime24 == null ? '—' : `${m.uptime24.toFixed(1)}%`}</span>
            <Beats beats={m.beats} />
          </div>
        ))}
      </Panel>
      <Panel label="No monitor">
        {missing.map((s) => <div key={s.id} className="nm">{s.name}</div>)}
      </Panel>
    </>
  )
}

function Pools({ poll, now }) {
  const bad = down(poll, PVE_MS, now)
  return (
    <Panel label="Storage" unavailable={bad} updatedAt={poll.updatedAt} now={now}>
      {poll.data && !bad && poll.data.pools.map((p) => (
        <Row key={p.name} k={p.name} v={`${fmtBytes(p.used)} / ${fmtBytes(p.total)} · ${p.usedPct}%`} cls={p.level === 'ok' ? '' : 'alert'} />
      ))}
    </Panel>
  )
}

function LastRun({ poll, now }) {
  const u = poll.data
  const bad = down(poll, UPDATES_MS, now)
  return (
    <Panel label="Last update run" unavailable={bad} updatedAt={poll.updatedAt} now={now}>
      {u && !bad && (
        <>
          <Row k="status" v={u.status} cls={u.status === 'success' ? 'good' : 'alert'} />
          <Row k="started" v={when(u.started_at)} />
          <Row k="completed" v={when(u.completed_at)} />
          <Row k="host" v={u.host_status ?? '—'} cls={u.host_status === 'success' ? '' : 'alert'} />
          <Row k="containers" v={`${u.containers_ok}/${u.containers_total}`} />
          <Row k="next run" v={u.next_run ?? '—'} />
          {u.errors && <p className="s alert sub">{u.errors}</p>}
        </>
      )}
    </Panel>
  )
}

export default function Monitoring({ groups, monitors, kuma, pve, updates, now }) {
  return (
    <>
      <ErrorBoundary label="Monitors"><Monitors groups={groups} monitors={monitors} kuma={kuma} now={now} /></ErrorBoundary>
      <ErrorBoundary label="Storage"><Pools poll={pve} now={now} /></ErrorBoundary>
      <ErrorBoundary label="Last update run"><LastRun poll={updates} now={now} /></ErrorBoundary>
    </>
  )
}
