import { useState, useEffect } from 'react';
import { CheckSquare, Square, Check, Loader2, ChevronDown, RefreshCw } from 'lucide-react';

const TODOIST_TOKEN = import.meta.env.VITE_TODOIST_TOKEN || '';
const TODOIST_PROJECT_ID = import.meta.env.VITE_TODOIST_PROJECT_ID || '';

const TodoistWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

      // Filter out the default "Inbox" project
      projectsArray = projectsArray.filter(p => p.name !== 'Inbox');

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
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckSquare size={12} />todoist</span>
        
        {/* Actions Row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Refresh Button */}
          <button 
            onClick={fetchData}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            title="Refresh Tasks"
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Project Tabs Custom Dropdown */}
          {projects.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  outline: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {activeProjectId === 'all' ? 'all projects' : projects.find(p => p.id === activeProjectId)?.name.toLowerCase() || 'projects'}
                <ChevronDown size={12} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: '#1a1a1a', /* Solid dark background to fix transparency */
                border: '1px solid var(--border)',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 50,
                minWidth: '120px',
                overflow: 'hidden',
                opacity: isDropdownOpen ? 1 : 0,
                visibility: isDropdownOpen ? 'visible' : 'hidden',
                transform: isDropdownOpen ? 'translateY(0)' : 'translateY(-10px)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <button
                  onClick={() => { setActiveProjectId('all'); setIsDropdownOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 12px',
                    background: activeProjectId === 'all' ? 'var(--border)' : 'transparent',
                    border: 'none',
                    color: activeProjectId === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = activeProjectId === 'all' ? 'var(--border)' : 'transparent'; e.currentTarget.style.color = activeProjectId === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)'; }}
                >
                  all projects
                </button>
                {projects.map(p => (
                  <button 
                    key={p.id}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 12px',
                      background: activeProjectId === p.id ? 'var(--border)' : 'transparent',
                      border: 'none',
                      color: activeProjectId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = activeProjectId === p.id ? 'var(--border)' : 'transparent'; e.currentTarget.style.color = activeProjectId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)'; }}
                    onClick={() => { setActiveProjectId(p.id); setIsDropdownOpen(false); }}
                  >
                    {p.name.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
          {displayTasks.map((task, index) => (
            <div key={task.id} className={index >= 3 ? 'hide-on-mobile' : ''} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', group: 'true' }} onClick={() => completeTask(task.id)}>
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
