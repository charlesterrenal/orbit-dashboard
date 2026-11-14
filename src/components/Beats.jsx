import { useRef } from 'react'
import { barHeights } from '../lib/status.js'

const CLS = { 0: 'd', 2: 'p', 3: 'p' }

// Last `count` checks as thin bars. When a new check arrives the bars slide left by one;
// the first render and unchanged data stay still.
export default function Beats({ beats, pings, count, lastBeat }) {
  const prev = useRef(lastBeat)
  const moved = useRef(false)
  if (prev.current !== lastBeat) { moved.current = prev.current != null; prev.current = lastBeat }
  const shown = beats.slice(-count)
  return (
    <span key={lastBeat} className={moved.current ? 'beats shift' : 'beats'} aria-hidden="true">
      {barHeights(shown, pings.slice(-count)).map((h, i) => <i key={i} className={CLS[shown[i]]} style={{ '--h': `${h}%` }} />)}
    </span>
  )
}
