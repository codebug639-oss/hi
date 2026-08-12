import React, { useEffect, useState } from 'react';
import RepoHeader from './components/RepoHeader';
import CommitGraph from './components/CommitGraph';
import CommitDetails from './components/CommitDetails';
import DiffViewer from './components/DiffViewer';
import CommitIQCommitModal from './components/CommitIQCommitModal';
import { FolderGit2, AlertTriangle, Sparkles, RefreshCw, GitFork } from 'lucide-react';

export default function App() {
  const [repoInfo, setRepoInfo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [diffCommit, setDiffCommit] = useState(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRepoData = async (branch = selectedBranch) => {
    setIsRefreshing(true);
    if (window.electronAPI) {
      try {
        const info = await window.electronAPI.getRepoInfo();
        setRepoInfo(info);

        if (info.isGitRepo) {
          const commitList = await window.electronAPI.getCommits(branch);
          setCommits(commitList || []);
          if (commitList && commitList.length > 0 && !selectedCommit) {
            setSelectedCommit(commitList[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load git repo info:', err);
      }
    } else {
      // Mock data for browser testing if opened outside Electron
      setRepoInfo({
        isGitRepo: true,
        name: 'commitiq-demo',
        currentBranch: 'main',
        branches: ['main', 'feature/notes-ui', 'fix/llm-parser'],
        notesCount: 4,
        totalCommits: 5,
      });
      setCommits([
        {
          sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          shortSha: 'a1b2c3d',
          parents: ['b2c3d4e5f6789012345678901234567890abcdef'],
          authorName: 'Mahammad Azhar',
          authorEmail: 'azhar@example.com',
          date: new Date().toISOString(),
          relDate: '10 mins ago',
          subject: 'feat(ui): add connected commit note graph visualization',
          refs: 'HEAD -> main, origin/main',
          note: {
            type: 'feat',
            scope: 'ui',
            summary: 'Add visual timeline graph based on ui-design.jpg',
            description: 'Integrated connected branch stream graph, left timeline scale, CommitIQ side cards, and Electron IPC handlers for git notes.',
            changed_files: ['ui/src/components/CommitGraph.jsx', 'ui/src/App.jsx'],
            breaking_change: false,
            review_notes: 'Check responsive canvas scale and SVG curve Bezier calculations.',
          },
        },
        {
          sha: 'b2c3d4e5f6789012345678901234567890abcdef',
          shortSha: 'b2c3d4e',
          parents: ['c3d4e5f6789012345678901234567890abcdef1'],
          authorName: 'Mahammad Azhar',
          authorEmail: 'azhar@example.com',
          date: new Date(Date.now() - 3600000).toISOString(),
          relDate: '1 hour ago',
          subject: 'fix(core): improve error handling when LLM returns prose',
          refs: '',
          note: {
            type: 'fix',
            scope: 'core',
            summary: 'Graceful fallback and retry logic for unstructured model outputs',
            description: 'Validates JSON output from Anthropic/OpenAI/Gemini providers before attaching note.',
            changed_files: ['lib/commitiq_llm.sh'],
            breaking_change: false,
            review_notes: 'Verified against local llama3 endpoint.',
          },
        },
      ]);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchRepoData();
  }, []);

  const handleSelectRepo = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.selectRepo();
      if (res.success) {
        setSelectedCommit(null);
        fetchRepoData();
      }
    }
  };

  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    fetchRepoData(branch);
  };

  const handleEnableNotes = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.notesEnable();
      if (res.success) {
        alert('Git notes successfully enabled for push & fetch sync!');
        fetchRepoData();
      } else {
        alert(`Failed to enable notes: ${res.stderr || res.error}`);
      }
    }
  };

  const handleInitGitRepo = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.initRepo();
      if (res.success) {
        alert('Git repository initialized and CommitIQ notes enabled!');
        fetchRepoData();
      } else {
        alert(`Failed to initialize git repository: ${res.stderr || res.error}`);
      }
    }
  };

  const handleDropFolder = async (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length > 0) {
      const droppedPath = e.dataTransfer.files[0].path;
      if (droppedPath && window.electronAPI) {
        const res = await window.electronAPI.openPath(droppedPath);
        if (res.success) {
          setSelectedCommit(null);
          fetchRepoData();
        }
      }
    }
  };

  return (
    <div
      className="app-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFolder}
    >
      {/* Top Navigation Header */}
      <RepoHeader
        repoInfo={repoInfo}
        onSelectRepo={handleSelectRepo}
        onRefresh={() => fetchRepoData()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBranch={selectedBranch}
        onBranchChange={handleBranchChange}
        onOpenCommitModal={() => setIsCommitModalOpen(true)}
        onEnableNotes={handleEnableNotes}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <div className="main-content">
        {!repoInfo?.isGitRepo && !loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              background: '#11141a',
            }}
          >
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '8px',
                background: '#26211c',
                border: '1px dashed #54473c',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                marginBottom: '24px',
              }}
            >
              <FolderGit2 size={40} color="#c5a059" />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '0.4px' }}>
              CommitIQ IDE — Open or Drag & Drop Folder
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '520px', marginBottom: '28px', lineHeight: '1.6', fontSize: '13px' }}>
              Drop any repository or project folder here to view its connected commit graph, or initialize Git instantly with CommitIQ semantic notes.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleSelectRepo}>
                <FolderGit2 size={15} /> Open Folder / Repository
              </button>

              <button className="btn" onClick={handleInitGitRepo} style={{ background: '#15221b', borderColor: '#284738', color: '#7cbfa3' }}>
                <Sparkles size={15} color="#7cbfa3" /> Initialize Git Repository
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left/Center Visual Graph Canvas */}
            <CommitGraph
              commits={commits}
              selectedCommit={selectedCommit}
              onSelectCommit={(c) => setSelectedCommit(c)}
              searchQuery={searchQuery}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />

            {/* Right Slide-over Side Drawer for Selected Commit */}
            {selectedCommit && (
              <CommitDetails
                commit={selectedCommit}
                onClose={() => setSelectedCommit(null)}
                onViewDiff={(c) => setDiffCommit(c)}
              />
            )}
          </>
        )}
      </div>

      {/* Code Diff Modal */}
      {diffCommit && <DiffViewer commit={diffCommit} onClose={() => setDiffCommit(null)} />}

      {/* CommitIQ New Commit Modal */}
      {isCommitModalOpen && (
        <CommitIQCommitModal
          onClose={() => setIsCommitModalOpen(false)}
          onSuccess={() => fetchRepoData()}
        />
      )}
    </div>
  );
}
