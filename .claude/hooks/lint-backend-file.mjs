// PostToolUse hook for Edit/Write: immediately lints files under app/api/ or
// lib/api/ so backend-agent sees contract/security regressions right away
// instead of at the next full `pnpm lint` pass.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? '';
const isBackendFile = /[\\/]app[\\/]api[\\/]|[\\/]lib[\\/]api[\\/]/.test(filePath) && /\.tsx?$/.test(filePath);
if (!isBackendFile) process.exit(0);

const bin = process.platform === 'win32' ? 'node_modules\\.bin\\eslint.cmd' : 'node_modules/.bin/eslint';
const result = spawnSync(bin, [filePath], { encoding: 'utf8' });

if (result.status !== 0) {
  console.error(`eslint flagged ${filePath}:\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  process.exit(1);
}
process.exit(0);
