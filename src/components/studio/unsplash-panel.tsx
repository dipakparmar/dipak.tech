'use client';

import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

import type { StudioApi } from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UnsplashResult = {
  id: string;
  alt: string;
  color: string | null;
  thumb: string;
  full: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

// Unsplash requires attribution links to carry these UTM params.
const UTM = '?utm_source=dipak_studio&utm_medium=referral';

export function UnsplashPanel({
  studio,
  onInserted
}: {
  studio: StudioApi;
  onInserted?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/unsplash?query=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setError(
          res.status === 503
            ? 'Unsplash is not configured on this server.'
            : 'Search failed. Try again.'
        );
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results: UnsplashResult[] };
      setResults(data.results);
    } catch {
      setError('Search failed. Try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const insert = async (photo: UnsplashResult) => {
    setInsertingId(photo.id);
    try {
      // Fire-and-forget the required download trigger, then embed the photo.
      void fetch(
        `/api/unsplash?download=${encodeURIComponent(photo.downloadLocation)}`
      );
      await studio.addPhotoFromUrl(photo.full, `Photo · ${photo.photographer}`);
      onInserted?.();
    } catch {
      setError('Could not add that photo.');
    } finally {
      setInsertingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Input
          aria-label="Search Unsplash photos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Unsplash…"
          className="h-8"
        />
        <Button
          type="submit"
          size="icon"
          className="h-8 w-8"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!error && searched && !loading && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No photos found.</p>
      )}

      {results.length > 0 && (
        <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
          {results.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-md"
            >
              <button
                type="button"
                onClick={() => void insert(photo)}
                disabled={insertingId !== null}
                aria-label={`Add photo by ${photo.photographer}`}
                className="block aspect-square w-full"
                style={{ backgroundColor: photo.color ?? '#e5e5e5' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumb}
                  alt={photo.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {insertingId === photo.id && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </span>
                )}
              </button>
              {/* Required photographer attribution */}
              <a
                href={`${photo.photographerUrl}${UTM}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-0.5 pt-3 text-[10px] text-white/90 opacity-100 transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {photo.photographer}
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Photos from{' '}
        <a
          href={`https://unsplash.com/${UTM}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Unsplash
        </a>
        .
      </p>
    </div>
  );
}
