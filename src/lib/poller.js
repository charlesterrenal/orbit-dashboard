// Next call is scheduled only after the previous settles; hidden tabs are skipped.
export function createPoller({ fn, intervalMs, isHidden, onData, onError }) {
  let timer
  let busy = false
  let dead = false

  async function run() {
    clearTimeout(timer)
    if (dead || busy || isHidden()) return
    busy = true
    try {
      const data = await fn()
      if (!dead) onData(data)
    } catch (e) {
      if (!dead) onError(e)
    }
    busy = false
    if (!dead) timer = setTimeout(run, intervalMs)
  }

  return {
    run,
    stop() {
      dead = true
      clearTimeout(timer)
    },
  }
}
