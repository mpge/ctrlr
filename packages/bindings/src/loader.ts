import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BindingConfig } from '@ctrlr/types';
import { defaultBindings } from './defaults.js';
import { bindingConfigSchema } from './schema.js';

export const DEFAULT_FILENAME = 'ctrlr.bindings.json';

/**
 * Resolve the path the loader should read from. Search order:
 *
 *   1. The passed-in `cwd/ctrlr.bindings.json` (project-local).
 *   2. `$XDG_CONFIG_HOME/ctrlr/bindings.json` (or `%APPDATA%/ctrlr/bindings.json`).
 *   3. The defaults bundled in `@ctrlr/bindings`.
 */
export function resolveBindingsPath(cwd: string = process.cwd()): {
  path: string | null;
  source: 'project' | 'user' | 'defaults';
} {
  const local = path.join(cwd, DEFAULT_FILENAME);
  if (existsSync(local)) return { path: local, source: 'project' };
  const userPath = userConfigPath();
  if (userPath && existsSync(userPath)) return { path: userPath, source: 'user' };
  return { path: null, source: 'defaults' };
}

export function userConfigPath(): string | null {
  const home = process.env.XDG_CONFIG_HOME ?? process.env.APPDATA ?? process.env.HOME;
  if (!home) return null;
  return path.join(home, 'ctrlr', 'bindings.json');
}

export async function loadBindings(
  cwd: string = process.cwd(),
): Promise<{ config: BindingConfig; source: 'project' | 'user' | 'defaults'; path: string | null }> {
  const { path: foundPath, source } = resolveBindingsPath(cwd);
  if (!foundPath) {
    return { config: defaultBindings, source: 'defaults', path: null };
  }
  const raw = await readFile(foundPath, 'utf8');
  const json = JSON.parse(raw);
  const config = bindingConfigSchema.parse(json);
  return { config, source, path: foundPath };
}

export async function saveBindings(target: string, config: BindingConfig): Promise<void> {
  // Re-validate before writing so we never persist invalid data.
  const verified = bindingConfigSchema.parse(config);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(verified, null, 2)}\n`, 'utf8');
}
