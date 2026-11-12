'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle, Check, CircleAlert, Info } from 'lucide-react';
import {
  imageChecks,
  preview,
  seoChecks,
  type CheckStatus,
  type SeoCheck,
  type SeoData
} from '@/lib/seo';
import { cn } from '@/lib/utils';

type Readiness = 'rich' | 'basic' | 'none';
type ImageState =
  | { state: 'none' }
  | { state: 'loading' }
  | { state: 'ok'; width: number; height: number }
  | { state: 'error' };

const STATUS_ORDER: Record<CheckStatus, number> = {
  fail: 0,
  warn: 1,
  info: 2,
  pass: 3
};

export function SeoPanel({ seo }: { seo: SeoData }) {
  const p = preview(seo);
  const src = (url: string | null) =>
    url ? (seo.proxied?.[url] ?? null) : null;
  const ogSrc = src(p.image);
  const [img, setImg] = useState<ImageState>(
    p.image ? { state: 'loading' } : { state: 'none' }
  );

  const checks: SeoCheck[] = [
    ...seoChecks(seo),
    ...(img.state === 'ok' ? imageChecks(img.width, img.height) : []),
    ...(img.state === 'error'
      ? [
          {
            group: 'Open Graph' as const,
            status: 'fail' as const,
            label: 'og:image did not load',
            detail: `${p.image} is unreachable or not an image; previews will show no picture.`
          }
        ]
      : [])
  ];
  const imageOk = Boolean(p.image) && img.state !== 'error';
  const tally = (s: CheckStatus) => checks.filter((c) => c.status === s).length;

  const cardReady = (needsImage = true): Readiness =>
    !p.title ? 'none' : imageOk || !needsImage ? 'rich' : 'basic';
  const platforms: Array<[string, Readiness, string]> = [
    [
      'Google',
      !seo.title ? 'none' : seo.description ? 'rich' : 'basic',
      'title + description snippet'
    ],
    [
      'X',
      !p.twitterCard ? 'none' : imageOk ? 'rich' : 'basic',
      p.twitterCard ? `${p.twitterCard} card` : 'no twitter:card, plain link'
    ],
    ['Facebook', cardReady(), 'og:title + og:image'],
    ['LinkedIn', cardReady(), 'og:title + og:image'],
    ['WhatsApp', cardReady(), 'og:title + og:image'],
    ['Slack', cardReady(false), 'unfurls title, adds og:image when present'],
    ['Discord', cardReady(false), 'embed, colour from theme-color'],
    ['iMessage', cardReady(), 'og:title + og:image']
  ];

  const groups = [...new Set(checks.map((c) => c.group))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-muted-foreground">
          <b className="text-foreground">{tally('pass')}</b> passed ·{' '}
          <b className="text-red-600 dark:text-red-400">{tally('fail')}</b>{' '}
          failed ·{' '}
          <b className="text-amber-700 dark:text-amber-400">{tally('warn')}</b>{' '}
          warnings · {tally('info')} notes
        </span>
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label="Link preview support"
        >
          {platforms.map(([name, r, why]) => (
            <li
              key={name}
              title={why}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
                r === 'rich' &&
                  'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                r === 'basic' &&
                  'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                r === 'none' &&
                  'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              )}
            >
              {name}
              <span className="opacity-70">
                {r === 'rich' ? 'card' : r === 'basic' ? 'text only' : 'none'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Hidden loader: measures the real og:image so size checks use pixels, not declarations. */}
      {ogSrc && img.state === 'loading' && (
        // oxlint-disable-next-line nextjs/no-img-element -- proxied third-party image, measured only
        <img
          src={ogSrc}
          alt=""
          hidden
          onLoad={(e) =>
            setImg({
              state: 'ok',
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight
            })
          }
          onError={() => setImg({ state: 'error' })}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Preview platform="Google">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <Favicon src={src(seo.favicon)} />
              <div className="min-w-0">
                <div className="text-[13px]">{p.siteName ?? p.host}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {seo.url}
                </div>
              </div>
            </div>
            <div className="line-clamp-1 text-[17px] text-[#1a0dab] dark:text-[#99c3ff]">
              {seo.title ?? seo.url}
            </div>
            <div className="line-clamp-2 text-[13px] text-muted-foreground">
              {seo.description ?? (
                <Missing>
                  No description: Google picks text from the page.
                </Missing>
              )}
            </div>
          </div>
        </Preview>

        <Preview platform="X">
          {!p.twitterCard ? (
            <Missing>No twitter:card: X shows a plain link.</Missing>
          ) : p.twitterCard === 'summary' ? (
            <div className="flex overflow-hidden rounded-xl border">
              <PreviewImage
                src={src(p.twitterImage)}
                className="aspect-square w-24 shrink-0"
              />
              <div className="min-w-0 space-y-0.5 p-2.5 text-[13px]">
                <div className="text-muted-foreground">{p.host}</div>
                <div className="line-clamp-1">{p.title}</div>
                <div className="line-clamp-2 text-muted-foreground">
                  {p.description}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-xl border">
                <PreviewImage
                  src={src(p.twitterImage)}
                  className="aspect-[1.91]"
                />
                <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {p.title}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                From {p.host}
              </div>
            </div>
          )}
        </Preview>

        <Preview platform="Facebook">
          <div className="overflow-hidden rounded border">
            <PreviewImage src={ogSrc} className="aspect-[1.91]" />
            <div className="space-y-0.5 bg-muted/50 px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">
                {p.host}
              </div>
              <div className="line-clamp-2 text-sm font-semibold">
                {p.title}
              </div>
              <div className="line-clamp-1 text-xs text-muted-foreground">
                {p.description}
              </div>
            </div>
          </div>
        </Preview>

        <Preview platform="LinkedIn">
          <div className="overflow-hidden rounded-lg border">
            <PreviewImage src={ogSrc} className="aspect-[1.91]" />
            <div className="space-y-0.5 px-3 py-2">
              <div className="line-clamp-2 text-sm font-semibold">
                {p.title}
              </div>
              <div className="text-xs text-muted-foreground">{p.host}</div>
            </div>
          </div>
        </Preview>

        <Preview platform="Slack">
          <div className="flex gap-2.5 text-[13px]">
            <div className="w-1 shrink-0 rounded bg-muted-foreground/30" />
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <Favicon src={src(seo.favicon)} small />
                {p.siteName ?? p.host}
              </div>
              <div className="font-semibold text-[#1264a3] dark:text-[#1d9bd1]">
                {p.title}
              </div>
              <div className="line-clamp-3 text-muted-foreground">
                {p.description}
              </div>
              {ogSrc && (
                <PreviewImage
                  src={ogSrc}
                  className="mt-1.5 aspect-[1.91] w-56 rounded"
                />
              )}
            </div>
          </div>
        </Preview>

        <Preview platform="WhatsApp">
          <div className="rounded-lg bg-[#d9fdd3] p-1 text-[13px] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]">
            <div className="overflow-hidden rounded-md bg-black/5 dark:bg-black/20">
              {ogSrc ? (
                <PreviewImage src={ogSrc} className="aspect-[1.91]" />
              ) : null}
              <div className="space-y-0.5 px-2.5 py-1.5">
                <div className="line-clamp-2 font-semibold">{p.title}</div>
                <div className="line-clamp-2 text-xs opacity-75">
                  {p.description}
                </div>
                <div className="text-xs opacity-60">{p.host}</div>
              </div>
            </div>
            <div className="px-1.5 py-1 text-[#027eb5] dark:text-[#53bdeb]">
              {seo.url}
            </div>
          </div>
        </Preview>

        <Preview platform="Discord">
          <div
            className="rounded border-l-4 bg-[#2b2d31] p-3 text-[13px] text-[#dbdee1]"
            style={{ borderLeftColor: seo.themeColor ?? '#1e1f22' }}
          >
            <div className="text-xs text-[#b5bac1]">{p.siteName ?? p.host}</div>
            <div className="font-semibold text-[#00a8fc]">{p.title}</div>
            <div className="line-clamp-3 text-[#dbdee1]/80">
              {p.description}
            </div>
            {ogSrc && (
              <PreviewImage
                src={ogSrc}
                className="mt-2 aspect-[1.91] rounded"
              />
            )}
          </div>
        </Preview>

        <Preview platform="iMessage">
          <div className="w-64 overflow-hidden rounded-2xl bg-muted">
            {ogSrc ? (
              <PreviewImage src={ogSrc} className="aspect-[1.91]" />
            ) : null}
            <div className="px-3 py-2 text-[13px]">
              <div className="line-clamp-2 font-semibold">{p.title}</div>
              <div className="text-muted-foreground">{p.host}</div>
            </div>
          </div>
        </Preview>
      </div>

      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g}>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
              {g}
            </h3>
            <ul className="divide-y text-sm">
              {checks
                .filter((c) => c.group === g)
                .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
                .map((c, i) => (
                  <li key={`${c.label}-${i}`} className="flex gap-2 py-1.5">
                    <StatusIcon status={c.status} />
                    <div className="min-w-0">
                      <div>{c.label}</div>
                      {c.detail && (
                        <div className="break-words text-xs text-muted-foreground">
                          {c.detail}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Preview({
  platform,
  children
}: {
  platform: string;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-xs font-medium text-muted-foreground">
        {platform}
      </figcaption>
      <div className="rounded-lg border bg-background p-3">{children}</div>
    </figure>
  );
}

function PreviewImage({
  src,
  className
}: {
  src: string | null;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'grid w-full place-items-center bg-muted text-xs text-muted-foreground',
          className
        )}
      >
        no image
      </div>
    );
  }
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- proxied third-party image
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn('w-full bg-muted object-cover', className)}
    />
  );
}

function Favicon({ src, small }: { src: string | null; small?: boolean }) {
  const size = small ? 'h-3.5 w-3.5' : 'h-6 w-6 rounded-full border p-0.5';
  return src ? (
    // oxlint-disable-next-line nextjs/no-img-element -- proxied third-party image
    <img src={src} alt="" className={cn(size, 'shrink-0 object-contain')} />
  ) : (
    <span className={cn(size, 'shrink-0 rounded-full bg-muted')} />
  );
}

function Missing({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs italic text-amber-700 dark:text-amber-400">
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  const cls = 'mt-0.5 h-4 w-4 shrink-0';
  if (status === 'pass')
    return <Check className={cn(cls, 'text-emerald-500')} aria-label="pass" />;
  if (status === 'fail')
    return (
      <CircleAlert className={cn(cls, 'text-red-500')} aria-label="fail" />
    );
  if (status === 'warn')
    return (
      <AlertTriangle
        className={cn(cls, 'text-amber-500')}
        aria-label="warning"
      />
    );
  return (
    <Info className={cn(cls, 'text-muted-foreground')} aria-label="note" />
  );
}
