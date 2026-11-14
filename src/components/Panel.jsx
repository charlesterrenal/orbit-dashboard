import { fmtAgo } from '../lib/status.js'

function agoText(updatedAt, now) {
  const a = fmtAgo(now - updatedAt)
  return a === 'just now' ? a : `${a} ago`
}

// Children stay visible when unavailable only if the caller passes them (the directory keeps its links).
export default function Panel({ label, unavailable, updatedAt, now, flush, children }) {
  return (
    <section>
      <h2 className="lbl">{label}</h2>
      <div className={flush ? 'pn pn-flush' : 'pn'}>
        {unavailable && (
          <p className="note">
            {updatedAt ? `unavailable · last data ${agoText(updatedAt, now)}` : 'unavailable'}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
