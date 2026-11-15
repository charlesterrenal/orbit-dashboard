import { fmtToday, hhmm } from '../lib/status.js'
import { TABS } from '../lib/tabs.js'

export default function Header({ tab, now }) {
  return (
    <header className="head">
      <nav className="brand">
        <b>orbit</b>
        {TABS.map((t) => (
          <a key={t} href={`#/${t}`} className={tab === t ? 'on' : undefined} aria-current={tab === t ? 'page' : undefined}>{t}</a>
        ))}
      </nav>
      <div className="when"><b>{hhmm(now)}</b><span>{fmtToday(now)}</span></div>
    </header>
  )
}
