'use client';

import {
  Diamond,
  Music,
  Pause,
  Play,
  Plus,
  Scissors,
  Square,
  Video,
  X
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  Timeline as MultitrackTimeline,
  type LaneContext,
  type TimelineTrack
} from '@/components/timeline/timeline';
import {
  getObjectLabel,
  type StudioApi,
  type StudioObject
} from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AnimationPreset } from '@/lib/studio/animation';
import { clipEnd, type AudioClip } from '@/lib/studio/audio-clips';
import type { VideoFormat } from '@/lib/studio/video';

const PRESETS: { id: AnimationPreset; label: string }[] = [
  { id: 'fade', label: 'Fade' },
  { id: 'slide-up', label: 'Slide up' },
  { id: 'slide-left', label: 'Slide in' },
  { id: 'pop', label: 'Pop' },
  { id: 'rise', label: 'Rise' }
];

const FORMAT_LABELS: Record<VideoFormat, string> = {
  mp4: 'MP4',
  webm: 'WebM'
};

type Lane =
  | { kind: 'object'; obj: StudioObject }
  | { kind: 'clip'; clip: AudioClip };

/** Track a horizontal drag, reporting the delta from where it started. */
function startDrag(e: React.PointerEvent, onMove: (dx: number) => void) {
  e.preventDefault();
  e.stopPropagation();
  const sx = e.clientX;
  const move = (ev: PointerEvent) => onMove(ev.clientX - sx);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function WaveCanvas({
  clip,
  pxPerSec,
  height
}: {
  clip: AudioClip;
  pxPerSec: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const width = Math.max(1, Math.round(clip.duration * pxPerSec));
    cv.width = width;
    cv.height = height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(217,70,239,0.55)';
    const startBucket = Math.floor(clip.offset * clip.peaksPerSecond);
    const endBucket = Math.floor(
      (clip.offset + clip.duration) * clip.peaksPerSecond
    );
    const buckets = Math.max(1, endBucket - startBucket);
    const mid = height / 2;
    for (let x = 0; x < width; x++) {
      const b = startBucket + Math.floor((x / width) * buckets);
      const peak = clip.peaks[b] ?? 0;
      const h = Math.max(1, peak * (height - 2));
      ctx.fillRect(x, mid - h / 2, 1, h);
    }
  }, [
    clip.offset,
    clip.duration,
    clip.peaks,
    clip.peaksPerSecond,
    pxPerSec,
    height
  ]);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

function AudioClipBlock({
  studio,
  clip,
  pxPerSec,
  height
}: {
  studio: StudioApi;
  clip: AudioClip;
  pxPerSec: number;
  height: number;
}) {
  return (
    <div
      className="absolute top-1 bottom-1 cursor-grab overflow-hidden rounded-md border border-fuchsia-500/60 bg-fuchsia-500/10 active:cursor-grabbing"
      style={{
        left: clip.start * pxPerSec,
        width: Math.max(10, clip.duration * pxPerSec)
      }}
      onPointerDown={(e) => {
        const start = clip.start;
        startDrag(e, (dx) =>
          studio.updateAudioClip(clip.id, { start: start + dx / pxPerSec })
        );
      }}
    >
      <WaveCanvas clip={clip} pxPerSec={pxPerSec} height={height - 8} />
      {/* Trim-in handle */}
      <div
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-fuchsia-500/70"
        onPointerDown={(e) => {
          const { start, offset, duration } = clip;
          const min = Math.max(-offset, -start);
          const max = duration - 0.1;
          startDrag(e, (dx) => {
            const dt = Math.min(Math.max(dx / pxPerSec, min), max);
            studio.updateAudioClip(clip.id, {
              start: start + dt,
              offset: offset + dt,
              duration: duration - dt
            });
          });
        }}
      />
      {/* Trim-out handle */}
      <div
        className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-fuchsia-500/70"
        onPointerDown={(e) => {
          const duration = clip.duration;
          startDrag(e, (dx) =>
            studio.updateAudioClip(clip.id, {
              duration: duration + dx / pxPerSec
            })
          );
        }}
      />
    </div>
  );
}

export function Timeline({ studio }: { studio: StudioApi }) {
  const single = studio.selected.length === 1 ? studio.selected[0] : null;
  const durationSec = Math.max(studio.duration, 3);
  const canPlay = studio.duration > 0;

  const objectRows = studio.layers.filter((o) => studio.getKeyframes(o));
  const clipUnderPlayhead = studio.audioClips.find(
    (c) => studio.playhead > c.start && studio.playhead < clipEnd(c)
  );

  const lanes: Lane[] = [
    ...objectRows.map((obj) => ({ kind: 'object' as const, obj })),
    ...studio.audioClips.map((clip) => ({ kind: 'clip' as const, clip }))
  ];

  const tracks: TimelineTrack[] = lanes.map((lane, i) =>
    lane.kind === 'object'
      ? {
          id: `obj-${i}`,
          header: (
            <div className="flex h-full items-center truncate px-2 text-xs text-muted-foreground">
              {getObjectLabel(lane.obj)}
            </div>
          )
        }
      : {
          id: `clip-${lane.clip.id}`,
          header: (
            <div className="flex h-full items-center gap-1 px-2 text-xs">
              <Music className="h-3 w-3 shrink-0 text-fuchsia-500" />
              <span className="truncate">{lane.clip.name}</span>
              <button
                type="button"
                aria-label="Remove clip"
                className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => studio.removeAudioClip(lane.clip.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        }
  );

  const renderLane = (ctx: LaneContext) => {
    const lane = lanes[ctx.index];
    if (!lane) return null;
    if (lane.kind === 'clip')
      return (
        <AudioClipBlock
          studio={studio}
          clip={lane.clip}
          pxPerSec={ctx.pxPerSec}
          height={ctx.laneHeight}
        />
      );
    return studio.getKeyframes(lane.obj)?.map((kf) => (
      <button
        key={kf.t}
        type="button"
        aria-label={`Seek to ${kf.t.toFixed(1)}s`}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: kf.t * ctx.pxPerSec }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => studio.seek(kf.t)}
      >
        <Diamond className="h-3 w-3 fill-sky-500 text-sky-500" />
      </button>
    ));
  };

  const transport = (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-8 w-8"
        disabled={!canPlay}
        aria-label={studio.playing ? 'Pause' : 'Play'}
        onClick={() => (studio.playing ? studio.pause() : studio.play())}
      >
        {studio.playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canPlay}
        aria-label="Stop and reset"
        onClick={studio.stopAnimation}
      >
        <Square className="h-4 w-4" />
      </Button>
      <span className="w-24 text-center text-xs tabular-nums text-muted-foreground">
        {studio.playhead.toFixed(1)}s / {studio.duration.toFixed(1)}s
      </span>
      <div className="mx-1 h-6 w-px bg-border" />
      <label className="inline-flex">
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) await studio.addAudioClip(file);
          }}
        />
        <span className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted">
          <Music className="mr-1.5 h-4 w-4" />
          Add music
        </span>
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        disabled={!clipUnderPlayhead}
        onClick={() =>
          clipUnderPlayhead &&
          studio.splitAudioClipAt(clipUnderPlayhead.id, studio.playhead)
        }
      >
        <Scissors className="mr-1.5 h-4 w-4" />
        Split
      </Button>
      {studio.videoFormats.length > 1 && (
        <Select
          value={studio.videoFormat}
          onValueChange={(v) => studio.setVideoFormat(v as VideoFormat)}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {studio.videoFormats.map((format) => (
              <SelectItem key={format} value={format} className="text-xs">
                {FORMAT_LABELS[format]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        type="button"
        size="sm"
        disabled={
          !canPlay ||
          studio.videoFormats.length === 0 ||
          studio.videoProgress !== null
        }
        onClick={() => void studio.exportVideo()}
      >
        <Video className="mr-1.5 h-4 w-4" />
        {studio.videoProgress !== null
          ? `Rendering ${Math.round(studio.videoProgress * 100)}%`
          : `Export ${studio.videoFormat.toUpperCase()}`}
      </Button>
    </>
  );

  return (
    <div className="border-t bg-background/80 p-2">
      {/* Per-object animation presets */}
      {single && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
          <span className="mr-1 max-w-[140px] truncate text-xs font-medium">
            {getObjectLabel(single)}
          </span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => studio.applyAnimationPreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={studio.addKeyframe}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Keyframe @ {studio.playhead.toFixed(1)}s
          </Button>
          {studio.getKeyframes(single) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => studio.clearKeyframes(single)}
            >
              Clear keyframes
            </Button>
          )}
        </div>
      )}

      <MultitrackTimeline
        durationSec={durationSec}
        time={studio.playhead}
        onSeek={studio.seek}
        follow={studio.playing}
        tracks={tracks}
        renderLane={renderLane}
        transport={transport}
      />
    </div>
  );
}
