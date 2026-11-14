import { verdictLabel } from '../lib/status.js'

const hhmm = (t) =>
  new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Header({ verdict, updatedAt, tab }) {
  return (
    <header className="top">
      <nav className="nav">
        <span className="logo">▣ ORBIT</span>
        <a href="#/directory" className={tab === 'directory' ? 'on' : ''} aria-current={tab === 'directory' ? 'page' : undefined}>DIRECTORY</a>
        <a href="#/monitoring" className={tab === 'monitoring' ? 'on' : ''} aria-current={tab === 'monitoring' ? 'page' : undefined}>MONITORING</a>
      </nav>
      <span className={`verdict verdict-${verdict.state}`} title={[...verdict.issues, ...verdict.unknown.map((u) => `${u} unavailable`)].join(", ")}>
        {verdictLabel(verdict)} · checked {updatedAt ? hhmm(updatedAt) : '--:--'}
      </span>
    </header>
  )
}
