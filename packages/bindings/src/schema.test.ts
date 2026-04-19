import { describe, expect, it } from 'vitest';
import { defaultBindings } from './defaults.js';
import { bindingConfigSchema } from './schema.js';

describe('bindingConfigSchema', () => {
  it('accepts the bundled defaults', () => {
    const parsed = bindingConfigSchema.parse(defaultBindings);
    expect(parsed.version).toBe(1);
    expect(parsed.buttons.A?.action.kind).toBe('send');
  });

  it('rejects unknown action kinds', () => {
    const bad = {
      version: 1,
      buttons: {
        A: { action: { kind: 'noooope' } },
      },
    };
    expect(() => bindingConfigSchema.parse(bad)).toThrow();
  });

  it('rejects unknown button names', () => {
    const bad = {
      version: 1,
      buttons: {
        WAT: { action: { kind: 'noop' } },
      },
    };
    expect(() => bindingConfigSchema.parse(bad)).toThrow();
  });

  it('rejects extra top-level keys', () => {
    const bad = {
      version: 1,
      buttons: {},
      extra: true,
    };
    expect(() => bindingConfigSchema.parse(bad)).toThrow();
  });

  it('keeps stick configurations through the round trip', () => {
    const parsed = bindingConfigSchema.parse({
      version: 1,
      buttons: { A: { action: { kind: 'noop' } } },
      sticks: {
        right: {
          axis: 'y',
          threshold: 0.4,
          positive: { kind: 'cycle_focus', direction: 'next' },
          negative: { kind: 'cycle_focus', direction: 'prev' },
        },
      },
    });
    expect(parsed.sticks?.right?.axis).toBe('y');
    expect(parsed.sticks?.right?.positive.kind).toBe('cycle_focus');
  });
});
