# How commitiq works (10 lines)

1. You run `git commitiq -m "fix login bug"` — it first executes the real `git commit`, exactly like plain git.
2. If the commit fails (nothing staged, conflict, rejected hook), commitiq stops right there — no LLM call, no note.
3. On success it captures the commit's full diff (`git diff HEAD^ HEAD`, or the whole initial commit).
4. It sends that diff to your configured LLM (Anthropic, OpenAI, Gemini, Ollama, a local endpoint, or a CLI tool).
5. The prompt demands a strict JSON object: `type, scope, summary, description, changed_files, breaking_change, review_notes`.
6. The response is validated as JSON (with `jq` if available) and retried once with stricter instructions if the model returns prose.
7. The JSON is attached to the commit as a **git note** (`git notes add`, stored under `refs/notes/commits`) — nothing is written to `.txt` files.
8. `git commitiq notes-enable` (run once per repo) configures push/fetch refspecs so notes sync with the remote.
9. `git commitiq push origin main` pushes the branch **and** the notes; a plain `git push` also includes them, but a bare `git push origin main` would skip notes.
10. Collaborators fetch normally, then read the summaries with `git log --show-notes`, `git commitiq show <sha>`, or `git notes show <sha>`.
