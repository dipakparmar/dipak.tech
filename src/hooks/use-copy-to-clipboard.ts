import { useCallback, useEffect, useRef, useState } from 'react';
import { useHaptics } from '@/hooks/use-haptics';

const RESET_MS = 2000;

export type CopyStatus = 'idle' | 'copied' | 'error';

export function useCopyToClipboard(resetMs: number = RESET_MS) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const { trigger } = useHaptics();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      try {
        await navigator.clipboard.writeText(value);
        trigger('success');
        setStatus('copied');
      } catch {
        trigger('error');
        setStatus('error');
      }
      timer.current = setTimeout(() => setStatus('idle'), resetMs);
    },
    [resetMs, trigger]
  );

  return { status, copied: status === 'copied', copy };
}
