import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';

export default function DiffViewer({ commit, onClose }) {
  const [diffText, setDiffText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!commit) return;
    setLoading(true);

    if (window.electronAPI) {
      window.electronAPI.getCommitDiff(commit.sha).then((res) => {
        setDiffText(res || 'No diff content returned.');
        setLoading(false);
      });
    } else {
      setDiffText('Electron IPC API not connected.');
      setLoading(false);
    }
  }, [commit]);

  if (!commit) return null;

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diffText.split('\n');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 16, 0.85)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        padding: '30px',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '1100px',
          height: '85vh',
          background: '#171b22',
          border: '1px solid var(--border-strong)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '14px 20px',
            background: '#11141a',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={16} color="#c5a059" />
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', letterSpacing: '0.4px' }}>
                Git Commit Diff
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginLeft: '10px' }}>
                {commit.shortSha} — {commit.subject}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-sm" onClick={handleCopyDiff}>
              {copied ? <Check size={13} color="#7cbfa3" /> : <Copy size={13} />}
              Copy Raw Diff
            </button>
            <button className="btn btn-sm" onClick={onClose} style={{ borderRadius: '3px', padding: '5px' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Diff Viewer Canvas */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '1.6',
            background: '#11141a',
            color: '#dcd7cd',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading commit diff...
            </div>
          ) : (
            lines.map((line, idx) => {
              let style = { whiteSpace: 'pre-wrap', wordBreak: 'break-all' };
              let bg = 'transparent';
              let color = '#dcd7cd';

              if (line.startsWith('+') && !line.startsWith('+++')) {
                bg = 'rgba(61, 107, 86, 0.22)';
                color = '#8ecfb0';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                bg = 'rgba(158, 71, 71, 0.22)';
                color = '#e59e9e';
              } else if (line.startsWith('@@')) {
                bg = 'rgba(74, 107, 130, 0.25)';
                color = '#9ebfd5';
              } else if (line.startsWith('diff --git') || line.startsWith('index ')) {
                color = '#c5a059';
                style.fontWeight = 'bold';
              }

              return (
                <div key={idx} style={{ ...style, background: bg, color, padding: '1px 8px', borderRadius: '2px' }}>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
