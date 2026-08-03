import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Server, Settings, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-open');
    return stored === null ? true : stored === 'true';
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleSidebar = () => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-open', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  };

  return (
    <nav className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>

      {/* Peeking collapse tab — rides on the right edge */}
      <button className="sidebar-peek-tab" onClick={toggleSidebar} aria-label="Toggle Sidebar">
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Main Nav */}
      <div className="sidebar-links">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end title="Home">
          <Home size={16} className="sidebar-icon" />
          {isOpen && <span>Home</span>}
        </NavLink>
        <NavLink to="/services" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Services">
          <LayoutGrid size={16} className="sidebar-icon" />
          {isOpen && <span>Services</span>}
        </NavLink>
        <NavLink to="/containers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Containers">
          <Server size={16} className="sidebar-icon" />
          {isOpen && <span>Containers</span>}
        </NavLink>
      </div>

      {/* Footer: Theme + Settings */}
      <div className="sidebar-footer">
        <button
          className="sidebar-link sidebar-theme-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark'
            ? <Sun size={16} className="sidebar-icon" />
            : <Moon size={16} className="sidebar-icon" />
          }
          {isOpen && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="Settings">
          <Settings size={16} className="sidebar-icon" />
          {isOpen && <span>Settings</span>}
        </NavLink>
      </div>

    </nav>
  );
};

export default Sidebar;
