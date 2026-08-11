import { useState, useEffect } from 'react';
import { getStorageStatus } from '../api/proxmox';
import { HardDrive } from 'lucide-react';
import { SiProxmox } from '@icons-pack/react-simple-icons';
import Tooltip from './Tooltip';
import ProgressBar from './ProgressBar';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StorageWidget = () => {
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStorageStatus();
        // Sort by total size descending to prioritize large mounts/HDDs over small local partitions
        const sortedData = [...data].sort((a, b) => b.total - a.total);
        // take first 2 storages
        const top2 = sortedData.slice(0, 2).map(store => ({
          ...store,
          percent: store.total > 0 ? (store.used / store.total) * 100 : 0
        }));
        
        setStorages(top2);
        setError(null);
      } catch (err) {
        // Mock data fallback
        setStorages([
          { storage: 'local', used: 137.7 * 1024**3, total: 500 * 1024**3, percent: 27.5 },
          { storage: 'nas-mount', used: 800 * 1024**3, total: 2000 * 1024**3, percent: 40.0 }
        ]);
        setError('mock data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const radius = 15.91549430918954;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SiProxmox size={12} color="#E57000" />
          <div className="widget-title" style={{ margin: 0 }}>storage overview</div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'var(--storage-align, center)', gap: '16px', width: '100%', height: '100%', flex: 1, flexDirection: 'var(--storage-dir, row)' }}>
        {loading ? (
          <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '8px' }} />
        ) : (
          storages.map((store, i) => {
            const strokeDasharray = `${(store.percent / 100) * circumference} ${circumference}`;
            let colorVar = '--accent-primary';
            if (store.percent > 85) {
              colorVar = '--accent-offline';
            } else if (store.percent > 70) {
              colorVar = '--accent-warning';
            }

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px', flex: 1, width: '100%' }}>
                
                {/* Donut (Desktop only) */}
                <div className="hide-on-mobile" style={{ width: '64px', height: '64px', position: 'relative', alignSelf: 'center' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="var(--bg-primary)" strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke={`var(${colorVar})`} strokeWidth="4"
                      strokeDasharray={strokeDasharray}
                      style={{ transition: 'stroke-dasharray 1s ease-in-out, stroke 0.5s ease' }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: `var(${colorVar})`, transition: 'color 0.5s ease' }}>
                      {store.percent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Flat Bar (Mobile only) */}
                <div className="hide-on-desktop" style={{ width: '100%', flexDirection: 'column', gap: '8px' }}>
                  <ProgressBar percent={store.percent} label={store.storage} />
                  <div style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                    {formatBytes(store.used)} / {formatBytes(store.total)}
                  </div>
                </div>

                {/* Details (Desktop only) */}
                <div className="hide-on-mobile" style={{ flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>{store.storage}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {formatBytes(store.used)} / {formatBytes(store.total)}
                  </span>
                </div>
                
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};

export default StorageWidget;
