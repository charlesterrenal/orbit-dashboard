import { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';

const JellyfinSummaryWidget = () => {
  const [stats, setStats] = useState({ active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      const apiKey = import.meta.env.VITE_JELLYFIN_API_KEY;
      if (!apiKey || apiKey === 'your_jellyfin_api_key_here') {
        setError('Missing Config');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/jellyfin/Sessions', {
          headers: { 'X-Emby-Token': apiKey }
        });
        
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        const activeSessions = data.filter(s => s.NowPlayingItem).length;
        setStats({ active: activeSessions });
        setError(null);
      } catch (err) {
        setError('Error');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const isStreaming = stats.active > 0;

  return (
    <Link to="/services" style={{ textDecoration: 'none', display: 'block', height: '100%' }} title="Jellyfin Status">
      <div className="card service-card summary-widget-content">
        {/* Top: Standard Widget Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HardDrive size={13} className="icon-mono" />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'lowercase' }}>
              media
            </span>
          </div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isStreaming ? 'var(--accent-dot)' : 'var(--text-subtle)',
            animation: isStreaming ? 'pulse 2s ease-in-out infinite' : 'none',
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
              active streams
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
          <span>{isStreaming ? `${stats.active} streaming` : 'server idle'}</span>
        </div>
      </div>
    </Link>
  );
};

export default JellyfinSummaryWidget;
