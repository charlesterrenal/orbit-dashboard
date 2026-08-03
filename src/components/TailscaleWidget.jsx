import { useState, useEffect } from 'react';
import { Network, Laptop, Smartphone, Server, Globe } from 'lucide-react';

const TailscaleWidget = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      const apiKey = import.meta.env.VITE_TAILSCALE_API_KEY;
      
      if (!apiKey || apiKey === 'your_tailscale_api_key_here') {
        setError('Missing Config');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/tailscale/api/v2/tailnet/-/devices`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        const allDevices = data.devices || [];
        
        // Sort by last seen, most recent first
        const sorted = allDevices.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
        
        setDevices(sorted);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Tailscale devices:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, []);

  const getDeviceIcon = (os) => {
    const lowerOS = (os || '').toLowerCase();
    if (lowerOS.includes('ios') || lowerOS.includes('android')) return <Smartphone size={16} />;
    if (lowerOS.includes('mac') || lowerOS.includes('windows')) return <Laptop size={16} />;
    return <Server size={16} />;
  };

  const getTimeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const activeCount = devices.filter(d => {
    const minutesSince = (new Date() - new Date(d.lastSeen)) / 60000;
    return minutesSince < 10; // Consider active if seen in last 10 mins
  }).length;

  return (
    <div className="widget" style={{ marginBottom: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Network size={14} /> TAILSCALE NETWORK
        </h3>
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-subtle)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: activeCount > 0 ? 'var(--accent-dot)' : 'var(--text-subtle)', boxShadow: activeCount > 0 ? '0 0 8px var(--accent-dot)' : 'none' }} />
            {activeCount} / {devices.length} active
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Loading network...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error === 'Missing Config' ? 'Add Tailscale API key & Tailnet to .env.local' : 'Connection failed'}
          </div>
        ) : devices.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Globe size={24} strokeWidth={1.5} opacity={0.5} />
            <span>No devices found</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devices.slice(0, 4).map((device) => {
              const isOnline = (new Date() - new Date(device.lastSeen)) / 60000 < 10;
              
              return (
                <div key={device.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: isOnline ? 'var(--accent-online)' : 'var(--text-subtle)' }}>
                      {getDeviceIcon(device.os)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                        {device.hostname.split('.')[0]}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
                        {device.addresses?.[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '11px', color: isOnline ? 'var(--accent-dot)' : 'var(--text-subtle)', display: 'flex', alignItems: 'center' }}>
                    {isOnline ? (
                      <div
                        title="online"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-dot)',
                          boxShadow: '0 0 8px var(--accent-dot)',
                          flexShrink: 0
                        }}
                      />
                    ) : getTimeAgo(device.lastSeen)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TailscaleWidget;
