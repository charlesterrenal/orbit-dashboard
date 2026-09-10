import ServiceCard from './ServiceCard';
import RadarrWidget from './RadarrWidget';
import SonarrWidget from './SonarrWidget';
import JellyseerrWidget from './JellyseerrWidget';
import JellyfinWidget from './JellyfinWidget';

const ServiceGroup = ({ title, items, getWidget }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Group Card Header Inside */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
          {items.length} {items.length === 1 ? 'service' : 'services'}
        </span>
      </div>

      {/* Grid of service tiles inside */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
        {items.map(service => (
          <ServiceCard 
            key={service.id} 
            service={service} 
            expandedContent={getWidget ? getWidget(service.id) : null} 
          />
        ))}
      </div>
    </div>
  );
};

const ServiceGrid = ({ services }) => {
  const homelab = services.filter(s => s.category === 'services');
  const websites = services.filter(s => s.category === 'websites');
  const arrStack = services.filter(s => s.category === 'arr-stack');

  const getWidget = (id) => {
    switch(id) {
      case 'radarr': return <RadarrWidget />;
      case 'sonarr': return <SonarrWidget />;
      case 'jellyseerr': return <JellyseerrWidget />;
      case 'jellyfin': return <JellyfinWidget />;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ServiceGroup title="services" items={homelab} getWidget={getWidget} />
      <ServiceGroup title="websites" items={websites} />
      <ServiceGroup title="arr-stack" items={arrStack} getWidget={getWidget} />
    </div>
  );
};

export default ServiceGrid;
