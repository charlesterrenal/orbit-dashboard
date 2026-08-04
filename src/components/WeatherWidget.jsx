import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets } from 'lucide-react';

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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code&forecast_hours=14&timezone=auto`;
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

  if (loading) {
    return (
      <div className="widget">
        <div className="widget-title">weather</div>
        <div className="skeleton" style={{ height: '100px', borderRadius: '10px' }} />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="widget">
        <div className="widget-title">weather</div>
        <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{error}</p>
      </div>
    );
  }

  const { temperature_2m: temp, weather_code: code, wind_speed_10m: wind, relative_humidity_2m: humidity } = weather.current;
  const condition = WMO_CONDITIONS[code] || { label: 'Unknown', Icon: Cloud };
  const ConditionIcon = condition.Icon;

  const hourlyTemps = weather.hourly.temperature_2m;
  const hourlyCodes = weather.hourly.weather_code;
  const hourlyTimes = weather.hourly.time;

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div className="widget-title" style={{ margin: 0 }}>weather · General Trias</div>
      </div>
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1', color: 'var(--text-primary)' }}>{Math.round(temp)}°C</div>
            <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>{condition.label}</div>
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

        <div className="hide-scrollbar" style={{ 
          display: 'flex', 
          borderTop: '1px solid var(--border)', 
          paddingTop: '8px', 
          marginTop: '4px',
          gap: '12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {/* Hide webkit scrollbar via inline style not possible, but standard properties usually hide it well enough on modern browsers */}
          {hourlyTemps.slice(1, 13).map((tempStr, i) => {
            const index = i + 1;
            const hourCode = hourlyCodes[index];
            const HourIcon = (WMO_CONDITIONS[hourCode] || { Icon: Cloud }).Icon;
            const date = new Date(hourlyTimes[index]);
            const hour = date.getHours();
            const timeStr = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`;
            return (
              <div key={i} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '32px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{timeStr}</span>
                <HourIcon size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(tempStr)}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
