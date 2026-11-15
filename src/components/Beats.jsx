import { useRef } from 'react'
import { heatLevels } from '../lib/status.js'

const CLS = { 0: 'd', 2: 'p', 3: 'p' }

// Last `count` checks as a heat strip: brighter is slower, older checks fade. When a new check arrives the cells slide left by one;
// the first render and unchanged data stay still.
export default function Beats({ beats, pings, count, lastBeat }) {
  const prev = useRef(lastBeat)
  const moved = useRef(false)
  if (prev.current !== lastBeat) { moved.current = prev.current != null; prev.current = lastBeat }
  const shown = beats.slice(-count)
  return (
    <span key={lastBeat} className={moved.current ? 'beats shift' : 'beats'} aria-hidden="true">
      {heatLevels(shown, pings.slice(-count)).map((o, i) => <i key={i} className={CLS[shown[i]]} style={{ '--o': o }} />)}
    </span>
  )
}
