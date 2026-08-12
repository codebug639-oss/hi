import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRepoRoot, validateGitDir } from './repo'
import { createFixtureRepo } from './test-utils'

/** Git reports Windows paths with forward slashes; Node uses backslashes. */
function normalize(p: string): string {
  return p.replace(/\\/g, '/')
}

describe('repo validation', () => {
  it('returns null for a directory that is not a git repo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'commitiq-norepo-'))
    try {
      expect(await validateGitDir(dir)).toBeNull()
      expect(await resolveRepoRoot(dir)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('validates a repo root and derives its display name from the last path segment', async () => {
    const repo = await createFixtureRepo()
    try {
      await repo.commit('first')
      const validation = await validateGitDir(repo.dir)
      expect(validation).not.toBeNull()
      expect(normalize(validation!.root)).toBe(normalize(repo.dir))
      expect(validation!.name).toBe(normalize(repo.dir).split('/').pop())
    } finally {
      repo.cleanup()
    }
  })

  it('resolves the work-tree root from a nested subdirectory', async () => {
    const repo = await createFixtureRepo()
    try {
      await repo.commit('first')
      const nested = join(repo.dir, 'src', 'deep')
      mkdirSync(nested, { recursive: true })
      const root = await resolveRepoRoot(nested)
      expect(root).not.toBeNull()
      expect(normalize(root!)).toBe(normalize(repo.dir))
    } finally {
      repo.cleanup()
    }
  })
})
