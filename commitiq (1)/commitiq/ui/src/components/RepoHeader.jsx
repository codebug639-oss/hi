import React from 'react';
import {
  FolderGit2,
  GitBranch,
  RotateCw,
  Search,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Minus,
  Square,
  X,
} from 'lucide-react';

export default function RepoHeader({
  repoInfo,
  onSelectRepo,
  onRefresh,
  searchQuery,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  onOpenCommitModal,
  onEnableNotes,
  isRefreshing,
}) {
  return (
    <header className="top-bar">
      {/* Left: Repo Identity & Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={onSelectRepo}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#11141a',
            padding: '5px 12px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
          }}
          title="Click to open a different Git repository"
        >
          <FolderGit2 size={16} color="#c5a059" />
          <span
            style={{
              fontWeight: 700,
              fontSize: '14px',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-main)',
              letterSpacing: '0.4px',
            }}
          >
            {repoInfo?.name || 'Loading Repo...'}
          </span>
        </div>

        {repoInfo?.isGitRepo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#15221b',
                color: '#7cbfa3',
                border: '1px solid #284738',
                padding: '4px 9px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}
            >
              <GitBranch size={13} color="#7cbfa3" />
              {repoInfo.currentBranch || 'main'}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#26211c',
                color: '#c5a059',
                border: '1px solid #54473c',
                padding: '4px 9px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}
              title="Commits with AI-generated semantic git notes attached"
            >
              <Sparkles size={13} color="#c5a059" />
              {repoInfo.notesCount} CommitIQ Notes
            </div>
          </div>
        )}
      </div>

      {/* Middle: Search & Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '460px', margin: '0 20px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={14}
            color="var(--text-dim)"
            style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Filter commits by SHA, summary, scope, or author..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: '100%', paddingLeft: '34px' }}
          />
        </div>

        {repoInfo?.branches?.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              className="input-field"
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              style={{ paddingRight: '24px', cursor: 'pointer', height: '33px' }}
            >
              <option value="ALL">All Branches</option>
              {repoInfo.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Git Repository graph"
        >
          <RotateCw size={13} className={isRefreshing ? 'spin' : ''} />
          Refresh
        </button>

        <button
          className="btn btn-sm"
          onClick={onEnableNotes}
          title="Sync Git Notes with remote (git commitiq notes-enable)"
        >
          <ShieldCheck size={13} color="#7cbfa3" />
          Sync Notes
        </button>

        <button className="btn btn-sm btn-primary" onClick={onOpenCommitModal}>
          <PlusCircle size={13} />
          Git CommitIQ
        </button>

        {/* Panel Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '6px' }}>
          <button
            className="btn btn-sm"
            onClick={() => window.electronAPI?.minimizeWindow()}
            style={{ padding: '5px', borderRadius: '3px', border: 'none', background: 'transparent' }}
            title="Minimize Panel"
          >
            <Minus size={13} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => window.electronAPI?.maximizeWindow()}
            style={{ padding: '5px', borderRadius: '3px', border: 'none', background: 'transparent' }}
            title="Maximize / Restore Panel"
          >
            <Square size={11} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => window.electronAPI?.closeWindow()}
            style={{ padding: '5px', borderRadius: '3px', border: '1px solid #6b2d34', background: '#2b181b', color: '#e58e93' }}
            title="Close Panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
