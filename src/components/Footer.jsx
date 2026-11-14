import { PVE_MS, UPDATES_MS } from '../lib/intervals.js'
import { fmtDay, pollDown } from '../lib/status.js'

const LEVEL = { ok: '', warn: ' warn', crit: ' crit' }
const fine = (status) => status === 'success' || status === 'running'

function Cell({ label, cls = '', children }) {
  return <span className={`fi${cls}`}><em>{label}</em>{children}</span>
}

export default function Footer({ pve, updates, now }) {
  const pools = pollDown(pve, PVE_MS, now) ? null : pve.data?.pools
  const u = pollDown(updates, UPDATES_MS, now) ? null : updates.data
  const started = u?.started_at ? Date.parse(u.started_at) : NaN
  return (
    <footer className="foot">
      {pools?.length
        ? pools.map((p) => <Cell key={p.name} label={p.name} cls={LEVEL[p.level]}><b>{p.usedPct}%</b></Cell>)
        : <Cell label="storage"><b className="na">n/a</b></Cell>}
      <Cell label="last update" cls=" r">
        {u
          ? <><b>{Number.isNaN(started) ? 'n/a' : fmtDay(started)}</b><b className={fine(u.status) ? undefined : 'bad'}>{u.status}</b></>
          : <b className="na">n/a</b>}
      </Cell>
    </footer>
  )
}
