import { EFF_WORD_LIST } from './word-list';

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

const CHARS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
  safeSymbols: '-_!@#$%^',
  lowercaseNoAmbiguous: 'abcdefghjkmnpqrstuvwxyz',
  uppercaseNoAmbiguous: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  numbersNoAmbiguous: '23456789',
};

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  safeSymbols: boolean;
  excludeAmbiguous: boolean;
  customExclude: string;
}

export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.lowercase) charset += options.excludeAmbiguous ? CHARS.lowercaseNoAmbiguous : CHARS.lowercase;
  if (options.uppercase) charset += options.excludeAmbiguous ? CHARS.uppercaseNoAmbiguous : CHARS.uppercase;
  if (options.numbers) charset += options.excludeAmbiguous ? CHARS.numbersNoAmbiguous : CHARS.numbers;
  if (options.symbols) charset += options.safeSymbols ? CHARS.safeSymbols : CHARS.symbols;

  if (options.customExclude) {
    const excluded = new Set(options.customExclude.split(''));
    charset = charset.split('').filter(c => !excluded.has(c)).join('');
  }

  if (charset.length === 0) return '';

  let result = '';
  for (let i = 0; i < options.length; i++) {
    result += charset[secureRandomInt(charset.length)];
  }
  return result;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export function generatePassphrase(options: PassphraseOptions): string {
  const words: string[] = [];
  for (let i = 0; i < options.wordCount; i++) {
    let word = EFF_WORD_LIST[secureRandomInt(EFF_WORD_LIST.length)];
    if (options.capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
    words.push(word);
  }

  let result = words.join(options.separator);
  if (options.includeNumber) {
    result += options.separator + secureRandomInt(100).toString();
  }
  return result;
}

export interface MemorableOptions {
  length: number;
  includeDigits: boolean;
  includeSymbols: boolean;
}

const CONSONANTS = 'bcdfghjklmnprstvwz';
const VOWELS = 'aeiou';

export function generateMemorable(options: MemorableOptions): string {
  let result = '';
  let isConsonant = true;

  while (result.length < options.length) {
    const pool = isConsonant ? CONSONANTS : VOWELS;
    result += pool[secureRandomInt(pool.length)];
    isConsonant = !isConsonant;
  }

  result = result.slice(0, options.length);

  const chars = result.split('');
  if (options.includeDigits && chars.length > 2) {
    const pos = secureRandomInt(chars.length);
    chars[pos] = CHARS.numbers[secureRandomInt(CHARS.numbers.length)];
  }
  if (options.includeSymbols && chars.length > 3) {
    const pos = secureRandomInt(chars.length);
    chars[pos] = CHARS.safeSymbols[secureRandomInt(CHARS.safeSymbols.length)];
  }

  return chars.join('');
}

export function generatePin(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += secureRandomInt(10).toString();
  }
  return result;
}

export interface SaltOptions {
  length: number;
  encoding: 'hex' | 'base64';
}

export function generateSalt(options: SaltOptions): string {
  const bytes = new Uint8Array(options.length);
  crypto.getRandomValues(bytes);

  if (options.encoding === 'hex') {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(String.fromCharCode(...bytes));
}

export interface SecretOptions {
  length: number;
  prefix: string;
  encoding: 'hex' | 'base64' | 'alphanumeric';
}

export function generateSecret(options: SecretOptions): string {
  const prefixLen = options.prefix.length;
  const bodyLen = options.length - prefixLen;
  if (bodyLen <= 0) return options.prefix;

  let body = '';
  if (options.encoding === 'hex') {
    const bytes = new Uint8Array(Math.ceil(bodyLen / 2));
    crypto.getRandomValues(bytes);
    body = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, bodyLen);
  } else if (options.encoding === 'base64') {
    const bytes = new Uint8Array(Math.ceil(bodyLen * 3 / 4));
    crypto.getRandomValues(bytes);
    body = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, bodyLen);
    while (body.length < bodyLen) {
      const extra = new Uint8Array(4);
      crypto.getRandomValues(extra);
      body += btoa(String.fromCharCode(...extra)).replace(/[+/=]/g, '');
    }
    body = body.slice(0, bodyLen);
  } else {
    const charset = CHARS.lowercase + CHARS.uppercase + CHARS.numbers;
    for (let i = 0; i < bodyLen; i++) {
      body += charset[secureRandomInt(charset.length)];
    }
  }

  return options.prefix + body;
}

export function generateUUID(version: 4 | 7): string {
  if (version === 4) {
    return generateUUIDv4();
  }
  return generateUUIDv7();
}

function generateUUIDv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUUID(bytes);
}

function generateUUIDv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestamp = Date.now();
  bytes[0] = (timestamp / 2**40) & 0xff;
  bytes[1] = (timestamp / 2**32) & 0xff;
  bytes[2] = (timestamp / 2**24) & 0xff;
  bytes[3] = (timestamp / 2**16) & 0xff;
  bytes[4] = (timestamp / 2**8) & 0xff;
  bytes[5] = timestamp & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUUID(bytes);
}

function formatUUID(bytes: Uint8Array): string {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
