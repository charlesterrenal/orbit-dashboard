import { useState, useEffect } from 'react';
import { Download, Upload, Activity, ExternalLink } from 'lucide-react';
import { SiQbittorrent } from '@icons-pack/react-simple-icons';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="widget-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SiQbittorrent size={14} color="#2F67BA" /> qbittorrent
          </div>
          <a 
            href="http://192.168.254.203:8080" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s', marginTop: '2px' }}
            title="Open Web UI"
          >
            <ExternalLink size={12} style={{ cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'currentColor'} />
          </a>
        </h3>
        {!loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-subtle)' }}>
            <Activity size={10} /> {activeCount} active
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '16px' }}>
        {loading && !stats ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Connecting...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'var(--accent-dot)' }}>
                  <Download size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Download</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatSpeed(stats?.dl_info_speed)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'var(--accent-blue)' }}>
                  <Upload size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Upload</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatSpeed(stats?.up_info_speed)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QbittorrentWidget;
