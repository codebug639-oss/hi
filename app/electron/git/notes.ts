import { GitError, runGit, type RunOptions } from './runner'
import type { NoteRef } from '../../shared/git'

/**
 * Lists all notes in the repo (from the default notes ref,
 * refs/notes/commits). Returns an empty array when no notes exist.
 */
export async function listNotes(dir: string, options?: RunOptions): Promise<NoteRef[]> {
  let out: string
  try {
    out = await runGit(['notes', 'list'], { cwd: dir, env: options?.env })
  } catch (err) {
    // `git notes list` fails when no notes ref exists yet — treat as "no notes".
    if (err instanceof GitError) return []
    throw err
  }

  const notes: NoteRef[] = []
  for (const line of out.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [noteSha, commitSha] = trimmed.split(/\s+/)
    if (noteSha && commitSha) notes.push({ noteSha, commitSha })
  }
  return notes
}

/**
 * Returns the raw note content for `commitSha`, or null when the commit
 * has no note. Content is returned verbatim (it may be JSON, a commitiq
 * placeholder message, or plain text).
 */
export async function getNote(
  dir: string,
  commitSha: string,
  options?: RunOptions
): Promise<string | null> {
  try {
    const out = await runGit(['notes', 'show', commitSha], { cwd: dir, env: options?.env })
    // Strip the single trailing newline git adds; tolerate CRLF (Windows).
    return out.replace(/\r?\n$/, '')
  } catch (err) {
    if (err instanceof GitError) return null
    throw err
  }
}
