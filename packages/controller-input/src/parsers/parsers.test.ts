import { describe, expect, it } from 'vitest';
import { genericParser } from './generic.js';
import { pickParser } from './index.js';
import { playstationParser } from './playstation.js';
import { diffState, emptyState } from './types.js';
import { xboxParser } from './xbox.js';

describe('pickParser', () => {
  it('routes Sony vendor ids to the PlayStation parser', () => {
    expect(pickParser(0x054c, 0x09cc)).toBe(playstationParser);
  });
  it('routes Microsoft vendor ids to the Xbox parser', () => {
    expect(pickParser(0x045e, 0x02ea)).toBe(xboxParser);
  });
  it('falls back to the generic parser for unknown devices', () => {
    expect(pickParser(0xdead, 0xbeef)).toBe(genericParser);
  });
});

describe('playstationParser', () => {
  it('decodes a synthetic DS4 idle frame correctly', () => {
    // Idle: sticks centered (128), hat = 8 (neutral), no buttons.
    const buf = Buffer.from([0x01, 128, 128, 128, 128, 0x08, 0x00, 0x00, 0, 0, 0]);
    const state = playstationParser.parse(buf);
    expect(state).not.toBeNull();
    expect(state?.sticks.left).toEqual({ x: 0, y: 0 });
    expect(state?.buttons.A).toBe(false);
    expect(state?.buttons.DPAD_UP).toBe(false);
  });

  it('decodes the cross face button (A)', () => {
    // face nibble bit 5 set → cross
    const buf = Buffer.from([0x01, 128, 128, 128, 128, 0x28, 0x00, 0x00, 0, 0, 0]);
    const state = playstationParser.parse(buf);
    expect(state?.buttons.A).toBe(true);
    expect(state?.buttons.B).toBe(false);
  });

  it('decodes D-pad up (hat = 0)', () => {
    const buf = Buffer.from([0x01, 128, 128, 128, 128, 0x00, 0x00, 0x00, 0, 0, 0]);
    const state = playstationParser.parse(buf);
    expect(state?.buttons.DPAD_UP).toBe(true);
    expect(state?.buttons.DPAD_DOWN).toBe(false);
  });
});

describe('xboxParser', () => {
  it('decodes a synthetic Xbox idle frame', () => {
    const buf = Buffer.alloc(17);
    buf[0] = 0x01;
    // sticks at 0 (which decodes to 0 in i16le), triggers 0, hat 0 (neutral on this firmware), no buttons
    const state = xboxParser.parse(buf);
    expect(state).not.toBeNull();
    expect(state?.buttons.A).toBe(false);
  });

  it('decodes A-button press', () => {
    const buf = Buffer.alloc(17);
    buf[0] = 0x01;
    buf[14] = 0x01; // A bit
    const state = xboxParser.parse(buf);
    expect(state?.buttons.A).toBe(true);
  });
});

describe('diffState', () => {
  it('emits a press event when a button transitions to true', () => {
    const a = emptyState();
    const b = emptyState();
    b.buttons.A = true;
    const events = diffState(a, b, 'controller-1');
    expect(events).toEqual([
      expect.objectContaining({ type: 'button', button: 'A', pressed: true }),
    ]);
  });

  it('emits a release event when a button transitions to false', () => {
    const a = emptyState();
    a.buttons.A = true;
    const b = emptyState();
    b.buttons.A = false;
    const events = diffState(a, b, 'c');
    expect(events[0]).toEqual(
      expect.objectContaining({ type: 'button', button: 'A', pressed: false }),
    );
  });

  it('emits stick events whenever the value changes', () => {
    const a = emptyState();
    const b = emptyState();
    b.sticks.left = { x: 0.5, y: -0.2 };
    const events = diffState(a, b, 'c');
    expect(events).toEqual([
      expect.objectContaining({ type: 'stick', stick: 'left', x: 0.5, y: -0.2 }),
    ]);
  });

  it('only emits trigger events when the value moves more than the threshold', () => {
    const a = emptyState();
    const b = emptyState();
    b.triggers.LT = 0.5;
    expect(diffState(a, b, 'c').length).toBe(1);
    const c = { ...b, triggers: { ...b.triggers, LT: 0.51 } };
    expect(diffState(b, c, 'c').length).toBe(0); // below 0.05 default threshold
  });
});
