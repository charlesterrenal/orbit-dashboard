import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const CopyToClipboard = ({ text, customIcon }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="copy-button"
      title="Copy to clipboard"
      style={{
        background: 'none',
        border: 'none',
        padding: '4px',
        cursor: 'pointer',
        color: copied ? 'var(--accent-online)' : 'var(--text-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        transition: 'all var(--transition-fast)'
      }}
    >
      {copied ? <Check size={14} /> : (customIcon || <Copy size={14} />)}
    </button>
  );
};

export default CopyToClipboard;
