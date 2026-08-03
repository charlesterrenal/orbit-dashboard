import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

const PopoverMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePopover = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="popover-container" ref={popoverRef} style={{ position: 'relative' }}>
      <button 
        onClick={togglePopover}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-subtle)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'color var(--transition-fast)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subtle)'}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div 
          className="popover-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '4px',
            minWidth: '120px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-in-out'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default PopoverMenu;
