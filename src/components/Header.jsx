import { verdictLabel } from '../lib/status.js'
import StatStrip from './StatStrip.jsx'

const NO_POLL = { data: null, error: null, updatedAt: null }
const hhmm = (t) =>
  new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Header({ verdict, updatedAt, tab, now, pve = NO_POLL, updates = NO_POLL, summary = { up: 0, total: 0 } }) {
  const detail = [...verdict.issues, ...verdict.unknown.map((u) => `${u} unavailable`)].join(', ')
  const d = new Date(now)
  return (
    <header className="band">
      <div className="band-top">
        <span className="logo">▣ ORBIT</span>
        <nav className="tabs">
          <a href="#/directory" className={tab === 'directory' ? 'on' : ''} aria-current={tab === 'directory' ? 'page' : undefined}>Directory</a>
          <a href="#/monitoring" className={tab === 'monitoring' ? 'on' : ''} aria-current={tab === 'monitoring' ? 'page' : undefined}>Monitoring</a>
        </nav>
        <div className="clock">
          <span className="clock-time">{hhmm(now)}</span>
          <span className="s">{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
      <div className="band-main">
        <div className={`pill pill-${verdict.state}`} title={detail}>
          <span className="pill-dot" aria-hidden="true" />
          <span className="pill-text">{verdictLabel(verdict)}</span>
        </div>
        <span className="s">checked {updatedAt ? hhmm(updatedAt) : '--:--'}</span>
      </div>
      <StatStrip pve={pve} updates={updates} summary={summary} now={now} />
    </header>
  )
}
