/**
 * commitiq UI — shared IPC contract.
 *
 * Single source of truth for the channel names and message payloads
 * exchanged between the renderer (React), the preload bridge, and the
 * main process. Everything here is types + constants only, so it can be
 * imported by all three sides without side effects.
 *
 * The `Note` type mirrors the JSON schema produced by lib/commitiq_llm.sh
 * (see README.md / plan.md). Phase 0 defines it as the contract; later
 * phases render it.
 */

export const IpcChannels = {
  AppGetVersion: 'app:get-version',
  AppGetPlatform: 'app:get-platform',
  RepoOpen: 'repo:open'
} as const

/** A git repository that was successfully opened in the app. */
export interface RepoInfo {
  /** Absolute path of the directory the user picked. */
  path: string
  /** Absolute path of the git work-tree root (from `git rev-parse --show-toplevel`). */
  root: string
  /** Display name (last path segment of the work-tree root). */
  name: string
}

/** Result of the "open repository" dialog. */
export type OpenRepoResult =
  | { status: 'opened'; repo: RepoInfo }
  | { status: 'cancelled' }
  | { status: 'invalid'; message: string }

/**
 * Contract for a commitiq note, as produced by lib/commitiq_llm.sh and
 * stored in git notes (refs/notes/commits). Parsed leniently — fields may
 * be missing or unknown on older notes.
 */
export interface Note {
  /** Conventional-commit type: feat, fix, refactor, docs, chore, test, perf, build, ci, revert, style. */
  type: string
  /** Optional short scope, or empty string. */
  scope?: string
  /** Imperative summary under 60 characters. */
  summary?: string
  /** 2-4 sentences on what changed and why it matters. */
  description?: string
  /** List of changed files. */
  changed_files?: string[]
  /** Whether the change is breaking. */
  breaking_change?: boolean
  /** Anything a reviewer must know, or empty string. */
  review_notes?: string
}

/**
 * Typed surface exposed to the renderer via contextBridge as `window.api`.
 * Keep this in sync with electron/preload.ts.
 */
export interface Api {
  getAppVersion(): Promise<string>
  getPlatform(): Promise<string>
  openRepo(): Promise<OpenRepoResult>
}
