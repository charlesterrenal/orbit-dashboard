import { useState, useEffect } from 'react';
import { getUpdateStatus, getPendingUpdates } from '../api/updates';
import { CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Package, Server, Box } from 'lucide-react';

const timeAgo = (dateStr) => {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
};

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle size={14} style={{ color: 'var(--accent-dot)' }} />;
    case 'running':
      return <RefreshCw size={14} style={{ color: 'var(--accent-warning)', animation: 'spin 2s linear infinite' }} />;
    case 'partial':
      return <AlertTriangle size={14} style={{ color: 'var(--accent-warning)' }} />;
    case 'failed':
      return <XCircle size={14} style={{ color: 'var(--accent-offline)' }} />;
    default:
      return <Clock size={14} style={{ color: 'var(--text-subtle)' }} />;
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'success': return 'All systems up to date';
    case 'running': return 'Update in progress...';
    case 'partial': return 'Completed with errors';
    case 'failed': return 'Update failed';
    default: return 'No data available';
  }
};

const statusColor = (status) => {
  switch (status) {
    case 'success': return 'var(--accent-dot)';
    case 'running': return 'var(--accent-warning)';
    case 'partial': return 'var(--accent-warning)';
    case 'failed': return 'var(--accent-offline)';
    default: return 'var(--text-subtle)';
  }
};

const UpdateStatusWidget = () => {
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statusData, pendingData] = await Promise.all([
          getUpdateStatus(),
          getPendingUpdates(),
        ]);
        setStatus(statusData);
        setPending(pendingData);
        setError(null);
      } catch (e) {
        // Fallback mock data
        setStatus({
          status: 'success',
          completed_at: new Date(Date.now() - 86400000).toISOString(),
          host_status: 'success',
          containers_total: 5,
          containers_ok: 5,
          errors: '',
          next_run: 'Sunday 04:00 AM',
        });
        setPending({ count: 3, packages: [] });
        setError('mock data — check status server');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const s = status || {};

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className="icon-mono" />
          <div className="widget-title" style={{ margin: 0 }}>system updates</div>
        </div>
        {!loading && !error && (
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor(s.status), animation: s.status === 'running' ? 'pulse 1s ease-in-out infinite' : 'none', boxShadow: `0 0 6px ${statusColor(s.status)}80` }} />
        )}
      </div>

      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '24px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '16px', borderRadius: '8px', width: '70%' }} />
            <div className="skeleton" style={{ height: '16px', borderRadius: '8px', width: '85%' }} />
          </div>
        ) : (
          <>
            {error && <div style={{ fontSize: '10px', color: 'var(--accent-warning)', marginBottom: '-6px' }}>{error}</div>}

            {/* Status banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: `${statusColor(s.status)}12`, border: `1px solid ${statusColor(s.status)}25` }}>
              <StatusIcon status={s.status} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: statusColor(s.status) }}>
                {statusLabel(s.status)}
              </span>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>host</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: s.host_status === 'success' ? 'var(--accent-dot)' : 'var(--accent-offline)' }}>
                  {s.host_status === 'success' ? '✓ updated' : '✗ failed'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>containers</span>
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 500,
                  color: s.containers_ok === s.containers_total ? 'var(--accent-dot)' : 'var(--accent-warning)'
                }}>
                  {s.containers_ok ?? '–'} / {s.containers_total ?? '–'} updated
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>pending</span>
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 500,
                  color: pending?.count > 0 ? 'var(--accent-warning)' : 'var(--text-primary)'
                }}>
                  {pending?.count ?? '–'} packages
                </span>
              </div>
            </div>

            {/* Divider + timestamps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>last run</span>
                <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {timeAgo(s.completed_at)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>next run</span>
                <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {s.next_run || '—'}
                </span>
              </div>
            </div>

            {/* Error details */}
            {s.errors && (
              <div style={{ fontSize: '10px', color: 'var(--accent-offline)', padding: '6px 10px', borderRadius: '6px', background: 'var(--accent-offline)10', lineHeight: 1.5 }}>
                ⚠ {s.errors}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateStatusWidget;
