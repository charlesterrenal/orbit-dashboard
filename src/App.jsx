import { useEffect, useState } from 'react'
import { getConfig, getKuma, getPve, getUpdates } from './lib/api.js'
import { isStale, uptimeSummary, verdict as computeVerdict } from './lib/status.js'
import { KUMA_MS, PVE_MS, UPDATES_MS } from './lib/intervals.js'
import { usePoll } from './lib/usePoll.js'
import Directory from './components/Directory.jsx'
import Header from './components/Header.jsx'
import Issues from './components/Issues.jsx'
import Monitoring from './components/Monitoring.jsx'
import Panel from './components/Panel.jsx'
import Rail from './components/Rail.jsx'

const tabFromHash = () => (location.hash === '#/monitoring' ? 'monitoring' : 'directory')

function useNow(ms) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

// Owns all three polls; stays mounted across tab switches so polling never restarts.
function Dashboard({ config, tab, now }) {
  const kuma = usePoll(getKuma, KUMA_MS)
  const pve = usePoll(() => getPve(config.node), PVE_MS)
  const updates = usePoll(getUpdates, UPDATES_MS)

  const verdict = computeVerdict({
    monitors: kuma.data,
    pve: pve.data,
    updates: updates.data,
    errors: { kuma: kuma.error, pve: pve.error, updates: updates.error },
  })
  const kumaDown = kuma.error != null || (kuma.updatedAt != null && isStale(kuma.updatedAt, KUMA_MS, now))

  return (
    <>
      <Header
        verdict={verdict}
        updatedAt={kuma.updatedAt}
        tab={tab}
        now={now}
        pve={pve}
        updates={updates}
        summary={kumaDown ? { up: 0, total: 0 } : uptimeSummary(config.groups.flatMap((g) => g.services), kuma.data)}
      />
      <div className="layout">
        <main>
          <Issues verdict={verdict} />
          {tab === 'directory' && (
            <Directory
              groups={config.groups}
              monitors={kuma.data}
              unavailable={kumaDown}
              updatedAt={kuma.updatedAt}
              now={now}
            />
          )}
          {tab === 'monitoring' && (
            <Monitoring
              groups={config.groups}
              monitors={kuma.data}
              kuma={kuma}
              pve={pve}
              updates={updates}
              now={now}
            />
          )}
        </main>
        {tab === 'directory' && <Rail node={config.node} pve={pve} updates={updates} now={now} />}
      </div>
    </>
  )
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState(null)
  const now = useNow(30000)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // Retry until loaded: a restored tab may start before the network is up.
  useEffect(() => {
    let timer
    let dead = false
    const load = () => getConfig().then(
      (c) => {
        c.warnings.forEach((w) => console.warn(`services.json: ${w}`))
        if (!dead) { setConfigError(null); setConfig(c) }
      },
      (e) => {
        if (dead) return
        setConfigError(e.message)
        if (!e.message.startsWith('invalid services.json')) timer = setTimeout(load, 10000)
      },
    )
    load()
    return () => { dead = true; clearTimeout(timer) }
  }, [])

  if (config) {
    return <div className="page"><Dashboard config={config} tab={tab} now={now} /></div>
  }
  return (
    <div className="page">
      <Header verdict={{ state: 'unknown', issues: [], unknown: ['config'] }} updatedAt={null} tab={tab} now={now} />
      <div className="layout layout-one">
        <main>
          {configError && (
            <Panel label="Config">
              <p className="note bad">
                {configError.startsWith('invalid services.json') ? configError : `could not load services.json: ${configError}`}
              </p>
            </Panel>
          )}
        </main>
      </div>
    </div>
  )
}
