'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  /** Returns the current orbit angle in radians. */
  getAngle: () => number;
  /** Returns the current playback time in seconds (for BPM pulse). */
  getTime: () => number;
  /** Detected tempo, drives the beat pulse. */
  bpm: number | null;
  className?: string;
}

/**
 * Circular 8D visualiser: radial frequency bars around a ring, an orbiting glow
 * that tracks the current pan position, and a pulsing centre representing the
 * listener. Renders on a canvas via requestAnimationFrame.
 */
export function AudioVisualizer({
  analyser,
  getAngle,
  getTime,
  bpm,
  className
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smoothRef = useRef<Float32Array | null>(null);
  const propsRef = useRef({ getAngle, getTime, bpm });
  useEffect(() => {
    propsRef.current = { getAngle, getTime, bpm };
  }, [getAngle, getTime, bpm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let freqData: Uint8Array<ArrayBuffer> | null = null;
    if (analyser) {
      freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const BARS = 96;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.26;

      ctx.clearRect(0, 0, w, h);

      // Read + smooth frequency data.
      let level = 0;
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        if (!smoothRef.current || smoothRef.current.length !== BARS) {
          smoothRef.current = new Float32Array(BARS);
        }
        const smooth = smoothRef.current;
        const step = Math.floor(freqData.length / BARS) || 1;
        let sum = 0;
        for (let i = 0; i < BARS; i++) {
          let v = 0;
          for (let j = 0; j < step; j++) v += freqData[i * step + j] || 0;
          v = v / step / 255;
          smooth[i] = smooth[i] * 0.72 + v * 0.28;
          sum += smooth[i];
        }
        level = sum / BARS;
      } else if (smoothRef.current) {
        for (let i = 0; i < smoothRef.current.length; i++)
          smoothRef.current[i] *= 0.9;
      }

      const accent = '56, 189, 248'; // sky-400
      const accent2 = '168, 85, 247'; // purple-500

      // Beat pulse from the detected tempo: a decaying envelope each beat plus an
      // expanding ring that fires on the downbeat.
      const { bpm, getTime } = propsRef.current;
      let beatEnv = 0;
      let beatPhase = 0;
      if (bpm && bpm > 0) {
        const beats = getTime() * (bpm / 60);
        beatPhase = beats - Math.floor(beats);
        beatEnv = Math.pow(1 - beatPhase, 2.2);
      }

      // Outer glow ring (breathes with audio level + beat).
      const glowR = baseRadius * (1.9 + level + beatEnv * 0.25);
      const ring = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.4,
        cx,
        cy,
        glowR
      );
      ring.addColorStop(
        0,
        `rgba(${accent}, ${0.12 + level * 0.25 + beatEnv * 0.15})`
      );
      ring.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Expanding beat ring.
      if (bpm && bpm > 0) {
        const pulseR = baseRadius * (1 + beatPhase * 1.15);
        ctx.strokeStyle = `rgba(${accent}, ${(1 - beatPhase) * 0.45})`;
        ctx.lineWidth = 2 + (1 - beatPhase) * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radial frequency bars.
      const smooth = smoothRef.current;
      if (smooth) {
        for (let i = 0; i < smooth.length; i++) {
          const angle = (i / smooth.length) * Math.PI * 2 - Math.PI / 2;
          const amp = smooth[i];
          const inner = baseRadius;
          const outer = baseRadius + amp * baseRadius * 1.5;
          const x1 = cx + Math.cos(angle) * inner;
          const y1 = cy + Math.sin(angle) * inner;
          const x2 = cx + Math.cos(angle) * outer;
          const y2 = cy + Math.sin(angle) * outer;
          const mix = i / smooth.length;
          ctx.strokeStyle = `rgba(${mix > 0.5 ? accent2 : accent}, ${0.35 + amp * 0.65})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Base ring.
      ctx.strokeStyle = `rgba(${accent}, 0.25)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Centre listener node (pulses with level + beat).
      const centerR = baseRadius * (0.14 + level * 0.08 + beatEnv * 0.05);
      const centerGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        centerR * 2.2
      );
      centerGrad.addColorStop(0, `rgba(${accent}, 0.9)`);
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, centerR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting sound source. Angle 0 = front (top); orbits in the horizontal plane.
      const a = propsRef.current.getAngle() - Math.PI / 2;
      const orbitR = baseRadius * 1.35;
      const ox = cx + Math.cos(a) * orbitR;
      const oy = cy + Math.sin(a) * orbitR;
      const orbGrad = ctx.createRadialGradient(
        ox,
        oy,
        0,
        ox,
        oy,
        22 + level * 20
      );
      orbGrad.addColorStop(0, `rgba(${accent2}, 0.95)`);
      orbGrad.addColorStop(0.4, `rgba(${accent2}, 0.5)`);
      orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, 22 + level * 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Faint trailing orbit path.
      ctx.strokeStyle = `rgba(${accent2}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [analyser]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
