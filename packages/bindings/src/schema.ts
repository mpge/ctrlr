import { BUTTON_NAMES, type BindingConfig } from '@ctrlr/types';
import { z } from 'zod';

const buttonName = z.enum(BUTTON_NAMES as unknown as [string, ...string[]]);

const target = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('focused') }),
  z.object({ mode: z.literal('agent'), agent: z.string().min(1) }),
  z.object({ mode: z.literal('all') }),
]);

export const actionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('send'),
    target,
    text: z.string(),
    appendNewline: z.boolean().optional(),
  }),
  z.object({ kind: z.literal('interrupt'), target }),
  z.object({ kind: z.literal('restart'), target }),
  z.object({ kind: z.literal('focus'), agent: z.string().min(1) }),
  z.object({ kind: z.literal('cycle_focus'), direction: z.enum(['next', 'prev']) }),
  z.object({
    kind: z.literal('broadcast'),
    text: z.string(),
    appendNewline: z.boolean().optional(),
  }),
  z.object({ kind: z.literal('stop_all') }),
  z.object({ kind: z.literal('spawn'), agent: z.string().min(1) }),
  z.object({ kind: z.literal('kill'), agent: z.string().min(1) }),
  z.object({ kind: z.literal('noop') }),
]);

const buttonBinding = z.object({
  label: z.string().optional(),
  action: actionSchema,
});

const stickBinding = z.object({
  axis: z.enum(['x', 'y']),
  threshold: z.number().min(0).max(1).optional(),
  positive: actionSchema,
  negative: actionSchema,
});

export const bindingConfigSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    name: z.string().optional(),
    buttons: z.record(buttonName, buttonBinding),
    sticks: z
      .object({
        left: stickBinding.optional(),
        right: stickBinding.optional(),
      })
      .optional(),
    triggers: z
      .object({
        LT: z.object({ action: actionSchema }).optional(),
        RT: z.object({ action: actionSchema }).optional(),
      })
      .optional(),
  })
  .strict()
  .transform((parsed): BindingConfig => parsed as unknown as BindingConfig);
