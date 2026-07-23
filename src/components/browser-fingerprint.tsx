'use client';

import { useEffect, useMemo, useState } from 'react';
import { collectSignals, type Signal } from '@/lib/fingerprint';

/** Deterministic short hash of the collected values, computed in-browser. */
function fingerprintHash(signals: Signal[]): string {
  const seed = signals.map((s) => `${s.label}:${s.datum}`).join('|');
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

/** One probed component on the board. */
function Component({
  s,
  live,
  probing,
  side
}: {
  s: Signal;
  live: boolean;
  probing: boolean;
  side: 'left' | 'right';
}) {
  const Icon = s.icon;
  const stub = (
    <div className="relative hidden h-px w-6 shrink-0 lg:block xl:w-10">
      <div
        className={`absolute inset-0 transition-colors duration-300 ${live || probing ? 'bg-violet-500' : 'bg-border'}`}
      />
      {/* solder pad, at the card end of the stub */}
      <div
        className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-colors duration-300 ${
          side === 'left' ? 'left-0' : 'right-0'
        } ${live || probing ? 'bg-violet-500 shadow-[0_0_8px_rgb(139_92_246)]' : 'bg-border'}`}
      />
      {/* traveling probe pulse while this one is being read */}
      {probing && (
        <div
          className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-violet-300 motion-reduce:hidden ${
            side === 'left'
              ? 'animate-[probeL_0.9s_ease-in-out_infinite]'
              : 'animate-[probeR_0.9s_ease-in-out_infinite]'
          }`}
        />
      )}
    </div>
  );

  return (
    <div className="flex items-center">
      {side === 'right' && stub}
      <div
        className={`flex-1 rounded-xl border bg-card p-4 transition-all duration-500 ${
          live ? 'animate-[riseIn_0.45s_ease] opacity-100' : 'opacity-45'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>{s.label}</span>
              <span
                className={`rounded px-1 py-px text-[9px] ${
                  live
                    ? 'bg-violet-500/10 text-violet-500'
                    : probing
                      ? 'animate-pulse bg-muted text-muted-foreground'
                      : 'text-transparent'
                }`}
              >
                {live ? 'OK' : 'PROBING'}
              </span>
            </div>
            {live ? (
              <div className="mt-1 break-words text-sm font-semibold">
                {s.datum}
              </div>
            ) : (
              <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            )}
            {live && (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {s.note}
              </p>
            )}
          </div>
        </div>
      </div>
      {side === 'left' && stub}
    </div>
  );
}

export function BrowserFingerprint() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    collectSignals().then((s) => {
      if (cancelled) return;
      setSignals(s);
      let i = 0;
      const step = () => {
        i += 1;
        setShown(i);
        if (i < s.length) timer = setTimeout(step, 420);
      };
      timer = setTimeout(step, 500);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const total = signals.length;
  const done = total > 0 && shown >= total;
  const pct = total ? Math.round((shown / total) * 100) : 0;
  const hash = useMemo(
    () => (done ? fingerprintHash(signals) : ''),
    [done, signals]
  );

  const half = Math.ceil(total / 2);
  const left = signals.slice(0, half);
  const right = signals.slice(half);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 text-center font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {done
          ? `Scan complete, ${total} of ${total} components responded`
          : `Probing components, ${shown} of ${total || '…'}`}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_12rem_1fr] lg:gap-0">
        {/* Left rail */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          {left.map((s, i) => (
            <Component
              key={s.label}
              s={s}
              side="left"
              live={i < shown}
              probing={i === shown}
            />
          ))}
        </div>

        {/* Center chip */}
        <div className="order-1 flex justify-center lg:order-2 lg:sticky lg:top-24">
          <div className="flex flex-col items-center">
            <div
              className={`relative h-32 w-32 ${done ? 'animate-[chipPulse_0.6s_ease]' : ''}`}
            >
              {/* pins sticking out from under the chip */}
              {[0, 1, 2, 3].map((n) => (
                <span key={n}>
                  <span
                    className={`absolute -left-2 h-0.5 w-2 transition-colors duration-300 ${done ? 'bg-violet-500' : 'bg-border'}`}
                    style={{ top: `${20 + n * 20}%` }}
                  />
                  <span
                    className={`absolute -right-2 h-0.5 w-2 transition-colors duration-300 ${done ? 'bg-violet-500' : 'bg-border'}`}
                    style={{ top: `${20 + n * 20}%` }}
                  />
                </span>
              ))}

              {/* charging border: a conic sweep that fills the chip's own frame */}
              <div
                className="absolute inset-0 rounded-2xl transition-[background] duration-300"
                style={{
                  background: `conic-gradient(from -90deg, rgb(139 92 246) ${pct * 3.6}deg, color-mix(in oklab, rgb(139 92 246) 16%, transparent) 0deg)`
                }}
              />

              {/* chip face */}
              <div className="absolute inset-[3px] grid place-items-center rounded-[13px] bg-card font-mono shadow-sm">
                {done ? (
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      fingerprint
                    </div>
                    <div className="mt-1 text-sm font-bold text-violet-500">
                      {hash}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      {pct}%
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      you
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 max-w-[9rem] text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
              session chip, volatile, forgets on close
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="order-3 flex flex-col gap-4">
          {right.map((s, i) => (
            <Component
              key={s.label}
              s={s}
              side="right"
              live={half + i < shown}
              probing={half + i === shown}
            />
          ))}
        </div>
      </div>

      {done && (
        <>
          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
            Every reading above was taken on this device and uploaded nowhere.
            The point is not this bench. It is that any site you open can probe
            the same components silently and assemble the same profile.
          </p>
          <p className="mx-auto mt-4 text-center text-xs text-muted-foreground/80">
            Inspired by the original idea from{' '}
            <a
              href="https://sinceyouarrived.world/?utm_source=tools.dipak.io&utm_medium=referral&utm_campaign=browser-fingerprint"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-500 underline-offset-2 hover:underline"
            >
              Since You Arrived
            </a>
            .
          </p>
        </>
      )}

      <style jsx global>{`
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes chipPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
        @keyframes probeL {
          from {
            right: 100%;
          }
          to {
            right: 0%;
          }
        }
        @keyframes probeR {
          from {
            left: 100%;
          }
          to {
            left: 0%;
          }
        }
      `}</style>
    </div>
  );
}
