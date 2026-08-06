import WeatherWidget from '../components/WeatherWidget';
import CalendarWidget from '../components/CalendarWidget';
import SystemStats from '../components/SystemStats';
import TodoistWidget from '../components/TodoistWidget';
import NetworkWidget from '../components/NetworkWidget';
import GreetingClock from '../components/GreetingClock';
import ServicesSummaryWidget from '../components/ServicesSummaryWidget';
import DockerSummaryWidget from '../components/DockerSummaryWidget';
import TailscaleSummaryWidget from '../components/TailscaleSummaryWidget';
import JellyfinSummaryWidget from '../components/JellyfinSummaryWidget';
import StorageWidget from '../components/StorageWidget';
import ActivityFeedWidget from '../components/ActivityFeedWidget';
import { LayoutGrid } from 'lucide-react';

const Home = () => {
  return (
    <div className="page-container animate-enter">
      <GreetingClock />
      <div className="home-grid">
        {/* Column 1 */}
        <div className="home-col">
          <div className="order-todo tile-widget"><TodoistWidget /></div>
          <div className="order-weather tile-widget"><WeatherWidget /></div>
        </div>
        
        {/* Column 2 */}
        <div className="home-col">
          <div className="order-calendar tile-widget"><CalendarWidget /></div>
        </div>
        
        {/* Column 3 */}
        <div className="home-col">
          <div className="widget order-overview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
              <h3 className="widget-title" style={{ margin: 0 }}><LayoutGrid size={12} />overview</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <ServicesSummaryWidget />
              <DockerSummaryWidget />
              <TailscaleSummaryWidget />
              <JellyfinSummaryWidget />
            </div>
          </div>
          <div className="tile-widget">
            <StorageWidget />
          </div>
        </div>
        
        {/* Column 4 */}
        <div className="home-col">
          <div className="order-proxmox tile-widget"><SystemStats /></div>
          <div className="order-network tile-widget"><NetworkWidget /></div>
        </div>
      </div>
      
      <ActivityFeedWidget />
    </div>
  );
};

export default Home;
