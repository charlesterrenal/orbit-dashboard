import { serviceStatus } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Panel from './Panel.jsx'
import ServiceRow from './ServiceRow.jsx'

const NO_DATA = { state: 'nodata', ping: null, since: null }

export default function Directory({ groups, monitors, unavailable, updatedAt, now }) {
  return groups.map((g) => (
    <ErrorBoundary key={g.name} label={g.name}>
      <Panel label={g.name} unavailable={unavailable} updatedAt={updatedAt} now={now} flush>
        <div className="grid3">
          {g.services.map((s) => (
            <ServiceRow key={s.id} service={s} now={now} status={monitors ? serviceStatus(s, monitors) : NO_DATA} />
          ))}
        </div>
      </Panel>
    </ErrorBoundary>
  ))
}
