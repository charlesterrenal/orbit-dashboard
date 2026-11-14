import { useEffect, useRef, useState } from 'react'
import { createPoller } from './poller.js'

export function usePoll(fn, intervalMs) {
  const [state, setState] = useState({ data: null, error: null, updatedAt: null, resumedAt: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const poller = createPoller({
      fn: () => fnRef.current(),
      intervalMs,
      isHidden: () => document.hidden,
      onData: (data) => setState({ data, error: null, updatedAt: Date.now() }),
      onError: (error) => setState((s) => ({ ...s, error })),
    })
    const onVisible = () => {
      if (document.hidden) return
      setState((s) => ({ ...s, resumedAt: Date.now() }))
      poller.run()
    }
    document.addEventListener('visibilitychange', onVisible)
    poller.run()
    return () => {
      poller.stop()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])

  return state
}
