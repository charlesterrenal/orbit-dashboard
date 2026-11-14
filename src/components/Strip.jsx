import { KUMA_MS, PVE_MS } from '../lib/intervals.js'
import { pollDown, summarize, unavailableLabel, uptimeParts } from '../lib/status.js'
import Section from './Section.jsx'
import Tick from './Tick.jsx'

const LEVEL = { ok: '', warn: ' warn', crit: ' crit' }

function Meter({ label, value, pct, level = '' }) {
  return (
    <div className={`mt${level}`}>
      <span className="ml" title={label}>{label}</span>
      <span className="mb"><i style={{ width: `${pct ?? 0}%` }} /></span>
      <b className={value == null ? 'na' : undefined}>{value ?? 'n/a'}</b>
    </div>
  )
}

function Services({ s, failed, kuma }) {
  const known = s.up != null
  return (
    <Section
      title={failed ? unavailableLabel('services', kuma.updatedAt) : 'services'}
      alert={failed}
      tip={s.downNames.join(', ')}
    >
      {known
        ? <b className={`big ${s.down > 0 ? 'bad' : 'ok'}`}><Tick value={s.up} /><small>of {s.total} up</small></b>
        : <b className="big na">n/a</b>}
      {known && (s.groups.length > 0 || s.unmonitored > 0) && (
        <div className="gls">
          {s.groups.map((g) => (
            <div key={g.name} className={g.down ? 'gl bad' : 'gl'}><span>{g.name}</span><b>{g.up} of {g.total}</b></div>
          ))}
          {s.unmonitored > 0 && <div className="gl dim"><span>not monitored</span><b>{s.unmonitored}</b></div>}
        </div>
      )}
    </Section>
  )
}

function Server({ p, pool, failed, pve }) {
  const up = p && uptimeParts(p.uptimeSec)
  const title = failed ? unavailableLabel('server', pve.updatedAt) : up ? `server, up ${up.value} ${up.unit}` : 'server'
  const mem = p && Math.round((p.memUsed / p.memTotal) * 100)
  return (
    <Section title={title} alert={failed}>
      <Meter label="cpu" value={p && `${p.cpuPct}%`} pct={p?.cpuPct} />
      <Meter label="memory" value={p && `${mem}%`} pct={mem} />
      <Meter label={pool ? pool.name : 'disk'} value={pool && `${pool.usedPct}%`} pct={pool?.usedPct} level={pool ? LEVEL[pool.level] : ''} />
      <Meter
        label="containers"
        value={p && `${p.lxcRunning} of ${p.lxcTotal}`}
        pct={p && (p.lxcTotal ? (p.lxcRunning / p.lxcTotal) * 100 : 0)}
      />
    </Section>
  )
}

export default function Strip({ groups, kuma, pve, now }) {
  const failed = { kuma: pollDown(kuma, KUMA_MS, now), pve: pollDown(pve, PVE_MS, now), updates: false }
  const s = summarize({ groups, monitors: kuma.data, pools: pve.data?.pools ?? null, failed })
  return (
    <div className="top">
      <Services s={s} failed={failed.kuma} kuma={kuma} />
      <Server p={failed.pve ? null : pve.data} pool={s.fullestPool} failed={failed.pve} pve={pve} />
    </div>
  )
}
