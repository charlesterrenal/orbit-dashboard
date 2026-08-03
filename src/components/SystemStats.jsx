import { useState, useEffect } from 'react';
import { getClusterStatus } from '../api/proxmox';
import Tooltip from './Tooltip';
import ProgressBar from './ProgressBar';
import { ChevronDown, ChevronUp, Server } from 'lucide-react';

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  return `${days}d ${hours}h`;
};

const formatBytes = (bytes, unit = 'GB') => {
  const gb = bytes / (1024 ** 3);
  return unit === 'MB' ? `${(bytes / (1024 ** 2)).toFixed(0)} MB/s` : `${gb.toFixed(1)} GB`;
};

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getClusterStatus();
        setStats({
          cpu: (data.cpu * 100) || 0,
          memory: {
            used: data.memory?.used ? data.memory.used / (1024 ** 3) : 0,
            total: data.memory?.total ? data.memory.total / (1024 ** 3) : 32,
          },
          uptime: formatUptime(data.uptime || 0),
          disk: data.rootfs ? {
            used: data.rootfs.used / (1024 ** 3),
            total: data.rootfs.total / (1024 ** 3),
          } : null,
          netIn: data.netin ?? null,
          netOut: data.netout ?? null,
        });
        setError(null);
      } catch (err) {
        setStats({
          cpu: 24.5,
          memory: { used: 16.2, total: 32 },
          uptime: '14d 2h',
          disk: { used: 120, total: 500 },
          netIn: null,
          netOut: null,
        });
        setError('mock data — check credentials');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const memPercent = stats ? (stats.memory.used / stats.memory.total) * 100 : 0;
  const diskPercent = stats?.disk ? (stats.disk.used / stats.disk.total) * 100 : null;

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Server size={12} style={{ color: 'var(--text-subtle)' }} />
          <div className="widget-title" style={{ margin: 0 }}>proxmox · pve</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!error && (
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-dot)', animation: 'pulse 2s ease-in-out infinite' }} />
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '16px', aspectRatio: '2 / 1', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {error && <div style={{ fontSize: '10px', color: 'var(--accent-warning)' }}>{error}</div>}

            <Tooltip content="CPU load across all cores">
              <ProgressBar percent={stats?.cpu || 0} label="cpu" />
            </Tooltip>

            <Tooltip content={`${stats?.memory.used.toFixed(1)} GB / ${stats?.memory.total.toFixed(0)} GB`}>
              <ProgressBar percent={memPercent} label="ram" />
            </Tooltip>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>uptime</span>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{stats?.uptime}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStats;
