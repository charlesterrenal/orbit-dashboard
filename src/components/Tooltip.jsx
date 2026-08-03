import { useState } from 'react';

const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isVisible && (
        <div 
          className="tooltip-content"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '6px 10px',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: '500',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 50,
            border: '1px solid var(--border)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-in-out'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
