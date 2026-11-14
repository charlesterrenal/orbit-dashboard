import { statusText } from '../lib/status.js'
import { Icon } from './ServiceRow.jsx'

const BEAT = ['down', 'up', 'pending', 'maintenance']

export default function FeaturedCard({ service, status, monitor, now, index }) {
  return (
    <a
      className={`fcard rise${status.state === 'down' ? ' down' : ''}`}
      style={{ '--i': index }}
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="fcard-head">
        <Icon service={service} />
        <div className="fcard-title">
          <span className="fcard-name">{service.name}</span>
          <span className="s">{service.description ?? statusText(status, now)}</span>
        </div>
        <span className={`dot dot-${status.state}`} aria-hidden="true" />
      </div>
      <div className="fcard-stats">
        <span className="fstat">
          <b>{monitor?.uptime24 == null ? '—' : `${monitor.uptime24.toFixed(1)}%`}</b>
          <span className="s">24h</span>
        </span>
        <span className="fstat">
          <b>{status.ping == null ? '—' : `${status.ping}ms`}</b>
          <span className="s">ping</span>
        </span>
        <span className={`fstat fstat-state fstat-${status.state}`}>
          <b>{statusText(status, now)}</b>
        </span>
      </div>
      {monitor && (
        <span className="beats" aria-hidden="true">
          {monitor.beats.map((b, i) => <i key={i} className={`beat beat-${BEAT[b] ?? 'pending'}`} style={{ '--i': i }} />)}
        </span>
      )}
    </a>
  )
}
