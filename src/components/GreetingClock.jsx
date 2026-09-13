import { useState, useEffect } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { fetchUptimeStatuses } from '../api/uptime';
import services from '../config/services.json';
import Tooltip from './Tooltip';

const GreetingClock = ({ onOpenCmd }) => {
  const [time, setTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState(null); // null = loading

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statuses = await fetchUptimeStatuses();
        const offlineServices = services.filter(s => {
          const monitor = statuses[s.monitorName?.toLowerCase()];
          return monitor && monitor.status === 'offline';
        });
        setSystemStatus(offlineServices.length === 0 ? 'ok' : offlineServices);
      } catch {
        setSystemStatus('ok'); // fail silently, assume ok
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  let greeting = 'good evening';
  if (hours < 12) greeting = 'good morning';
  else if (hours < 17) greeting = 'good afternoon';

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).toLowerCase();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDown = Array.isArray(systemStatus) && systemStatus.length > 0;
  const statusColor = isDown ? 'var(--accent-offline)' : 'var(--accent-dot)';
  const statusText = systemStatus === null
    ? 'checking...'
    : isDown
      ? `${systemStatus.length} service${systemStatus.length > 1 ? 's' : ''} down`
      : 'all systems operational';
  const statusGlow = isDown
    ? '0 0 12px rgba(239, 68, 68, 0.45)'
    : '0 0 12px rgba(34, 197, 94, 0.35)';
  const iconGlow = isDown
    ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))'
    : 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))';

  const userName = import.meta.env.VITE_DASHBOARD_USER || 'admin';

  return (
    <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: 0,
          textShadow: '0 2px 24px rgba(255, 255, 255, 0.06), 0 1px 4px rgba(0,0,0,0.08)'
        }}>
          {greeting}, {userName}.
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onOpenCmd && (
            <button
              onClick={onOpenCmd}
              title="quick find (ctrl+k)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-subtle)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color var(--transition-fast), color var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-subtle)'; }}
            >
              <span>quick find</span>
              <kbd style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)'
              }}>
                ctrl+k
              </kbd>
            </button>
          )}
          <div style={{
            fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums'
          }}>
            {formatTime(time)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', margin: 0 }}>
          {formatDate(time)}
        </p>
        <span style={{ color: 'var(--border)' }}>•</span>
        <Tooltip content={
          isDown
            ? `down: ${systemStatus.map(s => s.name).join(', ')}`
            : `${services.length} services monitored`
        }>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, cursor: 'default' }}>
            {isDown
              ? <AlertTriangle size={14} style={{ filter: iconGlow }} />
              : <Activity size={14} style={{ filter: iconGlow }} />
            }
            <span style={{ fontSize: '0.875rem', fontWeight: 500, textShadow: statusGlow }}>
              {statusText}
            </span>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default GreetingClock;

