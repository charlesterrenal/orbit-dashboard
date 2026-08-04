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
  let greeting = 'Good evening';
  if (hours < 12) greeting = 'Good morning';
  else if (hours < 17) greeting = 'Good afternoon';

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
        {greeting}, Charles.
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', margin: 0 }}>
          {formatDate(time)}
        </p>
        <span style={{ color: 'var(--border)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-dot)' }}>
          <Activity size={14} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>All systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default GreetingClock;
