import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentSpec } from '@ctrlr/types';
import { z } from 'zod';

export const CONFIG_FILENAME = 'ctrlr.config.json';

const agentSpec = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9_-]*$/i, 'lowercase alphanumeric, dashes, underscores'),
  label: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  accent: z.enum(['pink', 'cyan', 'amber', 'green', 'red']).optional(),
});

export const projectConfigSchema = z
  .object({
    version: z.literal(1),
    agents: z.array(agentSpec).min(1),
    bindings: z.string().optional(),
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export function configPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILENAME);
}

export async function loadConfig(cwd: string = process.cwd()): Promise<ProjectConfig> {
  const file = configPath(cwd);
  if (!existsSync(file)) {
    throw new Error(`No ${CONFIG_FILENAME} in ${cwd}. Run \`ctrlr init\`.`);
  }
  const raw = await readFile(file, 'utf8');
  return projectConfigSchema.parse(JSON.parse(raw));
}

export async function saveConfig(target: string, cfg: ProjectConfig): Promise<void> {
  const verified = projectConfigSchema.parse(cfg);
  await writeFile(target, `${JSON.stringify(verified, null, 2)}\n`, 'utf8');
}

export function specsFromConfig(cfg: ProjectConfig): AgentSpec[] {
  return cfg.agents;
}
