import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { fetchCalendarEvents } from '../api/calendar';

const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL || '';

const CalendarWidget = () => {
  const [offset, setOffset] = useState(0); // months relative to today
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!CALENDAR_URL) return;
    setLoading(true);
    fetchCalendarEvents(CALENDAR_URL).then(fetchedEvents => {
      // Filter out past events
      const now = new Date();
      now.setHours(0, 0, 0, 0); // start of today
      const upcoming = fetchedEvents.filter(e => e.end ? e.end >= now : e.start >= now);
      setEvents(upcoming.slice(0, 3)); // show next 3
      setLoading(false);
    });
  }, []);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);

  const year = base.getFullYear();
  const month = base.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const monthName = base.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', minHeight: '20px' }}>
        <div className="widget-title" style={{ margin: 0 }}>calendar</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setOffset(o => o - 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'color var(--transition-fast)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setOffset(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isCurrentMonth ? 'var(--accent-primary)' : 'var(--text-subtle)', fontSize: '9px', fontWeight: '600', padding: '2px 4px', borderRadius: '4px', transition: 'color var(--transition-fast)' }}
          >
            today
          </button>
          <button
            onClick={() => setOffset(o => o + 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', transition: 'color var(--transition-fast)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: '230px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{monthName}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{year}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {dayLabels.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '600', color: 'var(--text-subtle)', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '16px' }}>
          {cells.map((day, i) => {
            const isToday = day === todayDate;
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  padding: '5px 2px',
                  borderRadius: '6px',
                  fontWeight: isToday ? '700' : '400',
                  color: isToday ? '#fff' : day ? 'var(--text-muted)' : 'transparent',
                  backgroundColor: isToday ? 'var(--accent-primary)' : 'transparent',
                  cursor: day ? 'default' : 'default',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                {day || ''}
              </div>
            );
          })}
        </div>

        {/* Events Section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', flex: 1 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Upcoming Events
          </div>
          
          {!CALENDAR_URL && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
              <CalendarIcon size={14} />
              <span>No VITE_CALENDAR_URL in .env</span>
            </div>
          )}

          {loading && CALENDAR_URL && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
              Syncing calendar...
            </div>
          )}

          {!loading && events.length === 0 && CALENDAR_URL && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
              No upcoming events.
            </div>
          )}

          {!loading && events.map((ev, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ev.title}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>
                {ev.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
