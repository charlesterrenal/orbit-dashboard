import { useState, useEffect, useRef } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, CloudSun } from 'lucide-react';

const LAT = import.meta.env.VITE_WEATHER_LAT || '14.3864';
const LON = import.meta.env.VITE_WEATHER_LON || '120.8810';

const WMO_CONDITIONS = {
  0: { label: 'Clear Sky', Icon: Sun },
  1: { label: 'Mainly Clear', Icon: Sun },
  2: { label: 'Partly Cloudy', Icon: Cloud },
  3: { label: 'Overcast', Icon: Cloud },
  45: { label: 'Foggy', Icon: Cloud },
  48: { label: 'Icy Fog', Icon: Cloud },
  51: { label: 'Light Drizzle', Icon: CloudRain },
  53: { label: 'Drizzle', Icon: CloudRain },
  55: { label: 'Heavy Drizzle', Icon: CloudRain },
  61: { label: 'Slight Rain', Icon: CloudRain },
  63: { label: 'Rain', Icon: CloudRain },
  65: { label: 'Heavy Rain', Icon: CloudRain },
  71: { label: 'Light Snow', Icon: CloudSnow },
  80: { label: 'Rain Showers', Icon: CloudRain },
  81: { label: 'Heavy Showers', Icon: CloudRain },
  95: { label: 'Thunderstorm', Icon: CloudLightning },
  99: { label: 'Heavy Thunderstorm', Icon: CloudLightning },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=14&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather API failed');
        const data = await res.json();
        setWeather(data);
      } catch (e) {
        setError('Weather unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [weather]);

  if (loading) {
    return (
      <div className="widget">
        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>weather</span>
          <div className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="widget">
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>weather</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { temperature_2m: temp, weather_code: code, wind_speed_10m: wind, relative_humidity_2m: humidity } = weather.current;
  const condition = WMO_CONDITIONS[code] || { label: 'Unknown', Icon: Cloud };
  const ConditionIcon = condition.Icon;

  const hourlyTemps = weather.hourly.temperature_2m;
  const hourlyCodes = weather.hourly.weather_code;
  const hourlyPrecip = weather.hourly.precipitation_probability;
  const hourlyTimes = weather.hourly.time;

  return (
    <div className="widget">
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        {/* Card Header Inside */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            weather
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '700', lineHeight: '1', color: 'var(--text-primary)' }}>{Math.round(temp)}°C</div>
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '8px' }}>{condition.label.toLowerCase()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {(import.meta.env.VITE_WEATHER_CITY || 'local forecast').toLowerCase()} • {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
            </div>
          </div>
          <ConditionIcon size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', marginBottom: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-subtle)' }}>
            <Droplets size={10} style={{ color: 'var(--accent-primary)' }} />{humidity}%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-subtle)' }}>
            <Wind size={10} style={{ color: 'var(--accent-primary)' }} />{Math.round(wind)} km/h
          </span>
        </div>

        <div className="hide-on-mobile" style={{ position: 'relative', marginTop: '4px' }}>
          <div 
            ref={scrollRef}
            className="hide-scrollbar" 
            style={{ 
              display: 'flex', 
              borderTop: '1px solid var(--border)', 
              paddingTop: '8px', 
            gap: '12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingRight: '16px' // extra padding to scroll past the fade
          }}>
            {hourlyTemps.slice(1, 13).map((tempStr, i) => {
              const index = i + 1;
              const hourCode = hourlyCodes[index];
              const precipProb = hourlyPrecip[index];
              const HourIcon = (WMO_CONDITIONS[hourCode] || { Icon: Cloud }).Icon;
              const date = new Date(hourlyTimes[index]);
              const hour = date.getHours();
              const timeStr = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`;
              return (
                <div key={i} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '32px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-subtle)', textTransform: 'lowercase', letterSpacing: '0.05em' }}>{timeStr}</span>
                  <HourIcon size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(tempStr)}°</span>
                  {precipProb > 0 ? (
                    <span style={{ fontSize: '8px', color: '#0ea5e9', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      {precipProb}%
                    </span>
                  ) : (
                    <span style={{ fontSize: '8px', height: '12px' }}></span> // placeholder to keep alignment
                  )}
                </div>
              );
            })}
          </div>
          {/* Fade Effect on the right side */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '30px',
            background: 'linear-gradient(to right, transparent, var(--bg-surface))',
            pointerEvents: 'none'
          }} />
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
