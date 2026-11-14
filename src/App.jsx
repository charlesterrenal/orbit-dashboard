import { useEffect, useState } from 'react'
import { getConfig, getKuma } from './lib/api.js'
import { isStale, verdict as computeVerdict } from './lib/status.js'
import { usePoll } from './lib/usePoll.js'
import Directory from './components/Directory.jsx'
import Header from './components/Header.jsx'
import Panel from './components/Panel.jsx'

const KUMA_MS = 60000
const tabFromHash = () => (location.hash === '#/monitoring' ? 'monitoring' : 'directory')

function useNow(ms) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState(null)
  const kuma = usePoll(getKuma, KUMA_MS)
  const now = useNow(30000)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    getConfig().then(
      (c) => {
        c.warnings.forEach((w) => console.warn(`services.json: ${w}`))
        setConfig(c)
      },
      (e) => setConfigError(e.message),
    )
  }, [])

  const verdict = computeVerdict({
    monitors: kuma.data,
    pve: null,
    updates: null,
    errors: { kuma: kuma.error },
  })
  const kumaDown = kuma.error != null || (kuma.updatedAt != null && isStale(kuma.updatedAt, KUMA_MS, now))

  return (
    <div className="page">
      <Header verdict={verdict} updatedAt={kuma.updatedAt} tab={tab} />
      <div className="layout">
        <aside className="rail" />
        <main>
          {configError && (
            <Panel label="Config">
              <p className="note bad">
                {configError.startsWith('invalid services.json') ? configError : `invalid services.json: ${configError}`}
              </p>
            </Panel>
          )}
          {config && tab === 'directory' && (
            <Directory
              groups={config.groups}
              monitors={kuma.data}
              unavailable={kumaDown}
              updatedAt={kuma.updatedAt}
              now={now}
            />
          )}
        </main>
      </div>
    </div>
  )
}
