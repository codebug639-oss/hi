# commitiq

`git commitiq` — a real git subcommand that runs a normal `git commit`
and then generates a structured semantic summary of the change using an
LLM (Anthropic, OpenAI, Gemini, Ollama, a local endpoint, or a local
CLI tool), stored as a **git note** on the commit (`refs/notes/commits`)
as a parseable JSON object.

It works via git's own plugin mechanism: any executable named
`git-<word>` on your `$PATH` becomes callable as `git <word>`. This is
the same trick tools like `hub`, `git-flow`, and `git-extras` use — no
fork of git, no core changes, nothing to get merged upstream.

## Docs

- [`INSTALL.md`](INSTALL.md) — step-by-step installation guide
- [`FLOW.md`](FLOW.md) — what happens, start to finish, in 10 lines

## Install

**Linux / macOS / Git Bash on Windows — one-liner (downloads from GitHub):**
```bash
curl -fsSL https://raw.githubusercontent.com/codebug639-oss/hi/master/install.sh | bash
```
Or from a local checkout: `bash /path/to/commitiq/install.sh`. The
installer uses local files when present, otherwise downloads `bin/` +
`lib/` from GitHub (override with `COMMITIQ_REPO=owner/repo` and
`COMMITIQ_REF=main`).

**Native Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File \path\to\commitiq\install.ps1
```

Both installers copy the files into `~/.commitiq/` (bin + lib), then —
only if that folder isn't already on your `PATH` — ask before adding it
to your shell rc file (`~/.bashrc`/`~/.zshrc`) or User PATH on Windows.
Nothing is edited without asking first. If you say no, or the installer
can't prompt you (e.g. running non-interactively), it just prints the
line to add yourself.

## Configure a provider

```bash
git commitiq setup
```

Interactive wizard: pick a provider, paste in an API key (input hidden,
never echoed), optionally override the default model. Saved to
`~/.commitiq/config`, permission-locked to your user only (`chmod 600`).

Or non-interactively, for scripting a fresh machine:
```bash
git commitiq setup --provider anthropic --api-key sk-ant-... --model claude-sonnet-5
```

Change any of it later, anytime, without redoing the whole wizard:
```bash
git commitiq config set provider openai
git commitiq config set model gpt-4o-mini
git commitiq config set api_key sk-...        # alias: 'key' also works
git commitiq config get provider
git commitiq config list                       # api_key shown masked
```

**Environment variables always win** over the saved config, so CI/
scripted use isn't affected: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `COMMITIQ_PROVIDER` to force a
choice, and `COMMITIQ_ANTHROPIC_MODEL` / `COMMITIQ_OPENAI_MODEL` /
`COMMITIQ_GEMINI_MODEL` to override a model.

## Sync git notes with your remote

Git notes are **not pushed by default**, and configuring a notes push
refspec disables git's implicit branch pushing. Fix both in one step,
once per repository (uses whatever remote is configured, or pass a
name):

```bash
git commitiq notes-enable
# or: git commitiq notes-enable upstream
```

This adds to the repo's `.git/config`:

```ini
[remote "origin"]
    fetch = +refs/notes/*:refs/notes/*     # pull notes from remote
    push  = refs/heads/*:refs/heads/*      # keep normal branch pushes working
    push  = refs/notes/*:refs/notes/*      # push notes automatically
```

...and sets `notes.displayRef = refs/notes/commits` (so `git log` shows
notes) plus `notes.rewriteRef` (so notes survive `git rebase`). After
this, a plain `git push` sends branches **and** notes, and
`git fetch`/`git pull` brings notes back from collaborators.

> Push gotcha: an explicit-refspec push like `git push origin main` or
> `git push origin HEAD` pushes only what you named, so it skips notes.
> Use bare `git push`, or — when you need to name a branch —
> `git commitiq push origin main`, which behaves like `git push` but
> appends the notes refspec for you (`git push origin main
> refs/notes/*:refs/notes/*`). `git commitiq push` with no arguments is
> a plain `git push`; `--delete`/`-d`/`--mirror` are forwarded untouched.

> Caveat: GitHub and GitLab store git notes but do **not** render them
> in their web UI — they're a command-line feature (`git log
> --show-notes`, `git commitiq show <sha>`).

## Use it

```bash
git commitiq -m "fix login bug"          # same as: git commitiq commit -m "..."
git commitiq commit -am "refactor auth"  # any git commit flag works, forwarded as-is
```

Every flag you'd normally pass to `git commit` works — `commitiq commit`
is just `git commit` with a step appended after it. If the underlying
commit fails (nothing staged, conflict, rejected by a pre-commit hook,
etc.), commitiq stops right there: no LLM call, no note, identical to
plain `git commit` failing.

On success, commitiq asks the configured LLM for a structured summary
of the diff and attaches it to the commit as a **git note**
(`git notes show HEAD`). The note contains a single JSON object:

```json
{
  "type": "fix",
  "scope": "auth",
  "summary": "Handle expired session tokens gracefully",
  "description": "Login now returns a clear error instead of a stack trace when a session token has expired. Touches src/auth/session.js and its tests.",
  "changed_files": ["src/auth/session.js", "tests/session_test.js"],
  "breaking_change": false,
  "review_notes": "Watch for callers that assumed the old exception type."
}
```

- `type` is constrained to conventional-commit values: `feat`, `fix`,
  `refactor`, `docs`, `chore`, `test`, `perf`, `build`, `ci`, `revert`,
  `style`.
- The response is validated as JSON (with `jq` when available) and
  retried once with stricter instructions if the model returns prose.

If no provider is set up, or the request fails, a placeholder note
explaining why is attached instead — this never blocks or breaks the
commit itself. LLM errors are appended to `.commitiq/.commitiq.log`.

Other commands:
```bash
git commitiq show a1b2c3   # print the stored note for a sha (or prefix)
git commitiq log           # list commits that have a stored summary
git commitiq help
```

## Notes / known constraints

- **Migrating from the old `.txt` storage**: repos that used the
  earlier `.commitiq/<sha>.txt` files keep them on disk but `show`/
  `log` now read git notes only — old summaries can still be read with
  `cat .commitiq/<sha>.txt`.
- **No diff size cap right now** — the full diff is sent as-is. Revisit
  before production use: very large diffs cost more per commit and can
  exceed a provider's context limit (shows up as a failed request in
  `.commitiq/.commitiq.log`; commit still succeeds either way).
- **Zero external dependencies** — runs entirely using standard Bash and `curl` (bundled with Git for Windows, macOS, and Linux). No Python or additional package installations required (`jq` is used for JSON validation only if it happens to be installed).
- Notes live in `refs/notes/commits`. Notes are *not* part of the commit
  object itself, so rewriting/rebaseing changes nothing in history —
  but see `notes.rewriteRef` (set by `notes-enable`) so rebased commits
  keep their notes.
- `git-commitiq` itself is a bash script. On native Windows,
  `git-commitiq.cmd` shims it by shelling out to Git for Windows'
  bundled `bash.exe`, which you already have installed if you have git.
