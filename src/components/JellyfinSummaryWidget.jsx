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

  return (
    <Link to="/media" style={{ textDecoration: 'none', display: 'block' }} title="Jellyfin Status">
      <div className="card service-card summary-widget-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        <HardDrive size={24} style={{ color: 'var(--text-subtle)' }} />
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
        ) : error ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-offline)' }}>Error</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
              {stats.active}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'lowercase', letterSpacing: '0.05em' }}>
              streams
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default JellyfinSummaryWidget;
