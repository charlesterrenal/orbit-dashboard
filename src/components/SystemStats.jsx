import { useState, useEffect } from 'react';
import { getClusterStatus, getNodeGuests } from '../api/proxmox';
import Tooltip from './Tooltip';
import ProgressBar from './ProgressBar';
import { SiProxmox } from '@icons-pack/react-simple-icons';

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  return `${days}d ${hours}h`;
};

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [guests, setGuests] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const data = await getClusterStatus();
        if (!mounted || !data) return;
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
        });
        setError(null);
      } catch (err) {
        if (mounted) {
          setStats({
            cpu: 24.5,
            wait: 1.2,
            loadavg: ['1.23', '1.05', '0.98'],
            cpuinfo: { cpus: 12, model: 'Intel(R) Core(TM) i7' },
            memory: { used: 16.2, total: 32 },
            swap: { used: 1.2, total: 8 },
            uptime: '14d 2h',
          });
          setError('mock data — check credentials');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    const fetchGuests = async () => {
      try {
        const g = await getNodeGuests();
        if (mounted && g) setGuests(g);
      } catch (e) {
        if (mounted) setGuests({ lxcs: { running: 5, total: 5 }, vms: { running: 0, total: 0 } });
      }
    };
    fetchGuests();
    const guestInterval = setInterval(fetchGuests, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(guestInterval);
    };
  }, []);

  const memPercent = stats ? (stats.memory.used / stats.memory.total) * 100 : 0;
  const swapPercent = stats?.swap && stats.swap.total > 0 ? (stats.swap.used / stats.swap.total) * 100 : 0;

  return (
    <div className="widget">
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'visible' }}>
        {/* Card Header Inside */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SiProxmox size={15} className="icon-mono" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              proxmox · pve
            </span>
          </div>
          {!error && !loading && (
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-dot)', animation: 'pulse 2s ease-in-out infinite' }} />
          )}
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton" style={{ height: '24px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: '24px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: '24px', borderRadius: '6px' }} />
          </div>
        ) : (
          <>
            {error && <div style={{ fontSize: '10px', color: 'var(--accent-warning)', marginBottom: '-6px' }}>{error}</div>}

            {/* Gauges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Tooltip content={`${stats?.cpuinfo?.cpus || 0} cores • load ${stats?.loadavg?.join(' · ') || '—'}`}>
                <ProgressBar percent={stats?.cpu || 0} label="cpu" />
              </Tooltip>

              <Tooltip content={`${stats?.memory.used.toFixed(1)} GB of ${stats?.memory.total.toFixed(0)} GB used`}>
                <ProgressBar percent={memPercent} label="ram" />
              </Tooltip>

              {stats?.swap && (
                <Tooltip content={`${stats?.swap.used.toFixed(1)} GB of ${stats?.swap.total.toFixed(0)} GB swap`}>
                  <ProgressBar percent={swapPercent} label="swap" />
                </Tooltip>
              )}
            </div>

            {/* Footer Stats Row */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingTop: '10px',
              marginTop: 'auto',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-subtle)', fontWeight: '500' }}>uptime</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>{stats?.uptime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-subtle)', fontWeight: '500' }}>memory</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
                  {stats?.memory.used.toFixed(1)} / {stats?.memory.total.toFixed(0)} GB
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-subtle)', fontWeight: '500' }}>lxc</span>
                <span style={{
                  fontWeight: '500',
                  color: guests?.lxcs && guests.lxcs.running < guests.lxcs.total ? 'var(--accent-warning)' : 'var(--text-muted)'
                }}>
                  {guests?.lxcs ? `${guests.lxcs.running} / ${guests.lxcs.total} running` : '5 / 5 running'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemStats;
