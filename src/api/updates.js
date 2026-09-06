// API module for fetching system update status
// Reads from:
//   1. A status JSON served by a tiny HTTP server on the Proxmox host (port 8199)
//   2. The Proxmox API for real-time pending package counts

export const getUpdateStatus = async () => {
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'success',
          started_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 86400000 + 300000).toISOString(),
          host_status: 'success',
          containers_total: 5,
          containers_ok: 5,
          errors: '',
          next_run: 'Sunday 04:00 AM',
        });
      }, 500);
    });
  }

  try {
    const response = await fetch('/api/updates/status.json');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Update Status Error:', error);
    throw error;
  }
};

export const getPendingUpdates = async () => {
  if (!import.meta.env.VITE_PROXMOX_URL) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ count: 3, packages: [] }), 500);
    });
  }

  try {
    const node = import.meta.env.VITE_PROXMOX_NODE || 'pve';
    const response = await fetch(`/api/proxmox/nodes/${node}/apt/update`, {
      headers: {
        'Authorization': `PVEAPIToken=${import.meta.env.VITE_PROXMOX_TOKEN_ID}=${import.meta.env.VITE_PROXMOX_SECRET}`,
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const json = await response.json();
    return { count: (json.data || []).length, packages: json.data || [] };
  } catch (error) {
    console.error('Pending Updates Error:', error);
    return { count: 0, packages: [] };
  }
};
