import { useState, useEffect } from 'react';
import { Download, Upload, Activity, ExternalLink } from 'lucide-react';

const QbittorrentWidget = () => {
  const [stats, setStats] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      // Fetch global transfer info
      const transferRes = await fetch('/api/qbit/api/v2/transfer/info');
      if (!transferRes.ok) throw new Error('qBittorrent not accessible');
      const transferData = await transferRes.json();
      setStats(transferData);

      // Fetch active torrents count
      const activeRes = await fetch('/api/qbit/api/v2/torrents/info?filter=active');
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveCount(activeData.length || 0);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Update every 3s
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytes) => {
    if (!bytes || bytes === 0) return '0 B/s';
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / 1048576).toFixed(1)} MB/s`;
  };

  return (
    <div className="widget" style={{ marginBottom: '0' }}>
      <div className="card" style={{ padding: '14px 16px' }}>
        {/* Card Header Inside */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              qbittorrent
            </span>
            <a 
              href="http://192.168.254.203:8080" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              title="Open Web UI"
            >
              <ExternalLink size={12} style={{ cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'currentColor'} />
            </a>
          </div>
          {!loading && !error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-subtle)' }}>
              <Activity size={11} /> {activeCount} active
            </div>
          )}
        </div>
        {loading && !stats ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Connecting...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
            {/* Download (Left) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'color-mix(in srgb, var(--accent-dot) 12%, transparent)',
                color: 'var(--accent-dot)', flexShrink: 0
              }}>
                <Download size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 600 }}>down</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {formatSpeed(stats?.dl_info_speed)}
                </span>
              </div>
            </div>

            {/* Upload (Right) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
                color: 'var(--accent-blue)', flexShrink: 0
              }}>
                <Upload size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'lowercase', letterSpacing: '0.04em', fontWeight: 600 }}>up</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {formatSpeed(stats?.up_info_speed)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QbittorrentWidget;
