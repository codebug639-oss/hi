interface RepoPromptProps {
  onOpen: () => void
  error: string | null
}

export function RepoPrompt({ onOpen, error }: RepoPromptProps) {
  return (
    <div className="welcome">
      <div className="welcome__card">
        <div className="welcome__logo" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M6 8.2v7.6M8.2 6h5.6a4.2 4.2 0 0 1 4.2 4.2v.4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="welcome__title">commitiq</h1>
        <p className="welcome__subtitle">
          Browse your commit graph and read the LLM-generated notes stored on
          each commit.
        </p>
        <button type="button" className="btn btn--primary" onClick={onOpen} autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          Open repository…
        </button>
        {error ? (
          <p className="welcome__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="welcome__hint">Pick any folder that is a git work tree.</p>
        )}
      </div>
    </div>
  )
}
