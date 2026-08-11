import { useState } from 'react';
import TailscaleWidget from '../components/TailscaleWidget';
import ServiceGrid from '../components/ServiceGrid';
import QbittorrentWidget from '../components/QbittorrentWidget';
import servicesConfig from '../config/services.json';

const Services = () => {
  const [services] = useState(servicesConfig);

  return (
    <div className="page-container animate-enter">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(auto, 720px) 380px', justifyContent: 'center', gap: '32px', alignItems: 'start' }} className="services-grid-mobile">
        <div className="col-main">
          <ServiceGrid services={services} />
        </div>
        <aside className="col-right" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <TailscaleWidget />
          <QbittorrentWidget />
        </aside>
      </div>
    </div>
  );
};

export default Services;
