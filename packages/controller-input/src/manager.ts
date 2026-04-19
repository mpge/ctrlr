import { EventEmitter } from 'node:events';
import type {
  ConnectionEvent,
  ControllerEvent,
  ControllerInfo,
  ControllerVendor,
} from '@ctrlr/types';
import { findKnownDevice } from './known-devices.js';
import { pickParser } from './parsers/index.js';
import {
  type ControllerParser,
  emptyState,
  diffState,
  type ParsedState,
} from './parsers/types.js';

export interface ControllerManagerOptions {
  /** Polling interval (ms) for device discovery. Default 2000. */
  pollIntervalMs?: number;
  /** Override the HID module (for testing). Defaults to `node-hid`. */
  hid?: HidModule;
  /** Stick deadzone applied uniformly. Default 0.15. */
  deadzone?: number;
}

export interface HidDeviceDescriptor {
  vendorId: number;
  productId: number;
  path?: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  release?: number;
  interface?: number;
  usagePage?: number;
  usage?: number;
}

export interface HidDeviceHandle {
  on(event: 'data', listener: (data: Buffer) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  removeAllListeners(): this;
  close(): void;
}

export interface HidModule {
  devices(): HidDeviceDescriptor[];
  HID: new (path: string) => HidDeviceHandle;
}

interface OpenController {
  info: ControllerInfo;
  device: HidDeviceHandle;
  parser: ControllerParser;
  state: ParsedState;
}

/**
 * High-level controller hub. Detects gamepads, opens them, and emits
 * normalized `ControllerEvent`s plus `connect`/`disconnect` lifecycle events.
 *
 * Lifecycle:
 *   const mgr = new ControllerManager();
 *   mgr.on('input', (e) => …);
 *   mgr.on('connect', (info) => …);
 *   await mgr.start();
 *   …
 *   await mgr.stop();
 */
export class ControllerManager extends EventEmitter {
  private readonly options: Required<Omit<ControllerManagerOptions, 'hid'>> & {
    hid: HidModule | null;
  };
  private hid: HidModule | null;
  private readonly open = new Map<string, OpenController>();
  private timer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(options: ControllerManagerOptions = {}) {
    super();
    this.options = {
      pollIntervalMs: options.pollIntervalMs ?? 2000,
      hid: options.hid ?? null,
      deadzone: options.deadzone ?? 0.15,
    };
    this.hid = options.hid ?? null;
  }

  /**
   * Begin polling for connected gamepads. Idempotent.
   *
   * `node-hid` is loaded lazily here so users without controllers attached
   * (e.g. CI machines without `libudev`) can still import the package.
   */
  async start(): Promise<void> {
    if (this.started) return;
    if (!this.hid) {
      this.hid = await loadDefaultHid();
    }
    this.started = true;
    this.scan();
    this.timer = setInterval(() => this.scan(), this.options.pollIntervalMs);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  /** Stop polling, close all open devices. Idempotent. */
  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const id of [...this.open.keys()]) {
      this.closeController(id, 'shutdown');
    }
  }

  /** Currently-open controllers. */
  list(): ControllerInfo[] {
    return [...this.open.values()].map((c) => c.info);
  }

  /** Re-scan once, synchronously (useful for tests and `ctrlr controllers`). */
  scanOnce(): ControllerInfo[] {
    if (!this.hid) throw new Error('ControllerManager not started');
    this.scan();
    return this.list();
  }

  /** Typed event registration for the events this manager emits. */
  override on(event: 'input', listener: (e: ControllerEvent) => void): this;
  override on(event: 'connect', listener: (info: ControllerInfo) => void): this;
  override on(event: 'disconnect', listener: (info: ControllerInfo) => void): this;
  override on(event: 'lifecycle', listener: (e: ConnectionEvent) => void): this;
  override on(event: 'error', listener: (err: Error) => void): this;
  // biome-ignore lint/suspicious/noExplicitAny: matches Node's EventEmitter base signature
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  // ----- internals -----

  private scan(): void {
    if (!this.hid) return;
    let descriptors: HidDeviceDescriptor[];
    try {
      descriptors = this.hid.devices();
    } catch (err) {
      this.emit('error', err as Error);
      return;
    }

    const seen = new Set<string>();
    for (const d of descriptors) {
      if (!isLikelyGamepad(d)) continue;
      if (!d.path) continue;
      const id = controllerId(d);
      seen.add(id);
      if (this.open.has(id)) continue;
      this.openController(id, d);
    }

    // Anything we had open that's no longer present has been unplugged.
    for (const id of [...this.open.keys()]) {
      if (!seen.has(id)) this.closeController(id, 'unplugged');
    }
  }

  private openController(id: string, d: HidDeviceDescriptor): void {
    if (!this.hid || !d.path) return;
    let device: HidDeviceHandle;
    try {
      device = new this.hid.HID(d.path);
    } catch (err) {
      // Permission denied or device busy. Skip without spamming connect events.
      this.emit('error', err as Error);
      return;
    }

    const parser = pickParser(d.vendorId, d.productId);
    const known = findKnownDevice(d.vendorId, d.productId);
    const vendor: ControllerVendor = known?.vendor ?? parser.vendor;
    const product = known?.product ?? d.product ?? `Unknown ${hex(d.vendorId)}:${hex(d.productId)}`;
    const info: ControllerInfo = {
      id,
      vendor,
      product,
      vendorId: d.vendorId,
      productId: d.productId,
      path: d.path,
      manufacturer: d.manufacturer,
      serialNumber: d.serialNumber,
    };

    const entry: OpenController = { info, device, parser, state: emptyState() };
    this.open.set(id, entry);

    device.on('data', (data) => this.handleData(entry, data));
    device.on('error', (err) => {
      this.emit('error', err);
      this.closeController(id, 'error');
    });

    this.emit('connect', info);
    this.emit('lifecycle', { type: 'connect', ts: Date.now(), controller: info });
  }

  private closeController(id: string, _reason: string): void {
    const entry = this.open.get(id);
    if (!entry) return;
    try {
      entry.device.removeAllListeners();
      entry.device.close();
    } catch {
      // best effort
    }
    this.open.delete(id);
    this.emit('disconnect', entry.info);
    this.emit('lifecycle', { type: 'disconnect', ts: Date.now(), controller: entry.info });
  }

  private handleData(entry: OpenController, data: Buffer): void {
    const next = entry.parser.parse(data);
    if (!next) return;
    const events = diffState(entry.state, next, entry.info.id);
    entry.state = next;
    for (const ev of events) this.emit('input', ev);
  }
}

function isLikelyGamepad(d: HidDeviceDescriptor): boolean {
  // Known device ids are always allowed even if usage page is funky.
  if (findKnownDevice(d.vendorId, d.productId)) return true;
  // Generic Desktop usage page (0x01), usage Joystick (0x04) or Gamepad (0x05).
  if (d.usagePage === 0x01 && (d.usage === 0x04 || d.usage === 0x05)) return true;
  return false;
}

function controllerId(d: HidDeviceDescriptor): string {
  return `${hex(d.vendorId)}:${hex(d.productId)}#${d.path ?? d.serialNumber ?? '0'}`;
}

function hex(n: number): string {
  return n.toString(16).padStart(4, '0');
}

async function loadDefaultHid(): Promise<HidModule> {
  // Dynamic import so that `import '@ctrlr/controller-input'` doesn't hard-fail
  // in environments where `node-hid` couldn't be built.
  const mod = (await import('node-hid')) as unknown as {
    default?: HidModule;
    devices?: HidModule['devices'];
    HID?: HidModule['HID'];
  };
  if (mod.default) return mod.default;
  if (mod.devices && mod.HID) return { devices: mod.devices, HID: mod.HID };
  throw new Error('Failed to load node-hid: unexpected module shape');
}
