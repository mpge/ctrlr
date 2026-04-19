#!/usr/bin/env node
// Drives the built `ctrlr` binary against a throwaway scratch directory and
// asserts that the basic surface works: `--help` exits 0, `init` writes
// well-formed JSON, `controllers` runs (HID device or not is irrelevant — we
// only care that it doesn't throw an unhandled exception). Designed to run
// inside the CI matrix so we catch regressions that escape unit tests
// (importable-but-broken module shape, missing exports, broken IPC paths,
// etc.).
//
// Failure is signalled by `process.exitCode = 1`. The script is intentionally
// dependency-free — it must boot from a fresh `pnpm install --prod=false`
// without anything beyond the workspace itself.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const cliEntry = path.join(repoRoot, 'apps', 'cli', 'dist', 'index.js');

const failures = [];
const log = (msg) => console.log(`\u001b[36m›\u001b[0m ${msg}`);
const ok = (msg) => console.log(`  \u001b[32m✓\u001b[0m ${msg}`);
const fail = (msg, err) => {
  failures.push(msg);
  console.log(`  \u001b[31m✗\u001b[0m ${msg}`);
  if (err) console.log(`    ${err.message ?? err}`);
};

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    encoding: 'utf8',
    timeout: 15_000,
    ...options,
  });
}

// 1. --help
log('ctrlr --help');
{
  const r = runCli(['--help']);
  if (r.status !== 0) fail('--help should exit 0', new Error(`status=${r.status}`));
  else if (!r.stdout.includes('Control your AI agents like a game controller'))
    fail('--help should print the description');
  else ok('exit 0 and prints the description');
}

// 2. --version
log('ctrlr --version');
{
  const r = runCli(['--version']);
  if (r.status !== 0) fail('--version should exit 0');
  else if (!/^\d+\.\d+\.\d+\s*$/.test(r.stdout))
    fail(`--version output unexpected: ${JSON.stringify(r.stdout)}`);
  else ok(`prints semver (${r.stdout.trim()})`);
}

// 3. controllers (no controllers expected on CI; verify graceful handling)
log('ctrlr controllers');
{
  const r = runCli(['controllers']);
  if (r.status !== 0)
    fail('controllers should exit 0 even with no devices', new Error(r.stderr || ''));
  else ok('exit 0 (no devices is a normal state)');
}

// 4. init in a scratch dir
log('ctrlr init in scratch directory');
const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'ctrlr-smoke-'));
try {
  const r = runCli(['init'], { cwd: tmpDir });
  if (r.status !== 0) {
    fail('init should exit 0', new Error(`status=${r.status}; stderr=${r.stderr}`));
  } else {
    ok('init exited 0');
    try {
      const config = JSON.parse(readFileSync(path.join(tmpDir, 'ctrlr.config.json'), 'utf8'));
      if (config.version !== 1) fail('config.version should be 1');
      else if (!Array.isArray(config.agents) || config.agents.length === 0)
        fail('config.agents should be a non-empty array');
      else ok(`ctrlr.config.json well-formed (${config.agents.length} agents)`);
    } catch (err) {
      fail('ctrlr.config.json should be valid JSON', err);
    }
    try {
      const bindings = JSON.parse(readFileSync(path.join(tmpDir, 'ctrlr.bindings.json'), 'utf8'));
      if (bindings.version !== 1) fail('bindings.version should be 1');
      else if (!bindings.buttons?.A) fail('default bindings should bind A');
      else
        ok(
          `ctrlr.bindings.json well-formed (binds ${Object.keys(bindings.buttons).length} buttons)`,
        );
    } catch (err) {
      fail('ctrlr.bindings.json should be valid JSON', err);
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

// 5. init --force after a previous init succeeds
log('ctrlr init --force re-applies on top');
const tmpDir2 = mkdtempSync(path.join(os.tmpdir(), 'ctrlr-smoke-'));
try {
  runCli(['init'], { cwd: tmpDir2 });
  const r = runCli(['init', '--force'], { cwd: tmpDir2 });
  if (r.status !== 0) fail('init --force should exit 0', new Error(r.stderr));
  else ok('init --force exited 0');
} finally {
  rmSync(tmpDir2, { recursive: true, force: true });
}

console.log('');
if (failures.length > 0) {
  console.log(`\u001b[31m${failures.length} failure(s):\u001b[0m`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('\u001b[32mAll smoke checks passed.\u001b[0m');
}
