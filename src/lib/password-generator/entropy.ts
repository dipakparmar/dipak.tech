// Entropy calculation utilities for password strength estimation

export interface EntropyResult {
  bits: number;
  crackTime: string;
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  color: string;
  percentage: number;
}

const LOWERCASE = 26;
const UPPERCASE = 26;
const DIGITS = 10;
const SYMBOLS = 33;
const SAFE_SYMBOLS = 8;

export function calculatePasswordEntropy(
  length: number,
  options: {
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    safeSymbols: boolean;
    excludeAmbiguous: boolean;
  }
): EntropyResult {
  let poolSize = 0;
  if (options.lowercase) poolSize += options.excludeAmbiguous ? LOWERCASE - 2 : LOWERCASE;
  if (options.uppercase) poolSize += options.excludeAmbiguous ? UPPERCASE - 2 : UPPERCASE;
  if (options.numbers) poolSize += options.excludeAmbiguous ? DIGITS - 2 : DIGITS;
  if (options.symbols) poolSize += options.safeSymbols ? SAFE_SYMBOLS : SYMBOLS;

  if (poolSize === 0) return { bits: 0, crackTime: 'Instant', strength: 'very-weak', color: 'bg-red-500', percentage: 0 };

  const bits = Math.floor(length * Math.log2(poolSize));
  return entropyToResult(bits);
}

export function calculatePassphraseEntropy(wordCount: number, listSize: number = 7776): EntropyResult {
  const bits = Math.floor(wordCount * Math.log2(listSize));
  return entropyToResult(bits);
}

export function calculatePinEntropy(length: number): EntropyResult {
  const bits = Math.floor(length * Math.log2(10));
  return entropyToResult(bits);
}

export function calculateGenericEntropy(length: number, poolSize: number): EntropyResult {
  if (poolSize === 0 || length === 0) return { bits: 0, crackTime: 'Instant', strength: 'very-weak', color: 'bg-red-500', percentage: 0 };
  const bits = Math.floor(length * Math.log2(poolSize));
  return entropyToResult(bits);
}

function entropyToResult(bits: number): EntropyResult {
  const crackTime = estimateCrackTime(bits);
  const { strength, color, percentage } = getStrengthFromBits(bits);
  return { bits, crackTime, strength, color, percentage };
}

function estimateCrackTime(bits: number): string {
  const guessesPerSecond = 1e10;
  const totalGuesses = Math.pow(2, bits);
  const seconds = totalGuesses / guessesPerSecond / 2;

  if (seconds < 0.001) return 'Instant';
  if (seconds < 1) return 'Less than a second';
  if (seconds < 60) return `${Math.floor(seconds)} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 31536000 * 1000) return `${Math.floor(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1e6) return `${Math.floor(seconds / 31536000 / 1000)}k years`;
  if (seconds < 31536000 * 1e9) return `${Math.floor(seconds / 31536000 / 1e6)}M years`;
  return 'Centuries+';
}

function getStrengthFromBits(bits: number): { strength: EntropyResult['strength']; color: string; percentage: number } {
  if (bits < 28) return { strength: 'very-weak', color: 'bg-red-500', percentage: 10 };
  if (bits < 36) return { strength: 'weak', color: 'bg-orange-500', percentage: 25 };
  if (bits < 60) return { strength: 'fair', color: 'bg-yellow-500', percentage: 50 };
  if (bits < 100) return { strength: 'strong', color: 'bg-green-500', percentage: 75 };
  return { strength: 'very-strong', color: 'bg-emerald-500', percentage: 100 };
}
