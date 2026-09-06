import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { SiDocker } from '@icons-pack/react-simple-icons';
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

  const isNominal = stats.total > 0 && stats.running === stats.total;

  return (
    <Link to="/containers" style={{ textDecoration: 'none', display: 'block', height: '100%' }} title="Docker Overview">
      <div className="card service-card summary-widget-content">
        {/* Top: Standard Widget Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SiDocker size={13} className="icon-mono" />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'lowercase' }}>
              docker
            </span>
          </div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isNominal ? 'var(--accent-dot)' : stats.running > 0 ? 'var(--accent-warning)' : 'var(--accent-offline)',
            animation: isNominal ? 'pulse 2s ease-in-out infinite' : 'none',
            flexShrink: 0
          }} />
        </div>

        {/* Middle: Commanding Hero Metric */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 'auto 0' }}>
            <div className="skeleton" style={{ width: '48px', height: '28px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '64px', height: '12px', borderRadius: '4px' }} />
          </div>
        ) : error ? (
          <span style={{ fontSize: '11px', color: 'var(--accent-offline)', margin: 'auto 0' }}>Error</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: 'auto 0' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.running}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              / {stats.total} containers
            </div>
          </div>
        )}

        {/* Bottom: Operational Status Delta */}
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: isNominal ? 'var(--text-subtle)' : stats.total - stats.running > 0 ? 'var(--accent-warning)' : 'var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{isNominal ? '0 stopped' : `${stats.total - stats.running} stopped`}</span>
        </div>
      </div>
    </Link>
  );
};

export default DockerSummaryWidget;
