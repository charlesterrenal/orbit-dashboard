import { useState, useEffect } from 'react';
import { Container } from 'lucide-react';

const DockerWidget = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContainers = async () => {
      const apiKey = import.meta.env.VITE_PORTAINER_API_KEY;
      if (!apiKey || apiKey === 'your_portainer_api_key_here') {
        setError('Missing Portainer API Key');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch all environments (endpoints)
        const endpointsRes = await fetch('/api/portainer/api/endpoints', {
          headers: { 'X-API-Key': apiKey }
        });
        
        if (!endpointsRes.ok) throw new Error('Portainer API not available');
        const endpoints = await endpointsRes.json();

        // 2. Fetch containers for each endpoint in parallel
        const containerPromises = endpoints.map(async (endpoint) => {
          try {
            const cRes = await fetch(`/api/portainer/api/endpoints/${endpoint.Id}/docker/containers/json?all=true`, {
              headers: { 'X-API-Key': apiKey }
            });
            if (!cRes.ok) return [];
            const cData = await cRes.json();
            // Attach the node name to each container for the UI
            return cData.map(c => ({ ...c, nodeName: endpoint.Name }));
          } catch (e) {
            return [];
          }
        });

        const allContainersArrays = await Promise.all(containerPromises);
        const allContainers = allContainersArrays.flat();

        // 3. Sort: running first, then alphabetically
        const sorted = allContainers.sort((a, b) => {
          if (a.State === 'running' && b.State !== 'running') return -1;
          if (a.State !== 'running' && b.State === 'running') return 1;
          const nameA = (a.Names?.[0] || a.Id).replace('/', '').toLowerCase();
          const nameB = (b.Names?.[0] || b.Id).replace('/', '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setContainers(sorted);
        setError(null);
      } catch (e) {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContainers();
    const interval = setInterval(fetchContainers, 15000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (state) => {
    switch (state) {
      case 'running': return 'var(--accent-online)';
      case 'exited': return 'var(--accent-offline)';
      case 'paused': return 'var(--accent-warning)';
      default: return 'var(--text-subtle)';
    }
  };

  // Group containers by nodeName
  const nodes = [...new Set(containers.map(c => c.nodeName))].sort();

  return (
    <div className="widget">
      <div className="widget-title">docker containers</div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '8px' }} />)}
        </div>
      ) : error ? (
        <div>
          <p style={{ fontSize: '11px', color: 'var(--accent-offline)', marginBottom: '8px' }}>{error}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-subtle)', lineHeight: '1.5' }}>
            Check VITE_PORTAINER_URL and API Key in .env.local
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
          {nodes.map(node => {
            const nodeContainers = containers.filter(c => c.nodeName === node);
            if (nodeContainers.length === 0) return null;
            
            return (
              <div key={node}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '12px' }}>
                  {node}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {nodeContainers.map((c, i) => {
                    const name = (c.Names?.[0] || c.Id.slice(0, 12)).replace('/', '');
                    const isRunning = c.State === 'running';
                    return (
                      <div key={c.Id} className={`card animate-enter stagger-${(i % 4) + 1}`} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: isRunning ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: isRunning ? 600 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor(c.State), boxShadow: isRunning ? `0 0 6px ${statusColor(c.State)}80` : 'none', flexShrink: 0 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-subtle)' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.Image.split('@')[0].split(':')[0]}</span>
                          <span style={{ textTransform: 'capitalize', fontWeight: '500', color: isRunning ? 'var(--accent-online)' : 'var(--text-muted)' }}>{c.State}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {containers.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>No containers found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DockerWidget;
