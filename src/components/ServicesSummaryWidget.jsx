import { useState, useEffect } from 'react';
import { LayoutGrid, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchUptimeStatuses } from '../api/uptime';
import servicesConfig from '../config/services.json';

const ServicesSummaryWidget = () => {
  const [stats, setStats] = useState({ total: servicesConfig.length, online: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statuses = await fetchUptimeStatuses();
        let onlineCount = 0;
        
        servicesConfig.forEach(service => {
          const key = service.monitorName;
          const status = (statuses[key]?.status || service.status || 'unknown');
          if (status === 'online') onlineCount++;
        });
        
        setStats({ total: servicesConfig.length, online: onlineCount });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const isNominal = stats.total > 0 && stats.online === stats.total;

  return (
    <Link to="/services" style={{ textDecoration: 'none', display: 'block', height: '100%' }} title="Services Overview">
      <div className="card service-card summary-widget-content">
        {/* Top: Standard Widget Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutGrid size={13} className="icon-mono" />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-subtle)', textTransform: 'lowercase' }}>
              services
            </span>
          </div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isNominal ? 'var(--accent-dot)' : 'var(--accent-offline)',
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: 'auto 0' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats.online}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '-0.01em' }}>
              / {stats.total} online
            </div>
          </div>
        )}

        {/* Bottom: Operational Status Delta */}
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: isNominal ? 'var(--text-subtle)' : 'var(--accent-offline)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{isNominal ? 'all systems ok' : `${stats.total - stats.online} failing`}</span>
        </div>
      </div>
    </Link>
  );
};

export default ServicesSummaryWidget;
