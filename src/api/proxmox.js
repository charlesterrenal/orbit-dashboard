// Stub for Proxmox API integration
// In a real scenario, requests would be routed through Vite proxy to avoid CORS

export const getClusterStatus = async () => {
  // If no env variables are set, return mock data
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          cpu: 0.12,
          memory: { total: 32000000000, used: 16000000000 },
          uptime: 86400 * 14 + 3600 * 5, // 14 days, 5 hours
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
      memory: { total: json.data.memory.total, used: json.data.memory.used },
      uptime: json.data.uptime
    };
  } catch (error) {
    console.error("Proxmox API Error:", error);
    throw error;
  }
};
