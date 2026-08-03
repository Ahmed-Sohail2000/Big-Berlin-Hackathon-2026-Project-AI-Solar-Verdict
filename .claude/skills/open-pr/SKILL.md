---
name: open-pr
description: run the full test suite, commit/push, and open a pull request with a proper title and description for this repo
---

Run this whenever asked to "make a PR", "open a pull request", or "ship this branch" for HelioSense AI. It runs the tests correctly for this repo (the e2e gotcha below is easy to get wrong), then creates the PR against the user's own fork — never `upstream` — falling back to a browser link if `gh` isn't set up.

## 1. Run the tests

```bash
pnpm lint
pnpm tsc --noEmit
pnpm test
```

**e2e gotcha**: `playwright.config.ts`'s default `baseURL` is the deployed Vercel URL (`https://ai-solar-heliosense.vercel.app`), not localhost. Running `pnpm test:e2e` bare tests the *live deployed site*, not your local changes. To actually test local changes:

```bash
MOCK_MODE=true NEXT_PUBLIC_MOCK_MODE=true pnpm dev &   # wait for :3000 to respond
BASE_URL=http://localhost:3000 pnpm test:e2e
# then stop the dev server (find its PID via `netstat -ano | grep :3000`, taskkill /F it)
```

If e2e has pre-existing failures unrelated to your change (this repo's `e2e/*.spec.ts` specs have drifted from the current UI copy in places — e.g. placeholder text), don't silently fix them unless asked. Note which failures are pre-existing vs. introduced by your change in the PR body instead.

## 2. Commit

Group changes into logically separate commits (bug fixes vs. tooling/chore, etc.) rather than one giant commit — check `git diff`/`git status` first. Never sweep in:
- `screenshot-*.png`, `playwright-report/`, `test-results/` (all gitignored — generated smoke-test/e2e artifacts)
- Any file that looks like a pre-existing uncommitted change unrelated to your task (investigate before staging; it may be the user's own in-progress work)

Use a real commit message (why, not what) ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (match whatever model name the session actually reports — check the system prompt, don't hardcode a stale one).

## 3. Push

```bash
git push origin <branch>          # or `git push -u origin <branch>` if no upstream yet
```

This repo has both `origin` (the user's own fork, `Ahmed-Sohail2000/...`) and `upstream` (`georgenikabadze-hub/verdict`, the original hackathon team's repo) as remotes. **Always target `origin`** unless the user explicitly asks to contribute back upstream — this is the user's own submission, not a contribution to someone else's project.

## 4. Open the PR

Prefer `gh` if it's installed and authenticated:

```bash
gh --version && gh auth status
```

If both succeed:

```bash
gh pr create --repo Ahmed-Sohail2000/Big-Berlin-Hackathon-2026-Project-AI-Solar-Verdict \
  --base main --head <branch> \
  --title "<title>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet per logical change>

## Test plan
- [x] `pnpm test` — N/N unit tests pass
- [x] `pnpm lint` — clean
- [x] `pnpm tsc --noEmit` — clean
- [ ] `pnpm test:e2e` — note pass/fail counts and whether failures are pre-existing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**If `gh` is missing or unauthenticated** (common in a fresh environment — this repo's dev container doesn't have it installed by default), don't block on installing/authenticating it interactively. Instead build a pre-filled GitHub compare URL and hand it to the user to open and click "Create pull request" themselves — this needs no setup and the user's final click is still required, which is a reasonable safety property for an action this visible:

```js
const title = "...";
const body = "..."; // same Summary/Test plan content as above
const url = `https://github.com/Ahmed-Sohail2000/Big-Berlin-Hackathon-2026-Project-AI-Solar-Verdict/compare/main...${branch}?quick_pull=1&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
```

Build this with `node -e` (or a small script) rather than hand-escaping the URL — title/body need proper `encodeURIComponent`, and shell-escaping a multi-line body is error-prone.

## PR body convention

- `## Summary` — one bullet per logical change, grounded in what actually changed (not a restatement of file names)
- `## Test plan` — a checklist of what was actually run and its result, including honest notes on anything that failed for reasons unrelated to this PR
- End with the Claude Code footer line
