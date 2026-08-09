import { describe, expect, it } from 'vitest'
import { getNote, listNotes } from './notes'
import { createFixtureRepo } from './test-utils'

describe('git notes', () => {
  it('returns an empty list and null content when no notes exist', async () => {
    const repo = await createFixtureRepo()
    try {
      const c = await repo.commit('no notes here')
      expect(await listNotes(repo.dir)).toEqual([])
      expect(await getNote(repo.dir, c)).toBeNull()
    } finally {
      repo.cleanup()
    }
  })

  it('lists and reads a JSON note attached via git notes add', async () => {
    const repo = await createFixtureRepo()
    try {
      const c1 = await repo.commit('first')
      const c2 = await repo.commit('second')
      const noteJson = JSON.stringify({
        type: 'fix',
        scope: 'auth',
        summary: 'Handle expired tokens',
        description: 'Returns a clear error instead of a stack trace.',
        changed_files: ['src/auth/session.ts'],
        breaking_change: false,
        review_notes: ''
      })
      await repo.git(['notes', 'add', '-m', noteJson, c2])

      const notes = await listNotes(repo.dir)
      expect(notes).toHaveLength(1)
      expect(notes[0].commitSha).toBe(c2)
      expect(notes[0].noteSha).toMatch(/^[0-9a-f]{40}$/)

      expect(await getNote(repo.dir, c1)).toBeNull()
      expect(await getNote(repo.dir, c2)).toBe(noteJson)
    } finally {
      repo.cleanup()
    }
  })

  it('round-trips multi-line plain-text notes verbatim', async () => {
    const repo = await createFixtureRepo()
    try {
      const c = await repo.commit('multi-line')
      const text = 'commitiq: no semantic summary available\nSee .commitiq/.commitiq.log for details.'
      await repo.git(['notes', 'add', '-m', text, c])
      expect(await getNote(repo.dir, c)).toBe(text)
    } finally {
      repo.cleanup()
    }
  })
})
