import { useState, useEffect } from 'react';
import { Network } from 'lucide-react';
import { Link } from 'react-router-dom';

const TailscaleSummaryWidget = () => {
  const [stats, setStats] = useState({ total: 0, active: 0 });
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
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const allDevices = data.devices || [];
        
        const active = allDevices.filter(d => {
          const minutesSince = (new Date() - new Date(d.lastSeen)) / 60000;
          return minutesSince < 10;
        }).length;
        
        setStats({ total: allDevices.length, active });
        setError(null);
      } catch (err) {
        setError('Error');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return (
    <Link to="/services" style={{ textDecoration: 'none', display: 'block' }} title="Tailscale Overview">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', width: '100%', aspectRatio: '1 / 1', boxSizing: 'border-box' }}>
        <Network size={24} style={{ color: 'var(--text-subtle)' }} />
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
        ) : error ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-offline)' }}>Error</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
              {stats.active}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/{stats.total}</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stats.active > 0 ? 'var(--accent-online)' : 'var(--text-subtle)', boxShadow: stats.active > 0 ? '0 0 8px var(--accent-online)' : 'none' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                online
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
};

export default TailscaleSummaryWidget;
