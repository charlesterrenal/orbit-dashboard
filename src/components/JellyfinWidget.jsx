import { useState, useEffect } from 'react';
import { PlayCircle, Tv, Film, Music, StopCircle, HardDrive } from 'lucide-react';

const JellyfinWidget = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      const apiKey = import.meta.env.VITE_JELLYFIN_API_KEY;
      if (!apiKey || apiKey === 'your_jellyfin_api_key_here') {
        setError('Missing API Key');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/jellyfin/Sessions', {
          headers: {
            'X-Emby-Token': apiKey
          }
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        // Filter out idle sessions that are just web UI open but not playing anything
        const activeSessions = data.filter(s => s.NowPlayingItem);
        
        setSessions(activeSessions);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Jellyfin sessions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type) => {
    switch(type) {
      case 'Movie': return <Film size={16} />;
      case 'Episode': return <Tv size={16} />;
      case 'Audio': return <Music size={16} />;
      default: return <PlayCircle size={16} />;
    }
  };

  return (
    <div className="widget" style={{ marginBottom: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <HardDrive size={14} /> JELLYFIN STREAMS
        </h3>
        {!loading && (
          <span className={`pill ${sessions.length > 0 ? 'online' : 'unknown'}`} style={{ padding: '2px 8px' }}>
            {sessions.length} active
          </span>
        )}
      </div>

      <div className="card" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
            Loading sessions...
          </div>
        ) : error ? (
          <div style={{ padding: '15px 0', textAlign: 'center', color: 'var(--accent-offline)', fontSize: '13px' }}>
            {error === 'Missing API Key' ? 'Add Jellyfin API key to .env.local' : 'Connection failed'}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <StopCircle size={24} strokeWidth={1.5} opacity={0.5} />
            <span>No active streams right now</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((session) => {
              const item = session.NowPlayingItem;
              const isTranscoding = session.TranscodingInfo?.IsAudioDirect === false || session.TranscodingInfo?.IsVideoDirect === false;
              const primaryImageTag = item?.ImageTags?.Primary;
              
              // Build image URL via our proxy
              const imageUrl = primaryImageTag 
                ? `/api/jellyfin/Items/${item.Id}/Images/Primary?fillHeight=120&fillWidth=120&quality=96&tag=${primaryImageTag}` 
                : null;
              
              return (
                <div key={session.Id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {imageUrl ? (
                    <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={imageUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent-primary)', backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', padding: '12px', borderRadius: '8px', flexShrink: 0 }}>
                      {getIcon(session.NowPlayingItem?.Type)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.NowPlayingItem?.Name || 'Unknown Title'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span>{session.UserName}</span>
                      <span>•</span>
                      <span>{session.Client}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: isTranscoding ? 'color-mix(in srgb, var(--accent-warning) 15%, transparent)' : 'color-mix(in srgb, var(--accent-online) 15%, transparent)', color: isTranscoding ? 'var(--accent-warning)' : 'var(--accent-online)' }}>
                      {isTranscoding ? 'Transcoding' : 'Direct Play'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JellyfinWidget;
