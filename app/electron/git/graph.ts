import { runGit } from './runner'
import type { CommitMeta, GraphData, RefTip, RefsScope } from '../../shared/git'

export interface LoadGraphOptions {
  /** Which refs to traverse. Defaults to 'all'. */
  scope?: RefsScope
  /** Cap on the number of commits loaded. Defaults to 5000. */
  maxCount?: number
  env?: NodeJS.ProcessEnv
}

const DEFAULT_MAX_COUNT = 5000

/** rev-list ref arguments for the given scope. */
function refArgs(scope: RefsScope): string[] {
  switch (scope) {
    case 'all':
      return ['--all']
    case 'branches':
      return ['--branches']
    case 'current':
      return ['HEAD']
  }
}

/** Parses `git rev-list --parents` output into raw (hash, parents) pairs. */
function parseRevList(out: string): Array<{ hash: string; parents: string[] }> {
  const commits: Array<{ hash: string; parents: string[] }> = []
  for (const line of out.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s+/)
    commits.push({ hash: parts[0], parents: parts.slice(1) })
  }
  return commits
}

/** Parses `git log --format=%H%x1f%an%x1f%ad%x1f%s` output into metadata. */
function parseLog(out: string): CommitMeta[] {
  const commits: CommitMeta[] = []
  for (const line of out.split('\n')) {
    if (!line.trim()) continue
    const [hash, author = '', date = '', ...subjectParts] = line.split('\x1f')
    if (!hash) continue
    commits.push({ hash, parents: [], author, date, subject: subjectParts.join(' ') })
  }
  return commits
}

/** Parses `git for-each-ref --format=%(refname)%00%(objectname)%00%(*objectname)` output. */
function parseRefs(out: string): RefTip[] {
  const refs: RefTip[] = []
  for (const line of out.split('\n')) {
    if (!line.trim()) continue
    const [refname, objectname = '', peeled = ''] = line.split('\0')
    if (!refname || !objectname) continue
    const target = peeled || objectname

    if (refname.startsWith('refs/heads/')) {
      refs.push({ name: refname.slice('refs/heads/'.length), type: 'branch', target })
    } else if (refname.startsWith('refs/remotes/')) {
      refs.push({ name: refname.slice('refs/remotes/'.length), type: 'remote', target })
    } else if (refname.startsWith('refs/tags/')) {
      refs.push({ name: refname.slice('refs/tags/'.length), type: 'tag', target })
    }
  }
  return refs
}

/**
 * Loads the commit graph for the repo at `dir`.
 *
 * Runs three commands:
 *   1. `rev-list <refs> --parents`           → edges
 *   2. `log <refs> --format=... --date=short` → metadata (batched)
 *   3. `for-each-ref refs/{heads,remotes,tags}` + HEAD → ref tips
 * plus `rev-list <refs> --count` to detect truncation.
 *
 * When `maxCount` caps the result, the list is not ancestry-closed: a
 * merge's parents can fall outside the set and ref tips can point outside
 * it. Callers must tolerate both (see GraphData docs).
 */
export async function loadGraph(dir: string, options: LoadGraphOptions = {}): Promise<GraphData> {
  const { scope = 'all', maxCount = DEFAULT_MAX_COUNT, env } = options
  const refs = refArgs(scope)
  const run = (args: string[]) => runGit(args, { cwd: dir, env })

  const [revListOut, logOut, refsOut, countOut] = await Promise.all([
    run(['rev-list', ...refs, '--parents', `--max-count=${maxCount}`]),
    run(['log', ...refs, '--format=%H%x1f%an%x1f%ad%x1f%s', '--date=short', `--max-count=${maxCount}`]),
    run(['for-each-ref', '--format=%(refname)%00%(objectname)%00%(*objectname)', 'refs/heads', 'refs/remotes', 'refs/tags']),
    run(['rev-list', ...refs, '--count'])
  ])

  const edges = parseRevList(revListOut)
  const metadata = parseLog(logOut)
  const refTips = parseRefs(refsOut)
  const totalCount = parseInt(countOut.trim(), 10) || 0

  // Join edges + metadata by hash. rev-list and log traverse the same set,
  // so every edge hash should find metadata; tolerate misses defensively.
  const byHash = new Map(metadata.map((c) => [c.hash, c]))
  const commits: CommitMeta[] = edges.map((edge) => ({
    hash: edge.hash,
    parents: edge.parents,
    author: byHash.get(edge.hash)?.author ?? '',
    date: byHash.get(edge.hash)?.date ?? '',
    subject: byHash.get(edge.hash)?.subject ?? ''
  }))

  // HEAD tip (works for attached and detached HEAD).
  let headTip: RefTip | null = null
  try {
    const headOut = await run(['rev-parse', 'HEAD'])
    const headSha = headOut.trim()
    if (headSha) headTip = { name: 'HEAD', type: 'head', target: headSha }
  } catch {
    // unborn HEAD (no commits yet) — no tip to add
  }

  return {
    commits,
    refs: headTip ? [...refTips, headTip] : refTips,
    scope,
    totalCount,
    truncated: totalCount > maxCount
  }
}
