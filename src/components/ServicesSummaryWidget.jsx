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

  return (
    <Link to="/services" style={{ textDecoration: 'none', display: 'block' }} title="Services Overview">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', width: '100%', aspectRatio: '1 / 1', boxSizing: 'border-box' }}>
        <LayoutGrid size={24} style={{ color: 'var(--text-subtle)' }} />
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
              {stats.online}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/{stats.total}</span>
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              online
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ServicesSummaryWidget;
