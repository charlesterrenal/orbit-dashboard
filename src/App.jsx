import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Services from './pages/Services';
import Containers from './pages/Containers';
import ParticleBackground from './components/ParticleBackground';
import CommandPalette from './components/CommandPalette';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync when Sidebar changes theme via localStorage + data-theme attribute
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme');
      if (current) setTheme(current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // Apply initial theme
    document.documentElement.setAttribute('data-theme', theme);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-layout">
      <ParticleBackground color={theme === 'dark' ? '#333333' : '#cbd5e1'} />
      <Sidebar onOpenCmd={() => setIsCmdOpen(true)} />
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home onOpenCmd={() => setIsCmdOpen(true)} />} />
          <Route path="/services" element={<Services />} />
          <Route path="/containers" element={<Containers />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
