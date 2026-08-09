import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Options for running a git command. */
export interface RunOptions {
  /** Working directory for the git process. */
  cwd: string
  /** Extra environment variables (merged over process.env). Used for test isolation. */
  env?: NodeJS.ProcessEnv
}

/** Thrown when a git command exits non-zero (e.g. `git notes show` on a commit without a note). */
export class GitError extends Error {
  readonly cmd: string
  /** Numeric exit code, or a string code like 'ENOENT' when git itself is missing. */
  readonly exitCode: number | string | null
  readonly stderr: string

  constructor(cmd: string, exitCode: number | string | null, stderr: string) {
    super(`git ${cmd} failed (exit ${exitCode ?? 'signal'}): ${stderr.trim()}`)
    this.name = 'GitError'
    this.cmd = cmd
    this.exitCode = exitCode
    this.stderr = stderr
  }
}

/**
 * Runs `git <args>` and resolves with stdout. Rejects with GitError on
 * non-zero exit (covers both "git not installed" and git-level errors).
 */
export async function runGit(args: string[], options: RunOptions): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      // Large repos produce big rev-list outputs; keep plenty of headroom.
      maxBuffer: 64 * 1024 * 1024
    })
    return stdout
  } catch (err) {
    // err.code is a number (exit code) or a string like 'ENOENT' (git missing).
    const e = err as { code?: number | string; stderr?: string }
    throw new GitError(args.join(' '), e.code ?? null, e.stderr ?? '')
  }
}
