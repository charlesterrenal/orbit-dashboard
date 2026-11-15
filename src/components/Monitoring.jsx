import { KUMA_MS, PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { downFirst, fmtBytes, fmtDate, fmtDay, pollDown, serviceStatus, splitMonitored, unavailableLabel } from '../lib/status.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import Section from './Section.jsx'
import ServiceRow from './ServiceRow.jsx'

const NONE = { state: 'none', ping: null, since: null }
const fine = (status) => status === 'success' || status === 'running'
const when = (iso) => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? 'n/a' : fmtDate(t)
}

function Monitors({ groups, kuma, now }) {
  const failed = pollDown(kuma, KUMA_MS, now)
  const live = failed ? null : kuma.data
  const { found, missing } = splitMonitored(groups.flatMap((g) => g.services), live)
  const monitorOf = new Map(found.map((f) => [f.service.id, f.monitor]))
  return (
    <Section
      title={failed ? unavailableLabel('monitors', kuma.updatedAt) : 'monitors, last 50 checks, bar height is response time'}
      alert={failed}
      className="mon"
    >
      {downFirst(found.map((f) => f.service), live).map((s) => (
        <ServiceRow key={s.id} service={s} status={serviceStatus(s, live)} monitor={monitorOf.get(s.id)} count={50} now={now} />
      ))}
      {missing.map((s) => <ServiceRow key={s.id} service={s} status={NONE} count={50} now={now} />)}
    </Section>
  )
}

function Pools({ pve, now }) {
  const failed = pollDown(pve, PVE_MS, now)
  const pools = failed ? null : pve.data?.pools
  return (
    <Section title={failed ? unavailableLabel('storage', pve.updatedAt) : 'storage'} alert={failed}>
      {pools && (
        <table>
          <thead><tr><th>pool</th><th className="n">used</th><th className="n">total</th><th /></tr></thead>
          <tbody>
            {pools.map((p) => (
              <tr key={p.name} className={p.level}>
                <td>{p.name}</td>
                <td className="n">{fmtBytes(p.used)}</td>
                <td className="n">{fmtBytes(p.total)}</td>
                <td><span className={`meter ${p.level}`}><i style={{ width: `${p.usedPct}%` }} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function LastRun({ updates, now }) {
  const failed = pollDown(updates, UPDATES_MS, now)
  const u = failed ? null : updates.data
  const rows = u && [
    ['status', u.status, u.status === 'success' ? 'ok' : fine(u.status) ? '' : 'crit'],
    ['started', when(u.started_at)],
    ['completed', when(u.completed_at)],
    ['host', u.host_status ?? 'n/a', u.host_status === 'failed' ? 'crit' : ''],
    ['containers', `${u.containers_ok} of ${u.containers_total} updated`],
    ['errors', u.errors || 'none', u.errors ? 'crit' : ''],
    ['next run', u.next_run ?? 'n/a'],
  ]
  return (
    <Section title={failed ? unavailableLabel('last update run', updates.updatedAt) : 'last update run'} alert={failed}>
      {rows && (
        <table className="kvt">
          <tbody>
            {rows.map(([k, v, cls]) => (
              <tr key={k}><th>{k}</th><td className={cls || undefined}>{v}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

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
function ContainerImages({ containers, now }) {
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

export default function Monitoring({ groups, kuma, pve, updates, containers, now }) {
  return (
    <>
      <ErrorBoundary label="monitors"><Monitors groups={groups} kuma={kuma} now={now} /></ErrorBoundary>
      <div className="cols2">
        <ErrorBoundary label="storage"><Pools pve={pve} now={now} /></ErrorBoundary>
        <ErrorBoundary label="last update run"><LastRun updates={updates} now={now} /></ErrorBoundary>
      </div>
      <ErrorBoundary label="container images"><ContainerImages containers={containers} now={now} /></ErrorBoundary>
    </>
  )
}
