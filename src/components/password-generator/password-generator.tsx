'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  generatePassword,
  generatePassphrase,
  generateMemorable,
  generatePin,
  generateSalt,
  generateSecret,
  generateUUID,
  type PasswordOptions,
  type PassphraseOptions,
  type MemorableOptions,
  type SaltOptions,
  type SecretOptions,
} from '@/lib/password-generator/generators';
import {
  calculatePasswordEntropy,
  calculatePassphraseEntropy,
  calculatePinEntropy,
  calculateGenericEntropy,
  type EntropyResult,
} from '@/lib/password-generator/entropy';
import { PRESETS, type Preset } from '@/lib/password-generator/presets';
import { ScenePanda } from './password-strength-scene';
import { useSceneEntropy } from '@/lib/password-generator/scene-context';
import {
  Tabs,
  TabsList,
  TabsContent,
} from '@/components/ui/tabs';
import { HapticTabsTrigger as TabsTrigger } from '@/components/haptic-wrappers';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { HapticButton as Button } from '@/components/haptic-wrappers';
import { Input } from '@/components/ui/input';
import { HapticSlider as Slider } from '@/components/haptic-wrappers';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HapticSelectItem as SelectItem } from '@/components/haptic-wrappers';
import { HapticCheckbox as Checkbox } from '@/components/haptic-wrappers';
import {
  Copy,
  RefreshCw,
  Share2,
  Check,
  ShieldCheck,
  Wifi,
  TextCursorInput,
  KeyRound,
  Database,
  Hash,
  Fingerprint,
} from 'lucide-react';

type Mode = 'password' | 'passphrase' | 'memorable' | 'pin' | 'salt' | 'secret' | 'uuid';

const PRESET_ICONS: Record<string, React.ReactNode> = {
  'shield-check': <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />,
  'wifi': <Wifi className="mr-1.5 h-3.5 w-3.5" />,
  'text-cursor-input': <TextCursorInput className="mr-1.5 h-3.5 w-3.5" />,
  'key-round': <KeyRound className="mr-1.5 h-3.5 w-3.5" />,
  'database': <Database className="mr-1.5 h-3.5 w-3.5" />,
  'hash': <Hash className="mr-1.5 h-3.5 w-3.5" />,
  'fingerprint': <Fingerprint className="mr-1.5 h-3.5 w-3.5" />,
};

const DEFAULT_ENTROPY: EntropyResult = {
  bits: 0,
  crackTime: 'Instant',
  strength: 'very-weak',
  color: 'bg-red-500',
  percentage: 0,
};

function buildUrlKey(params: URLSearchParams): string {
  const sorted = new URLSearchParams([...params.entries()].sort());
  return sorted.toString();
}

export function PasswordGenerator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const prevUrlKey = useRef<string>('');
  const isInitialMount = useRef(true);
  const { trigger: hapticTrigger } = useHaptics();

  const [mode, setMode] = useState<Mode>(
    () => (searchParams.get('mode') as Mode) || 'password'
  );

  // Password options
  const [pwLength, setPwLength] = useState(() => parseInt(searchParams.get('len') || '16', 10));
  const [pwUpper, setPwUpper] = useState(() => searchParams.get('upper') !== '0');
  const [pwLower, setPwLower] = useState(() => searchParams.get('lower') !== '0');
  const [pwNum, setPwNum] = useState(() => searchParams.get('num') !== '0');
  const [pwSym, setPwSym] = useState(() => searchParams.get('sym') !== '0');
  const [pwSafe, setPwSafe] = useState(() => searchParams.get('safe') === '1');
  const [pwNoAmbig, setPwNoAmbig] = useState(() => searchParams.get('noambig') === '1');
  const [pwExclude, setPwExclude] = useState(() => searchParams.get('exclude') || '');

  // Passphrase options
  const [ppWords, setPpWords] = useState(() => parseInt(searchParams.get('words') || '4', 10));
  const [ppSep, setPpSep] = useState(() => searchParams.get('sep') || '-');
  const [ppCustomSep, setPpCustomSep] = useState('');
  const [ppCap, setPpCap] = useState(() => searchParams.get('cap') !== '0');
  const [ppAddNum, setPpAddNum] = useState(() => searchParams.get('addnum') === '1');

  // Memorable options
  const [memLength, setMemLength] = useState(() => parseInt(searchParams.get('len') || '12', 10));
  const [memDigits, setMemDigits] = useState(() => searchParams.get('digits') !== '0');
  const [memSymbols, setMemSymbols] = useState(() => searchParams.get('symbols') === '1');

  // PIN options
  const [pinLength, setPinLength] = useState(() => parseInt(searchParams.get('len') || '6', 10));

  // Salt options
  const [saltLength, setSaltLength] = useState(() => parseInt(searchParams.get('len') || '32', 10));
  const [saltEnc, setSaltEnc] = useState<'hex' | 'base64'>(() => (searchParams.get('enc') as 'hex' | 'base64') || 'hex');

  // Secret options
  const [secLength, setSecLength] = useState(() => parseInt(searchParams.get('len') || '40', 10));
  const [secPrefix, setSecPrefix] = useState(() => searchParams.get('prefix') || 'sk_');
  const [secCustomPrefix, setSecCustomPrefix] = useState('');
  const [secEnc, setSecEnc] = useState<'hex' | 'base64' | 'alphanumeric'>(() => (searchParams.get('enc') as 'hex' | 'base64' | 'alphanumeric') || 'base64');

  // UUID options
  const [uuidVer, setUuidVer] = useState<4 | 7>(() => (parseInt(searchParams.get('ver') || '4', 10) as 4 | 7));

  // Shared
  const [count, setCount] = useState(() => Math.min(50, Math.max(1, parseInt(searchParams.get('count') || '1', 10))));
  const [regenKey, setRegenKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getActiveSeparator = useCallback(() => {
    if (ppSep === 'custom') return ppCustomSep;
    if (ppSep === 'space') return ' ';
    return ppSep;
  }, [ppSep, ppCustomSep]);

  const getActivePrefix = useCallback(() => {
    if (secPrefix === 'custom') return secCustomPrefix;
    if (secPrefix === 'none') return '';
    return secPrefix;
  }, [secPrefix, secCustomPrefix]);

  const [results, setResults] = useState<string[]>([]);

  // Generate results client-side only to avoid SSR hydration mismatch
  useEffect(() => {
    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      switch (mode) {
        case 'password':
          generated.push(generatePassword({
            length: pwLength,
            uppercase: pwUpper,
            lowercase: pwLower,
            numbers: pwNum,
            symbols: pwSym,
            safeSymbols: pwSafe,
            excludeAmbiguous: pwNoAmbig,
            customExclude: pwExclude,
          }));
          break;
        case 'passphrase':
          generated.push(generatePassphrase({
            wordCount: ppWords,
            separator: getActiveSeparator(),
            capitalize: ppCap,
            includeNumber: ppAddNum,
          }));
          break;
        case 'memorable':
          generated.push(generateMemorable({
            length: memLength,
            includeDigits: memDigits,
            includeSymbols: memSymbols,
          }));
          break;
        case 'pin':
          generated.push(generatePin(pinLength));
          break;
        case 'salt':
          generated.push(generateSalt({ length: saltLength, encoding: saltEnc }));
          break;
        case 'secret':
          generated.push(generateSecret({
            length: secLength,
            prefix: getActivePrefix(),
            encoding: secEnc,
          }));
          break;
        case 'uuid':
          generated.push(generateUUID(uuidVer));
          break;
      }
    }
    setResults(generated);
  }, [
    mode, count, regenKey,
    pwLength, pwUpper, pwLower, pwNum, pwSym, pwSafe, pwNoAmbig, pwExclude,
    ppWords, ppCap, ppAddNum, getActiveSeparator,
    memLength, memDigits, memSymbols,
    pinLength,
    saltLength, saltEnc,
    secLength, secEnc, getActivePrefix,
    uuidVer,
  ]);

  const entropy = useMemo((): EntropyResult => {
    switch (mode) {
      case 'password':
        return calculatePasswordEntropy(pwLength, {
          uppercase: pwUpper,
          lowercase: pwLower,
          numbers: pwNum,
          symbols: pwSym,
          safeSymbols: pwSafe,
          excludeAmbiguous: pwNoAmbig,
        });
      case 'passphrase':
        return calculatePassphraseEntropy(ppWords);
      case 'memorable': {
        let pool = 18 + 5;
        if (memDigits) pool += 10;
        if (memSymbols) pool += 8;
        return calculateGenericEntropy(memLength, pool);
      }
      case 'pin':
        return calculatePinEntropy(pinLength);
      case 'salt':
        return calculateGenericEntropy(saltLength, 256);
      case 'secret': {
        let pool = 0;
        if (secEnc === 'hex') pool = 16;
        else if (secEnc === 'base64') pool = 62;
        else pool = 62;
        return calculateGenericEntropy(secLength - getActivePrefix().length, pool);
      }
      case 'uuid':
        return calculateGenericEntropy(uuidVer === 4 ? 122 : 62, 2);
      default:
        return DEFAULT_ENTROPY;
    }
  }, [
    mode,
    pwLength, pwUpper, pwLower, pwNum, pwSym, pwSafe, pwNoAmbig,
    ppWords,
    memLength, memDigits, memSymbols,
    pinLength,
    saltLength,
    secLength, secEnc, getActivePrefix,
    uuidVer,
  ]);

  const regenerate = useCallback(() => {
    setRegenKey(k => k + 1);
  }, []);

  // Push entropy to layout-level scene context
  const { setEntropy: setSceneEntropy } = useSceneEntropy();
  useEffect(() => {
    setSceneEntropy(entropy);
  }, [entropy, setSceneEntropy]);

  // Sync state to URL
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams();
    params.set('mode', mode);

    switch (mode) {
      case 'password':
        params.set('len', pwLength.toString());
        params.set('upper', pwUpper ? '1' : '0');
        params.set('lower', pwLower ? '1' : '0');
        params.set('num', pwNum ? '1' : '0');
        params.set('sym', pwSym ? '1' : '0');
        params.set('safe', pwSafe ? '1' : '0');
        params.set('noambig', pwNoAmbig ? '1' : '0');
        if (pwExclude) params.set('exclude', pwExclude);
        break;
      case 'passphrase':
        params.set('words', ppWords.toString());
        params.set('sep', ppSep === 'space' ? ' ' : ppSep);
        params.set('cap', ppCap ? '1' : '0');
        params.set('addnum', ppAddNum ? '1' : '0');
        break;
      case 'memorable':
        params.set('len', memLength.toString());
        params.set('digits', memDigits ? '1' : '0');
        params.set('symbols', memSymbols ? '1' : '0');
        break;
      case 'pin':
        params.set('len', pinLength.toString());
        break;
      case 'salt':
        params.set('len', saltLength.toString());
        params.set('enc', saltEnc);
        break;
      case 'secret':
        params.set('len', secLength.toString());
        params.set('prefix', secPrefix === 'custom' ? secCustomPrefix : secPrefix);
        params.set('enc', secEnc);
        break;
      case 'uuid':
        params.set('ver', uuidVer.toString());
        break;
    }

    if (count > 1) params.set('count', count.toString());

    const newKey = buildUrlKey(params);
    if (newKey === prevUrlKey.current) return;
    prevUrlKey.current = newKey;
    router.push(pathname + '?' + params.toString(), { scroll: false });
  }, [
    router, pathname, mode, count,
    pwLength, pwUpper, pwLower, pwNum, pwSym, pwSafe, pwNoAmbig, pwExclude,
    ppWords, ppSep, ppCustomSep, ppCap, ppAddNum,
    memLength, memDigits, memSymbols,
    pinLength,
    saltLength, saltEnc,
    secLength, secPrefix, secCustomPrefix, secEnc,
    uuidVer,
  ]);

  const applyPreset = useCallback((preset: Preset) => {
    const p = preset.params;
    setMode(p.mode as Mode);

    switch (p.mode) {
      case 'password':
        setPwLength(parseInt(p.len || '16', 10));
        setPwUpper(p.upper !== '0');
        setPwLower(p.lower !== '0');
        setPwNum(p.num !== '0');
        setPwSym(p.sym !== '0');
        setPwSafe(p.safe === '1');
        setPwNoAmbig(p.noambig === '1');
        setPwExclude(p.exclude || '');
        break;
      case 'passphrase':
        setPpWords(parseInt(p.words || '4', 10));
        setPpSep(p.sep || '-');
        setPpCap(p.cap !== '0');
        setPpAddNum(p.addnum === '1');
        break;
      case 'memorable':
        setMemLength(parseInt(p.len || '12', 10));
        setMemDigits(p.digits !== '0');
        setMemSymbols(p.symbols === '1');
        break;
      case 'pin':
        setPinLength(parseInt(p.len || '6', 10));
        break;
      case 'salt':
        setSaltLength(parseInt(p.len || '32', 10));
        setSaltEnc((p.enc as 'hex' | 'base64') || 'hex');
        break;
      case 'secret':
        setSecLength(parseInt(p.len || '40', 10));
        setSecPrefix(p.prefix || 'sk_');
        setSecEnc((p.enc as 'hex' | 'base64' | 'alphanumeric') || 'base64');
        break;
      case 'uuid':
        setUuidVer(parseInt(p.ver || '4', 10) as 4 | 7);
        break;
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(results[0] || '');
    hapticTrigger("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [results, hapticTrigger]);

  const copySingle = useCallback(async (index: number) => {
    await navigator.clipboard.writeText(results[index] || '');
    hapticTrigger("success");
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, [results, hapticTrigger]);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(results.join('\n'));
    hapticTrigger("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [results, hapticTrigger]);

  const shareConfig = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    hapticTrigger("success");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [hapticTrigger]);

  return (
    <div className="space-y-6">
      {/* Presets + Panda row */}
      <div className="relative">
        <div className="flex items-end gap-4">
          {/* Presets */}
          <div className="flex flex-1 flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                title={preset.description}
              >
                {PRESET_ICONS[preset.icon]}
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Panda - right of presets, overlapping onto output card below */}
          <div className="relative z-20 flex-shrink-0 mb-[-2.5rem] pointer-events-none">
            <ScenePanda entropy={entropy} />
          </div>
        </div>
      </div>

      {/* Output */}
      <Card>
        <CardContent className="pt-6">
          {count === 1 ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-muted p-4 font-mono text-lg select-all">
                {results[0] || ''}
              </code>
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={copyAll}>
                  {copied ? <Check className="mr-2 h-3 w-3" /> : <Copy className="mr-2 h-3 w-3" />}
                  Copy All
                </Button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-muted px-3 py-1.5 font-mono text-sm select-all">
                      {r}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copySingle(i)}
                    >
                      {copiedIndex === i ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entropy */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Strength</span>
              <span className="font-medium">
                {entropy.bits} bits &mdash; {entropy.crackTime}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${entropy.color}`}
                style={{ width: `${entropy.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="capitalize">{entropy.strength.replace('-', ' ')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button onClick={regenerate} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
            <Button variant="outline" onClick={shareConfig}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode Tabs + Options */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="flex h-auto w-full flex-wrap gap-1">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="passphrase">Passphrase</TabsTrigger>
              <TabsTrigger value="memorable">Memorable</TabsTrigger>
              <TabsTrigger value="pin">PIN</TabsTrigger>
              <TabsTrigger value="salt">Salt</TabsTrigger>
              <TabsTrigger value="secret">Secret</TabsTrigger>
              <TabsTrigger value="uuid">UUID</TabsTrigger>
            </TabsList>

            {/* Password */}
            <TabsContent value="password" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Length</Label>
                  <Input
                    type="number"
                    value={pwLength}
                    onChange={(e) => setPwLength(Math.min(128, Math.max(8, parseInt(e.target.value) || 8)))}
                    className="w-20 text-center"
                    min={8}
                    max={128}
                  />
                </div>
                <Slider
                  value={[pwLength]}
                  onValueChange={(v) => setPwLength(v[0])}
                  min={8}
                  max={128}
                  step={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwUpper} onCheckedChange={(v) => setPwUpper(!!v)} />
                  Uppercase (A-Z)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwLower} onCheckedChange={(v) => setPwLower(!!v)} />
                  Lowercase (a-z)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwNum} onCheckedChange={(v) => setPwNum(!!v)} />
                  Numbers (0-9)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwSym} onCheckedChange={(v) => setPwSym(!!v)} />
                  Symbols (!@#...)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwSafe} onCheckedChange={(v) => setPwSafe(!!v)} />
                  Safe Symbols Only
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pwNoAmbig} onCheckedChange={(v) => setPwNoAmbig(!!v)} />
                  Exclude Ambiguous
                </label>
              </div>
              <div className="space-y-2">
                <Label>Custom Exclude</Label>
                <Input
                  value={pwExclude}
                  onChange={(e) => setPwExclude(e.target.value)}
                  placeholder="Characters to exclude..."
                />
              </div>
            </TabsContent>

            {/* Passphrase */}
            <TabsContent value="passphrase" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Word Count</Label>
                  <span className="text-sm text-muted-foreground">{ppWords}</span>
                </div>
                <Slider
                  value={[ppWords]}
                  onValueChange={(v) => setPpWords(v[0])}
                  min={3}
                  max={12}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Separator</Label>
                <Select value={ppSep} onValueChange={setPpSep}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">- (dash)</SelectItem>
                    <SelectItem value="space">[space]</SelectItem>
                    <SelectItem value=".">. (period)</SelectItem>
                    <SelectItem value="_">_ (underscore)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {ppSep === 'custom' && (
                  <Input
                    value={ppCustomSep}
                    onChange={(e) => setPpCustomSep(e.target.value)}
                    placeholder="Enter separator..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={ppCap} onCheckedChange={(v) => setPpCap(!!v)} />
                  Capitalize Words
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={ppAddNum} onCheckedChange={(v) => setPpAddNum(!!v)} />
                  Include Number
                </label>
              </div>
            </TabsContent>

            {/* Memorable */}
            <TabsContent value="memorable" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Length</Label>
                  <span className="text-sm text-muted-foreground">{memLength}</span>
                </div>
                <Slider
                  value={[memLength]}
                  onValueChange={(v) => setMemLength(v[0])}
                  min={8}
                  max={32}
                  step={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={memDigits} onCheckedChange={(v) => setMemDigits(!!v)} />
                  Include Digits
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={memSymbols} onCheckedChange={(v) => setMemSymbols(!!v)} />
                  Include Symbols
                </label>
              </div>
            </TabsContent>

            {/* PIN */}
            <TabsContent value="pin" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Length</Label>
                  <span className="text-sm text-muted-foreground">{pinLength}</span>
                </div>
                <Slider
                  value={[pinLength]}
                  onValueChange={(v) => setPinLength(v[0])}
                  min={4}
                  max={12}
                  step={1}
                />
              </div>
            </TabsContent>

            {/* Salt */}
            <TabsContent value="salt" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Length (bytes)</Label>
                  <span className="text-sm text-muted-foreground">{saltLength}</span>
                </div>
                <Slider
                  value={[saltLength]}
                  onValueChange={(v) => setSaltLength(v[0])}
                  min={16}
                  max={128}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Encoding</Label>
                <Select value={saltEnc} onValueChange={(v) => setSaltEnc(v as 'hex' | 'base64')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">Hex</SelectItem>
                    <SelectItem value="base64">Base64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Secret */}
            <TabsContent value="secret" className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Length</Label>
                  <span className="text-sm text-muted-foreground">{secLength}</span>
                </div>
                <Slider
                  value={[secLength]}
                  onValueChange={(v) => setSecLength(v[0])}
                  min={32}
                  max={128}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Select value={secPrefix} onValueChange={setSecPrefix}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sk_">sk_</SelectItem>
                    <SelectItem value="pk_">pk_</SelectItem>
                    <SelectItem value="api_">api_</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {secPrefix === 'custom' && (
                  <Input
                    value={secCustomPrefix}
                    onChange={(e) => setSecCustomPrefix(e.target.value)}
                    placeholder="Enter prefix..."
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Encoding</Label>
                <Select value={secEnc} onValueChange={(v) => setSecEnc(v as 'hex' | 'base64' | 'alphanumeric')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">Hex</SelectItem>
                    <SelectItem value="base64">Base64</SelectItem>
                    <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* UUID */}
            <TabsContent value="uuid" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Select value={uuidVer.toString()} onValueChange={(v) => setUuidVer(parseInt(v) as 4 | 7)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">v4 (Random)</SelectItem>
                    <SelectItem value="7">v7 (Time-based)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bulk count */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Count</Label>
              <span className="text-sm text-muted-foreground">{count}</span>
            </div>
            <Slider
              value={[count]}
              onValueChange={(v) => setCount(v[0])}
              min={1}
              max={50}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
