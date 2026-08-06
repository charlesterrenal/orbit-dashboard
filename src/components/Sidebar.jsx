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
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end title="home">
          <Home size={16} className="sidebar-icon" />
          {isOpen && <span>home</span>}
        </NavLink>
        <NavLink to="/services" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="services">
          <LayoutGrid size={16} className="sidebar-icon" />
          {isOpen && <span>services</span>}
        </NavLink>
        <NavLink to="/containers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title="containers">
          <Server size={16} className="sidebar-icon" />
          {isOpen && <span>containers</span>}
        </NavLink>
      </div>

      {/* Footer: Theme + Settings */}
      <div className="sidebar-footer">
        <button
          className="sidebar-link sidebar-theme-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={16} className="sidebar-icon" />
            : <Moon size={16} className="sidebar-icon" />
          }
          {isOpen && <span>{theme === 'dark' ? 'light mode' : 'dark mode'}</span>}
        </button>
      </div>

    </nav>
  );
};

export default Sidebar;
