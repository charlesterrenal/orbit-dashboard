import { PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { fmtBytes, fmtUptime, isStale } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Panel from './Panel.jsx'


const LEVEL_CLASS = { ok: 'f', warn: 'w', crit: 'b' }

// n-segment bar, `pct` filled, coloured by `cls`.
function Seg({ pct, n, cls = 'f' }) {
  const filled = Math.max(0, Math.min(n, Math.round((pct / 100) * n)))
  return (
    <div className="seg" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < filled ? cls : ''} />)}
    </div>
  )
}

const unavailable = (poll, ms, now) =>
  poll.error != null || (poll.updatedAt != null && isStale(poll.updatedAt, ms, now))

function Clock({ now }) {
  const d = new Date(now)
  return (
    <Panel label="Clock">
      <div className="kv">
        <span className="big">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span>
        <span className="big">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      </div>
      <div className="kv">
        <span className="s">{d.getFullYear()}</span>
        <span className="s">{d.toLocaleDateString('en-GB', { weekday: 'long' })}</span>
      </div>
    </Panel>
  )
}

function Server({ node, poll, now }) {
  const p = poll.data
  const bad = unavailable(poll, PVE_MS, now)
  const ram = p && Math.round((p.memUsed / p.memTotal) * 100)
  const lxc = p && (p.lxcTotal ? (p.lxcRunning / p.lxcTotal) * 100 : 0)
  return (
    <Panel label="Server" unavailable={bad} updatedAt={poll.updatedAt} now={now}>
      {p && !bad && (
        <>
          <div className="kv"><span className="big">{node}</span><span className="s">up {fmtUptime(p.uptimeSec)}</span></div>
          <div className="meters">
            <div>
              <div className="kv"><span className="s">CPU</span><span className="s">{p.cpuPct}%</span></div>
              <Seg pct={p.cpuPct} n={5} />
            </div>
            <div title={`${fmtBytes(p.memUsed)} / ${fmtBytes(p.memTotal)}`}>
              <div className="kv"><span className="s">RAM</span><span className="s">{ram}%</span></div>
              <Seg pct={ram} n={5} />
            </div>
            <div>
              <div className="kv"><span className="s">LXC</span><span className="s">{p.lxcRunning}/{p.lxcTotal}</span></div>
              <Seg pct={lxc} n={5} />
            </div>
          </div>
        </>
      )}
    </Panel>
  )
}

function Storage({ poll, now }) {
  const bad = unavailable(poll, PVE_MS, now)
  return (
    <Panel label="Storage" unavailable={bad} updatedAt={poll.updatedAt} now={now}>
      {poll.data && !bad && poll.data.pools.map((pool) => (
        <div key={pool.name} className="pool">
          <div className={`kv${pool.level === 'ok' ? '' : ' alert'}`}>
            <span>{pool.name}</span><span>{pool.usedPct}%</span>
          </div>
          <Seg pct={pool.usedPct} n={10} cls={LEVEL_CLASS[pool.level]} />
        </div>
      ))}
    </Panel>
  )
}

const stamp = (iso) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

function Updates({ poll, now }) {
  const u = poll.data
  const bad = unavailable(poll, UPDATES_MS, now)
  return (
    <Panel label="Updates" unavailable={bad} updatedAt={poll.updatedAt} now={now}>
      {u && !bad && (
        <>
          <div className="kv">
            {u.status === 'success'
              ? <span className="good">✓ All good</span>
              : <span className="alert">{u.status}</span>}
            {u.started_at && <span className="s">{stamp(u.started_at)}</span>}
          </div>
          <div className="s sub">host + {u.containers_ok}/{u.containers_total} containers</div>
          {u.errors && <div className="s alert sub">{u.errors}</div>}
        </>
      )}
    </Panel>
  )
}

export default function Rail({ node, pve, updates, now }) {
  return (
    <aside className="rail">
      <ErrorBoundary label="Clock"><Clock now={now} /></ErrorBoundary>
      <ErrorBoundary label="Server"><Server node={node} poll={pve} now={now} /></ErrorBoundary>
      <ErrorBoundary label="Storage"><Storage poll={pve} now={now} /></ErrorBoundary>
      <ErrorBoundary label="Updates"><Updates poll={updates} now={now} /></ErrorBoundary>
    </aside>
  )
}
