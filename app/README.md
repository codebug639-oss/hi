# commitiq — desktop UI (Electron)

A desktop app for browsing git commit graphs and reading the LLM-generated
commit notes stored by commitiq (git notes under `refs/notes/commits`).

> **Status: Phase 1 — git data layer.** Phase 0 (scaffold + app shell) is done.
> The main-process git layer now loads the commit graph (`rev-list --parents`,
> batched `log` metadata, ref tips via `for-each-ref` + HEAD) and reads notes
> (`git notes list` / `show`), exposed over typed IPC (`graph:load`,
> `notes:list`, `notes:get` with a per-repo cache) and covered by fixture-repo
> unit tests (`npm test`). The commit graph (Phase 2) and note card (Phase 3)
> renderers are next. See [`plan.md`](../plan.md) for the full roadmap.

## Commands

```bash
npm install        # install dependencies (downloads Electron)
npm run dev        # start electron-vite dev server + Electron (HMR)
npm run typecheck  # tsc for main/preload + renderer
npm test           # vitest: fixture-repo tests for the git layer (uses real git)
npm run build      # build main/preload/renderer into out/
npm run smoke      # build, then boot Electron headlessly and exit cleanly
npm run dist       # package installers (electron-builder)
```

## Layout

```
electron/    main process (window, IPC handlers, git layer)
  git/       repo validation, commit graph, notes (UI-free, unit-tested)
src/         renderer (React)
shared/      IPC contract + shared types (imported by all three)
```

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- The renderer only sees the typed `window.api` surface exposed by the
  preload script (`shared/ipc.ts` defines it).
- Strict CSP in `src/index.html`.
