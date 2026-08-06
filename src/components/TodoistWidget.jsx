import { useState, useEffect } from 'react';
import { CheckSquare, Square, Check, Loader2 } from 'lucide-react';

const TODOIST_TOKEN = import.meta.env.VITE_TODOIST_TOKEN || '';
const TODOIST_PROJECT_ID = import.meta.env.VITE_TODOIST_PROJECT_ID || '';

const TodoistWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    if (!TODOIST_TOKEN) return;
    setLoading(true);
    setError('');
    try {
      const token = TODOIST_TOKEN.replace(/['"]/g, '').trim();
      
      // Fetch both tasks and projects concurrently
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('https://api.todoist.com/api/v1/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('https://api.todoist.com/api/v1/projects', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!tasksRes.ok || !projectsRes.ok) {
        throw new Error(`HTTP Error: Invalid Token`);
      }
      
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      
      // Parse tasks
      let tasksArray = [];
      if (Array.isArray(tasksData)) tasksArray = tasksData;
      else if (tasksData?.items && Array.isArray(tasksData.items)) tasksArray = tasksData.items;
      else if (tasksData?.tasks && Array.isArray(tasksData.tasks)) tasksArray = tasksData.tasks;
      else if (tasksData?.data && Array.isArray(tasksData.data)) tasksArray = tasksData.data;
      else if (tasksData?.results && Array.isArray(tasksData.results)) tasksArray = tasksData.results;
      
      // Parse projects
      let projectsArray = [];
      if (Array.isArray(projectsData)) projectsArray = projectsData;
      else if (projectsData?.results && Array.isArray(projectsData.results)) projectsArray = projectsData.results;

      setTasks(tasksArray);
      setProjects(projectsArray);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const completeTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const token = TODOIST_TOKEN.replace(/['"]/g, '').trim();
      await fetch(`https://api.todoist.com/api/v1/tasks/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      fetchData(); // rollback
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = activeProjectId === 'all' 
    ? tasks 
    : tasks.filter(t => String(t.project_id) === String(activeProjectId));

  const displayTasks = filteredTasks.slice(0, 5);

  return (
    <div className="widget" style={{ gridColumn: 'span 1' }}>
      <div className="widget-title" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>TODOIST</span>
        
        {/* Project Tabs Dropdown or Scroll */}
        {projects.length > 0 && (
          <select 
            value={activeProjectId} 
            onChange={(e) => setActiveProjectId(e.target.value)}
            style={{ 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

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

        {TODOIST_TOKEN && !loading && displayTasks.length === 0 && !error && (
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
          {displayTasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', group: 'true' }} onClick={() => completeTask(task.id)}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', padding: 0, marginTop: '2px', cursor: 'pointer', transition: 'color 0.2s' }}>
                <Square size={14} />
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                {task.content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodoistWidget;
