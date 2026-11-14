import { useRef } from 'react'

const CLS = { 0: 'd', 2: 'p', 3: 'p' }

// Last `count` checks as thin bars. When a new check arrives the bars slide left by one;
// the first render and unchanged data stay still.
export default function Beats({ beats, count, lastBeat }) {
  const prev = useRef(lastBeat)
  const moved = useRef(false)
  if (prev.current !== lastBeat) { moved.current = prev.current != null; prev.current = lastBeat }
  return (
    <span key={lastBeat} className={moved.current ? 'beats shift' : 'beats'} aria-hidden="true">
      {beats.slice(-count).map((b, i) => <i key={i} className={CLS[b]} />)}
    </span>
  )
}
