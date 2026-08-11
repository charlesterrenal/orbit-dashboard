let monitorCache = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30s

export const fetchUptimeStatuses = async () => {
  if (monitorCache && Date.now() - cacheTime < CACHE_TTL) {
    return monitorCache;
  }

  try {
    // 1. Fetch monitor names from the public config
    const configRes = await fetch('/api/uptime/api/status-page/default');
    if (!configRes.ok) throw new Error('Status page config not found');
    const configData = await configRes.json();
    
    const monitors = {};
    (configData.publicGroupList || []).forEach(group => {
      (group.monitorList || []).forEach(m => {
        monitors[m.id] = m.name;
      });
    });

    // 2. Fetch the actual heartbeat history
    const hbRes = await fetch('/api/uptime/api/status-page/heartbeat/default');
    if (!hbRes.ok) throw new Error('Heartbeat data not found');
    const hbData = await hbRes.json();

    const statusMap = {};
    const heartbeatList = hbData.heartbeatList || {};
    const uptimeList = hbData.uptimeList || {};

    Object.entries(heartbeatList).forEach(([id, beats]) => {
      const name = monitors[id];
      if (!name || !beats?.length) return;
      const latest = beats[beats.length - 1];
      
      const uptimeDecimal = uptimeList[`${id}_24`];
      const uptimePercentage = uptimeDecimal !== undefined ? (uptimeDecimal * 100) : null;

      statusMap[name.toLowerCase()] = {
        status: latest.status === 1 ? 'online' : (latest.status === 0 ? 'offline' : 'pending'),
        ping: latest.ping ?? null,
        uptime: uptimePercentage,
        beats: beats.slice(-24).map(b => b.status === 1 ? 1 : 0),
      };
    });

    monitorCache = statusMap;
    cacheTime = Date.now();
    return statusMap;
  } catch (e) {
    console.warn('[UptimeKuma] Fetch failed:', e.message);
    return {};
  }
};
