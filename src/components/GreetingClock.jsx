import { useState, useEffect } from 'react';

const GreetingClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  let greeting = 'good evening';
  if (hours < 12) greeting = 'good morning';
  else if (hours < 17) greeting = 'good afternoon';

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).toLowerCase();
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '8px', textTransform: 'lowercase' }}>
        {formatTime(time)}
      </h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-muted)' }}>
        {greeting}, charles
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
        {formatDate(time)}
      </p>
    </div>
  );
};

export default GreetingClock;
