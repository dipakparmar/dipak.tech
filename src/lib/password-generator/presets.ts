export interface Preset {
  label: string;
  description: string;
  icon: string;
  params: Record<string, string>;
}

export const PRESETS: Preset[] = [
  {
    label: 'Strong Password',
    description: '20 chars, all types',
    icon: 'shield-check',
    params: { mode: 'password', len: '20', upper: '1', lower: '1', num: '1', sym: '1', safe: '0', noambig: '0' },
  },
  {
    label: 'Wi-Fi Password',
    description: '16 chars, no ambiguous',
    icon: 'wifi',
    params: { mode: 'password', len: '16', upper: '1', lower: '1', num: '1', sym: '1', safe: '1', noambig: '1' },
  },
  {
    label: 'Passphrase',
    description: '4 words, dashes',
    icon: 'text-cursor-input',
    params: { mode: 'passphrase', words: '4', sep: '-', cap: '1', addnum: '0' },
  },
  {
    label: 'API Secret',
    description: '40 chars, base64',
    icon: 'key-round',
    params: { mode: 'secret', len: '40', prefix: 'sk_', enc: 'base64' },
  },
  {
    label: 'Database Salt',
    description: '32 bytes, hex',
    icon: 'database',
    params: { mode: 'salt', len: '32', enc: 'hex' },
  },
  {
    label: 'PIN Code',
    description: '6 digits',
    icon: 'hash',
    params: { mode: 'pin', len: '6' },
  },
];
