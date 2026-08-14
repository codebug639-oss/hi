# Installing commitiq

`git commitiq` is a real git subcommand — install it once and it works in
every repository on your machine.

## Requirements

- **git** (obviously) — any recent version
- **bash** and **curl** — bundled with git itself on Windows (Git for
  Windows), macOS, and virtually every Linux distro. No Python or other
  dependencies.
- **Windows:** Git for Windows (its bundled `bash.exe` powers the
  `git-commitiq.cmd` shim).

## Step 1 — Install

**Linux / macOS / Git Bash on Windows — one-liner (downloads from GitHub):**

```bash
curl -fsSL https://raw.githubusercontent.com/codebug639-oss/hi/main/install.sh | bash
```

> To install from a fork or a pinned version instead:
> `COMMITIQ_REPO=owner/repo COMMITIQ_REF=v1.0.0 curl -fsSL <url> | bash`.

Or from a local checkout of this repo:

```bash
bash /path/to/commitiq/install.sh
```

The installer auto-detects: if `bin/` sits next to the script it copies
those files; otherwise it downloads `bin/` + `lib/` from GitHub
(`raw.githubusercontent.com/codebug639-oss/hi/<ref>`).

**Native Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File \path\to\commitiq\install.ps1
```

What the installer does:

1. Copies (or downloads) the files into `~/.commitiq/` (bin + lib) and makes them executable.
2. If `~/.commitiq/bin` is **not already on your `PATH`**, asks whether to
   add it — editing your shell rc file (`~/.bashrc`/`~/.zshrc`) or User
   PATH on Windows. **Nothing is modified without asking.** If you decline
   (or the installer can't prompt, e.g. in CI), it prints the line to add
   yourself.

Verify the install:

```bash
git commitiq help
```

## Step 2 — Configure an LLM provider

```bash
git commitiq setup
```

Interactive wizard: pick a provider, paste an API key (input hidden,
never echoed), optionally override the model. Config is saved to
`~/.commitiq/config` with `chmod 600` (your user only).

Non-interactively, for scripts or fresh machines:

```bash
git commitiq setup --provider anthropic --api-key sk-ant-... --model claude-sonnet-5
```

Supported providers: `anthropic`, `openai`, `gemini`, `ollama` (local
server, no key), `local` (any OpenAI-compatible endpoint such as LM
Studio), `cli` (installed CLI tool: `agy`/`antigravity`, `claude`,
`aichat`, `llm`).

Environment variables always win over the saved config (great for CI):
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (or
`GOOGLE_API_KEY`), `COMMITIQ_PROVIDER`, `COMMITIQ_<PROVIDER>_MODEL`.

Change anything later without redoing the wizard:

```bash
git commitiq config set provider openai
git commitiq config set model gpt-4o-mini
git commitiq config get provider
git commitiq config list        # API key shown masked
```

## Step 3 — Sync git notes (once per repository)

Summaries are stored as **git notes** (`refs/notes/commits`), and notes
are **not pushed by default**. Run this once in each repo you want notes
shared from:

```bash
git commitiq notes-enable
```

It configures the repo so plain `git push` sends branches **and** notes,
and `git fetch`/`git pull` brings notes back from collaborators.

## You're ready

```bash
git commitiq -m "fix login bug"     # commit + LLM summary as a git note
git commitiq push origin main       # push branch + notes together
git commitiq show a1b2c3            # print the stored summary
```

## Uninstalling

Delete `~/.commitiq/` and remove the `~/.commitiq/bin` PATH entry that
the installer added to your shell rc file / User PATH. Nothing else is
written anywhere.
