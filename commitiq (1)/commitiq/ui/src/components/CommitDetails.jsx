import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Eye,
  MessageSquareCode,
} from 'lucide-react';

export default function CommitDetails({ commit, onClose, onViewDiff }) {
  const [copied, setCopied] = useState(false);

  if (!commit) return null;

  const handleCopySha = () => {
    navigator.clipboard.writeText(commit.sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const note = commit.note;

  return (
    <aside className="detail-drawer">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#11141a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#c5a059" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '0.4px', color: 'var(--text-main)' }}>
            CommitIQ Summary
          </h2>
        </div>
        <button
          className="btn btn-sm"
          onClick={onClose}
          style={{ padding: '4px', borderRadius: '3px', background: 'transparent' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Content Scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Conventional Commit Badges & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span className={`type-badge ${commit.commitType}`}>{commit.commitType}</span>
          {note?.scope && (
            <span
              style={{
                background: '#20252c',
                color: '#c5a059',
                border: '1px solid var(--border-subtle)',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              scope: {note.scope}
            </span>
          )}
          {note?.breaking_change && (
            <span className="breaking-pill">
              <AlertTriangle size={11} style={{ marginRight: '4px', display: 'inline-block' }} color="#f4e6c3" />
              BREAKING CHANGE
            </span>
          )}
        </div>

        {/* Note Summary */}
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 700,
            fontFamily: 'var(--font-serif)',
            color: 'var(--text-main)',
            marginBottom: '12px',
            lineHeight: '1.4',
            letterSpacing: '0.2px',
          }}
        >
          {note?.summary || commit.subject}
        </h3>

        {/* Detailed Description */}
        {note?.description ? (
          <div
            style={{
              background: '#11141a',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '12px 14px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
              marginBottom: '16px',
            }}
          >
            {note.description}
          </div>
        ) : (
          <div
            style={{
              background: '#11141a',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-dim)',
              marginBottom: '16px',
            }}
          >
            No LLM summary note attached to this commit yet. Run <code>git commitiq</code> to attach summaries.
          </div>
        )}

        {/* Review Notes Alert Callout */}
        {note?.review_notes && (
          <div
            style={{
              background: '#26211c',
              border: '1px solid #54473c',
              borderRadius: '4px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c5a059', fontWeight: 700, fontSize: '12px', marginBottom: '6px', letterSpacing: '0.4px' }}>
              <MessageSquareCode size={14} color="#c5a059" />
              Reviewer Notes
            </div>
            <p style={{ fontSize: '12px', color: '#d1c2b2', lineHeight: '1.45' }}>
              {note.review_notes}
            </p>
          </div>
        )}

        {/* Changed Files List */}
        {note?.changed_files && note.changed_files.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>
              Changed Files ({note.changed_files.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {note.changed_files.map((file, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#11141a',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <FileCode size={14} color="#4a6b82" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {file}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commit Metadata Box */}
        <div
          style={{
            background: '#11141a',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Commit SHA</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#c5a059', fontWeight: 600 }}>
                {commit.sha.substring(0, 10)}
              </code>
              <button
                className="btn btn-sm"
                onClick={handleCopySha}
                style={{ padding: '2px 6px', fontSize: '10px' }}
                title="Copy Full Commit SHA"
              >
                {copied ? <Check size={12} color="#7cbfa3" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Author</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
              {commit.authorName} &lt;{commit.authorEmail}&gt;
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Date</span>
            <span style={{ color: 'var(--text-main)' }}>{commit.date}</span>
          </div>

          {commit.parents && commit.parents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Parents</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {commit.parents.map((p) => (
                  <code key={p} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {p.substring(0, 7)}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Drawer Action */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: '#11141a',
          display: 'flex',
          gap: '10px',
        }}
      >
        <button className="btn btn-primary" onClick={() => onViewDiff(commit)} style={{ flex: 1, justifyContent: 'center' }}>
          <Eye size={14} />
          View Code Diff
        </button>
      </div>
    </aside>
  );
}
