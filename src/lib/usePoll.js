import { useEffect, useRef, useState } from 'react'

// Next call is scheduled only after the previous settles; hidden tabs pause.
export function usePoll(fn, intervalMs) {
  const [state, setState] = useState({ data: null, error: null, updatedAt: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let timer
    let busy = false
    let dead = false

    const run = async () => {
      clearTimeout(timer)
      if (dead || busy || document.hidden) return
      busy = true
      try {
        const data = await fnRef.current()
        if (!dead) setState({ data, error: null, updatedAt: Date.now() })
      } catch (error) {
        if (!dead) setState((s) => ({ ...s, error }))
      }
      busy = false
      if (!dead) timer = setTimeout(run, intervalMs)
    }
    const onVisible = () => { if (!document.hidden) run() }

    document.addEventListener('visibilitychange', onVisible)
    run()
    return () => {
      dead = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return state
}
