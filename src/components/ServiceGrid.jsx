import ServiceCard from './ServiceCard';

const SectionLabel = ({ children }) => (
  <h2 style={{
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {homelab.length > 0 && (
        <div>
          <SectionLabel>services</SectionLabel>
          <div className="service-grid-layout" style={{ gap: '12px' }}>
            {homelab.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        </div>
      )}
      {websites.length > 0 && (
        <div>
          <SectionLabel>websites</SectionLabel>
          <div className="service-grid-layout" style={{ gap: '12px' }}>
            {websites.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceGrid;
