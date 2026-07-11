'use client';

// Synced multitrack preview for separated stems. Playback engine only — all the
// timeline UI (ruler, headers, zoom, scroll, scrub, playhead) lives in the generic
// <Timeline>. Here we own Web Audio: BufferSourceNodes started on one clock stay in
// sync, per-stem GainNodes drive mute/solo, and we draw each stem's waveform into a
// lane via Timeline's renderLane render prop.
import { Download, Pause, Play } from 'lucide-react';
import {
  Timeline,
  TimelineTrack,
  formatTC
} from '@/components/timeline/timeline';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export type PlayerStem = { name: string; buffer: AudioBuffer; url: string };

const PEAKS = 800;

const STEM_FILL: Record<string, string> = {
  vocals: 'fill-violet-500',
  drums: 'fill-sky-500',
  bass: 'fill-emerald-500',
  other: 'fill-amber-500'
};

/** Downsample a buffer to PEAKS normalized amplitudes (0..1) for drawing. */
function computePeaks(buffer: AudioBuffer): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.floor(data.length / PEAKS) || 1;
  const peaks: number[] = [];
  let max = 0.0001;
  for (let i = 0; i < PEAKS; i++) {
    let peak = 0;
    const start = i * block;
    for (let j = 0; j < block && start + j < data.length; j++) {
      const v = Math.abs(data[start + j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  return peaks.map((p) => p / max);
}

function Waveform({ peaks, fill }: { peaks: number[]; fill: string }) {
  return (
    <svg
      viewBox={`0 0 ${PEAKS} 44`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      {peaks.map((p, i) => {
        const h = Math.max(1, p * 38);
        return (
          <rect
            key={i}
            x={i}
            y={(44 - h) / 2}
            width={0.7}
            height={h}
            className={fill}
          />
        );
      })}
    </svg>
  );
}

export function StemPlayer({
  stems,
  filenameBase
}: {
  stems: PlayerStem[];
  filenameBase: string;
}) {
  const duration = stems[0]?.buffer.duration ?? 0;
  const peaks = useMemo(
    () => stems.map((s) => computePeaks(s.buffer)),
    [stems]
  );

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [solo, setSolo] = useState<Set<string>>(new Set());

  const ctxRef = useRef<AudioContext | null>(null);
  const gainsRef = useRef<Record<string, GainNode>>({});
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startCtxTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  const audible = useCallback(
    (name: string) => {
      if (muted.has(name)) return false;
      if (solo.size > 0) return solo.has(name);
      return true;
    },
    [muted, solo]
  );

  const applyGains = useCallback(() => {
    for (const s of stems) {
      const g = gainsRef.current[s.name];
      if (g) g.gain.value = audible(s.name) ? 1 : 0;
    }
  }, [stems, audible]);

  useEffect(applyGains, [applyGains]);

  const stopSources = useCallback(() => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    sourcesRef.current = [];
    cancelAnimationFrame(rafRef.current);
  }, []);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const t =
        startOffsetRef.current + (ctx.currentTime - startCtxTimeRef.current);
      if (t >= duration) {
        stopSources();
        setPlaying(false);
        setTime(0);
        return;
      }
      setTime(t);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  });

  const startAt = useCallback(
    (offset: number) => {
      let ctx = ctxRef.current;
      if (!ctx) {
        ctx = new AudioContext();
        ctxRef.current = ctx;
      }
      void ctx.resume();
      const when = ctx.currentTime + 0.02;
      startCtxTimeRef.current = when;
      startOffsetRef.current = offset;
      sourcesRef.current = stems.map((s) => {
        const src = ctx.createBufferSource();
        src.buffer = s.buffer;
        let g = gainsRef.current[s.name];
        if (!g) {
          g = ctx.createGain();
          g.connect(ctx.destination);
          gainsRef.current[s.name] = g;
        }
        src.connect(g);
        src.start(when, offset);
        return src;
      });
      applyGains();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    },
    [stems, applyGains]
  );

  const togglePlay = useCallback(() => {
    if (playing) {
      stopSources();
      startOffsetRef.current = time;
      setPlaying(false);
    } else {
      startAt(time >= duration ? 0 : time);
    }
  }, [playing, time, duration, startAt, stopSources]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(duration, t));
      setTime(clamped);
      if (playing) {
        stopSources();
        startAt(clamped);
      } else {
        startOffsetRef.current = clamped;
      }
    },
    [playing, duration, startAt, stopSources]
  );

  const toggleSet = (set: Set<string>, name: string) => {
    const next = new Set(set);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  };

  useEffect(() => {
    return () => {
      stopSources();
      void ctxRef.current?.close();
      ctxRef.current = null;
      gainsRef.current = {};
    };
  }, [stems, stopSources]);

  const tracks: TimelineTrack[] = stems.map((s) => {
    const isMuted = muted.has(s.name);
    const isSolo = solo.has(s.name);
    return {
      id: s.name,
      header: (
        <div className="flex h-full items-center gap-1 px-2">
          <button
            onClick={() => setMuted((m) => toggleSet(m, s.name))}
            aria-label={`Mute ${s.name}`}
            aria-pressed={isMuted}
            title="Mute"
            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
              isMuted
                ? 'bg-red-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            M
          </button>
          <button
            onClick={() => setSolo((m) => toggleSet(m, s.name))}
            aria-label={`Solo ${s.name}`}
            aria-pressed={isSolo}
            title="Solo"
            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
              isSolo
                ? 'bg-violet-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            S
          </button>
          <span className="ml-0.5 truncate text-xs font-medium capitalize">
            {s.name}
          </span>
        </div>
      )
    };
  });

  const transport = (
    <>
      <Button
        size="icon"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="font-mono text-sm tabular-nums">{formatTC(time)}</span>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        / {formatTC(duration)}
      </span>
    </>
  );

  return (
    <div>
      <Timeline
        durationSec={duration}
        time={time}
        onSeek={seek}
        tracks={tracks}
        follow={playing}
        transport={transport}
        renderLane={({ index, track }) => (
          <div
            className={`h-full w-full ${audible(track.id) ? '' : 'opacity-40'}`}
          >
            <Waveform
              peaks={peaks[index]}
              fill={STEM_FILL[track.id] ?? 'fill-violet-500'}
            />
          </div>
        )}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {stems.map((s) => (
          <a key={s.name} href={s.url} download={`${s.name}.wav`}>
            <Button size="sm" variant="outline">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span className="capitalize">{s.name}</span>
            </Button>
          </a>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {filenameBase} · drag to scrub · pinch or ⌘/Ctrl-scroll to zoom ·{' '}
        <span className="font-bold">S</span> solo ·{' '}
        <span className="font-bold">M</span> mute
      </p>
    </div>
  );
}
