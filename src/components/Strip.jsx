import { KUMA_MS, PVE_MS } from '../lib/intervals.js'
import { pollDown, summarize, unavailableLabel, uptimeParts } from '../lib/status.js'
import Section from './Section.jsx'
import Tick from './Tick.jsx'

function Field({ label, value, unit, level }) {
  return (
    <div className={`f${level ? ` ${level}` : ''}`}>
      <span>{label}</span>
      {value == null
        ? <b className="na">n/a</b>
        : <b><Tick value={value} />{unit && <small>{unit}</small>}</b>}
    </div>
  )
}

const LEVEL = { ok: undefined, warn: 'warn', crit: 'crit' }

export default function Strip({ groups, kuma, pve, now }) {
  const failed = { kuma: pollDown(kuma, KUMA_MS, now), pve: pollDown(pve, PVE_MS, now), updates: false }
  const s = summarize({ groups, monitors: kuma.data, pools: pve.data?.pools ?? null, failed })
  const p = failed.pve ? null : pve.data
  const up = p && uptimeParts(p.uptimeSec)
  const pool = s.fullestPool
  return (
    <div className="strip">
      <Section title={failed.pve ? unavailableLabel('server', pve.updatedAt) : 'server'} alert={failed.pve}>
        <div className="fs">
          <Field label="uptime" value={up?.value} unit={up?.unit} />
          <Field label="cpu" value={p?.cpuPct} unit="%" />
          <Field label="memory" value={p && Math.round((p.memUsed / p.memTotal) * 100)} unit="%" />
          <Field label={pool ? `disk ${pool.name}` : 'disk'} value={pool?.usedPct} unit="%" level={pool && LEVEL[pool.level]} />
          <Field label="containers" value={p?.lxcRunning} unit={p && `of ${p.lxcTotal}`} />
        </div>
      </Section>
      <Section
        title={failed.kuma ? unavailableLabel('services', kuma.updatedAt) : 'services'}
        alert={failed.kuma}
        tip={s.downNames.join(', ')}
      >
        <div className="fs">
          <Field label="up" value={s.up} />
          <Field label="down" value={s.down} level={s.down > 0 ? 'crit' : undefined} />
        </div>
      </Section>
    </div>
  )
}
