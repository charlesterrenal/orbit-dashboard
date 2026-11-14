import { serviceStatus, splitMonitored } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import FeaturedCard from './FeaturedCard.jsx'
import Panel from './Panel.jsx'
import ServiceRow from './ServiceRow.jsx'

const NO_DATA = { state: 'nodata', ping: null, since: null }

export default function Directory({ groups, monitors, unavailable, updatedAt, now }) {
  const statusOf = (s) => (monitors && !unavailable ? serviceStatus(s, monitors) : NO_DATA)
  const featured = groups.flatMap((g) => g.services).filter((s) => s.featured)
  const monitorOf = new Map(splitMonitored(featured, monitors).found.map((f) => [f.service.id, f.monitor]))
  return (
    <>
      {featured.length > 0 && (
        <ErrorBoundary label="Featured">
          <section>
            <h2 className="lbl">Featured</h2>
            <div className="fgrid">
              {featured.map((s, i) => (
                <FeaturedCard key={s.id} service={s} index={i} now={now} status={statusOf(s)} monitor={unavailable ? null : monitorOf.get(s.id)} />
              ))}
            </div>
          </section>
        </ErrorBoundary>
      )}
      {groups.map((g) => {
        const rest = g.services.filter((s) => !s.featured)
        if (!rest.length) return null
        return (
          <ErrorBoundary key={g.name} label={g.name}>
            <Panel label={g.name} unavailable={unavailable} updatedAt={updatedAt} now={now} flush>
              <div className="grid3">
                {rest.map((s) => <ServiceRow key={s.id} service={s} now={now} status={statusOf(s)} />)}
              </div>
            </Panel>
          </ErrorBoundary>
        )
      })}
    </>
  )
}
