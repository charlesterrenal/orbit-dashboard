import { UPDATES_MS } from '../lib/intervals.js'
import { fmtDay, pollDown, unavailableLabel } from '../lib/status.js'
import Section from './Section.jsx'

const CT_STATUS = {
  behind: (ct) => [`${ct.behind} behind`, 'warn'],
  current: () => ['current', 'ok'],
  failed: (ct) => [ct.error ? 'check failed' : `${ct.failed} check failed`, 'crit'],
}
const ROW_STATUS = {
  behind: (c) => [c.newest ?? 'newer image', 'warn'],
  current: () => ['current', ''],
  local: () => ['not checked', ''],
  failed: () => ['check failed', 'crit'],
}

// One collapsible row per CT; CTs with anything behind or failed start open.
export default function Containers({ containers, now }) {
  const failed = pollDown(containers, UPDATES_MS, now)
  const d = failed ? null : containers.data
  const title = failed
    ? unavailableLabel('container images', containers.updatedAt)
    : d && `container images, ${d.behind ? `${d.behind} of ${d.total} behind` : `all ${d.total} current`}, checked ${fmtDay(d.checkedAt)}`
  return (
    <Section title={title || 'container images'} alert={failed} className="cu">
      {d && (
        <>
          <div className="cu-r cu-hd"><span /><span>ct / container</span><span>running</span><span>newest</span></div>
          {d.cts.map((ct) => {
            const [text, cls] = CT_STATUS[ct.state](ct)
            return (
              <details key={ct.id} open={ct.state !== 'current'}>
                <summary className={`cu-r cu-ct ${ct.state === 'failed' ? 'crit' : ''}`}>
                  <span className="cu-tg" aria-hidden="true" />
                  <span><b>{ct.id} {ct.name}</b><span className="cu-n">{ct.containers.length} container{ct.containers.length === 1 ? '' : 's'}</span></span>
                  <span />
                  <span className={cls}>{text}</span>
                </summary>
                {ct.error && <div className="cu-r cu-kid"><span /><span className="crit">{ct.error}</span><span /><span /></div>}
                {ct.containers.map((c) => {
                  const [newest, ncls] = ROW_STATUS[c.status](c)
                  const dim = c.status === 'local' || c.state !== 'running'
                  return (
                    <div key={c.name} className={`cu-r cu-kid ${dim ? 'dim' : ''}`} title={c.error || c.image}>
                      <span />
                      <span className="cu-nm">{c.name}{c.state !== 'running' && ` (${c.state})`}</span>
                      <span>{c.status === 'local' ? 'local' : c.running}</span>
                      <span className={ncls}>{newest}</span>
                    </div>
                  )
                })}
              </details>
            )
          })}
        </>
      )}
    </Section>
  )
}
