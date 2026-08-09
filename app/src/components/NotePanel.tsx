export function NotePanel() {
  return (
    <section className="panel panel--note">
      <header className="panel__header">
        <h2 className="panel__title">Commit note</h2>
      </header>
      <div className="panel__body">
        <div className="empty-state">
          <svg
            className="empty-state__art"
            width="120"
            height="90"
            viewBox="0 0 120 90"
            fill="none"
            aria-hidden="true"
          >
            <rect x="24" y="12" width="72" height="66" rx="6" stroke="var(--art-line)" strokeWidth="1.5" />
            <path d="M40 34h40M40 46h40M40 58h24" stroke="var(--art-line)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="36" y="26" width="10" height="10" rx="3" fill="var(--art-node)" />
          </svg>
          <h3 className="empty-state__title">No commit selected</h3>
          <p className="empty-state__text">
            Click a commit in the graph to see its LLM-generated summary,
            changed files, and review notes.
          </p>
        </div>
      </div>
    </section>
  )
}
