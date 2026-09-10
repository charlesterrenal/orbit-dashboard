import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const DockerWidget = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'running': return 'var(--accent-dot)';
      case 'exited': return 'var(--accent-offline)';
      case 'paused': return 'var(--accent-warning)';
      default: return 'var(--text-subtle)';
    }
  };

  // Filter containers by search query
  const filteredContainers = containers.filter(c => {
    if (!searchQuery) return true;
    const name = (c.Names?.[0] || c.Id).replace('/', '').toLowerCase();
    const image = (c.Image || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || image.includes(query);
  });

  // Group filtered containers by nodeName
  const nodes = [...new Set(filteredContainers.map(c => c.nodeName))].sort();

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          docker containers
        </span>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: '6px', padding: '4px 10px', border: '1px solid var(--border)' }}>
          <Search size={13} style={{ color: 'var(--text-subtle)', marginRight: '6px' }} />
          <input
            type="text"
            placeholder="search containers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              width: '160px'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '8px' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--accent-offline)', marginBottom: '8px' }}>{error}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', lineHeight: '1.5' }}>
            Check VITE_PORTAINER_URL and API Key in .env.local
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {nodes.map(node => {
            const nodeContainers = filteredContainers.filter(c => c.nodeName === node);
            if (nodeContainers.length === 0) return null;
            const runningCount = nodeContainers.filter(c => c.State === 'running').length;
            
            return (
              <div key={node} className="card" style={{ padding: '14px 16px' }}>
                {/* Node Card Header Inside */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {node}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                    {runningCount} / {nodeContainers.length} running
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {nodeContainers.map((c) => {
                    const name = (c.Names?.[0] || c.Id.slice(0, 12)).replace('/', '');
                    const isRunning = c.State === 'running';
                    return (
                      <div 
                        key={c.Id} 
                        style={{ 
                          padding: '10px 12px', 
                          backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '6px', 
                          opacity: isRunning ? 1 : 0.6 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: isRunning ? 600 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </span>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor(c.State), boxShadow: isRunning ? `0 0 6px ${statusColor(c.State)}80` : 'none', flexShrink: 0 }} />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.Image.split('@')[0].split(':')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredContainers.length === 0 && !loading && (
            <div className="card" style={{ padding: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: 0 }}>
                {searchQuery ? 'No containers match your search.' : 'No containers found.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DockerWidget;
