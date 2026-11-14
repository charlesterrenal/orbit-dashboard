// Heading with a thin rule after it; the only grouping device on the page.
export default function Section({ title, alert, tip, className, children }) {
  return (
    <section className={className}>
      <h3 className={alert ? 'alert' : undefined} title={tip || undefined}>{title}</h3>
      {children}
    </section>
  )
}
