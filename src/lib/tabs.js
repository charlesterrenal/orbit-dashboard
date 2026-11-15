export const TABS = ['directory', 'monitoring', 'containers']

// '#/monitoring' -> 'monitoring'; an unknown or empty hash falls back to the first tab.
export const tabFromHash = (hash) => {
  const t = hash.replace(/^#\//, '')
  return TABS.includes(t) ? t : TABS[0]
}
