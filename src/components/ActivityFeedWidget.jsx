import { useState, useEffect, useCallback } from 'react';
import { Terminal, RefreshCcw } from 'lucide-react';
import { getSyslog } from '../api/proxmox';

const ActivityFeedWidget = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const rawLogs = await getSyslog(50); // fetch last 50 lines
        console.log("Raw syslog:", rawLogs);
        
        if (!Array.isArray(rawLogs)) {
          throw new Error('Invalid syslog data received');
        }

        // /journal endpoint returns a flat array of strings mixed with cursor metadata (starts with 's=')
        const validLogs = rawLogs.filter(log => typeof log === 'string' && !log.startsWith('s='));
        
        // Let's reverse them so newest is on top
        const parsed = validLogs.reverse().map((logStr, index) => {
          if (typeof logStr !== 'string') return { id: index, time: '', message: 'Invalid log format' };
          
          const match = logStr.match(/^([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+[^\s]+\s+(.*)$/);
          let time = '';
          let message = logStr;
          if (match) {
            time = match[1]; // e.g. "Aug 06 12:30:15"
            message = match[2]; // the rest
          }
          return { id: index, time, message: message.toLowerCase() };
        });
        setLogs(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchLogs]);
  return (
    <div className="widget" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={12} style={{ color: 'var(--text-subtle)' }} />
          <h3 className="widget-title" style={{ margin: 0 }}>system logs</h3>
        </div>
        <button
          onClick={fetchLogs}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'color var(--transition-fast)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
          title="Refresh Logs"
        >
          <RefreshCcw size={12} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div 
        className="card" 
        style={{ 
          padding: '16px', 
          backgroundColor: 'var(--bg-surface)', 
          border: '1px solid var(--border)', 
          borderRadius: '6px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '11px',
          color: 'var(--text-primary)',
          display: 'flex', 
          flexDirection: 'column',
          gap: '6px',
          boxShadow: 'none'
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px' }}>
          {loading && logs.length === 0 ? (
            <div style={{ color: 'var(--text-subtle)' }}>loading logs...</div>
          ) : error ? (
            <div style={{ color: 'var(--accent-offline)' }}>error: {error}</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>[{log.time}]</span>
                <span style={{ 
                  color: log.message.includes('warn') ? 'var(--accent-warning)' : 
                         (log.message.includes('error') || log.message.includes('fail')) ? 'var(--accent-offline)' : 'var(--text-primary)',
                  wordBreak: 'break-all'
                }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <span style={{ color: 'var(--text-subtle)' }}>[{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} {new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
          <span style={{ animation: 'pulse 1s step-end infinite', color: 'var(--text-primary)' }}>_</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeedWidget;

