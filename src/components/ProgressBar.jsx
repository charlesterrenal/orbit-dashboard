const ProgressBar = ({ percent, label }) => {
  let barFill = 'var(--progress-fill)';
  let textColor = 'var(--text-muted)';

  if (percent > 85) {
    barFill = 'var(--accent-offline)';
    textColor = 'var(--accent-offline)';
  } else if (percent > 70) {
    barFill = 'var(--accent-warning)';
    textColor = 'var(--accent-warning)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-subtle)', textTransform: 'lowercase' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: textColor, fontVariantNumeric: 'tabular-nums' }}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '5px', 
        backgroundColor: 'var(--border)', 
        borderRadius: '9999px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, percent))}%`,
          backgroundColor: barFill,
          borderRadius: '9999px',
          transition: 'width 0.4s ease, background-color 0.3s ease'
        }} />
      </div>
    </div>
  );
};

export default ProgressBar;
