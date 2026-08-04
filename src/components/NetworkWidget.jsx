import { useState, useEffect } from 'react';
import { getClusterStatus } from '../api/proxmox';
import { ArrowDown, ArrowUp, Activity } from 'lucide-react';

const formatSpeed = (bytesPerSec) => {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const NetworkWidget = () => {
  const [netIn, setNetIn] = useState(0);
  const [netOut, setNetOut] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const stats = await getClusterStatus();
        if (mounted) {
          setNetIn(stats.netin || 0);
          setNetOut(stats.netout || 0);
        }
      } catch (err) {
        // silently fail or retry
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="widget" style={{ gridColumn: 'span 1' }}>
      <div className="widget-title" style={{ marginBottom: '8px' }}>network speed</div>
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '160px', justifyContent: 'center' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-online)' }}>
            <ArrowDown size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Download</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatSpeed(netIn)}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <ArrowUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Upload</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatSpeed(netOut)}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default NetworkWidget;
