import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CommitIQCommitModal({ onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResult(null);

    if (window.electronAPI) {
      const res = await window.electronAPI.commitIQ(message);
      setLoading(false);
      if (res.success) {
        setResult({ success: true, message: 'Commit created & LLM summary note attached successfully!' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setResult({ success: false, message: res.stderr || res.error || 'Commit failed.' });
      }
    } else {
      setLoading(false);
      setResult({ success: false, message: 'Electron IPC API not connected.' });
    }
  };

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
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#171b22',
          border: '1px solid var(--border-strong)',
          borderRadius: '4px',
          padding: '24px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#c5a059" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', letterSpacing: '0.4px' }}>
              Create CommitIQ Semantic Commit
            </h2>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{ borderRadius: '3px', padding: '5px' }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          Runs <code style={{ fontFamily: 'var(--font-mono)', color: '#c5a059' }}>git commitiq -m &quot;...&quot;</code> inside the repository. On success, an AI LLM summary note will automatically be attached to the commit.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              COMMIT MESSAGE
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. fix(auth): handle expired session tokens gracefully"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', resize: 'none' }}
              autoFocus
            />
          </div>

          {result && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: result.success ? '#15221b' : '#2b181b',
                color: result.success ? '#7cbfa3' : '#e58e93',
                border: `1px solid ${result.success ? '#284738' : '#6b2d34'}`,
              }}
            >
              {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !message.trim()}>
              {loading ? (
                <>
                  <Loader2 size={14} className="spin" /> Creating Commit & Summarizing...
                </>
              ) : (
                <>
                  <Send size={14} /> Commit & Attach Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
