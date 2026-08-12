import { describe, expect, it } from 'vitest'
import { loadGraph } from './graph'
import { createFixtureRepo } from './test-utils'

describe('commit graph', () => {
  it('loads linear history with parents, metadata, and ref tips', async () => {
    const repo = await createFixtureRepo()
    try {
      const c1 = await repo.commit('first commit')
      const c2 = await repo.commit('second commit')
      const c3 = await repo.commit('third commit')

      const graph = await loadGraph(repo.dir)
      expect(graph.truncated).toBe(false)
      expect(graph.totalCount).toBe(3)
      expect(graph.commits).toHaveLength(3)
      expect(graph.commits.map((c) => c.hash)).toEqual(
        expect.arrayContaining([c1, c2, c3])
      )

      const head = graph.commits.find((c) => c.hash === c3)
      expect(head?.parents).toEqual([c2])
      expect(head?.subject).toBe('third commit')
      expect(head?.author).toBe('Fixture User')
      expect(head?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const first = graph.commits.find((c) => c.hash === c1)
      expect(first?.parents).toEqual([])

      const names = graph.refs.map((r) => r.name)
      expect(names).toContain('HEAD')
      expect(names).toContain('main')
      const main = graph.refs.find((r) => r.name === 'main')
      expect(main?.target).toBe(c3)
    } finally {
      repo.cleanup()
    }
  })

  it('captures merge parents and multiple branch tips', async () => {
    const repo = await createFixtureRepo()
    try {
      await repo.commit('base')
      await repo.git(['checkout', '-q', '-b', 'feature'])
      await repo.commit('feature work')
      await repo.git(['checkout', '-q', 'main'])
      await repo.git(['merge', '-q', '--no-ff', 'feature', '-m', 'merge feature'])
      const merge = await repo.head()

      const graph = await loadGraph(repo.dir)
      const mergeCommit = graph.commits.find((c) => c.hash === merge)
      expect(mergeCommit).toBeDefined()
      expect(mergeCommit!.parents).toHaveLength(2)
      expect(graph.commits).toHaveLength(3)

      const names = graph.refs.map((r) => r.name)
      expect(names).toContain('main')
      expect(names).toContain('feature')
      const feature = graph.refs.find((r) => r.name === 'feature')
      expect(feature?.type).toBe('branch')
    } finally {
      repo.cleanup()
    }
  })

  it('scope=current only traverses HEAD while scope=all sees every branch', async () => {
    const repo = await createFixtureRepo()
    try {
      await repo.commit('base')
      await repo.git(['checkout', '-q', '-b', 'side'])
      await repo.commit('side work')
      await repo.git(['checkout', '-q', 'main'])
      await repo.commit('main work')

      const current = await loadGraph(repo.dir, { scope: 'current' })
      expect(current.totalCount).toBe(2) // base + main work

      const all = await loadGraph(repo.dir, { scope: 'all' })
      expect(all.totalCount).toBe(3) // base + side work + main work
    } finally {
      repo.cleanup()
    }
  })

  it('reports truncation when maxCount is exceeded', async () => {
    const repo = await createFixtureRepo()
    try {
      for (let i = 0; i < 5; i++) await repo.commit(`commit ${i}`)

      const graph = await loadGraph(repo.dir, { maxCount: 3 })
      expect(graph.commits).toHaveLength(3)
      expect(graph.totalCount).toBe(5)
      expect(graph.truncated).toBe(true)

      const full = await loadGraph(repo.dir, { maxCount: 10 })
      expect(full.truncated).toBe(false)
    } finally {
      repo.cleanup()
    }
  })

  it('includes lightweight and annotated tag tips, peeled to commits', async () => {
    const repo = await createFixtureRepo()
    try {
      const c = await repo.commit('tagged')
      await repo.git(['tag', 'v1.0.0'])
      await repo.git(['tag', '-a', 'v2.0.0', '-m', 'annotated release'])

      const graph = await loadGraph(repo.dir)
      const tags = graph.refs.filter((r) => r.type === 'tag')
      expect(tags.map((r) => r.name)).toEqual(expect.arrayContaining(['v1.0.0', 'v2.0.0']))
      for (const tag of tags) expect(tag.target).toBe(c)
    } finally {
      repo.cleanup()
    }
  })

  it('handles a repository with no commits', async () => {
    const repo = await createFixtureRepo()
    try {
      const graph = await loadGraph(repo.dir)
      expect(graph.commits).toHaveLength(0)
      expect(graph.refs).toHaveLength(0)
      expect(graph.totalCount).toBe(0)
      expect(graph.truncated).toBe(false)
    } finally {
      repo.cleanup()
    }
  })
})
