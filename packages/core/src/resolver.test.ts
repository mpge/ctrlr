import { defaultBindings } from '@ctrlr/bindings';
import type { ButtonEvent, StickEvent } from '@ctrlr/types';
import { describe, expect, it } from 'vitest';
import { resolveBindingForEvent } from './resolver.js';
import { StickEdgeDetector } from './stick.js';

const press = (button: ButtonEvent['button'], pressed: boolean): ButtonEvent => ({
  type: 'button',
  ts: 0,
  controllerId: 'c',
  button,
  pressed,
});

describe('resolveBindingForEvent', () => {
  it('returns null on button releases', () => {
    const detector = new StickEdgeDetector();
    expect(resolveBindingForEvent(press('A', false), defaultBindings, detector)).toBeNull();
  });

  it('resolves A to the default `pick 1` send action', () => {
    const detector = new StickEdgeDetector();
    const resolved = resolveBindingForEvent(press('A', true), defaultBindings, detector);
    expect(resolved?.action).toEqual(
      expect.objectContaining({ kind: 'send', text: '1', appendNewline: true }),
    );
    expect(resolved?.source).toBe('A');
  });

  it('returns null when button has no binding', () => {
    const detector = new StickEdgeDetector();
    expect(resolveBindingForEvent(press('LSB', true), defaultBindings, detector)).toBeNull();
  });

  it('resolves a stick crossing using the binding configuration', () => {
    const detector = new StickEdgeDetector();
    const event: StickEvent = {
      type: 'stick',
      ts: 0,
      controllerId: 'c',
      stick: 'left',
      x: 0.9,
      y: 0,
    };
    const resolved = resolveBindingForEvent(event, defaultBindings, detector);
    expect(resolved?.action).toEqual({ kind: 'cycle_focus', direction: 'next' });
  });
});
