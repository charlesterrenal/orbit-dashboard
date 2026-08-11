import { useState, useEffect } from 'react';
import { Film, Download, AlertCircle } from 'lucide-react';

const RadarrWidget = ({ onActiveStatusChange }) => {
  const [missingCount, setMissingCount] = useState(0);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    const apiKey = import.meta.env.VITE_RADARR_API_KEY;
    if (!apiKey || apiKey === 'your_radarr_key') {
      setError('Missing API Key');
      setLoading(false);
      return;
    }

    try {
      // Fetch all movies to find missing
      const moviesRes = await fetch(`/api/radarr/api/v3/movie?apikey=${apiKey}`);
      if (!moviesRes.ok) throw new Error('Failed to fetch movies');
      const movies = await moviesRes.json();
      
      const missing = movies.filter(m => !m.hasFile && m.monitored).length;
      setMissingCount(missing);

      // Fetch queue
      const queueRes = await fetch(`/api/radarr/api/v3/queue?apikey=${apiKey}`);
      if (!queueRes.ok) throw new Error('Failed to fetch queue');
      const queueData = await queueRes.json();
      
      // Radarr API v3 queue returns records array
      const currentQueue = queueData.records || [];
      setQueue(currentQueue);
      if (onActiveStatusChange) {
        onActiveStatusChange(missing > 0 || currentQueue.length > 0);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '130px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        {!loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-subtle)' }}>
            <AlertCircle size={10} style={{ color: missingCount > 0 ? 'var(--accent-warning)' : 'inherit' }} /> 
            {missingCount} missing
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Syncing database...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error}
          </div>
        ) : queue.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-subtle)', gap: '8px' }}>
            <Film size={24} opacity={0.5} />
            <span style={{ fontSize: '12px' }}>Queue is empty</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            {queue.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div style={{ color: 'var(--accent-dot)' }}>
                    <Download size={14} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.movie?.title || item.title}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>
                      {(100 - (item.sizeleft / item.size) * 100).toFixed(1)}% • {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RadarrWidget;
