import { useState, useEffect, useRef } from 'react';
import { getClusterStatus } from '../api/proxmox';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SiProxmox } from '@icons-pack/react-simple-icons';

const formatSpeed = (bytesPerSec) => {
  if (bytesPerSec === 0 || isNaN(bytesPerSec)) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  if (i < 0) return '0 B/s';
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const NetworkWidget = () => {
  const [netInSpeed, setNetInSpeed] = useState(0);
  const [netOutSpeed, setNetOutSpeed] = useState(0);
  const prevStats = useRef({ time: null, netIn: 0, netOut: 0 });

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const stats = await getClusterStatus();
        if (mounted && stats) {
          const now = Date.now();
          if (prevStats.current.time) {
            const timeDiff = (now - prevStats.current.time) / 1000;
            const inDiff = (stats.netin || 0) - prevStats.current.netIn;
            const outDiff = (stats.netout || 0) - prevStats.current.netOut;
            
            if (inDiff >= 0 && outDiff >= 0 && timeDiff > 0) {
              setNetInSpeed(inDiff / timeDiff);
              setNetOutSpeed(outDiff / timeDiff);
            }
          }
          prevStats.current = { time: now, netIn: stats.netin || 0, netOut: stats.netout || 0 };
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SiProxmox size={12} className="icon-mono" />
          <div className="widget-title" style={{ margin: 0 }}>network speed</div>
        </div>
      </div>
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-evenly' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
            <ArrowDown size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'lowercase', letterSpacing: '0.05em', fontWeight: 600 }}>Download</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatSpeed(netInSpeed)}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
            <ArrowUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'lowercase', letterSpacing: '0.05em', fontWeight: 600 }}>Upload</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatSpeed(netOutSpeed)}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default NetworkWidget;
