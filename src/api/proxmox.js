// Stub for Proxmox API integration
// In a real scenario, requests would be routed through Vite proxy to avoid CORS

export const getClusterStatus = async () => {
  // If no env variables are set, return mock data
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          cpu: 0.12,
          wait: 0.01,
          loadavg: ['1.23', '1.05', '0.98'],
          cpuinfo: { cpus: 12, model: 'Intel(R) Core(TM) i7-8700T CPU @ 2.40GHz' },
          memory: { total: 32000000000, used: 16000000000 },
          swap: { total: 8000000000, used: 1200000000 },
          uptime: 86400 * 14 + 3600 * 5,
          netin: 1048576 * 15,
          netout: 1048576 * 5,
          thermal: null // mock — no sensor data in dev
        });
      }, 500);
    });
  }

  try {
    const node = import.meta.env.VITE_PROXMOX_NODE || 'pve';
    // Use the Vite proxy prefix '/api/proxmox' configured in vite.config.js
    const response = await fetch(`/api/proxmox/nodes/${node}/status`, {
      headers: {
        'Authorization': `PVEAPIToken=${import.meta.env.VITE_PROXMOX_TOKEN_ID}=${import.meta.env.VITE_PROXMOX_SECRET}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    return {
      cpu: json.data.cpu,
      wait: json.data.wait || 0,
      loadavg: json.data.loadavg || [],
      cpuinfo: json.data.cpuinfo || {},
      memory: { total: json.data.memory.total, used: json.data.memory.used },
      swap: json.data.swap ? { total: json.data.swap.total, used: json.data.swap.used } : null,
      uptime: json.data.uptime,
      netin: json.data.netin || 0,
      netout: json.data.netout || 0,
      thermal: json.data.thermal ?? null,
    };
  } catch (error) {
    console.error("Proxmox API Error:", error);
    throw error;
  }
};

export const getNodeGuests = async () => {
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          vms:  { total: 6,  running: 5 },
          lxcs: { total: 16, running: 16 },
        });
      }, 500);
    });
  }

  try {
    const node = import.meta.env.VITE_PROXMOX_NODE || 'pve';
    const headers = {
      'Authorization': `PVEAPIToken=${import.meta.env.VITE_PROXMOX_TOKEN_ID}=${import.meta.env.VITE_PROXMOX_SECRET}`
    };

    const [vmRes, lxcRes] = await Promise.all([
      fetch(`/api/proxmox/nodes/${node}/qemu`, { headers }),
      fetch(`/api/proxmox/nodes/${node}/lxc`,  { headers }),
    ]);

    const [vmJson, lxcJson] = await Promise.all([vmRes.json(), lxcRes.json()]);

    const vms  = vmJson.data  || [];
    const lxcs = lxcJson.data || [];

    return {
      vms:  { total: vms.length,  running: vms.filter(v  => v.status === 'running').length },
      lxcs: { total: lxcs.length, running: lxcs.filter(c => c.status === 'running').length },
    };
  } catch (error) {
    console.error("Proxmox Guests Error:", error);
    return null;
  }
};

export const getStorageStatus = async () => {
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { storage: 'local', total: 100000000000, used: 45000000000 },
          { storage: 'nas-mount', total: 2000000000000, used: 1500000000000 }
        ]);
      }, 500);
    });
  }

  try {
    const node = import.meta.env.VITE_PROXMOX_NODE || 'pve';
    const response = await fetch(`/api/proxmox/nodes/${node}/storage`, {
      headers: {
        'Authorization': `PVEAPIToken=${import.meta.env.VITE_PROXMOX_TOKEN_ID}=${import.meta.env.VITE_PROXMOX_SECRET}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    return json.data.map(store => ({
      storage: store.storage,
      total: store.total || 0,
      used: store.used || 0
    }));
  } catch (error) {
    console.error("Proxmox API Storage Error:", error);
    throw error;
  }
};


export const getSyslog = async (limit = 20) => {
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { n: 1, t: "Aug 06 12:30:15 pve systemd[1]: Started Crafty Controller." },
          { n: 2, t: "Aug 06 12:35:02 pve pveproxy[1234]: proxy error" },
          { n: 3, t: "Aug 06 14:10:44 pve apt-get: update complete" }
        ]);
      }, 500);
    });
  }

  try {
    const node = import.meta.env.VITE_PROXMOX_NODE || "pve";
    // Using the /journal endpoint with lastentries fetches the most recent logs
    const response = await fetch(`/api/proxmox/nodes/${node}/journal?lastentries=${limit}`, {
      headers: {
        "Authorization": `PVEAPIToken=${import.meta.env.VITE_PROXMOX_TOKEN_ID}=${import.meta.env.VITE_PROXMOX_SECRET}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error("Proxmox Syslog Error:", error);
    throw error;
  }
};

