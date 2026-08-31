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
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {pos && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            marginBottom: '6px',
            padding: '5px 10px',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: '500',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 9999,
            border: '1px solid var(--border)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-in-out',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
