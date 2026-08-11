import { useState, useEffect } from 'react';
import { GitPullRequest, Clock, Check } from 'lucide-react';

const JellyseerrWidget = ({ onActiveStatusChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    const apiKey = import.meta.env.VITE_JELLYSEERR_API_KEY;
    if (!apiKey || apiKey === 'your_jellyseerr_key') {
      setError('Missing API Key');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/jellyseerr/api/v1/request?filter=pending`, {
        headers: {
          'X-Api-Key': apiKey
        }
      });
      if (!res.ok) throw new Error('Failed to fetch requests');
      
      const data = await res.json();
      const currentRequests = data.results || [];
      setRequests(currentRequests);
      if (onActiveStatusChange) {
        onActiveStatusChange(currentRequests.length > 0);
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
    const interval = setInterval(fetchStats, 60000); // 1 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '130px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        {!loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-subtle)' }}>
            <Clock size={10} style={{ color: requests.length > 0 ? 'var(--accent-warning)' : 'inherit' }} /> 
            {requests.length} pending
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Checking requests...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-subtle)', gap: '8px' }}>
            <Check size={24} style={{ color: 'var(--accent-online)', opacity: 0.8 }} />
            <span style={{ fontSize: '12px' }}>All caught up!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            {requests.map((req) => (
              <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {req.media?.title || req.media?.name || 'Unknown Media'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(217, 119, 6, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    Needs Approval
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>
                  Requested by: {req.requestedBy?.displayName || req.requestedBy?.email || 'Unknown User'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JellyseerrWidget;
