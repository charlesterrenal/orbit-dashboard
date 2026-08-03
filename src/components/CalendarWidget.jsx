import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarWidget = () => {
  const [offset, setOffset] = useState(0); // months relative to today

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

      <div className="card" style={{ padding: '12px', aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'auto' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{monthName}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{year}</span>
        </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {dayLabels.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '600', color: 'var(--text-subtle)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
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
    </div>
    </div>
  );
};

export default CalendarWidget;
