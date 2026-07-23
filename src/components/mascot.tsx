'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { collectSignals, type Signal } from '@/lib/fingerprint';
import { MASCOTS, type MascotDef } from '@/lib/mascots';
import {
  buildCanonicalUrl,
  buildHref,
  isHost,
  isMainSite
} from '@/lib/host-routing';

const TOOL_PATH = 'browser-fingerprint';

/**
 * Resolve the fingerprint-tool link for whatever host the mascot is on:
 * relative on the tools site or the main portfolio, absolute canonical on
 * any other subdomain that does not serve /tools.
 */
function resolveToolHref(host: string): string {
  if (isHost('tools', host) || isMainSite(host)) {
    return buildHref('tools', TOOL_PATH, host);
  }
  return buildCanonicalUrl('tools', `/${TOOL_PATH}`);
}

type Mood =
  | 'sleeping'
  | 'waking'
  | 'talking'
  | 'idle'
  | 'bored'
  | 'drowsy'
  | 'dizzy'
  | 'party';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a'
];

const WAKE_MS = 900; // stretch + yawn before it starts talking
const TALK_MS = 4200; // dwell per spoken line
// Winding-down chain: gradual, natural slide toward sleep.
const WIND: { mood: Mood; dwell: number }[] = [
  { mood: 'idle', dwell: 5200 },
  { mood: 'bored', dwell: 5600 },
  { mood: 'drowsy', dwell: 4600 },
  { mood: 'dizzy', dwell: 2800 }
];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const now = () => performance.now();

/** Live, human "time on page" string from the mount timestamp. */
function timeOnPage(t0: number): string {
  const secs = Math.round((now() - t0) / 1000);
  return secs >= 90
    ? `about ${Math.round(secs / 60)} minutes`
    : `${secs} seconds`;
}

/* ── Face: eyes + mouth, shared across all four bodies. ──────────────── */
function Face({
  m,
  mood,
  blink,
  pupil
}: {
  m: MascotDef;
  mood: Mood;
  blink: boolean;
  pupil: { x: number; y: number };
}) {
  const { lx, ly, rx, ry, r, mouthY } = m.eyes;
  const state =
    mood === 'dizzy'
      ? 'spiral'
      : mood === 'drowsy' || mood === 'waking'
        ? 'half'
        : blink || mood === 'sleeping'
          ? 'shut'
          : 'open';

  const eye = (x: number, y: number) => {
    if (state === 'shut')
      return (
        <path
          d={`M${x - 8} ${y}q8 7 16 0`}
          className="stroke-white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      );
    if (state === 'spiral')
      return (
        <path
          d={`M${x} ${y}m-2 0a2 2 0 1 1 4 0a4 4 0 1 1 -8 0a6 6 0 1 1 12 0`}
          className="stroke-white"
          strokeWidth="2"
          fill="none"
        />
      );
    if (state === 'half')
      return (
        <>
          <ellipse
            cx={x}
            cy={y + 2}
            rx={r}
            ry={r * 0.5}
            className="fill-white"
          />
          <circle
            cx={x + pupil.x * 0.5}
            cy={y + 2}
            r={r * 0.45}
            className="fill-slate-900"
          />
        </>
      );
    return (
      <>
        <circle cx={x} cy={y} r={r} className="fill-white" />
        <circle
          cx={x + pupil.x}
          cy={y + pupil.y}
          r={r * 0.45}
          className="fill-slate-900"
        />
      </>
    );
  };

  // Mouth per mood.
  let mouth: React.ReactNode;
  if (mood === 'waking' || mood === 'drowsy')
    mouth = (
      <ellipse
        cx="75"
        cy={mouthY + 2}
        rx="6"
        ry="7"
        className="fill-slate-900/60"
      />
    );
  else if (mood === 'dizzy')
    mouth = (
      <path
        d={`M64 ${mouthY}q5 -6 11 0t11 0`}
        className="stroke-slate-900/60"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );
  else if (mood === 'sleeping' || mood === 'bored')
    mouth = (
      <path
        d={`M68 ${mouthY}h14`}
        className="stroke-slate-900/50"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    );
  else
    mouth = (
      <path
        d={`M64 ${mouthY}q11 12 22 0`}
        className="stroke-slate-900/70"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    );

  return (
    <>
      {eye(lx, ly)}
      {eye(rx, ry)}
      {mouth}
    </>
  );
}

export function Mascot() {
  const [m, setM] = useState<MascotDef | null>(null);
  const [mood, setMood] = useState<Mood>('sleeping');
  const [bubble, setBubble] = useState('');
  const [hint, setHint] = useState('');
  const [wiggle, setWiggle] = useState(false);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [toolHref, setToolHref] = useState(() =>
    buildCanonicalUrl('tools', `/${TOOL_PATH}`)
  );
  const [, forceTick] = useState(0); // ticks the live "time on page" value

  // Data + telemetry (refs, they don't drive rendering directly).
  const signals = useRef<Signal[]>([]);
  const told = useRef(0);
  const wakes = useRef(0);
  const pokes = useRef(0);
  const clicks = useRef(0);
  const away = useRef(0);
  const awayMs = useRef(0);
  const hiddenAt = useRef(0);
  const t0 = useRef(0);
  const queue = useRef<string[]>([]);
  const qi = useRef(0);
  const pokeStamps = useRef<number[]>([]); // recent pokes, for spam easter egg
  const btn = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    dx: number;
    dy: number;
    sx: number;
    sy: number;
    moved: boolean;
    id: number;
  } | null>(null);
  const justDragged = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pick a mascot after mount (random in render would break hydration).
  useEffect(() => {
    t0.current = now();
    setM(pick(MASCOTS));
    setToolHref(resolveToolHref(window.location.host));
    collectSignals().then((s) => {
      signals.current = s;
    });
  }, []);

  // Count every click on the page; eyes follow the cursor (rAF-throttled).
  useEffect(() => {
    const onClick = () => {
      clicks.current += 1;
    };
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = btn.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const a = Math.atan2(e.clientY - cy, e.clientX - cx);
        const d = Math.min(
          2.5,
          Math.hypot(e.clientX - cx, e.clientY - cy) / 60
        );
        setPupil({ x: Math.cos(a) * d, y: Math.sin(a) * d });
      });
    };
    document.addEventListener('click', onClick);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('mousemove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Blink while its eyes are open.
  useEffect(() => {
    if (mood === 'sleeping' || mood === 'dizzy' || mood === 'drowsy') return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3800);
    return () => clearInterval(id);
  }, [mood]);

  // Time it away, and react on return if it's awake.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hiddenAt.current = now();
        away.current += 1;
      } else if (hiddenAt.current) {
        awayMs.current += now() - hiddenAt.current;
        hiddenAt.current = 0;
        if (m && mood !== 'sleeping') {
          clearTimeout(timer.current);
          setMood('talking');
          setBubble(pick(m.voice.back));
          timer.current = setTimeout(startWind, TALK_MS);
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, mood]);

  // Subtle wake hint: a delayed wiggle + fading nudge while it sleeps.
  useEffect(() => {
    if (!m || mood !== 'sleeping') {
      setHint('');
      return;
    }
    let alive = true;
    const show = () => {
      if (!alive) return;
      // Sometimes it sleep-talks (a dream) instead of nudging you to wake it.
      const dreaming = Math.random() < 0.35;
      setHint(dreaming ? pick(m.voice.dream) : pick(m.voice.hint));
      if (!dreaming) {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 700);
      }
      setTimeout(() => alive && setHint(''), 3200);
    };
    const first = setTimeout(show, 5000);
    const iv = setInterval(show, 18000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [m, mood]);

  // While a "time on page" line is showing, re-render once a second so the
  // value stays live instead of freezing at whatever it was when spoken.
  useEffect(() => {
    if (!bubble.includes('{t}')) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [bubble]);

  const newsLines = useCallback(() => {
    const out: string[] = [];
    // {t} is substituted with a live, ticking value at render time.
    out.push("You've been here {t} now.");
    if (clicks.current > 3)
      out.push(
        `You've clicked around ${clicks.current} times, if you're counting. I am.`
      );
    if (away.current > 0)
      out.push(
        `You wandered off ${away.current} time${away.current === 1 ? '' : 's'}, ${Math.round(
          awayMs.current / 1000
        )}s away in total.`
      );
    if (pokes.current > 2)
      out.push(`That's ${pokes.current} pokes, by the way.`);
    return out;
  }, []);

  const startWind = useCallback(() => {
    if (!m) return;
    let i = 0;
    const step = () => {
      if (i >= WIND.length) {
        setMood('sleeping');
        setBubble(pick(m.voice.sleep));
        timer.current = setTimeout(() => setBubble(''), 2600);
        return;
      }
      const stage = WIND[i];
      setMood(stage.mood);
      const line =
        stage.mood === 'idle'
          ? pick([...newsLines(), ''])
          : stage.mood === 'bored'
            ? pick(m.voice.bored)
            : stage.mood === 'drowsy'
              ? pick(m.voice.drowsy)
              : pick(m.voice.dizzy);
      setBubble(line);
      i += 1;
      timer.current = setTimeout(step, stage.dwell);
    };
    step();
  }, [m, newsLines]);

  const advance = useCallback(() => {
    clearTimeout(timer.current);
    if (qi.current >= queue.current.length) {
      startWind();
      return;
    }
    const line = queue.current[qi.current];
    setBubble(line);
    // The tools-page link appears only once it actually reaches the teaser.
    if (m && line === m.voice.teaser) setShowCta(true);
    qi.current += 1;
    timer.current = setTimeout(advance, TALK_MS);
  }, [m, startWind]);

  // Easter egg: Konami code → party mode.
  const party = useCallback(() => {
    if (!m) return;
    clearTimeout(timer.current);
    setMood('party');
    setBubble(m.voice.secret);
    setShowCta(true);
    timer.current = setTimeout(startWind, 5200);
  }, [m, startWind]);

  useEffect(() => {
    let seq: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      seq = [...seq, e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => seq[i]?.toLowerCase() === k.toLowerCase()))
        party();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [party]);

  const wake = useCallback(() => {
    if (!m) return;
    // Ignore the click that ends a drag.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    clearTimeout(timer.current);
    pokes.current += 1;

    // Easter egg: rapid poking (5+ within 2.5s) makes it dizzy and grumpy.
    const t = now();
    pokeStamps.current = [...pokeStamps.current, t].filter((s) => t - s < 2500);
    if (pokeStamps.current.length >= 5) {
      pokeStamps.current = [];
      setMood('dizzy');
      setBubble(`${pick(m.voice.poke)} Okay okay, stop poking!`);
      timer.current = setTimeout(startWind, 2600);
      return;
    }

    // Already up (talking or winding down): perk back up.
    if (mood !== 'sleeping' && mood !== 'waking') {
      setMood('talking');
      if (qi.current < queue.current.length) advance();
      else {
        setBubble(pick(m.voice.poke));
        timer.current = setTimeout(startWind, TALK_MS);
      }
      return;
    }

    wakes.current += 1;

    const lines: string[] = [];
    if (wakes.current === 1) lines.push(pick(m.voice.greetFirst));
    else {
      lines.push(pick(m.voice.greetBack));
      const missed = away.current;
      if (missed > 0)
        lines.push(
          `You slipped away ${missed} time${missed === 1 ? '' : 's'} while I dozed.`
        );
    }

    const fresh = signals.current.slice(told.current);
    if (fresh.length) {
      lines.push(m.voice.intro);
      lines.push(...fresh.map((s) => s.chat));
      told.current = signals.current.length;
      lines.push(...newsLines().slice(0, 1));
      lines.push(m.voice.outro);
      lines.push(m.voice.teaser);
    } else if (wakes.current > 1) {
      lines.push(pick(m.voice.nothingNew));
      lines.push(...newsLines().slice(0, 2));
    } else {
      lines.push(m.voice.stillReading);
    }

    queue.current = lines;
    qi.current = 0;

    // Stretch and yawn first, then start talking, a natural wake-up.
    setMood('waking');
    setBubble('');
    timer.current = setTimeout(() => {
      setMood('talking');
      advance();
    }, WAKE_MS);
  }, [m, mood, advance, startWind, newsLines]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Dragging: grab it and move it anywhere, clamped to the viewport. A real
  // drag suppresses the tap-to-wake that would otherwise fire on release.
  const onPointerDown = (e: React.PointerEvent) => {
    const w = wrapRef.current;
    if (!w) return;
    const r = w.getBoundingClientRect();
    setSnapping(false); // no glide while actively dragging
    drag.current = {
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      id: e.pointerId
    };
    btn.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const w = wrapRef.current;
    if (!d || !w || d.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
    const x = Math.min(
      Math.max(4, e.clientX - d.dx),
      window.innerWidth - w.offsetWidth - 4
    );
    const y = Math.min(
      Math.max(4, e.clientY - d.dy),
      window.innerHeight - w.offsetHeight - 4
    );
    setPos({ x, y });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    btn.current?.releasePointerCapture?.(e.pointerId);
    drag.current = null;
    if (!d.moved) return;
    justDragged.current = true;
    // Snap to the nearest corner with a smooth glide.
    const w = wrapRef.current;
    if (!w) return;
    const rect = w.getBoundingClientRect();
    const margin = 16;
    const toLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
    const toTop = rect.top + rect.height / 2 < window.innerHeight / 2;
    setSnapping(true);
    setPos({
      x: toLeft ? margin : window.innerWidth - w.offsetWidth - margin,
      y: toTop ? margin : window.innerHeight - w.offsetHeight - margin
    });
  };

  if (!m) return null;

  const animClass =
    mood === 'party'
      ? 'animate-[party_0.7s_ease-in-out_infinite]'
      : mood === 'sleeping'
        ? 'animate-[breathe_3.6s_ease-in-out_infinite]'
        : mood === 'waking'
          ? 'animate-[stretch_0.9s_ease-out]'
          : mood === 'dizzy'
            ? 'animate-[wobble_0.6s_ease-in-out_infinite]'
            : mood === 'bored'
              ? 'animate-[sway_3.2s_ease-in-out_infinite]'
              : mood === 'drowsy'
                ? 'animate-[bob_4.2s_ease-in-out_infinite] opacity-90'
                : 'animate-[bob_3s_ease-in-out_infinite]';

  return (
    <div
      ref={wrapRef}
      className={cn(
        'fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 touch-none',
        snapping
          ? 'transition-[left,top] duration-300 ease-out motion-reduce:transition-none'
          : ''
      )}
      style={
        pos
          ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
          : undefined
      }
    >
      {(bubble || hint) && (
        <div
          className={cn(
            'w-52 animate-[pop_0.25s_ease] motion-reduce:animate-none',
            hint && !bubble ? 'opacity-70' : ''
          )}
        >
          <div className="relative rounded-2xl border bg-background/95 px-3.5 py-2 text-left text-[0.8rem] leading-snug shadow-lg backdrop-blur">
            {(bubble || hint).replace('{t}', timeOnPage(t0.current))}
            {showCta && bubble === m.voice.teaser && (
              <a
                href={toolHref}
                className="mt-1.5 block font-medium text-violet-500 underline-offset-2 hover:underline"
              >
                → See the full read
              </a>
            )}
            <span className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r bg-background/95" />
          </div>
        </div>
      )}

      {/* Persistent tools-page link once it has finished its spiel. */}
      {showCta && !bubble && !hint && (
        <a
          href={toolHref}
          className="rounded-full border bg-background/95 px-3 py-1 text-[0.7rem] font-medium text-violet-500 shadow-sm backdrop-blur hover:underline"
        >
          → See the full read
        </a>
      )}

      <button
        ref={btn}
        type="button"
        onClick={wake}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={mood === 'sleeping' ? `Wake ${m.name}` : `Poke ${m.name}`}
        title={
          mood === 'sleeping'
            ? `${m.name} is napping, tap to wake (drag to move)`
            : `${m.name} (drag to move)`
        }
        className={cn(
          'group relative block cursor-grab touch-none select-none rounded-full outline-none active:cursor-grabbing',
          'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          m.ring,
          wiggle ? 'animate-[wiggle_0.6s_ease-in-out]' : ''
        )}
      >
        <svg
          width="72"
          height="72"
          viewBox="0 0 150 150"
          className={cn(
            'origin-bottom drop-shadow-lg',
            animClass,
            'motion-reduce:animate-none'
          )}
        >
          {m.body}
          <Face m={m} mood={mood} blink={blink} pupil={pupil} />
          {m.front}
        </svg>

        {mood === 'sleeping' && (
          <span className="pointer-events-none absolute -right-1 top-0 text-base font-semibold text-muted-foreground/70 animate-[bob_3.6s_ease-in-out_infinite] motion-reduce:animate-none">
            z<span className="text-sm">z</span>
            <span className="text-xs">z</span>
          </span>
        )}
      </button>

      <style jsx global>{`
        @keyframes bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes breathe {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-2px) scale(1.03);
          }
        }
        @keyframes sway {
          0%,
          100% {
            transform: rotate(-4deg);
          }
          50% {
            transform: rotate(4deg);
          }
        }
        @keyframes wobble {
          0%,
          100% {
            transform: rotate(-8deg);
          }
          50% {
            transform: rotate(8deg);
          }
        }
        @keyframes stretch {
          0% {
            transform: scaleY(0.9) scaleX(1.05);
          }
          40% {
            transform: scaleY(1.12) scaleX(0.94);
          }
          70% {
            transform: scaleY(0.97) scaleX(1.02);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0);
          }
          25% {
            transform: rotate(-9deg);
          }
          75% {
            transform: rotate(9deg);
          }
        }
        @keyframes pop {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes party {
          0% {
            transform: rotate(0) scale(1.1);
            filter: hue-rotate(0deg) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
          }
          50% {
            transform: rotate(180deg) scale(1.2);
            filter: hue-rotate(180deg) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
          }
          100% {
            transform: rotate(360deg) scale(1.1);
            filter: hue-rotate(360deg) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
          }
        }
      `}</style>
    </div>
  );
}
