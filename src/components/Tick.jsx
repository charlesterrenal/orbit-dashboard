import { useRef } from 'react'

// A changed value slides up into place. The first value never animates; once it has
// changed, the class stays on and each new value is a new element (key), so only
// real changes replay the animation.
export default function Tick({ value }) {
  const prev = useRef(value)
  const changed = useRef(false)
  if (prev.current !== value) { prev.current = value; changed.current = true }
  return <span key={value} className={changed.current ? 'tv tick' : 'tv'}>{value}</span>
}
