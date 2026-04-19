import { z } from 'zod';

export const ipcRequest = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ping') }),
  z.object({ kind: z.literal('quit') }),
  z.object({
    kind: z.literal('send'),
    agent: z.string().nullable(),
    text: z.string(),
    appendNewline: z.boolean().default(true),
  }),
  z.object({ kind: z.literal('focus'), agent: z.string() }),
  z.object({ kind: z.literal('restart'), agent: z.string() }),
  z.object({ kind: z.literal('list_agents') }),
]);

export type IpcRequest = z.infer<typeof ipcRequest>;

export const ipcResponse = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export type IpcResponse = z.infer<typeof ipcResponse>;
