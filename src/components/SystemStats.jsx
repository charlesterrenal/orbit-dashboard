import { useState, useEffect } from 'react';
import { getClusterStatus } from '../api/proxmox';
import Tooltip from './Tooltip';
import ProgressBar from './ProgressBar';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SiProxmox } from '@icons-pack/react-simple-icons';

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
          wait: (data.wait * 100) || 0,
          loadavg: data.loadavg || [],
          cpuinfo: data.cpuinfo || {},
          memory: {
            used: data.memory?.used ? data.memory.used / (1024 ** 3) : 0,
            total: data.memory?.total ? data.memory.total / (1024 ** 3) : 32,
          },
          swap: data.swap ? {
            used: data.swap.used / (1024 ** 3),
            total: data.swap.total / (1024 ** 3),
          } : null,
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
          wait: 1.2,
          loadavg: ['1.23', '1.05', '0.98'],
          cpuinfo: { cpus: 12, model: 'Intel(R) Core(TM) i7' },
          memory: { used: 16.2, total: 32 },
          swap: { used: 1.2, total: 8 },
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
  const swapPercent = stats?.swap && stats.swap.total > 0 ? (stats.swap.used / stats.swap.total) * 100 : 0;
  const diskPercent = stats?.disk ? (stats.disk.used / stats.disk.total) * 100 : null;

  return (
    <div className="widget" style={{ gridRow: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SiProxmox size={14} color="#E57000" />
          <div className="widget-title" style={{ margin: 0 }}>proxmox · pve</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!error && (
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-dot)', animation: 'pulse 2s ease-in-out infinite' }} />
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100% - 28px)', gap: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
          </div>
        ) : (
          <>
            {error && <div style={{ fontSize: '10px', color: 'var(--accent-warning)', marginBottom: '-8px' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Tooltip content={`Load Avg: ${stats?.loadavg?.join(', ')} | ${stats?.cpuinfo?.cpus || 0} Cores`}>
                <ProgressBar percent={stats?.cpu || 0} label="cpu" />
              </Tooltip>

              <Tooltip content="IO Delay (Wait)">
                <ProgressBar percent={stats?.wait || 0} label="io wait" />
              </Tooltip>

              <Tooltip content={`${stats?.memory.used.toFixed(1)} GB / ${stats?.memory.total.toFixed(0)} GB`}>
                <ProgressBar percent={memPercent} label="ram" />
              </Tooltip>
              
              {stats?.swap && (
                <Tooltip content={`${stats?.swap.used.toFixed(1)} GB / ${stats?.swap.total.toFixed(0)} GB`}>
                  <ProgressBar percent={swapPercent} label="swap" />
                </Tooltip>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
              <div className="hide-on-mobile" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>uptime</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{stats?.uptime}</span>
              </div>
              <div className="hide-on-mobile" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>load</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{stats?.loadavg?.join(' · ')}</span>
              </div>
              <div className="hide-on-mobile" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>cpu</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={stats?.cpuinfo?.model}>{stats?.cpuinfo?.model || 'Unknown'}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemStats;
