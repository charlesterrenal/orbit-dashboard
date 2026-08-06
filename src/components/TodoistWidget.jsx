import { useState, useEffect } from 'react';
import { CheckSquare, Square, Check, Loader2 } from 'lucide-react';

const TODOIST_TOKEN = import.meta.env.VITE_TODOIST_TOKEN || '';

const TodoistWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = async () => {
    if (!TODOIST_TOKEN) return;
    setLoading(true);
    setError('');
    try {
      const token = TODOIST_TOKEN.replace(/['"]/g, '').trim();
      const res = await fetch('https://api.todoist.com/api/v1/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Invalid Token`);
      }
      const data = await res.json();
      let tasksArray = [];
      if (Array.isArray(data)) {
        tasksArray = data;
      } else if (data && data.items && Array.isArray(data.items)) {
        tasksArray = data.items;
      } else if (data && data.tasks && Array.isArray(data.tasks)) {
        tasksArray = data.tasks;
      } else if (data && data.data && Array.isArray(data.data)) {
        tasksArray = data.data;
      } else if (data && data.results && Array.isArray(data.results)) {
        tasksArray = data.results;
      }
      setTasks(tasksArray.slice(0, 5)); // show top 5
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const completeTask = async (id) => {
    // optimistic UI
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const token = TODOIST_TOKEN.replace(/['"]/g, '').trim();
      await fetch(`https://api.todoist.com/api/v1/tasks/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      fetchTasks(); // rollback on error
    }
  };

  return (
    <div className="widget" style={{ gridColumn: 'span 1' }}>
      <div className="widget-title" style={{ marginBottom: '8px' }}>chores</div>
      <div className="card" style={{ padding: '12px', minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
        
        {!TODOIST_TOKEN && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            <CheckSquare size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <span style={{ fontSize: '11px', textAlign: 'center' }}>No VITE_TODOIST_TOKEN<br/>in .env</span>
          </div>
        )}

        {TODOIST_TOKEN && loading && tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}

        {TODOIST_TOKEN && !loading && tasks.length === 0 && !error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            <Check size={24} style={{ marginBottom: '8px', color: 'var(--accent-online)', opacity: 0.8 }} />
            <span style={{ fontSize: '11px' }}>All caught up!</span>
          </div>
        )}

        {error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-offline)' }}>
            <span style={{ fontSize: '11px', textAlign: 'center' }}>Error:<br/>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', group: 'true' }} onClick={() => completeTask(task.id)}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', padding: 0, marginTop: '2px', cursor: 'pointer', transition: 'color 0.2s' }}>
                <Square size={14} />
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {task.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodoistWidget;
