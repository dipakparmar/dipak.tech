'use client';

import { Check, Copy, X } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const { status, copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={() => copy(text)}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"
      aria-label={
        status === 'error' ? 'Copy failed' : copied ? 'Copied' : 'Copy code'
      }
    >
      {status === 'error' ? (
        <X className="size-3.5 text-destructive" />
      ) : copied ? (
        <Check className="size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}
