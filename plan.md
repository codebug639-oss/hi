# commitiq UI — Implementation Plan (Electron)

A **desktop application built with Electron** that turns commitiq's stored
notes into an interactive, browsable experience:

1. Ask the user to open a git repository
2. Draw an interactive **commit graph**
3. When the user clicks a commit, show that commit's **commitiq note**
   (the LLM-generated JSON summary stored in git notes under
   `refs/notes/commits`)

The core bash tool stays untouched. This app is a *pure consumer* of the notes
data contract — it reads git notes and renders them, and never modifies the
commit flow.

---

## 1. User flow

```
$ git commitiq ui            # or: launch the commitiq desktop app
│
├─ 1. "Open a git repository"
│      • launch → welcome screen with "Open repository…" (native folder picker)
│      • if a repo is already open, show its name + "Switch repository" button
│      • validate: it must be an initialized git repo (git rev-parse)
│
├─ 2. Draw the commit graph
│      • all commits reachable from any ref (--all), rendered as an
│        interactive SVG graph (lanes + connectors, like GitHub's view)
│      • default selection = HEAD
│
├─ 3. Main window (side-by-side layout)
│      ┌─────────────────────────────┬──────────────────────────┐
│      │  toolbar: [repo] [refs ▾]   │                          │
│      │  ┌────────────────────────┐ │   note card             │
│      │  │  ● a1b2c3 fix: handle  │ │   ┌──────────────────┐  │
│      │  │  │                     │ │   │ [fix] auth       │  │
│      │  │  ├─● d4e5f6 feat: add  │ │   │ Handle expired   │  │
│      │  │  │  │                   │ │   │ session tokens…  │  │
│      │  │  │  ● 9f8e7d chore:    │ │   │                  │  │
│      │  │  ...                   │ │   │ Files: …         │  │
│      │  └────────────────────────┘ │   └──────────────────┘  │
│      └─────────────────────────────┴──────────────────────────┘
│
└─ 4. Interact
       • click a commit node/row in the graph
       • the notes panel re-renders for the selected commit
       • keyboard navigation + search/filter, ⌘Q/Alt+F4 to quit
```

## 2. Tech stack

| Concern          | Choice                                              | Why |
|------------------|-----------------------------------------------------|-----|
| Desktop shell    | **Electron** (latest stable)                        | Native window + web renderer, first-class cross-platform (Win/macOS/Linux) |
| Build tooling    | **electron-vite**                                   | Standard modern setup: fast dev server, HMR, sane main/preload/renderer build |
| Renderer         | **React 18 + TypeScript**                           | Component model fits the graph + card UI; TS shares types with the git layer |
| Styling          | **CSS Modules / vanilla CSS + CSS variables**       | Dark/light theme, no heavy UI kit needed; optional Tailwind later |
| Graph rendering  | **Custom SVG** (lane layout in TS)                  | Full control of click targets, zoom, and styling; lane algorithm carries over from the TUI plan |
| Git access       | **Node `child_process.execFile` → git CLI** (main process) | Same philosophy as the bash core: shell out to the installed git, no magic |
| JSON             | Renderer-side `JSON.parse` (typed via shared types) | Note parsing only |
| Packaging        | **electron-builder**                                | NSIS (Windows), dmg (macOS), AppImage/deb (Linux) |

Alternatives considered:
- **Svelte instead of React** — lighter, equally viable; React chosen for
  ecosystem maturity and team familiarity.
- **`simple-git` npm wrapper** — thin, safe wrapper over the same git CLI; an
  acceptable convenience layer if we want it, but plain `execFile` has zero
  dependency risk.
- **d3 / dagre for the graph** — possible for exotic layouts, but a custom
  lane-based SVG is simpler, fully testable, and maps clicks exactly.

## 3. Architecture & project layout

```
app/                                 # Electron project (its own package.json)
├── package.json                     # scripts: dev / build / dist / test
├── electron.vite.config.ts
├── electron-builder.yml             # packaging targets + icons
├── electron/                        # main process (Node.js, no DOM)
│   ├── main.ts                      #   window lifecycle, native menu, IPC wiring
│   ├── preload.ts                   #   contextBridge → typed, minimal API surface
│   ├── ipc.ts                       #   IPC channel definitions + handlers
│   └── git/
│       ├── repo.ts                  #   isRepo, pickAndValidateRepo, repoRoot
│       ├── graph.ts                 #   rev-list --all --parents → raw edge list
│       ├── log.ts                   #   batch commit metadata (author/date/subject)
│       └── notes.ts                 #   notes list, notes show <sha>
└── src/                             # renderer (React, runs in Chromium)
    ├── main.tsx                     #   React root
    ├── App.tsx                      #   top-level state machine (welcome → graph → detail)
    ├── types.ts                     #   shared Commit / Note types (mirrors lib/commitiq_llm.sh schema)
    ├── lib/
    │   ├── graphLayout.ts           #   lane assignment + connector geometry (pure, tested)
    │   └── noteFormat.ts            #   JSON → note card view model
    └── components/
        ├── RepoPrompt.tsx           #   welcome + "Open repository…" screen
        ├── Toolbar.tsx              #   repo name, refs scope selector, search box
        ├── GraphPanel.tsx           #   SVG commit graph: nodes, lanes, selection, zoom
        ├── CommitRow.tsx            #   one graph row (glyphs + sha + subject)
        ├── NotePanel.tsx            #   note card: badge, summary, files, review notes
        ├── FilterBar.tsx            #   text / type filters, refs toggle
        └── styles/                  #   CSS modules + theme variables
```

Design rules:
- **Git access lives only in the main process.** The renderer never runs git;
  it gets data over IPC. This keeps the security model simple
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
  preload exposes a narrow typed API via `contextBridge`).
- **`src/lib` and `electron/git` must be UI-free and pure** — unit-tested
  directly against fixture repos.
- **Shared types**: one `Commit`/`Note` definition used by both main-process
  git code and the renderer (via a `shared/` folder or type-only import).

## 4. Data layer

### 4.1 Commit graph (main process)

```
git rev-list --all --parents
   → a1b2c3 d4e5f6 9f8e7d        (sha + parent shas, one per line)
```
Build the DAG in the main process. Then enrich with metadata in one batched
call:

```
git log --all --format=%H%x1f%an%x1f%ad%x1f%s --date=short
```

- **We own the layout**: `src/lib/graphLayout.ts` turns the DAG into SVG lane
  geometry (x/y per commit, connector paths) — we need exact node→commit
  mapping for clicks, hover, and selection.
- **Refs scope**: default `--all`; toolbar toggle switches to `--branches` or
  current branch.
- **Large repos**: cap at `--max-count` (e.g. 5000) with a status banner;
  consider virtualization (render only visible commits) since rows are cheap.

### 4.2 Notes (main process)

```
git notes list                → <note-sha> <annotated-commit-sha>  (map)
git notes show <sha>          → the note content (JSON)
```
- **Lazy-load over IPC**: renderer asks for notes only for visible commits;
  main process caches them per session.
- Missing note → placeholder card ("No commitiq note for this commit") with a
  hint to run `git commitiq commit` / `git commitiq setup`.
- Non-JSON notes (the placeholder notes the bash core attaches) render as
  plain text.

### 4.3 Note JSON contract (from `lib/commitiq_llm.sh`)

```json
{
  "type": "feat" | "fix" | "refactor" | "docs" | "chore" | "test" | "perf" |
          "build" | "ci" | "revert" | "style",
  "scope": "optional short scope or empty string",
  "summary": "imperative summary under 60 characters",
  "description": "2-4 sentences on what changed and why it matters",
  "changed_files": ["list of changed files"],
  "breaking_change": true | false,
  "review_notes": "anything a reviewer must know, or empty string"
}
```
Parse leniently (unknown/missing fields tolerated) — the contract may evolve.
The `Note` type in `src/types.ts` documents the contract and is the single
source of truth for rendering.

## 5. Graph rendering (SVG lanes)

- **Lane layout** (in `src/lib/graphLayout.ts`, pure TS): each commit gets a
  lane; a commit's lane = leftmost free lane among its parents; merges/forks
  get connectors (`│`, `├`, `─` shapes as SVG paths).
- **Visuals**: commit nodes as colored dots (merge commits different color),
  connectors as thin lines; ref tips labeled (`* main`, `* origin/feature`).
- **Interactions**: click node/row → select + show note; hover → highlight row
  + tooltip (sha, subject); wheel / trackpad → scroll; optional zoom-to-fit.
- **Windows/unicode**: no terminal issues in Electron — SVG uses its own
  glyphs, so no ASCII fallback needed (unlike the TUI plan).

## 6. UI layout & interactions

**Layout:** Electron window (~1200×800, resizable, dark/light theme following
the OS setting). Side-by-side: `GraphPanel` (left, ~70%) + `NotePanel` (right,
~30%), collapsible. Toolbar across the top with repo name, refs scope selector,
search/filter box, and a "switch repository" action.

| Interaction | Action |
|-------------|--------|
| **Click a commit** (node or row) | select it → note panel loads and shows its note (the core requested interaction) |
| `↑`/`↓` / `j`/`k` | move selection when the graph has focus |
| `Enter` | open the commit's detail (expand description, toggle raw JSON) |
| `⌘/Ctrl+F` | focus search box: filter graph by text (subject, author, sha) |
| Type filter dropdown | filter by note type (`fix`, `feat`, …; commits without notes hidden or dimmed) |
| Refs selector | `--all` / `--branches` / current branch |
| `⌘/Ctrl+C` on a selected commit | copy note JSON to clipboard |
| "Open on remote" button | derive URL from `git remote` + sha and open in default browser |
| Scroll / trackpad | pan the graph; scroll the note card when it's focused |
| `⌘Q` / window close | quit |

**Note panel card:**
- Colored type badge per conventional-commit type (fix=red, feat=green, …)
- Scope, summary, description, `changed_files` as a list, `breaking_change`
  tag, `review_notes` section
- Toggle to raw JSON view

## 7. Implementation phases

### Phase 0 — Scaffold + window shell (~1 day)
- `electron-vite` scaffold (React + TS), main/preload/renderer wiring,
  security settings (`contextIsolation`, sandbox), IPC skeleton with typed
  channels
- Empty window with placeholder panels; app icon + `electron-builder` base
  config

### Phase 1 — Git data layer in main process (~1–2 days)
- `electron/git/*`: repo validation, rev-list/log/notes via `execFile`
- Unit tests against a fixture repo the test creates with real `git`
- IPC handlers for graph data + notes

### Phase 2 — Repo prompt + graph rendering (~2–3 days)
- Welcome screen with native folder picker (`dialog.showOpenDialog`) +
  validation flow
- `graphLayout.ts` lane algorithm + SVG `GraphPanel`: nodes, connectors, ref
  labels, selection, scroll/pan
- Commit hover tooltips + keyboard navigation

### Phase 3 — Note panel + click-to-show (~1–2 days)
- `NotePanel` card rendering from typed `Note`
- Click commit → load note via IPC (lazy, cached); placeholder for missing notes
- Raw JSON toggle, copy-to-clipboard

### Phase 4 — Polish + packaging (~2–3 days)
- Search (`⌘F`), type filter, refs selector, collapsible panels, theme
  (light/dark auto-follow)
- `electron-builder` distributables for Windows (NSIS), macOS (dmg), Linux
  (AppImage/deb); code signing + auto-update notes
- Integration with core: `git commitiq ui` in `bin/git-commitiq` launches the
  installed app (with a friendly "not installed" message otherwise)

### Phase 5 — Stretch (future)
- Generate a missing note on demand from the app (reuse prompt from
  `lib/commitiq_llm.sh`)
- Diff / file-changes view for the selected commit (`git show --stat`)
- Multi-repo sidebar ("recently opened")
- Export the graph + notes as a static HTML report

## 8. Testing & validation

- **Unit (Vitest):** `graphLayout.ts` golden tests for known DAG shapes
  (linear, merge, fork, octopus); note JSON parsing + formatting; git command
  builders.
- **Main-process git tests:** fixture-repo tests that run real `git` to create
  history and attach notes via `git notes add`, then assert parsed graph and
  note data. No mocking of git itself.
- **Component tests (Vitest + React Testing Library):** selection →
  note-panel update, filter behavior, placeholder states.
- **E2E (Playwright for Electron):** launch the packaged app, open a fixture
  repo, **click a commit and assert the note renders**, search/filter, switch
  repos, quit cleanly.
- **Manual smoke:** Windows (Git for Windows discovery), macOS, Linux; both
  themes; packaged vs dev build.

## 9. Distribution

- **electron-builder** with per-platform targets:
  - Windows: NSIS installer + portable exe
  - macOS: dmg (signed/notarized later)
  - Linux: AppImage + deb
- Install/update: separate download from the bash core (the bash tool remains
  zero-dependency); `git commitiq ui` opens the app if found
- Auto-update via `electron-updater` (or defer — decide in Phase 4)

## 10. Open questions (decide during Phase 0)

1. **Renderer framework**: React (recommended) vs Svelte vs vanilla TS?
2. **Repo picker scope**: current-dir + native picker only, or also a
   "recently opened" list persisted in Electron's `userData`?
3. **Default refs**: `--all` (recommended) vs current branch — and should the
   choice persist in `~/.commitiq/config`?
4. **Huge repos**: hard `--max-count` cap vs progressive/lazy graph loading?
5. **Packaging & updates**: auto-update now or later; separate repo for the
   Electron app vs monorepo with the bash core?
