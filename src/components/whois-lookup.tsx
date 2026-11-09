'use client';

import {
  ArrowRight,
  Check,
  Globe,
  Hash,
  Network,
  Search,
  Share2,
  X
} from 'lucide-react';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { HapticButton as Button } from '@/components/haptic-wrappers';
import { Input } from '@/components/ui/input';
import { OsintResults } from '@/components/osint-results';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

const EXAMPLE_QUERIES = [
  { label: 'github.com', icon: Globe },
  { label: '8.8.8.8', icon: Network },
  { label: 'AS15169', icon: Hash }
];

/** The URL's `?q=` is the source of truth: searching pushes it, back/forward re-scans. */
export function WhoisLookup() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const submitted = searchParams.get('q')?.trim() ?? '';
  // Bumped when the same query is submitted again, to force a fresh scan.
  const [rescan, setRescan] = useState(0);
  const { status: shareStatus, copied, copy } = useCopyToClipboard();

  const search = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    if (q === submitted) {
      setRescan((n) => n + 1);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', q);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <SearchForm key={submitted} initial={submitted} onSearch={search} />
        {!submitted && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => search(example.label)}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 font-mono text-sm transition-all hover:border-primary/50 hover:bg-muted/50"
              >
                <example.icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                {example.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {submitted && (
        <OsintResults
          key={`${submitted}#${rescan}`}
          query={submitted}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copy(window.location.href)}
              className="h-7 gap-1.5 text-xs"
            >
              {shareStatus === 'error' ? (
                <>
                  <X className="h-3.5 w-3.5 text-destructive" /> Copy failed
                </>
              ) : copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Link copied
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </>
              )}
            </Button>
          }
        />
      )}
    </div>
  );
}

function SearchForm({
  initial,
  onSearch
}: {
  initial: string;
  onSearch: (q: string) => void;
}) {
  const [query, setQuery] = useState(initial);
  const [empty, setEmpty] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setEmpty(!query.trim());
        onSearch(query);
      }}
    >
      <div className="relative flex items-center rounded-xl border-2 bg-background shadow-sm transition-all focus-within:border-primary/50">
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Domain, IP address, or ASN"
          aria-label="Domain, IP address, or ASN"
          aria-invalid={empty}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 border-0 bg-transparent pl-12 pr-28 font-mono text-base shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          className="absolute right-2 h-9 gap-2 rounded-lg px-4"
        >
          Scan <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {empty && (
        <p className="mt-1.5 text-sm text-destructive">
          Enter a domain, IP address, or ASN.
        </p>
      )}
    </form>
  );
}
