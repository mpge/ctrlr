import { genericParser } from './generic.js';
import { playstationParser } from './playstation.js';
import type { ControllerParser } from './types.js';
import { xboxParser } from './xbox.js';

/** Order matters: vendor-specific first, generic as fallback. */
export const parsers: ControllerParser[] = [xboxParser, playstationParser, genericParser];

export function pickParser(vendorId: number, productId: number): ControllerParser {
  return (
    parsers.find((p) => p.vendor !== 'generic' && p.matches(vendorId, productId)) ?? genericParser
  );
}
