import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultBindings } from './defaults.js';
import { loadBindings, resolveBindingsPath, saveBindings } from './loader.js';

let tmpDir: string;

afterEach(async () => {
  if (tmpDir) {
    const { rm } = await import('node:fs/promises');
    await rm(tmpDir, { recursive: true, force: true });
  }
});

describe('loadBindings', () => {
  it('falls back to defaults when no config file is present', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ctrlr-bind-'));
    const env = process.env;
    // The annotation is required: spreading `process.env` narrows the result to
    // the literal `{ HOME: string }` on stricter TS configurations, which then
    // rejects the `delete` calls below.
    const cloned: NodeJS.ProcessEnv = { ...env, HOME: tmpDir };
    // Removing rather than setting to undefined so the keys actually leave the
    // env — `process.env` ignores `undefined` assignments.
    // biome-ignore lint/performance/noDelete: see comment above
    delete cloned.XDG_CONFIG_HOME;
    // biome-ignore lint/performance/noDelete: see comment above
    delete cloned.APPDATA;
    process.env = cloned;
    try {
      const { config, source } = await loadBindings(tmpDir);
      expect(source).toBe('defaults');
      expect(config).toEqual(defaultBindings);
    } finally {
      process.env = env;
    }
  });

  it('reads ctrlr.bindings.json from the project root', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ctrlr-bind-'));
    const target = path.join(tmpDir, 'ctrlr.bindings.json');
    await saveBindings(target, defaultBindings);
    const { source, path: foundPath } = await loadBindings(tmpDir);
    expect(source).toBe('project');
    expect(foundPath).toBe(target);
  });

  it('saveBindings round-trips and re-validates', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ctrlr-bind-'));
    const target = path.join(tmpDir, 'ctrlr.bindings.json');
    await saveBindings(target, defaultBindings);
    const raw = await (await import('node:fs/promises')).readFile(target, 'utf8');
    expect(JSON.parse(raw).version).toBe(1);
  });

  it('refuses to save invalid configs', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ctrlr-bind-'));
    const target = path.join(tmpDir, 'ctrlr.bindings.json');
    // @ts-expect-error intentionally invalid
    await expect(saveBindings(target, { version: 2, buttons: {} })).rejects.toThrow();
  });

  it('resolveBindingsPath prefers project over user', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ctrlr-bind-'));
    await writeFile(path.join(tmpDir, 'ctrlr.bindings.json'), '{}', 'utf8');
    const { source } = resolveBindingsPath(tmpDir);
    expect(source).toBe('project');
  });
});
