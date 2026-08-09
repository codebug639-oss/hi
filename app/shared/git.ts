/**
 * commitiq UI — shared git data types.
 *
 * The shapes returned by the main-process git layer (electron/git/*) and
 * shipped to the renderer over IPC. Types only, no side effects.
 */

/** Which refs the commit graph should be built from. */
export type RefsScope = 'all' | 'branches' | 'current'

/** One commit in the graph. `hash` and `parents` are full SHAs. */
export interface CommitMeta {
  hash: string
  parents: string[]
  author: string
  /** Short date, YYYY-MM-DD (from `--date=short`). */
  date: string
  subject: string
}

/** A ref tip (branch / remote branch / tag / HEAD) rendered as a label. */
export interface RefTip {
  /** Short name, e.g. `main`, `origin/main`, `v1.0.0`, `HEAD`. */
  name: string
  type: 'branch' | 'remote' | 'tag' | 'head'
  /** Full SHA of the commit the ref points at (tags are peeled to commits). */
  target: string
}

/**
 * The full commit graph for the repo, as consumed by the renderer.
 *
 * Note: when `truncated` is true, `commits` is capped and therefore not
 * ancestry-closed — a commit's parents may be missing from the set, and a
 * ref tip's `target` may point outside it. Renderers must tolerate both.
 */
export interface GraphData {
  /** Commits in `git rev-list` order (newest first). */
  commits: CommitMeta[]
  refs: RefTip[]
  scope: RefsScope
  /** Total number of commits reachable from the scope (before any cap). */
  totalCount: number
  /** True when the graph was truncated by `maxCount`. */
  truncated: boolean
}

/** A note attached to a commit (from `git notes list`). */
export interface NoteRef {
  noteSha: string
  commitSha: string
}
