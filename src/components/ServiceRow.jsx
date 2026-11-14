import { useState } from 'react'
import { statusText } from '../lib/status.js'

const MARK = { up: '✓', down: '!', pending: '…', maintenance: '–', none: '–', nodata: '–' }

const tone = (name) => [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 6

export function Icon({ service }) {
  const [broken, setBroken] = useState(false)
  if (service.icon && !broken) {
    return <img className="ic" src={`/icons/${service.icon}`} alt="" onError={() => setBroken(true)} />
  }
  return <span className={`ic mono tone-${tone(service.name)}`} aria-hidden="true">{service.name.slice(0, 2)}</span>
}

// status: result of serviceStatus(), or { state: 'nodata' } before the first Kuma load.
export default function ServiceRow({ service, status, now }) {
  return (
    <a
      className={`svc${status.state === 'down' ? ' down' : ''}`}
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon service={service} />
      <span className="svc-text">
        <span className="nm">{service.name}</span>
        <span className="st">{statusText(status, now)}</span>
      </span>
      <span className={`mark mark-${status.state}`} aria-hidden="true">{MARK[status.state]}</span>
    </a>
  )
}
