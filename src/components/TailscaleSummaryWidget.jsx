import { useState, useEffect } from 'react';
import { SiTailscale } from '@icons-pack/react-simple-icons';
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

  const isNominal = stats.total > 0 && stats.active === stats.total;

  return (
    <Link to="/services" style={{ textDecoration: 'none', display: 'block', height: '100%' }} title="Tailscale Overview">
      <div className="card service-card summary-widget-content">
        {/* Top: Standard Widget Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SiTailscale size={13} className="icon-mono" />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'lowercase' }}>
              tailscale
            </span>
          </div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: stats.active > 0 ? 'var(--accent-dot)' : 'var(--accent-offline)',
            animation: stats.active > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
            flexShrink: 0
          }} />
        </div>

        {/* Middle: Commanding Hero Metric */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 'auto 0' }}>
            <div className="skeleton" style={{ width: '48px', height: '28px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '64px', height: '12px', borderRadius: '4px' }} />
          </div>
        ) : error ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-offline)', margin: 'auto 0' }}>Error</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: 'auto 0' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.active}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              / {stats.total} peers online
            </div>
          </div>
        )}

        {/* Bottom: Operational Status Delta */}
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{stats.total - stats.active > 0 ? `${stats.total - stats.active} idle` : 'mesh nominal'}</span>
        </div>
      </div>
    </Link>
  );
};

export default TailscaleSummaryWidget;
