import { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import PopoverMenu from './PopoverMenu';
import CopyToClipboard from './CopyToClipboard';
import { fetchUptimeStatuses } from '../api/uptime';

// Global uptime state shared across all cards (avoid N fetches)
let _uptimeCache = {};
let _uptimeListeners = [];
let _fetchInterval = null;

const subscribeToUptime = (cb) => {
  _uptimeListeners.push(cb);
  if (_uptimeListeners.length === 1) {
    const refresh = async () => {
      _uptimeCache = await fetchUptimeStatuses();
      _uptimeListeners.forEach(fn => fn(_uptimeCache));
    };
    refresh();
    _fetchInterval = setInterval(refresh, 30000);
  } else {
    cb(_uptimeCache);
  }
  return () => {
    _uptimeListeners = _uptimeListeners.filter(fn => fn !== cb);
    if (_uptimeListeners.length === 0 && _fetchInterval) {
      clearInterval(_fetchInterval);
      _fetchInterval = null;
    }
  };
};

const UptimeDots = ({ beats }) => {
  if (!beats?.length) return null;
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }} title="Last 15 heartbeats">
      {beats.slice(-15).map((b, i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: b === 1 ? 'var(--accent-online)' : 'var(--accent-offline)',
            opacity: 0.5 + (i / 15) * 0.5,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
};

const ServiceCard = ({ service }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [uptimeData, setUptimeData] = useState(null);
  const IconComponent = Icons[service.icon] || Icons.Server;

  useEffect(() => {
    const unsubscribe = subscribeToUptime((cache) => {
      const key = service.monitorName;
      if (key && cache[key]) setUptimeData(cache[key]);
    });
    return unsubscribe;
  }, [service.monitorName]);

  // Derive live status from Uptime Kuma, fall back to config
  const liveStatus = uptimeData?.status || service.status || 'unknown';
  const ping = uptimeData?.ping;
  const uptime24h = uptimeData?.uptime;

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card service-card"
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top row: icon + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: 'var(--text-primary)' }}>
          <IconComponent size={22} strokeWidth={1.5} />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Progressive disclosure: only shows on hover */}
          <div style={{ opacity: isHovered ? 1 : 0, transition: 'opacity var(--transition-fast)' }}>
            <PopoverMenu>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Copy URL</span>
                <CopyToClipboard text={service.url} />
              </div>
            </PopoverMenu>
          </div>

          {/* Status pill */}
          <span
            className={`pill ${liveStatus}`}
            style={{ padding: '3px 8px', fontSize: '10px' }}
          >
            {liveStatus}
          </span>
        </div>
      </div>

      {/* Service name + description */}
      <div style={{ marginTop: 'auto' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
          {service.name}
        </h3>
        {service.description && (
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{service.description}</p>
        )}
      </div>

      {/* Live metrics row (only if Uptime Kuma data available) */}
      {uptimeData && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {ping !== null && (
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
              {ping}ms
            </span>
          )}
          {uptime24h !== null && (
            <span style={{ fontSize: '10px', color: uptime24h > 99 ? 'var(--accent-online)' : uptime24h > 95 ? 'var(--accent-warning)' : 'var(--accent-offline)' }}>
              {uptime24h.toFixed(1)}% uptime
            </span>
          )}
        </div>
      )}

      {/* Heartbeat history dots */}
      {uptimeData?.beats && <UptimeDots beats={uptimeData.beats} />}
    </a>
  );
};

export default ServiceCard;
