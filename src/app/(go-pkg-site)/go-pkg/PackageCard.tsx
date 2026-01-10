'use client';

import { Badge } from '@/components/ui/badge';
import type { Repo } from '@/lib/github';
import Link from 'next/link';
import { useState } from 'react';

export function PackageCard({ repo }: { repo: Repo }) {
  const [copied, setCopied] = useState(false);
  const installCommand = `go get go.pkg.dipak.io/${repo.name}`;
  const githubUrl = `https://github.com/dipakparmar/${repo.name}`;
  const packageUrl = `/go-pkg/view/${repo.name}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-xl border bg-card p-5 text-card-foreground transition-all hover:border-foreground/20 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <Link
              href={packageUrl}
              className="font-semibold tracking-tight hover:text-blue-500 transition-colors"
            >
              {repo.name}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {repo.description || 'No description available'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {repo.stargazers_count > 0 && (
            <Badge variant="secondary" className="text-xs mr-1">
              ⭐ {repo.stargazers_count}
            </Badge>
          )}
          <Link
            href={packageUrl}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="View package info"
          >
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
          <Link
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="View on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Install Command */}
      <div className="mt-4 flex items-center gap-2 rounded-md bg-zinc-100 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
        <code className="flex-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
          <span className="text-zinc-400 dark:text-zinc-500">$</span> {installCommand}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          title="Copy install command"
          type="button"
        >
          {copied ? (
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
      </div>
    </div>
  );
}
