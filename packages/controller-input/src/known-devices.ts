import type { ControllerVendor } from '@ctrlr/types';

/**
 * Known device fingerprints. We use these to (a) filter the noisy HID device
 * list down to gamepads only, and (b) decide which parser to instantiate.
 *
 * IDs collected from the public USB IDs database and Linux's hid-ids.h. If
 * your controller isn't here, the generic HID gamepad parser will still pick
 * it up as long as it advertises usage page 0x0001 (generic desktop) usage
 * 0x0005 (gamepad).
 */
export interface KnownDevice {
  vendorId: number;
  productId: number;
  vendor: ControllerVendor;
  product: string;
}

export const KNOWN_DEVICES: KnownDevice[] = [
  // Microsoft / Xbox
  { vendorId: 0x045e, productId: 0x028e, vendor: 'xbox', product: 'Xbox 360 Controller' },
  { vendorId: 0x045e, productId: 0x02d1, vendor: 'xbox', product: 'Xbox One Controller' },
  { vendorId: 0x045e, productId: 0x02dd, vendor: 'xbox', product: 'Xbox One Controller (FW 2015)' },
  { vendorId: 0x045e, productId: 0x02e3, vendor: 'xbox', product: 'Xbox One Elite Controller' },
  { vendorId: 0x045e, productId: 0x02ea, vendor: 'xbox', product: 'Xbox One S Controller' },
  { vendorId: 0x045e, productId: 0x02fd, vendor: 'xbox', product: 'Xbox One S Controller (BT)' },
  { vendorId: 0x045e, productId: 0x0b00, vendor: 'xbox', product: 'Xbox Elite Controller Series 2' },
  { vendorId: 0x045e, productId: 0x0b12, vendor: 'xbox', product: 'Xbox Wireless Controller (Series X|S)' },
  { vendorId: 0x045e, productId: 0x0b13, vendor: 'xbox', product: 'Xbox Wireless Controller (Series X|S, BT)' },
  // Sony / PlayStation
  { vendorId: 0x054c, productId: 0x05c4, vendor: 'playstation', product: 'DualShock 4' },
  { vendorId: 0x054c, productId: 0x09cc, vendor: 'playstation', product: 'DualShock 4 (v2)' },
  { vendorId: 0x054c, productId: 0x0ba0, vendor: 'playstation', product: 'DualShock 4 USB Wireless Adapter' },
  { vendorId: 0x054c, productId: 0x0ce6, vendor: 'playstation', product: 'DualSense' },
  { vendorId: 0x054c, productId: 0x0df2, vendor: 'playstation', product: 'DualSense Edge' },
  // Nintendo (treated as generic for now)
  { vendorId: 0x057e, productId: 0x2009, vendor: 'generic', product: 'Switch Pro Controller' },
];

export function listKnownDevices(): readonly KnownDevice[] {
  return KNOWN_DEVICES;
}

export function findKnownDevice(vendorId: number, productId: number): KnownDevice | undefined {
  return KNOWN_DEVICES.find((d) => d.vendorId === vendorId && d.productId === productId);
}
