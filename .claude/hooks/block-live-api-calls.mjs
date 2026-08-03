// PreToolUse hook for Bash: blocks commands that would hit Verdict's live
// external APIs (Solar/Places/Gemini/Tavily) unless MOCK_MODE=true is part
// of the same command. Keeps agent test runs free, deterministic, and
// network-isolated instead of relying on agent discipline alone.
import { readFileSync } from 'node:fs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const command = input?.tool_input?.command ?? '';
const LIVE_HOSTS = /solar\.googleapis\.com|maps\.googleapis\.com|generativelanguage\.googleapis\.com|api\.tavily\.com/;

if (LIVE_HOSTS.test(command) && !/MOCK_MODE=true/.test(command)) {
  console.error(
    'Blocked: this command references a live Verdict external API without MOCK_MODE=true. ' +
    'Prefix it, e.g. `MOCK_MODE=true pnpm test`, or use the cached fixtures in data/fixtures/cached/.'
  );
  process.exit(2);
}

process.exit(0);
