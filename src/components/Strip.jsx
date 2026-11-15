import { useRef } from 'react'
import { KUMA_MS, PVE_MS } from '../lib/intervals.js'
import { pollDown, sparkPoints, summarize, unavailableLabel, uptimeParts } from '../lib/status.js'
import Section from './Section.jsx'
import Tick from './Tick.jsx'

const LEVEL = { ok: '', warn: ' warn', crit: ' crit' }

const SPAN = 60 // samples kept: 5 minutes at the 5s poll

// Last SPAN values; each new sample shifts the line left by one step (1 user unit = 1px in SVG transforms).
function Spark({ hist, n }) {
  const pts = sparkPoints(hist, SPAN)
  const first = SPAN - hist.length
  return (
    <svg className="spark" viewBox={`0 0 ${SPAN - 1} 20`} preserveAspectRatio="none" aria-hidden="true">
      <g key={n} className={n > 1 ? 'sh' : undefined}>
        <polygon points={`${first},20 ${pts} ${SPAN - 1},20`} />
        <polyline points={pts} />
      </g>
    </svg>
  )
}

function Meter({ label, value, pct, level = '', hist, n }) {
  return (
    <div className={`mt${level}${hist ? ' sp' : ''}`}>
      <span className="ml" title={label}>{label}</span>
      {hist && hist.length > 1 ? <Spark hist={hist} n={n} /> : <span className="mb"><i style={{ width: `${pct ?? 0}%` }} /></span>}
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
  const hist = useRef({ at: null, cpu: [], mem: [] }).current
  if (p && pve.updatedAt !== hist.at) {
    hist.at = pve.updatedAt
    hist.n = (hist.n ?? 0) + 1
    hist.cpu = [...hist.cpu, p.cpuPct].slice(-SPAN)
    hist.mem = [...hist.mem, mem].slice(-SPAN)
  }
  return (
    <Section title={title} alert={failed}>
      <Meter label="cpu" value={p && <Tick value={`${p.cpuPct}%`} />} pct={p?.cpuPct} hist={p && hist.cpu} n={hist.n} />
      <Meter label="memory" value={p && <Tick value={`${mem}%`} />} pct={mem} hist={p && hist.mem} n={hist.n} />
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
