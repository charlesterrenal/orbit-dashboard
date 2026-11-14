import { downFirst, serviceStatus, splitMonitored } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Section from './Section.jsx'
import ServiceRow from './ServiceRow.jsx'

const NO_DATA = { state: 'nodata', ping: null, since: null }

export default function Directory({ groups, monitors, unavailable, now }) {
  const live = unavailable ? null : monitors
  const monitorOf = new Map(splitMonitored(groups.flatMap((g) => g.services), live).found.map((f) => [f.service.id, f.monitor]))
  return (
    <div className="dir">
      {groups.map((g) => (
        <ErrorBoundary key={g.name} label={g.name}>
          <Section title={g.name} className="grp">
            {downFirst(g.services, live).map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                status={live ? serviceStatus(s, live) : NO_DATA}
                monitor={monitorOf.get(s.id)}
                count={30}
                now={now}
              />
            ))}
          </Section>
        </ErrorBoundary>
      ))}
    </div>
  )
}
