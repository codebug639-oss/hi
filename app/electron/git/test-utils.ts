import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runGit } from './runner'

export interface FixtureRepo {
  /** Absolute path of the fixture repo. */
  dir: string
  /** Runs a git command inside the repo with isolated config env. */
  git: (args: string[]) => Promise<string>
  /** Stages a new file and commits with the given message; returns the full HEAD sha. */
  commit: (message: string) => Promise<string>
  /** Returns the full sha of HEAD. */
  head: () => Promise<string>
  /** Removes the fixture repo (retries briefly for Windows file locks). */
  cleanup: () => void
}

/** Creates a temp git repo with real git, isolated from the user's config. */
export async function createFixtureRepo(): Promise<FixtureRepo> {
  const dir = mkdtempSync(join(tmpdir(), 'commitiq-test-'))
  const env: NodeJS.ProcessEnv = { GIT_CONFIG_NOSYSTEM: '1', HOME: dir }
  const git = (args: string[]) => runGit(args, { cwd: dir, env })

  let commitCount = 0
  const commit = async (message: string): Promise<string> => {
    writeFileSync(join(dir, `fixture-${commitCount++}.txt`), `${message}\n`)
    await git(['add', '.'])
    await git(['commit', '-q', '-m', message])
    return (await git(['rev-parse', 'HEAD'])).trim()
  }

  // Bootstrap: deterministic default branch, local identity, no signing.
  // Await each step — git commands must run strictly in sequence.
  await git(['init', '-q', '-b', 'main'])
  await git(['config', 'user.name', 'Fixture User'])
  await git(['config', 'user.email', 'fixture@example.com'])
  await git(['config', 'commit.gpgsign', 'false'])
  await git(['config', 'tag.gpgsign', 'false'])

  const cleanup = (): void => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        rmSync(dir, { recursive: true, force: true })
        return
      } catch {
        // Windows may briefly hold git file handles; wait, then retry.
        const start = Date.now()
        while (Date.now() - start < 100) {
          /* busy-wait */
        }
      }
    }
  }

  return { dir, git, commit, head: () => git(['rev-parse', 'HEAD']).then((s) => s.trim()), cleanup }
}
