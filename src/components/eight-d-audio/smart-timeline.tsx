'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  AnalysisResult,
  AutomatableParam,
  BAND_COLORS,
  Keyframe,
  ParamMeta,
  PARAM_META,
  PARAM_ORDER,
  sampleAutomation
} from '@/lib/eight-d-audio';

interface SmartTimelineProps {
  keyframes: Keyframe[];
  duration: number;
  analysis: AnalysisResult | null;
  currentTime: number;
  activeParam: AutomatableParam;
  selectedId: string | null;
  onSeek: (time: number) => void;
  onSelect: (id: string | null) => void;
  /** Drag updates both the keyframe time (x) and the active param value (y). */
  onMoveKeyframe: (id: string, time: number, value: number) => void;
  onAddKeyframe: (time: number) => void;
}

const HEIGHT = 200;
const PAD_Y = 22;
const HIT_RADIUS = 12;

/**
 * Multi-lane automation timeline. Every parameter is drawn as its own coloured
 * line over the waveform + energy sections; the active lane is solid with
 * draggable keyframe dots (drag horizontally to move in time, vertically to
 * change its value), the rest are dotted references. Click to seek,
 * double-click to add a point.
 */
export function SmartTimeline({
  keyframes,
  duration,
  analysis,
  currentTime,
  activeParam,
  selectedId,
  onSeek,
  onSelect,
  onMoveKeyframe,
  onAddKeyframe
}: SmartTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: HEIGHT });
  const draggingRef = useRef<string | null>(null);

  const stateRef = useRef({
    keyframes,
    duration,
    analysis,
    currentTime,
    activeParam,
    selectedId
  });
  useEffect(() => {
    stateRef.current = {
      keyframes,
      duration,
      analysis,
      currentTime,
      activeParam,
      selectedId
    };
  }, [keyframes, duration, analysis, currentTime, activeParam, selectedId]);

  const timeToX = useCallback((time: number, w: number) => {
    const d = stateRef.current.duration || 1;
    return (time / d) * w;
  }, []);
  const xToTime = useCallback((x: number, w: number) => {
    const d = stateRef.current.duration || 1;
    return Math.max(0, Math.min(d, (x / w) * d));
  }, []);
  const valueToY = useCallback((value: number, meta: ParamMeta, h: number) => {
    const n = (value - meta.min) / (meta.max - meta.min);
    return PAD_Y + (1 - n) * (h - PAD_Y * 2);
  }, []);
  const yToValue = useCallback((y: number, meta: ParamMeta, h: number) => {
    const n = 1 - (y - PAD_Y) / (h - PAD_Y * 2);
    return Math.max(
      meta.min,
      Math.min(meta.max, meta.min + n * (meta.max - meta.min))
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: HEIGHT };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(HEIGHT * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawLane = (
      w: number,
      h: number,
      sorted: Keyframe[],
      meta: ParamMeta,
      active: boolean,
      selId: string | null
    ) => {
      const samples = Math.max(2, Math.floor(w / 4));
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const time = (i / samples) * (stateRef.current.duration || 1);
        const val = sampleAutomation(sorted, time)[meta.key];
        const x = timeToX(time, w);
        const y = valueToY(val, meta, h);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (active) {
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(${meta.color},0.95)`;
        ctx.lineWidth = 2.25;
      } else {
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = `rgba(${meta.color},0.4)`;
        ctx.lineWidth = 1.25;
      }
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);

      if (active) {
        for (const kf of sorted) {
          const x = timeToX(kf.time, w);
          const y = valueToY(kf[meta.key], meta, h);
          const isSel = kf.id === selId;
          ctx.beginPath();
          ctx.arc(x, y, isSel ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isSel ? '#fff' : `rgba(${meta.color},1)`;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(${meta.color},1)`;
          ctx.stroke();
        }
      }
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      const s = stateRef.current;
      ctx.clearRect(0, 0, w, h);

      // Energy sections.
      if (s.analysis) {
        for (const sec of s.analysis.sections) {
          const x1 = timeToX(sec.start, w);
          const x2 = timeToX(sec.end, w);
          ctx.fillStyle = `rgba(${BAND_COLORS[sec.band]}, 0.07)`;
          ctx.fillRect(x1, 0, x2 - x1, h);
        }
      }

      // Waveform mirror.
      if (s.analysis) {
        const peaks = s.analysis.peaks;
        const mid = h / 2;
        ctx.fillStyle = 'rgba(148,163,184,0.22)';
        const step = w / peaks.length;
        for (let i = 0; i < peaks.length; i++) {
          const amp = peaks[i] * (h / 2 - PAD_Y);
          ctx.fillRect(i * step, mid - amp, Math.max(0.5, step), amp * 2);
        }
      }

      // Onset ticks.
      if (s.analysis) {
        ctx.strokeStyle = 'rgba(168,85,247,0.35)';
        ctx.lineWidth = 1;
        for (const onset of s.analysis.onsets) {
          const x = timeToX(onset, w);
          ctx.beginPath();
          ctx.moveTo(x, h - 6);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
      }

      const sorted = [...s.keyframes].sort((a, b) => a.time - b.time);
      if (sorted.length > 0) {
        // Inactive lanes first (dotted references), then the active lane on top.
        for (const p of PARAM_ORDER) {
          if (p === s.activeParam) continue;
          drawLane(w, h, sorted, PARAM_META[p], false, s.selectedId);
        }
        drawLane(w, h, sorted, PARAM_META[s.activeParam], true, s.selectedId);
      }

      // Playhead.
      const px = timeToX(s.currentTime, w);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [timeToX, valueToY]);

  const hitTest = useCallback(
    (x: number, y: number): string | null => {
      const { w, h } = sizeRef.current;
      const meta = PARAM_META[stateRef.current.activeParam];
      for (const kf of stateRef.current.keyframes) {
        const kx = timeToX(kf.time, w);
        const ky = valueToY(kf[meta.key], meta, h);
        if (Math.hypot(kx - x, ky - y) <= HIT_RADIUS) return kf.id;
      }
      return null;
    },
    [timeToX, valueToY]
  );

  const localCoords = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = localCoords(e);
      const hit = hitTest(x, y);
      if (hit) {
        draggingRef.current = hit;
        onSelect(hit);
        canvasRef.current?.setPointerCapture(e.pointerId);
      } else {
        onSelect(null);
        onSeek(xToTime(x, sizeRef.current.w));
      }
    },
    [hitTest, onSelect, onSeek, xToTime]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const { x, y } = localCoords(e);
      const meta = PARAM_META[stateRef.current.activeParam];
      onMoveKeyframe(
        draggingRef.current,
        xToTime(x, sizeRef.current.w),
        yToValue(y, meta, sizeRef.current.h)
      );
    },
    [onMoveKeyframe, xToTime, yToValue]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) {
      canvasRef.current?.releasePointerCapture(e.pointerId);
      draggingRef.current = null;
    }
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      onAddKeyframe(xToTime(e.clientX - rect.left, sizeRef.current.w));
    },
    [onAddKeyframe, xToTime]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{ height: HEIGHT }}
      className="block w-full max-w-full cursor-pointer touch-none rounded-xl border bg-muted/20"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}
