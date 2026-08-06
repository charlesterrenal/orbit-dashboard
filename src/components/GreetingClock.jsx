import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

const GreetingClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Only need to update every minute now since we don't show seconds/clock,
    // but updating every second is fine for midnight rollovers.
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  let greeting = 'good evening';
  if (hours < 12) greeting = 'good morning';
  else if (hours < 17) greeting = 'good afternoon';

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).toLowerCase();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          {greeting}, charles.
        </h1>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          {formatTime(time)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', margin: 0 }}>
          {formatDate(time)}
        </p>
        <span style={{ color: 'var(--border)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-dot)' }}>
          <Activity size={14} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>all systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default GreetingClock;
