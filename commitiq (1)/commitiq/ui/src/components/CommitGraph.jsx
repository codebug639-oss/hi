import React, { useMemo, useState, useRef } from 'react';
import { buildCommitGraph } from '../utils/gitParser';
import { Sparkles, Calendar, Tag, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function CommitGraph({
  commits,
  selectedCommit,
  onSelectCommit,
  searchQuery,
  typeFilter,
  onTypeFilterChange,
}) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  // Build topology graph
  const graphData = useMemo(() => {
    return buildCommitGraph(commits);
  }, [commits]);

  const { nodes, connections, laneCount, dateMilestones, totalHeight } = graphData;

  // Filter matching
  const isMatched = (node) => {
    if (typeFilter !== 'ALL' && node.commitType !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const noteSummary = node.note?.summary || '';
    const noteDesc = node.note?.description || '';
    const scope = node.note?.scope || '';
    const author = node.authorName || '';
    const sha = node.sha || '';
    const subj = node.subject || '';

    return (
      sha.toLowerCase().includes(q) ||
      subj.toLowerCase().includes(q) ||
      noteSummary.toLowerCase().includes(q) ||
      noteDesc.toLowerCase().includes(q) ||
      scope.toLowerCase().includes(q) ||
      author.toLowerCase().includes(q)
    );
  };

  // Ancestor / descendant highlighting when a commit is selected
  const activeShaChain = useMemo(() => {
    if (!selectedCommit) return new Set();
    const set = new Set();
    set.add(selectedCommit.sha);

    // Add immediate parents & children
    connections.forEach((conn) => {
      if (conn.fromSha === selectedCommit.sha) set.add(conn.toSha);
      if (conn.toSha === selectedCommit.sha) set.add(conn.fromSha);
    });
    return set;
  }, [selectedCommit, connections]);

  // Page Wheel Zoom Handler
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale((s) => Math.max(0.2, Math.min(5.0, s * zoomFactor)));
    }
  };

  const handleResetView = () => {
    setScale(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Visual Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          padding: '9px 20px',
          background: '#171b22',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 10,
        }}
      >
        {/* Type Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>
            Filter:
          </span>
          {['ALL', 'feat', 'fix', 'refactor', 'docs', 'chore', 'test'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : ''}`}
              onClick={() => onTypeFilterChange(t)}
              style={{ textTransform: 'uppercase', fontSize: '10px', padding: '3px 8px', letterSpacing: '0.5px' }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="btn btn-sm" onClick={() => setScale((s) => Math.min(5.0, s * 1.25))} title="Zoom In">
            <ZoomIn size={13} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '45px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn btn-sm" onClick={() => setScale((s) => Math.max(0.2, s * 0.8))} title="Zoom Out">
            <ZoomOut size={13} />
          </button>
          <button className="btn btn-sm" onClick={handleResetView} title="Reset View Scale">
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Container */}
      <div
        ref={containerRef}
        className="graph-container"
        onWheel={handleWheel}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#11141a',
          paddingBottom: '100px',
        }}
      >
        <div
          style={{
            position: 'relative',
            minHeight: `${totalHeight}px`,
            minWidth: `${220 + laneCount * 55 + 560}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Date Axis Markers */}
          {dateMilestones.map((m, idx) => (
            <div
              key={`date-${idx}`}
              style={{
                position: 'absolute',
                top: `${m.y - 12}px`,
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 5,
              }}
            >
              <div
                style={{
                  background: '#26211c',
                  border: '1px solid #54473c',
                  color: '#c5a059',
                  padding: '3px 9px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Calendar size={11} style={{ marginRight: '5px', display: 'inline-block', verticalAlign: 'middle' }} color="#c5a059" />
                {m.date}
              </div>
              <div
                style={{
                  height: '1px',
                  width: '110px',
                  background: 'linear-gradient(to right, rgba(197, 160, 89, 0.3), transparent)',
                }}
              />
            </div>
          ))}

          {/* Connected Topological Graph Bezier Curves */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${totalHeight}px`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {connections.map((conn) => {
              const isHighlight = activeShaChain.has(conn.fromSha) && activeShaChain.has(conn.toSha);
              return (
                <path
                  key={conn.id}
                  d={conn.path}
                  fill="none"
                  stroke={isHighlight ? '#c5a059' : conn.color}
                  strokeWidth={isHighlight ? 3.5 : conn.isMerge ? 2.25 : 1.75}
                  strokeDasharray={conn.isMerge ? '4,4' : 'none'}
                  strokeOpacity={isHighlight ? 1 : 0.75}
                  style={{ transition: 'stroke-width 0.2s, stroke 0.2s' }}
                />
              );
            })}
          </svg>

          {/* Graph Nodes & Compact Node Labels (No heavy side description cards by default) */}
          {nodes.map((node) => {
            const isSelected = selectedCommit?.sha === node.sha;
            const matched = isMatched(node);
            const inChain = activeShaChain.has(node.sha);

            return (
              <React.Fragment key={node.sha}>
                {/* Graph Node Dot */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCommit(node);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${node.x - 9}px`,
                    top: `${node.y - 9}px`,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: isSelected ? '#f4f1ea' : node.color,
                    border: `3px solid ${isSelected ? '#c5a059' : '#11141a'}`,
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(197, 160, 89, 0.4), 0 3px 10px rgba(0,0,0,0.5)'
                      : `0 2px 6px rgba(0, 0, 0, 0.4)`,
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.18s ease',
                    opacity: matched ? 1 : 0.3,
                  }}
                  title={`Click to view commit details for ${node.shortSha}`}
                />

                {/* Minimal Inline Commit Label (Visible on canvas, click opens full details drawer) */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCommit(node);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${node.x + 18}px`,
                    top: `${node.y - 14}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 10px',
                    background: isSelected ? '#222731' : '#171b22',
                    border: `1px solid ${isSelected ? '#c5a059' : 'var(--border-subtle)'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: isSelected ? 15 : 6,
                    opacity: matched ? (inChain || !selectedCommit ? 1 : 0.7) : 0.25,
                    transition: 'all 0.18s ease',
                    maxWidth: '480px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxShadow: isSelected ? '0 4px 14px rgba(0, 0, 0, 0.5)' : 'none',
                  }}
                >
                  <span className={`type-badge ${node.commitType}`}>{node.commitType}</span>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#c5a059', fontWeight: 600 }}>
                    {node.shortSha}
                  </span>

                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {node.note?.summary || node.subject}
                  </span>

                  {node.refs && (
                    <span
                      style={{
                        background: '#162230',
                        color: '#8eb2d5',
                        border: '1px solid #344c68',
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        flexShrink: 0,
                      }}
                    >
                      <Tag size={8} />
                      {node.refs.replace(/[()]/g, '')}
                    </span>
                  )}

                  {node.note && (
                    <Sparkles size={11} color="#c5a059" style={{ flexShrink: 0 }} />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
