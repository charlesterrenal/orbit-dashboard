import { useEffect, useState } from 'react'
import { getConfig, getContainers, getKuma, getPve, getUpdates } from './lib/api.js'
import { pollDown } from './lib/status.js'
import { KUMA_MS, PVE_MS, UPDATES_MS } from './lib/intervals.js'
import { tabFromHash as parseTab } from './lib/tabs.js'
import { usePoll } from './lib/usePoll.js'
import Containers from './components/Containers.jsx'
import Directory from './components/Directory.jsx'
import Header from './components/Header.jsx'
import Monitoring from './components/Monitoring.jsx'
import Footer from './components/Footer.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Section from './components/Section.jsx'
import Strip from './components/Strip.jsx'

const tabFromHash = () => parseTab(location.hash)

function useNow(ms) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

// Owns all the polls; stays mounted across tab switches so polling never restarts.
function Dashboard({ config, tab, now }) {
  const kuma = usePoll(getKuma, KUMA_MS)
  const pve = usePoll(() => getPve(config.node), PVE_MS)
  const updates = usePoll(getUpdates, UPDATES_MS)
  const containers = usePoll(getContainers, UPDATES_MS)

  const kumaDown = pollDown(kuma, KUMA_MS, now)

  return (
    <>
      <Header tab={tab} now={now} />
      <Strip groups={config.groups} kuma={kuma} pve={pve} now={now} />
      {tab === 'directory' && (
        <>
          <Directory groups={config.groups} monitors={kuma.data} unavailable={kumaDown} now={now} />
          <Footer pve={pve} updates={updates} now={now} />
        </>
      )}
      {tab === 'monitoring' && (
        <Monitoring groups={config.groups} kuma={kuma} pve={pve} updates={updates} now={now} />
      )}
      {tab === 'containers' && (
        <ErrorBoundary label="container images"><Containers containers={containers} now={now} /></ErrorBoundary>
      )}
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
      <Header tab={tab} now={now} />
      {configError && (
        <Section title="config" alert>
          <p className="note">
            {configError.startsWith('invalid services.json') ? configError : `could not load services.json: ${configError}`}
          </p>
        </Section>
      )}
    </div>
  )
}
