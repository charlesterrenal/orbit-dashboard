import { useEffect, useState } from 'react'
import { KUMA_MS } from '../lib/intervals.js'
import { fmtToday, hhmm } from '../lib/status.js'
import { TABS } from '../lib/tabs.js'

// Own 1s timer so only the clock re-renders each second.
function Clock() {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <b>{hhmm(t)}<span className="sec">:{String(new Date(t).getSeconds()).padStart(2, '0')}</span></b>
}

// checkedAt: last Kuma poll; the line under the header fills until the next one.
export default function Header({ tab, now, checkedAt }) {
  return (
    <header className="head">
      {checkedAt != null && <i key={checkedAt} className="next" style={{ animationDuration: `${KUMA_MS}ms` }} />}
      <nav className="brand">
        <b>orbit</b>
        {TABS.map((t) => (
          <a key={t} href={`#/${t}`} className={tab === t ? 'on' : undefined} aria-current={tab === t ? 'page' : undefined}>{t}</a>
        ))}
      </nav>
      <div className="when"><Clock /><span>{fmtToday(now)}</span></div>
    </header>
  )
}
