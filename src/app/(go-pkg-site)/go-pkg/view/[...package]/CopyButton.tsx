'use client';

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

export function CopyButton({ text }: { text: string }) {
  const { status, copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={() => copy(text)}
      className="shrink-0 rounded-md p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
      title="Copy to clipboard"
      aria-label={
        status === 'error'
          ? 'Copy failed'
          : copied
            ? 'Copied'
            : 'Copy install command'
      }
      type="button"
    >
      {status === 'error' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
