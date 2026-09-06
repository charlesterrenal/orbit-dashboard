import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Home, 
  LayoutGrid, 
  Server, 
  Sun, 
  Moon, 
  ExternalLink, 
  RefreshCw,
  Cpu,
  Radio,
  Tv,
  Film,
  DownloadCloud,
  Layers
} from 'lucide-react';

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const selectedItemRef = useRef(null);
  const navigate = useNavigate();

  const commands = [
    // navigation
    { id: 'nav-home', title: 'go to home', category: 'navigation', icon: Home, action: () => { navigate('/'); onClose(); } },
    { id: 'nav-services', title: 'go to services', category: 'navigation', icon: LayoutGrid, action: () => { navigate('/services'); onClose(); } },
    { id: 'nav-containers', title: 'go to containers', category: 'navigation', icon: Server, action: () => { navigate('/containers'); onClose(); } },

    // infrastructure & services
    { id: 'svc-pve', title: 'open proxmox ve webui', category: 'services', icon: Cpu, action: () => { window.open('https://192.168.254.200:8006', '_blank'); onClose(); } },
    { id: 'svc-portainer', title: 'open portainer', category: 'services', icon: Layers, action: () => { window.open('https://192.168.254.204:9443', '_blank'); onClose(); } },
    { id: 'svc-uptime', title: 'open uptime kuma', category: 'services', icon: Radio, action: () => { window.open('http://192.168.254.204:3001', '_blank'); onClose(); } },
    { id: 'svc-jellyfin', title: 'open jellyfin', category: 'services', icon: Tv, action: () => { window.open('http://192.168.254.203:8096', '_blank'); onClose(); } },
    { id: 'svc-jellyseerr', title: 'open jellyseerr', category: 'services', icon: Film, action: () => { window.open('http://192.168.254.203:5055', '_blank'); onClose(); } },
    { id: 'svc-qbit', title: 'open qbittorrent', category: 'services', icon: DownloadCloud, action: () => { window.open('http://192.168.254.203:8080', '_blank'); onClose(); } },

    // quick actions
    {
      id: 'act-theme',
      title: 'toggle dark / light theme',
      category: 'actions',
      icon: Sun,
      action: () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        document.documentElement.setAttribute('data-theme', next);
        onClose();
      }
    },
    {
      id: 'act-reload',
      title: 'reload page data',
      category: 'actions',
      icon: RefreshCw,
      action: () => {
        window.location.reload();
      }
    }
  ];

  const filteredCommands = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Lock body scroll and prevent page shift
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="cmd-palette-backdrop"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.15s ease forwards',
        overscrollBehavior: 'contain'
      }}
    >
      <div 
        className="cmd-palette-dialog"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'inherit',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Search Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <Search size={16} style={{ color: 'var(--text-subtle)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="type a command or search services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'inherit'
            }}
          />
          <kbd style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-subtle)',
            textTransform: 'lowercase'
          }}>esc</kbd>
        </div>

        {/* Command Results */}
        <div className="cmd-palette-list">
          {filteredCommands.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-subtle)',
              fontSize: '13px'
            }}>
              no matching commands or services found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  ref={isSelected ? selectedItemRef : null}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-subtle)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Icon size={16} />
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {cmd.title}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-subtle)',
                    fontWeight: 500
                  }}>
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          fontSize: '11px',
          color: 'var(--text-subtle)'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>↑↓</kbd> navigate</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>↵</kbd> select</span>
          </div>
          <span>ahhs command center</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
