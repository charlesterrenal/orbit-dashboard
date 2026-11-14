import { useEffect, useRef, useState } from 'react'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Eases from the previous value to `value`; snaps when motion is reduced.
export function useCountUp(value, ms = 700) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (value == null || from.current == null || reduced()) {
      from.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms)
      const v = a + (value - a) * (1 - (1 - p) ** 3)
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])

  return shown
}
