import { KUMA_MS, PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { downFirst, fmtBytes, fmtDate, pollDown, serviceStatus, splitMonitored, unavailableLabel } from '../lib/status.js'
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
    ['host', u.host_status ?? 'n/a', u.host_status === 'success' ? '' : 'crit'],
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

export default function Monitoring({ groups, kuma, pve, updates, now }) {
  return (
    <>
      <ErrorBoundary label="monitors"><Monitors groups={groups} kuma={kuma} now={now} /></ErrorBoundary>
      <div className="cols2">
        <ErrorBoundary label="storage"><Pools pve={pve} now={now} /></ErrorBoundary>
        <ErrorBoundary label="last update run"><LastRun updates={updates} now={now} /></ErrorBoundary>
      </div>
    </>
  )
}
