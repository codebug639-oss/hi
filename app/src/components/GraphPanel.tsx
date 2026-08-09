import type { RepoInfo } from '../../shared/ipc'

interface GraphPanelProps {
  repo: RepoInfo
}

export function GraphPanel({ repo }: GraphPanelProps) {
  return (
    <section className="panel panel--graph">
      <header className="panel__header">
        <h2 className="panel__title">Commit graph</h2>
        <div className="panel__chips">
          <span className="chip">{repo.name}</span>
          <span className="chip chip--muted">refs: all</span>
        </div>
      </header>
      <div className="panel__body">
        <div className="empty-state">
          <svg
            className="empty-state__art"
            width="220"
            height="90"
            viewBox="0 0 220 90"
            fill="none"
            aria-hidden="true"
          >
            <path d="M30 20v50M60 20v50M90 20v50M120 20v50M150 20v50M180 20v50" stroke="var(--art-line)" strokeWidth="1.5" />
            <path d="M30 45h30M120 25h30M60 55h30M150 65h30" stroke="var(--art-line)" strokeWidth="1.5" />
            <circle cx="30" cy="20" r="5" fill="var(--art-node)" />
            <circle cx="60" cy="55" r="5" fill="var(--art-node)" />
            <circle cx="90" cy="45" r="5" fill="var(--art-node)" />
            <circle cx="120" cy="25" r="5" fill="var(--art-node)" />
            <circle cx="150" cy="65" r="5" fill="var(--art-node)" />
            <circle cx="180" cy="20" r="5" fill="var(--art-node)" />
            <circle cx="30" cy="75" r="5" fill="var(--art-node)" />
          </svg>
          <h3 className="empty-state__title">The commit graph lands in Phase 2</h3>
          <p className="empty-state__text">
            Soon you'll be able to click any commit to read its commitiq note —
            stored in git notes under <code>refs/notes/commits</code>.
          </p>
        </div>
      </div>
    </section>
  )
}
