import { useCallback, useEffect, useState } from 'react'
import type { OpenRepoResult, RepoInfo } from '../shared/ipc'
import { RepoPrompt } from './components/RepoPrompt'
import { GraphPanel } from './components/GraphPanel'
import { NotePanel } from './components/NotePanel'
import { StatusBar } from './components/StatusBar'

type View = { kind: 'welcome' } | { kind: 'repo'; repo: RepoInfo }

export default function App() {
  const [view, setView] = useState<View>({ kind: 'welcome' })
  const [repoError, setRepoError] = useState<string | null>(null)
  const [platform, setPlatform] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.api.getPlatform().then(setPlatform)
    void window.api.getAppVersion().then(setVersion)
  }, [])

  const openRepo = useCallback(async () => {
    setRepoError(null)
    const result: OpenRepoResult = await window.api.openRepo()
    if (result.status === 'opened') {
      setView({ kind: 'repo', repo: result.repo })
    } else if (result.status === 'invalid') {
      setRepoError(result.message)
    }
    // cancelled → keep the current view as-is
  }, [])

  const closeRepo = useCallback(() => {
    setView({ kind: 'welcome' })
    setRepoError(null)
  }, [])

  return (
    <div className="app">
      {view.kind === 'welcome' ? (
        <RepoPrompt onOpen={openRepo} error={repoError} />
      ) : (
        <>
          <header className="app-header">
            <div className="app-header__brand">
              <span className="app-header__logo">⭘</span>
              <span className="app-header__title">commitiq</span>
              <span className="app-header__repo" title={view.repo.root}>
                {view.repo.name}
              </span>
            </div>
            <button type="button" className="btn btn--ghost" onClick={closeRepo}>
              Switch repository
            </button>
          </header>
          <main className="app-main">
            <GraphPanel repo={view.repo} />
            <NotePanel />
          </main>
        </>
      )}
      <StatusBar platform={platform} version={version} />
    </div>
  )
}
