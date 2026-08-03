import WeatherWidget from '../components/WeatherWidget';
import CalendarWidget from '../components/CalendarWidget';
import SystemStats from '../components/SystemStats';
import GithubWidget from '../components/GithubWidget';
import GreetingClock from '../components/GreetingClock';
import ServicesSummaryWidget from '../components/ServicesSummaryWidget';
import DockerSummaryWidget from '../components/DockerSummaryWidget';
import TailscaleSummaryWidget from '../components/TailscaleSummaryWidget';
import JellyfinSummaryWidget from '../components/JellyfinSummaryWidget';

const Home = () => {
  return (
    <div className="page-container animate-enter">
      <GreetingClock />
      <div className="home-grid">
        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SystemStats />
          <WeatherWidget />
        </div>
        
        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CalendarWidget />
        </div>
        
        {/* Column 3 */}
        <div className="widget">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
            <h3 className="widget-title" style={{ margin: 0 }}>OVERVIEW</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <ServicesSummaryWidget />
            <DockerSummaryWidget />
            <TailscaleSummaryWidget />
            <JellyfinSummaryWidget />
          </div>
        </div>
        
        {/* Column 4 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GithubWidget />
        </div>
      </div>
    </div>
  );
};

export default Home;
