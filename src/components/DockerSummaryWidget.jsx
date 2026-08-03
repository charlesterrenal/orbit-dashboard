import { useState, useEffect } from 'react';
import { Container, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const DockerSummaryWidget = () => {
  const [stats, setStats] = useState({ total: 0, running: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContainers = async () => {
      const apiKey = import.meta.env.VITE_PORTAINER_API_KEY;
      if (!apiKey || apiKey === 'your_portainer_api_key_here') {
        setError('Missing API Key');
        setLoading(false);
        return;
      }

      try {
        const endpointsRes = await fetch('/api/portainer/api/endpoints', {
          headers: { 'X-API-Key': apiKey }
        });
        if (!endpointsRes.ok) throw new Error('API Error');
        const endpoints = await endpointsRes.json();

        const containerPromises = endpoints.map(async (endpoint) => {
          try {
            const cRes = await fetch(`/api/portainer/api/endpoints/${endpoint.Id}/docker/containers/json?all=true`, {
              headers: { 'X-API-Key': apiKey }
            });
            if (!cRes.ok) return [];
            return await cRes.json();
          } catch (e) {
            return [];
          }
        });

        const allContainersArrays = await Promise.all(containerPromises);
        const allContainers = allContainersArrays.flat();
        
        const running = allContainers.filter(c => c.State === 'running').length;
        setStats({ total: allContainers.length, running });
        setError(null);
      } catch (e) {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContainers();
  }, []);

  return (
    <Link to="/containers" style={{ textDecoration: 'none', display: 'block' }} title="Docker Overview">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', width: '100%', aspectRatio: '1 / 1', boxSizing: 'border-box' }}>
        <Container size={24} style={{ color: 'var(--text-subtle)' }} />
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
        ) : error ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-offline)' }}>Error</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
              {stats.running}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/{stats.total}</span>
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              running
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default DockerSummaryWidget;
