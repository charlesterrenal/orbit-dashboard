import ServiceCard from './ServiceCard';
import RadarrWidget from './RadarrWidget';
import SonarrWidget from './SonarrWidget';
import JellyseerrWidget from './JellyseerrWidget';
import JellyfinWidget from './JellyfinWidget';

const SectionLabel = ({ children }) => (
  <h2 style={{
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'lowercase',
    letterSpacing: '0.08em',
    color: 'var(--text-subtle)',
    marginBottom: '12px',
  }}>
    {children}
  </h2>
);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {homelab.length > 0 && (
        <div>
          <SectionLabel>services</SectionLabel>
          <div className="service-grid-layout" style={{ gap: '12px', alignItems: 'start' }}>
            {homelab.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                expandedContent={getWidget(service.id)} 
              />
            ))}
          </div>
        </div>
      )}
      {websites.length > 0 && (
        <div>
          <SectionLabel>websites</SectionLabel>
          <div className="service-grid-layout" style={{ gap: '12px', alignItems: 'start' }}>
            {websites.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        </div>
      )}
      {arrStack.length > 0 && (
        <div>
          <SectionLabel>arr-stack</SectionLabel>
          <div className="service-grid-layout" style={{ gap: '12px', alignItems: 'start' }}>
            {arrStack.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                expandedContent={getWidget(service.id)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceGrid;
