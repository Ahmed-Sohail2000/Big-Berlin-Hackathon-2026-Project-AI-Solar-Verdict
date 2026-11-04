# CLAUDE.md

**Read `AGENTS.md` first.** It holds the product summary, hard rules and commands.
`docs/ROOF_TILE_COUNTING.md` is the source of truth for architecture and status.

## Key modules

- `lib/tile-count/count.ts`: photo plus corners to counts, confidence and warnings.
- `lib/tile-count/periodicity.ts`: autocorrelation period finder.
- `lib/tile-count/panels.ts`: panel recommendation from confirmed numbers.
- `lib/tile-count/synthetic-roof.ts`: known-answer roofs for tests and the sample.
- `components/tile-count/useWorkspace.ts`: all client state and actions.
- `middleware.ts` + `lib/auth/basic-auth.ts`: password gate, closed in production
  when `APP_USERNAME` or `APP_PASSWORD` is missing.

## Testing

- Unit tests run under Vitest with `happy-dom`. A file that needs `sharp` sets
  `// @vitest-environment node`.
- Playwright defaults to `http://localhost:3000`. With a production server, pass
  `APP_USERNAME` and `APP_PASSWORD`, which also configure its HTTP credentials.
- Tests start from a dark system theme, because an unset theme follows the OS.

## Claude Code tooling

- Skills in `.claude/skills/`: `run-verdict`, `open-pr`, `ci-verify`, `test-unit`,
  `test-e2e`, `lint`.
- Hooks in `.claude/hooks/` predate the cleanup. They are harmless, and removing them
  is the user's call.
