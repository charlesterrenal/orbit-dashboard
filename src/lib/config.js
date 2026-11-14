const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function validUrl(u) {
  try {
    const { protocol } = new URL(u)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function parseServicesConfig(json) {
  const bad = (why) => new Error(`invalid services.json: ${why}`)
  if (!isObj(json)) throw bad('not an object')
  if (!Array.isArray(json.groups)) throw bad('groups must be an array')
  const warnings = []
  const groups = json.groups.map((g, i) => {
    if (!isObj(g) || typeof g.name !== 'string' || !Array.isArray(g.services)) {
      throw bad(`group ${i} needs name and services[]`)
    }
    const services = []
    for (const s of g.services) {
      const id = s?.id ?? '?'
      if (!s?.id || !s?.name) warnings.push(`${id}: missing id or name`)
      else if (!validUrl(s.url)) warnings.push(`${id}: url must be http(s)`)
      else services.push(s)
    }
    return { name: g.name, services }
  })
  return { node: json.node || 'pve', groups, warnings }
}
