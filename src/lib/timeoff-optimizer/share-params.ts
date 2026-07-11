import type {
  CustomDayOff,
  Location,
  PlanStrategy,
  TakenDayOff
} from './types';

export const STRATEGIES = [
  'balanced',
  'longWeekends',
  'miniBreaks',
  'weekLongBreaks',
  'extendedVacations'
] as const;

export function isStrategy(value: string | null): value is PlanStrategy {
  return value !== null && (STRATEGIES as readonly string[]).includes(value);
}

export function makeLocationId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function base64EncodeJSON(value: unknown): string | null {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  } catch {
    return null;
  }
}

export function base64DecodeJSON<T>(encoded: string | null): T | null {
  if (!encoded) return null;
  try {
    const bin = atob(encoded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export function encodeLocations(locations: Location[]): string | null {
  const valid = locations.filter((l) => l.country);
  if (valid.length === 0) return null;
  const compact = valid.map((l) => ({ c: l.country, s: l.state, r: l.region }));
  return base64EncodeJSON(compact);
}

interface CompactLocation {
  c?: unknown;
  s?: unknown;
  r?: unknown;
}

export function decodeLocations(encoded: string | null): Location[] {
  const parsed = base64DecodeJSON<CompactLocation[]>(encoded);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((e): e is CompactLocation => typeof e === 'object' && e !== null)
    .map((e) => ({
      id: makeLocationId(),
      country: typeof e.c === 'string' ? e.c : null,
      state: typeof e.s === 'string' ? e.s : null,
      region: typeof e.r === 'string' ? e.r : null
    }));
}

export function decodeCustomDays(encoded: string | null): CustomDayOff[] {
  const parsed = base64DecodeJSON<unknown>(encoded);
  return Array.isArray(parsed) ? (parsed as CustomDayOff[]) : [];
}

export function decodeTakenDays(encoded: string | null): TakenDayOff[] {
  const parsed = base64DecodeJSON<unknown>(encoded);
  return Array.isArray(parsed) ? (parsed as TakenDayOff[]) : [];
}
