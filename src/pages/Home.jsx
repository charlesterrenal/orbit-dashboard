import WeatherWidget from '../components/WeatherWidget';
import CalendarWidget from '../components/CalendarWidget';
import TodoistWidget from '../components/TodoistWidget';
import GreetingClock from '../components/GreetingClock';
import OverviewCard from '../components/OverviewCard';
import SystemStats from '../components/SystemStats';
import NetworkStorageWidget from '../components/NetworkStorageWidget';
import ActivityFeedWidget from '../components/ActivityFeedWidget';

const Home = ({ onOpenCmd }) => {
  return (
    <div className="page-container animate-enter">
      <GreetingClock onOpenCmd={onOpenCmd} />
      <div className="home-grid">
        {/* Column 1: Core Host Telemetry */}
        <div className="home-col">
          <div className="order-proxmox tile-widget"><SystemStats /></div>
          <div className="order-network tile-widget"><NetworkStorageWidget /></div>
        </div>

        {/* Column 2: Fleet Overview */}
        <div className="home-col">
          <OverviewCard />
        </div>
        
        {/* Column 3: Calendar */}
        <div className="home-col">
          <div className="order-calendar tile-widget"><CalendarWidget /></div>
        </div>

        {/* Column 4: Tasks & Weather */}
        <div className="home-col">
          <div className="order-todo tile-widget"><TodoistWidget /></div>
          <div className="order-weather tile-widget"><WeatherWidget /></div>
        </div>
      </div>
      
      <ActivityFeedWidget />
    </div>
  );
};

export default Home;
