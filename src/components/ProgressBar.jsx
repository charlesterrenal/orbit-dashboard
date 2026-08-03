const ProgressBar = ({ percent, label }) => {
  let colorVar = '--accent-primary';
  if (percent > 85) {
    colorVar = '--accent-offline';
  } else if (percent > 70) {
    colorVar = '--accent-warning';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: `var(${colorVar})`, fontVariantNumeric: 'tabular-nums' }}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '6px', 
        backgroundColor: 'var(--border)', 
        borderRadius: '9999px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, percent))}%`,
          backgroundColor: `var(${colorVar})`,
          borderRadius: '9999px',
          transition: 'width 0.5s ease, background-color 0.5s ease'
        }} />
      </div>
    </div>
  );
};

export default ProgressBar;
