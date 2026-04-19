/**
 * Standardized button names. We map every supported gamepad's native button
 * layout into this set so bindings stay portable across vendors.
 */
export const BUTTON_NAMES = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'BACK',
  'START',
  'GUIDE',
  'LSB',
  'RSB',
  'DPAD_UP',
  'DPAD_DOWN',
  'DPAD_LEFT',
  'DPAD_RIGHT',
] as const;

export type ButtonName = (typeof BUTTON_NAMES)[number];

export type StickName = 'left' | 'right';

export type ControllerVendor = 'xbox' | 'playstation' | 'generic';

export interface ControllerInfo {
  /** Stable per-process id (e.g. "xbox-045e:02ea#0") */
  id: string;
  vendor: ControllerVendor;
  /** Friendly name, e.g. "Xbox Wireless Controller" */
  product: string;
  vendorId: number;
  productId: number;
  /** node-hid device path; opaque, OS-specific. */
  path: string;
  manufacturer?: string;
  serialNumber?: string;
}

interface BaseEvent {
  /** ms since epoch */
  ts: number;
  controllerId: string;
}

export interface ButtonEvent extends BaseEvent {
  type: 'button';
  button: ButtonName;
  pressed: boolean;
}

export interface StickEvent extends BaseEvent {
  type: 'stick';
  stick: StickName;
  /** -1.0 to 1.0, dead-zoned. Negative = left/up. */
  x: number;
  y: number;
}

export interface TriggerEvent extends BaseEvent {
  type: 'trigger';
  trigger: 'LT' | 'RT';
  /** 0.0 (released) to 1.0 (fully depressed). */
  value: number;
}

export interface ConnectionEvent {
  type: 'connect' | 'disconnect';
  ts: number;
  controller: ControllerInfo;
}

export type ControllerEvent = ButtonEvent | StickEvent | TriggerEvent;

export type ControllerLifecycleEvent = ControllerEvent | ConnectionEvent;

export const isButtonEvent = (e: ControllerEvent): e is ButtonEvent => e.type === 'button';
export const isStickEvent = (e: ControllerEvent): e is StickEvent => e.type === 'stick';
export const isTriggerEvent = (e: ControllerEvent): e is TriggerEvent => e.type === 'trigger';
