import { useState } from 'react'
import { fmtPct, statusText } from '../lib/status.js'
import Beats from './Beats.jsx'

export function Icon({ service }) {
  const [broken, setBroken] = useState(false)
  if (service.icon && !broken) {
    return <img className="ic" src={`/icons/${service.icon}`} alt="" onError={() => setBroken(true)} />
  }
  return <span className="mg" aria-hidden="true">{service.name.slice(0, 2).toLowerCase()}</span>
}

// status: serviceStatus() result, or { state: 'nodata' } when Kuma has no current data.
// monitor: the Kuma entry for this service, or undefined.
export default function ServiceRow({ service, status, monitor, count, now }) {
  const live = monitor && status.state !== 'nodata'
  return (
    <a className={`row ${status.state}`} href={service.url} target="_blank" rel="noopener noreferrer">
      <Icon service={service} />
      <span className="nm">{service.name}</span>
      <span className="lat">{statusText(status, now)}</span>
      <span className="up">{status.state === 'none' ? 'no monitor' : fmtPct(live ? monitor.uptime24 : null)}</span>
      {live ? <Beats beats={monitor.beats} count={count} lastBeat={monitor.lastBeat} /> : <span />}
    </a>
  )
}
