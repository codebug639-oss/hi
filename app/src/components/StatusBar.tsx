interface StatusBarProps {
  platform: string
  version: string
}

export function StatusBar({ platform, version }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span className="status-bar__left">Phase 0 · app shell</span>
      <span className="status-bar__right">
        {platform ? <span className="chip chip--mini">{platform}</span> : null}
        {version ? <span className="chip chip--mini">v{version}</span> : null}
      </span>
    </footer>
  )
}
