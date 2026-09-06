import { useState, useRef } from 'react';

const Tooltip = ({ children, content }) => {
  const [pos, setPos] = useState(null);
  const hideTimer = useRef(null);
  const triggerRef = useRef(null);

  const show = () => {
    clearTimeout(hideTimer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2,
      });
    }
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setPos(null), 120);
  };

  return (
    <div
      ref={triggerRef}
      className="tooltip-container"
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: 'relative', display: 'block', width: '100%' }}
    >
      {children}
      {pos && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            marginBottom: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-elevated)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            border: '1px solid var(--border)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{content}</span>
          {/* Subtle Bottom Caret */}
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--bg-elevated)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
