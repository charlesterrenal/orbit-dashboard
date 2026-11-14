export default function Issues({ verdict }) {
  const items = [
    ...verdict.issues.map((text) => ({ text, tone: 'bad' })),
    ...verdict.unknown.map((u) => ({ text: `${u} unavailable`, tone: 'warn' })),
  ]
  if (!items.length) return null
  return (
    <section aria-label="Issues">
      <h2 className={`lbl ${verdict.issues.length ? "lbl-alert" : ""}`}>Needs attention</h2>
      <div className="issues">
        {items.map((it, i) => (
          <div key={it.text} className={`issue issue-${it.tone} rise`} style={{ '--i': i }}>{it.text}</div>
        ))}
      </div>
    </section>
  )
}
