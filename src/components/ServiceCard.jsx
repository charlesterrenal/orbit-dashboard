import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Link } from 'lucide-react';
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
      {beats.slice(-12).map((b, i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: b === 1 ? 'var(--accent-online)' : 'var(--accent-offline)',
            opacity: 0.5 + (i / 12) * 0.5,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
};

const ServiceCard = ({ service, expandedContent }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasActiveProcess, setHasActiveProcess] = useState(false);
  const [uptimeData, setUptimeData] = useState(null);

  // No longer needed, using standard Lucide icons

  useEffect(() => {
    const unsubscribe = subscribeToUptime((cache) => {
      if (!service.monitorName || !cache) return;
      const target = service.monitorName.toLowerCase().trim();
      const match = Object.keys(cache).find(k => k.toLowerCase().trim() === target);
      if (match) setUptimeData(cache[match]);
    });
    return unsubscribe;
  }, [service.monitorName]);

  // Derive live status from Uptime Kuma, fall back to config
  const liveStatus = uptimeData?.status || service.status || 'unknown';
  const ping = uptimeData?.ping;
  const uptime24h = uptimeData?.uptime;

  return (
    <div
      className="service-tile"
      style={{ display: 'flex', flexDirection: 'column', position: 'relative', gridColumn: isExpanded ? '1 / -1' : 'auto' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'inherit' }}
      >
      {/* Top row: Title on left, actions & status dot on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em', margin: 0 }}>
            {service.name.toLowerCase()}
          </h3>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Copy URL */}
          <div 
            title="Copy URL"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              display: 'flex',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
          >
            <CopyToClipboard text={service.url} customIcon={<Link size={11} />} />
          </div>

          {/* External Link */}
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open App"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--text-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 4px',
              borderRadius: '5px',
              transition: 'color 0.2s, background-color 0.2s',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-subtle)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            <ExternalLink size={11} />
          </a>

          {/* Expand Button */}
          {expandedContent && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                color: hasActiveProcess ? 'var(--accent-warning)' : 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '3px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                if (!hasActiveProcess) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                if (!hasActiveProcess) e.currentTarget.style.color = 'var(--text-subtle)';
              }}
            >
              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          {/* Status Dot */}
          <div
            title={liveStatus}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: liveStatus === 'online' ? 'var(--accent-dot)' : liveStatus === 'offline' ? 'var(--accent-offline)' : 'var(--text-subtle)',
              boxShadow: liveStatus === 'online' ? '0 0 8px var(--accent-dot)' : 'none',
              flexShrink: 0,
              marginLeft: '2px'
            }}
          />
        </div>
      </div>

      {/* Description */}
      {service.description && (
        <p style={{ fontSize: '11px', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 0 0' }}>
          {service.description}
        </p>
      )}

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
      </div>

      {/* Expanded Content Area with smooth grid animation */}
      {expandedContent && (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              {React.cloneElement(expandedContent, { onActiveStatusChange: setHasActiveProcess })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;
