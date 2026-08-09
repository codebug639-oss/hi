import { runGit, type RunOptions } from './runner'

/** A directory validated as living inside a git work tree. */
export interface RepoValidation {
  /** Absolute path of the work-tree root. */
  root: string
  /** Display name (last path segment of the root). */
  name: string
}

/**
 * Resolves the work-tree root for `dir`, or null when `dir` is not inside
 * a git repository.
 */
export async function resolveRepoRoot(dir: string, options?: RunOptions): Promise<string | null> {
  try {
    const out = await runGit(['rev-parse', '--show-toplevel'], {
      cwd: dir,
      env: options?.env
    })
    const root = out.trim()
    return root || null
  } catch {
    return null
  }
}

/**
 * Validates that `dir` is inside a git work tree and returns the root +
 * display name, or null when it isn't.
 */
export async function validateGitDir(
  dir: string,
  options?: RunOptions
): Promise<RepoValidation | null> {
  const root = await resolveRepoRoot(dir, options)
  if (!root) return null
  const name = root.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? dir
  return { root, name }
}
