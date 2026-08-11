import { useState, useEffect } from 'react';
import { Tv, Calendar } from 'lucide-react';

const SonarrWidget = ({ onActiveStatusChange }) => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    const apiKey = import.meta.env.VITE_SONARR_API_KEY;
    if (!apiKey || apiKey === 'your_sonarr_key') {
      setError('Missing API Key');
      setLoading(false);
      return;
    }

    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 7); // Next 7 days

      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const res = await fetch(`/api/sonarr/api/v3/calendar?apikey=${apiKey}&unmonitored=false&start=${startStr}&end=${endStr}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      
      const data = await res.json();
      
      // Sort by air date
      const sorted = data.sort((a, b) => new Date(a.airDateUtc) - new Date(b.airDateUtc));
      setEpisodes(sorted);
      if (onActiveStatusChange) {
        onActiveStatusChange(sorted.length > 0);
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
    const interval = setInterval(fetchStats, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '130px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        {!loading && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-subtle)' }}>
            <Calendar size={10} /> this week
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Fetching schedule...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error}
          </div>
        ) : episodes.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-subtle)', gap: '8px' }}>
            <Calendar size={24} opacity={0.5} />
            <span style={{ fontSize: '12px' }}>No premieres this week</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            {episodes.map((ep) => (
              <div key={ep.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {ep.series?.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                    S{ep.seasonNumber.toString().padStart(2, '0')}E{ep.episodeNumber.toString().padStart(2, '0')}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>
                  {ep.title}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--accent-dot)', marginTop: '2px' }}>
                  {new Date(ep.airDateUtc).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SonarrWidget;
