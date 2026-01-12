/**
 * Line ending byte sequences for serial communication
 */
export const LINE_ENDINGS = {
  none: new Uint8Array([]),
  cr: new Uint8Array([0x0d]),
  lf: new Uint8Array([0x0a]),
  crlf: new Uint8Array([0x0d, 0x0a]),
} as const;

export type LineEnding = keyof typeof LINE_ENDINGS;

/**
 * Common baud rates for serial communication
 */
export const COMMON_BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800,
  921600,
] as const;

/**
 * Convert string to Uint8Array for serial transmission
 */
export function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert Uint8Array to string for display
 */
export function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

/**
 * Format bytes as hexadecimal string with spaces
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * Parse hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Format timestamp for logging display
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * Check if Web Serial API is available in current browser
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Concatenate two Uint8Arrays
 */
export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}
