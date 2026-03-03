'use client';

import { useMemo, useRef, useEffect } from 'react';
import { type EntropyResult } from '@/lib/password-generator/entropy';

// ─── Level Mapping ───────────────────────────────────────────────────────────

export function getLevel(crackTime: string): number {
  if (/Instant|Less than/i.test(crackTime)) return 0;
  if (/second/i.test(crackTime)) return 1;
  if (/minute/i.test(crackTime)) return 2;
  if (/hour/i.test(crackTime)) return 3;
  if (/day/i.test(crackTime)) return 4;
  if (/\d+[kM]\s*years|Centuries/i.test(crackTime)) return 6;
  if (/years/i.test(crackTime)) return 5;
  return 0;
}

// ─── Noise for organic motion ────────────────────────────────────────────────

function pseudoNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 53.3) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothNoise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return pseudoNoise(i, 0, seed) * (1 - u) + pseudoNoise(i + 1, 0, seed) * u;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ParticleType = 'mote' | 'petal' | 'butterfly' | 'wisp' | 'firefly' | 'raindrop' | 'cloud' | 'leaf' | 'snowflake' | 'star';

interface SpawnConfig {
  type: ParticleType;
  rate: number;
  max: number;
  settles: boolean;
}

interface SceneTheme {
  bgGradient: string;
  bgGradientDark: string;
  glowColor: string;
  glowColorDark: string;
  gravity: number;
  windBase: number;
  windGust: number;
  turbulence: number;
  spawns: SpawnConfig[];
}

// ─── Scene Themes ────────────────────────────────────────────────────────────

const GROUND_Y = 0.96; // ground level as ratio of canvas height

const themes: Record<number, SceneTheme> = {
  0: { // Spring meadow - petals + butterflies
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(129,212,250,0.12) 0%, rgba(200,230,201,0.08) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(79,195,247,0.15) 0%, rgba(165,214,167,0.06) 40%, transparent 70%)',
    glowColor: 'rgba(244,143,177,0.15)',
    glowColorDark: 'rgba(244,143,177,0.08)',
    gravity: 15,
    windBase: 5,
    windGust: 10,
    turbulence: 0.5,
    spawns: [
      { type: 'petal', rate: 4, max: 45, settles: true },
      { type: 'butterfly', rate: 0.2, max: 3, settles: false },
    ],
  },
  1: { // Sunset - warm wisps
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(255,138,101,0.15) 0%, rgba(255,204,128,0.08) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(230,81,0,0.18) 0%, rgba(255,143,0,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(255,112,67,0.15)',
    glowColorDark: 'rgba(255,112,67,0.1)',
    gravity: -3,
    windBase: 10,
    windGust: 18,
    turbulence: 0.6,
    spawns: [
      { type: 'wisp', rate: 2, max: 25, settles: false },
    ],
  },
  2: { // Night - wandering fireflies
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(13,27,42,0.12) 0%, rgba(27,40,56,0.08) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(13,27,42,0.3) 0%, rgba(27,40,56,0.15) 40%, transparent 70%)',
    glowColor: 'rgba(255,255,141,0.1)',
    glowColorDark: 'rgba(255,255,141,0.06)',
    gravity: 0,
    windBase: 0,
    windGust: 0,
    turbulence: 1.5,
    spawns: [
      { type: 'firefly', rate: 1.5, max: 30, settles: false },
    ],
  },
  3: { // Storm - rain + clouds
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(120,144,156,0.12) 0%, rgba(176,190,197,0.06) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(84,110,122,0.2) 0%, rgba(120,144,156,0.1) 40%, transparent 70%)',
    glowColor: 'rgba(144,202,249,0.12)',
    glowColorDark: 'rgba(144,202,249,0.07)',
    gravity: 420,
    windBase: -30,
    windGust: 40,
    turbulence: 0.2,
    spawns: [
      { type: 'raindrop', rate: 35, max: 200, settles: false },
      { type: 'cloud', rate: 0.15, max: 4, settles: false },
    ],
  },
  4: { // Autumn - tumbling leaves
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(230,81,0,0.1) 0%, rgba(255,143,0,0.05) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(191,54,12,0.16) 0%, rgba(230,81,0,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(255,109,0,0.1)',
    glowColorDark: 'rgba(255,109,0,0.06)',
    gravity: 80,
    windBase: 20,
    windGust: 45,
    turbulence: 0.8,
    spawns: [
      { type: 'leaf', rate: 3.5, max: 35, settles: true },
    ],
  },
  5: { // Winter - drifting snow
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(236,239,241,0.15) 0%, rgba(207,216,220,0.08) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(176,190,197,0.15) 0%, rgba(144,164,174,0.08) 40%, transparent 70%)',
    glowColor: 'rgba(255,255,255,0.12)',
    glowColorDark: 'rgba(176,190,197,0.08)',
    gravity: 18,
    windBase: 8,
    windGust: 30,
    turbulence: 1.0,
    spawns: [
      { type: 'snowflake', rate: 8, max: 80, settles: true },
    ],
  },
  6: { // Cosmic - twinkling stars
    bgGradient: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(26,0,48,0.15) 0%, rgba(206,147,216,0.08) 40%, transparent 70%)',
    bgGradientDark: 'radial-gradient(ellipse 130% 80% at 50% 0%, rgba(10,0,21,0.35) 0%, rgba(206,147,216,0.12) 40%, transparent 70%)',
    glowColor: 'rgba(206,147,216,0.15)',
    glowColorDark: 'rgba(206,147,216,0.1)',
    gravity: 0,
    windBase: 0,
    windGust: 0,
    turbulence: 0.3,
    spawns: [
      { type: 'star', rate: 4, max: 60, settles: false },
    ],
  },
};

// ─── Particle Colors ─────────────────────────────────────────────────────────

const COLORS: Record<string, string[]> = {
  petal:      ['#FFB7C5', '#FFC1CC', '#FF9EAF', '#FFD1DC', '#FADADD', '#F8BBD0'],
  butterfly:  ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F38181', '#6C5CE7'],
  wisp:       ['#FFCC80', '#FFE0B2', '#FF8A65', '#FFAB91'],
  firefly:    ['#FFFF8D', '#FFF9C4', '#FFF176'],
  raindrop:   ['#90CAF9', '#BBDEFB', '#E3F2FD'],
  cloud:      ['#B0BEC5', '#90A4AE', '#CFD8DC'],
  leaf:       ['#FF6D00', '#FF8F00', '#D84315', '#FDD835', '#E65100', '#BF360C'],
  snowflake:  ['#FFFFFF', '#ECEFF1', '#F5F5F5', '#E0E0E0'],
  star:       ['#CE93D8', '#E1BEE7', '#64B5F6', '#F3E5F5', '#B39DDB'],
};

// ─── Particle ────────────────────────────────────────────────────────────────

interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  seed: number;
  rotation: number;
  rotSpeed: number;
  phase: number;
  glowFreq: number;
  // Rain splash
  splashing: boolean;
  splashTime: number;
  splashX: number;
  splashY: number;
  // Ground settling
  settled: boolean;
  settledTime: number;
  // Butterfly wings
  wingPhase: number;
}

function createParticle(type: ParticleType, w: number, h: number, colors: string[]): Particle {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const seed = Math.random() * 1000;
  const groundY = h * GROUND_Y;

  const base: Particle = {
    type,
    x: Math.random() * w,
    y: -10,
    vx: 0, vy: 0,
    size: 2 + Math.random() * 3,
    life: 0,
    maxLife: 6 + Math.random() * 8,
    color, seed,
    rotation: 0, rotSpeed: 0,
    phase: Math.random() * Math.PI * 2,
    glowFreq: 0.5 + Math.random() * 1.5,
    splashing: false, splashTime: 0, splashX: 0, splashY: 0,
    settled: false, settledTime: 0,
    wingPhase: Math.random() * Math.PI * 2,
  };

  switch (type) {
    case 'petal':
      base.size = 2 + Math.random() * 3.5;
      base.maxLife = 12 + Math.random() * 10;
      base.rotation = Math.random() * Math.PI * 2;
      base.rotSpeed = (Math.random() - 0.5) * 2;
      break;
    case 'butterfly':
      base.x = Math.random() * w;
      base.y = groundY * 0.3 + Math.random() * groundY * 0.5;
      base.size = 3 + Math.random() * 2;
      base.maxLife = 15 + Math.random() * 15;
      base.vx = (Math.random() - 0.5) * 15;
      base.vy = (Math.random() - 0.5) * 8;
      break;
    case 'wisp':
      base.y = Math.random() * h * 0.6;
      base.size = 15 + Math.random() * 30;
      base.maxLife = 10 + Math.random() * 10;
      break;
    case 'firefly':
      base.x = Math.random() * w;
      base.y = h * 0.15 + Math.random() * h * 0.65;
      base.size = 2 + Math.random() * 2.5;
      base.maxLife = 8 + Math.random() * 12;
      base.vx = (Math.random() - 0.5) * 10;
      base.vy = (Math.random() - 0.5) * 10;
      break;
    case 'raindrop':
      base.size = 1 + Math.random() * 1.5;
      base.maxLife = 3 + Math.random() * 2;
      break;
    case 'cloud':
      base.x = -100; // start offscreen left
      base.y = h * 0.02 + Math.random() * h * 0.12;
      base.size = 40 + Math.random() * 60;
      base.maxLife = 60 + Math.random() * 30;
      base.vx = 8 + Math.random() * 12;
      break;
    case 'leaf':
      base.size = 4 + Math.random() * 6;
      base.maxLife = 20 + Math.random() * 15;
      base.rotation = Math.random() * Math.PI * 2;
      base.rotSpeed = (Math.random() - 0.5) * 3;
      break;
    case 'snowflake':
      base.size = 2.5 + Math.random() * 4;
      base.maxLife = 25 + Math.random() * 20;
      break;
    case 'star':
      base.x = Math.random() * w;
      base.y = Math.random() * h * 0.7;
      base.size = 0.8 + Math.random() * 2;
      base.maxLife = 999;
      break;
  }

  return base;
}

// ─── Particle Drawing ────────────────────────────────────────────────────────

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, time: number) {
  const fadeIn = Math.min(1, p.life * 2);
  const fadeOut = Math.min(1, (p.maxLife - p.life) * 2);
  let alpha = fadeIn * fadeOut;

  // Settled particles fade more slowly
  if (p.settled) {
    alpha = Math.max(0, 1 - p.settledTime / 18) * 0.5;
  }

  if (alpha <= 0) return;
  ctx.save();

  switch (p.type) {
    case 'petal': {
      ctx.globalAlpha = alpha * 0.5;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      // Petal shape - soft elliptical
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Subtle center highlight
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.ellipse(p.size * 0.15, 0, p.size * 0.3, p.size * 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      break;
    }
    case 'butterfly': {
      const wingFlap = Math.sin(time * 8 + p.wingPhase);
      const wingScale = 0.3 + Math.abs(wingFlap) * 0.7; // wings open/close
      ctx.globalAlpha = alpha * 0.7;
      ctx.translate(p.x, p.y);
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.8, p.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      // Left wing
      ctx.save();
      ctx.scale(wingScale, 1);
      ctx.beginPath();
      ctx.ellipse(-p.size * 1.2, -p.size * 0.3, p.size * 1.3, p.size * 0.9, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Wing detail
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.ellipse(-p.size * 1.1, -p.size * 0.3, p.size * 0.6, p.size * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
      // Right wing
      ctx.save();
      ctx.scale(wingScale, 1);
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(p.size * 1.2, -p.size * 0.3, p.size * 1.3, p.size * 0.9, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.ellipse(p.size * 1.1, -p.size * 0.3, p.size * 0.6, p.size * 0.4, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
      // Antennae
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.moveTo(-0.5, -p.size * 0.6);
      ctx.quadraticCurveTo(-p.size * 0.6, -p.size * 1.5, -p.size * 0.8, -p.size * 1.6);
      ctx.moveTo(0.5, -p.size * 0.6);
      ctx.quadraticCurveTo(p.size * 0.6, -p.size * 1.5, p.size * 0.8, -p.size * 1.6);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.4;
      ctx.stroke();
      break;
    }
    case 'mote': {
      const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * p.glowFreq + p.phase));
      ctx.globalAlpha = alpha * glow * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = alpha * glow * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }
    case 'wisp': {
      ctx.globalAlpha = alpha * 0.04;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }
    case 'firefly': {
      const glow = 0.5 + 0.5 * Math.sin(time * p.glowFreq + p.phase);
      const brightness = glow * glow;
      ctx.globalAlpha = alpha * brightness * 0.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = alpha * brightness * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = alpha * brightness;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFCC';
      ctx.fill();
      break;
    }
    case 'raindrop': {
      if (p.splashing) {
        const t = p.splashTime;
        const splashAlpha = Math.max(0, 1 - t * 3);
        const radius = 3 + t * 20;
        ctx.globalAlpha = splashAlpha * 0.3;
        ctx.beginPath();
        ctx.arc(p.splashX, p.splashY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI + p.seed;
          const dist = t * 15;
          const dy = t * t * 30;
          ctx.globalAlpha = splashAlpha * 0.4;
          ctx.beginPath();
          ctx.arc(
            p.splashX + Math.cos(angle) * dist,
            p.splashY - dist * 0.5 + dy,
            0.8, 0, Math.PI * 2,
          );
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      } else {
        const len = 6 + p.size * 4;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(angle) * len, p.y - Math.sin(angle) * len);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      break;
    }
    case 'cloud': {
      ctx.globalAlpha = alpha * 0.18;
      const r = p.size;
      // Puffy cloud shape from overlapping circles
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.7, 0, Math.PI * 2);
      ctx.arc(p.x - r * 0.6, p.y + r * 0.15, r * 0.55, 0, Math.PI * 2);
      ctx.arc(p.x + r * 0.7, p.y + r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.arc(p.x + r * 0.2, p.y - r * 0.3, r * 0.5, 0, Math.PI * 2);
      ctx.arc(p.x - r * 0.3, p.y - r * 0.2, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }
    case 'leaf': {
      ctx.globalAlpha = alpha * (p.settled ? 0.3 : 0.45);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.settled ? Math.PI * 0.1 * Math.sin(p.seed) : p.rotation);
      // Leaf shape
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.3, p.size * 0.8, p.size * 0.3, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.3, -p.size * 0.8, -p.size * 0.3, 0, -p.size);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Center vein
      ctx.globalAlpha = alpha * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.8);
      ctx.lineTo(0, p.size * 0.8);
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      break;
    }
    case 'snowflake': {
      const shimmer = 0.6 + 0.4 * Math.sin(time * 0.8 + p.phase);
      ctx.globalAlpha = alpha * shimmer * (p.settled ? 0.35 : 0.6);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.settled ? 0 : p.rotation);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -p.size);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';
        ctx.stroke();
        if (p.size > 2.5) {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.5);
          ctx.lineTo(p.size * 0.3, -p.size * 0.7);
          ctx.moveTo(0, -p.size * 0.5);
          ctx.lineTo(-p.size * 0.3, -p.size * 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      break;
    }
    case 'star': {
      const twinkle = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(time * p.glowFreq + p.phase), 3);
      ctx.globalAlpha = alpha * twinkle * 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = alpha * twinkle * 0.3;
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * 2.5, p.y);
      ctx.lineTo(p.x + p.size * 2.5, p.y);
      ctx.moveTo(p.x, p.y - p.size * 2.5);
      ctx.lineTo(p.x, p.y + p.size * 2.5);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = alpha * twinkle * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ─── Scene Ground Drawing ────────────────────────────────────────────────────

// Helper: draw an organic undulating terrain edge using noise
function drawTerrainPath(ctx: CanvasRenderingContext2D, w: number, h: number, baseY: number, amplitude: number, seed: number) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const ratio = x / w;
    const undulation = smoothNoise(ratio * 5, seed) * amplitude
      + smoothNoise(ratio * 12, seed + 50) * (amplitude * 0.4);
    ctx.lineTo(x, baseY + undulation);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
}

function drawTree(
  ctx: CanvasRenderingContext2D, x: number, groundY: number,
  trunkH: number, canopyR: number, trunkColor: string, canopyColors: string[],
  sway: number, op: number,
) {
  // Trunk
  ctx.globalAlpha = 0.22 * op;
  ctx.fillStyle = trunkColor;
  const tw = trunkH * 0.12;
  ctx.beginPath();
  ctx.moveTo(x - tw, groundY);
  ctx.quadraticCurveTo(x - tw * 0.6 + sway * 0.3, groundY - trunkH * 0.5, x - tw * 0.4 + sway, groundY - trunkH);
  ctx.lineTo(x + tw * 0.4 + sway, groundY - trunkH);
  ctx.quadraticCurveTo(x + tw * 0.6 + sway * 0.3, groundY - trunkH * 0.5, x + tw, groundY);
  ctx.closePath();
  ctx.fill();
  // Canopy clusters
  ctx.globalAlpha = 0.18 * op;
  const cx = x + sway;
  const cy = groundY - trunkH - canopyR * 0.3;
  for (let c = 0; c < canopyColors.length; c++) {
    const a = (c / canopyColors.length) * Math.PI * 2 + 0.3;
    const dist = canopyR * 0.35;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.6, canopyR * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = canopyColors[c];
    ctx.fill();
  }
  // Center canopy
  ctx.beginPath();
  ctx.arc(cx, cy, canopyR * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = canopyColors[0];
  ctx.fill();
}

function drawSceneGround(ctx: CanvasRenderingContext2D, level: number, w: number, h: number, t: number, dark: boolean) {
  const groundY = h * GROUND_Y;
  const op = dark ? 1.4 : 1;

  switch (level) {
    case 0: { // Spring - rolling green hills with grass, flowers, and trees
      // Back hill
      ctx.globalAlpha = 0.12 * op;
      ctx.fillStyle = dark ? '#2E7D32' : '#A5D6A7';
      drawTerrainPath(ctx, w, h, groundY - 10, 8, 3);
      ctx.fill();

      // Main ground
      ctx.globalAlpha = 0.18 * op;
      ctx.fillStyle = dark ? '#388E3C' : '#66BB6A';
      drawTerrainPath(ctx, w, h, groundY, 5, 7);
      ctx.fill();

      // Trees
      const springCanopy = dark
        ? ['#2E7D32', '#388E3C', '#43A047', '#1B5E20']
        : ['#66BB6A', '#81C784', '#A5D6A7', '#4CAF50'];
      for (let i = 0; i < 5; i++) {
        const tx = w * 0.08 + (i / 5) * w * 0.84 + pseudoNoise(i, 0, 200) * (w * 0.06);
        const th = 30 + Math.abs(pseudoNoise(i, 1, 210)) * 25;
        const cr = 14 + Math.abs(pseudoNoise(i, 2, 220)) * 10;
        const sway = Math.sin(t * 0.4 + i * 1.7) * 2;
        drawTree(ctx, tx, groundY, th, cr, dark ? '#5D4037' : '#8D6E63', springCanopy, sway, op);
      }

      // Tall grass blades
      for (let i = 0; i < 80; i++) {
        const gx = (i / 80) * w;
        const ratio = gx / w;
        const ty = groundY + smoothNoise(ratio * 5, 7) * 5 + smoothNoise(ratio * 12, 57) * 2;
        const gh = 12 + Math.abs(pseudoNoise(i, 1, 13)) * 18;
        const lean = pseudoNoise(i, 2, 17) * 4 + Math.sin(t * 0.8 + i * 0.5) * 2.5;
        ctx.globalAlpha = (dark ? 0.16 : 0.15) * op;
        ctx.beginPath();
        ctx.moveTo(gx, ty);
        ctx.quadraticCurveTo(gx + lean, ty - gh * 0.6, gx + lean * 1.5, ty - gh);
        ctx.strokeStyle = dark ? (i % 3 === 0 ? '#4CAF50' : '#66BB6A') : (i % 3 === 0 ? '#4CAF50' : '#81C784');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Wildflowers - bigger
      const flowerColors = dark
        ? ['#F48FB1', '#FFD54F', '#CE93D8', '#FF8A65', '#E1BEE7']
        : ['#EC407A', '#FBC02D', '#AB47BC', '#FF7043', '#BA68C8'];
      ctx.globalAlpha = 0.22 * op;
      for (let i = 0; i < 22; i++) {
        const fx = (i / 22) * w + pseudoNoise(i, 2, 21) * 30;
        const ratio = fx / w;
        const ty = groundY + smoothNoise(ratio * 5, 7) * 5 + smoothNoise(ratio * 12, 57) * 2;
        const fy = ty - 4 - Math.abs(pseudoNoise(i, 3, 31)) * 8;
        const fc = flowerColors[i % flowerColors.length];
        const fr = 2.5 + Math.abs(pseudoNoise(i, 4, 41)) * 2.5;
        // Stem
        ctx.globalAlpha = 0.12 * op;
        ctx.beginPath();
        ctx.moveTo(fx, ty);
        ctx.lineTo(fx, fy + fr);
        ctx.strokeStyle = dark ? '#4CAF50' : '#66BB6A';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Petals
        ctx.globalAlpha = 0.22 * op;
        for (let p = 0; p < 5; p++) {
          const angle = (p / 5) * Math.PI * 2 + i;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(angle) * fr * 0.55, fy + Math.sin(angle) * fr * 0.55, fr * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = fc;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = dark ? '#FFF9C4' : '#FFF176';
        ctx.fill();
      }
      break;
    }
    case 3: { // Rain - wet ground with puddles
      ctx.globalAlpha = 0.12 * op;
      ctx.fillStyle = dark ? '#37474F' : '#78909C';
      drawTerrainPath(ctx, w, h, groundY, 5, 55);
      ctx.fill();

      ctx.globalAlpha = 0.08 * op;
      ctx.fillStyle = dark ? '#263238' : '#607D8B';
      drawTerrainPath(ctx, w, h, groundY + 3, 3, 60);
      ctx.fill();

      // Puddles with animated ripples
      for (let i = 0; i < 6; i++) {
        const px = w * 0.08 + (i / 6) * w * 0.84;
        const ratio = px / w;
        const ty = groundY + smoothNoise(ratio * 5, 55) * 5 + smoothNoise(ratio * 12, 105) * 2;
        const pw = 20 + Math.abs(pseudoNoise(i, 0, 55)) * 40;
        ctx.globalAlpha = 0.12 * op;
        ctx.beginPath();
        ctx.ellipse(px, ty + 2, pw, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = dark ? '#455A64' : '#B0BEC5';
        ctx.fill();
        const ripplePhase = (t * 0.8 + i * 1.7) % 3;
        if (ripplePhase < 1.5) {
          const rippleR = ripplePhase * pw * 0.4;
          ctx.globalAlpha = 0.08 * (1 - ripplePhase / 1.5) * op;
          ctx.beginPath();
          ctx.ellipse(px, ty + 2, rippleR, rippleR * 0.3, 0, 0, Math.PI * 2);
          ctx.strokeStyle = dark ? '#90CAF9' : '#64B5F6';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      break;
    }
    case 4: { // Autumn - earthy ground with leaf piles and bare trees
      // Back layer
      ctx.globalAlpha = 0.1 * op;
      ctx.fillStyle = dark ? '#4E342E' : '#A1887F';
      drawTerrainPath(ctx, w, h, groundY - 6, 6, 70);
      ctx.fill();

      // Main terrain
      ctx.globalAlpha = 0.15 * op;
      ctx.fillStyle = dark ? '#5D4037' : '#8D6E63';
      drawTerrainPath(ctx, w, h, groundY, 5, 77);
      ctx.fill();

      // Autumn trees - sparse orange/gold canopy
      const autumnCanopy = dark
        ? ['#E65100', '#F57F17', '#BF360C', '#DD2C00']
        : ['#FF8F00', '#FFB300', '#E65100', '#FF6D00'];
      for (let i = 0; i < 4; i++) {
        const tx = w * 0.1 + (i / 4) * w * 0.8 + pseudoNoise(i, 0, 300) * (w * 0.08);
        const th = 35 + Math.abs(pseudoNoise(i, 1, 310)) * 20;
        const cr = 12 + Math.abs(pseudoNoise(i, 2, 320)) * 8;
        const sway = Math.sin(t * 0.3 + i * 2.1) * 1.5;
        drawTree(ctx, tx, groundY, th, cr, dark ? '#4E342E' : '#6D4C41', autumnCanopy, sway, op);
      }

      // Leaf piles - bigger
      const pileColors = dark
        ? ['#E65100', '#F57F17', '#BF360C', '#DD2C00']
        : ['#FF8F00', '#FFB300', '#D84315', '#FF6D00', '#E65100'];
      ctx.globalAlpha = 0.14 * op;
      for (let i = 0; i < 10; i++) {
        const px = (i / 10) * w + pseudoNoise(i, 0, 77) * 40;
        const ratio = px / w;
        const ty = groundY + smoothNoise(ratio * 5, 77) * 5 + smoothNoise(ratio * 12, 127) * 2;
        const pr = 10 + Math.abs(pseudoNoise(i, 1, 88)) * 18;
        for (let j = 0; j < 4; j++) {
          const ox = px + (j - 1.5) * pr * 0.35 + pseudoNoise(i * 4 + j, 2, 99) * 5;
          const or2 = pr * (0.4 + Math.abs(pseudoNoise(i * 4 + j, 3, 111)) * 0.5);
          ctx.beginPath();
          ctx.arc(ox, ty + 1, or2, Math.PI, 0);
          ctx.fillStyle = pileColors[(i + j) % pileColors.length];
          ctx.fill();
        }
      }
      break;
    }
    case 5: { // Winter - snow drifts with bare trees
      // Back snow
      ctx.globalAlpha = 0.1 * op;
      ctx.fillStyle = dark ? '#546E7A' : '#CFD8DC';
      drawTerrainPath(ctx, w, h, groundY - 8, 6, 95);
      ctx.fill();

      // Main snow
      ctx.globalAlpha = 0.18 * op;
      ctx.fillStyle = dark ? '#78909C' : '#ECEFF1';
      drawTerrainPath(ctx, w, h, groundY, 5, 99);
      ctx.fill();

      // Bare winter trees (no canopy, just branches)
      for (let i = 0; i < 3; i++) {
        const tx = w * 0.15 + (i / 3) * w * 0.7 + pseudoNoise(i, 0, 400) * (w * 0.06);
        const th = 35 + Math.abs(pseudoNoise(i, 1, 410)) * 20;
        const tw = th * 0.1;
        const sway = Math.sin(t * 0.25 + i * 1.9) * 1;
        // Trunk
        ctx.globalAlpha = 0.16 * op;
        ctx.fillStyle = dark ? '#455A64' : '#78909C';
        ctx.beginPath();
        ctx.moveTo(tx - tw, groundY);
        ctx.quadraticCurveTo(tx - tw * 0.5 + sway * 0.3, groundY - th * 0.5, tx - tw * 0.3 + sway, groundY - th);
        ctx.lineTo(tx + tw * 0.3 + sway, groundY - th);
        ctx.quadraticCurveTo(tx + tw * 0.5 + sway * 0.3, groundY - th * 0.5, tx + tw, groundY);
        ctx.closePath();
        ctx.fill();
        // Branches
        ctx.globalAlpha = 0.12 * op;
        ctx.strokeStyle = dark ? '#546E7A' : '#90A4AE';
        ctx.lineWidth = 1.2;
        for (let b = 0; b < 4; b++) {
          const by = groundY - th * (0.4 + b * 0.15);
          const bx = tx + sway * (0.4 + b * 0.15);
          const dir = b % 2 === 0 ? 1 : -1;
          const blen = 10 + Math.abs(pseudoNoise(i * 4 + b, 3, 420)) * 12;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + dir * blen * 0.6, by - blen * 0.3, bx + dir * blen, by - blen * 0.15);
          ctx.stroke();
        }
        // Snow on branches
        ctx.globalAlpha = 0.14 * op;
        ctx.fillStyle = dark ? '#B0BEC5' : '#FFFFFF';
        for (let b = 0; b < 3; b++) {
          const by = groundY - th * (0.45 + b * 0.15);
          const bx = tx + sway * (0.45 + b * 0.15);
          ctx.beginPath();
          ctx.ellipse(bx, by - 1, 4 + b * 1.5, 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Snow drifts - bigger
      ctx.globalAlpha = 0.16 * op;
      for (let i = 0; i < 12; i++) {
        const sx = (i / 12) * w + pseudoNoise(i, 0, 99) * 30;
        const ratio = sx / w;
        const ty = groundY + smoothNoise(ratio * 5, 99) * 5 + smoothNoise(ratio * 12, 149) * 2;
        const sr = 12 + Math.abs(pseudoNoise(i, 1, 109)) * 18;
        ctx.beginPath();
        ctx.arc(sx, ty - 1, sr, Math.PI * 0.85, Math.PI * 0.15);
        ctx.fillStyle = dark ? (i % 2 === 0 ? '#90A4AE' : '#78909C') : (i % 2 === 0 ? '#FFFFFF' : '#F5F5F5');
        ctx.fill();
      }

      // Snow sparkles
      for (let i = 0; i < 16; i++) {
        const sparkle = Math.sin(t * 1.5 + i * 2.3);
        if (sparkle > 0.6) {
          const sx2 = (i / 16) * w + pseudoNoise(i, 5, 120) * 40;
          const ratio2 = sx2 / w;
          const sy2 = groundY + smoothNoise(ratio2 * 5, 99) * 5 - 4;
          ctx.globalAlpha = (sparkle - 0.6) * 0.4 * op;
          ctx.beginPath();
          ctx.arc(sx2, sy2, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = dark ? '#B0BEC5' : '#FFFFFF';
          ctx.fill();
        }
      }
      break;
    }
  }
}

// ─── Page Background Component ───────────────────────────────────────────────

const MAX_SETTLED = 35;

export function ScenePageBackground({ entropy }: { entropy: EntropyResult }) {
  const level = useMemo(() => getLevel(entropy.crackTime), [entropy.crackTime]);
  const theme = themes[level];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const levelRef = useRef(level);
  const timeRef = useRef(0);
  const spawnAccsRef = useRef<Record<string, number>>({});

  // Phase out old particles on level change
  useEffect(() => {
    if (levelRef.current !== level) {
      for (const p of particlesRef.current) {
        p.maxLife = Math.min(p.maxLife, p.life + 1.5);
      }
      levelRef.current = level;
      spawnAccsRef.current = {};
    }
  }, [level]);

  useEffect(() => {
    let raf: number;

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const currentLevel = levelRef.current;
      const cfg = themes[currentLevel];
      const dt = 1 / 60;
      timeRef.current += dt;
      const t = timeRef.current;

      const windNoise = smoothNoise(t * 0.3, 42);
      const wind = cfg.windBase + cfg.windGust * windNoise;
      const groundY = h * GROUND_Y;

      ctx.clearRect(0, 0, w, h);

      // Detect dark mode (class-based via next-themes)
      const isDark = document.documentElement.classList.contains('dark');

      // Draw scene ground elements behind particles
      drawSceneGround(ctx, currentLevel, w, h, t, isDark);

      // Spawn particles for each spawn config
      const accs = spawnAccsRef.current;
      for (const spawn of cfg.spawns) {
        const key = spawn.type;
        if (accs[key] === undefined) accs[key] = 0;
        accs[key] += spawn.rate * dt;

        const colors = COLORS[spawn.type] || COLORS.petal;
        const currentCount = particlesRef.current.filter(p => p.type === key && !p.settled).length;

        while (accs[key] >= 1 && currentCount < spawn.max) {
          accs[key] -= 1;
          particlesRef.current.push(createParticle(spawn.type, w, h, colors));
        }
        if (accs[key] >= 1) accs[key] = 0;
      }

      // Track settled count
      let settledCount = particlesRef.current.filter(p => p.settled).length;

      // Update & draw
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life += dt;

        // Settled particles: just fade, don't move
        if (p.settled) {
          p.settledTime += dt;
          if (p.settledTime > 18) continue; // fully faded
          drawParticle(ctx, p, t);
          alive.push(p);
          continue;
        }

        if (p.life > p.maxLife) continue;

        // Rain splash state
        if (p.splashing) {
          p.splashTime += dt;
          if (p.splashTime > 0.4) continue;
          drawParticle(ctx, p, t);
          alive.push(p);
          continue;
        }

        // Noise-driven turbulence
        const nx = smoothNoise(t * 0.5 + p.seed, p.seed) * cfg.turbulence;
        const ny = smoothNoise(t * 0.5 + p.seed + 100, p.seed + 50) * cfg.turbulence;

        // Per-type physics
        switch (p.type) {
          case 'petal':
            p.vx += (wind * 0.3 + nx * 10) * dt;
            p.vy += (cfg.gravity + ny * 6) * dt;
            p.vx *= 0.98;
            p.vy *= 0.995;
            p.rotation += p.rotSpeed * dt;
            // Gentle sway
            p.vx += Math.sin(t * 1.5 + p.seed) * 5 * dt;
            break;
          case 'butterfly': {
            // Organic figure-8 wandering
            const targetVx = smoothNoise(t * 0.3 + p.seed, p.seed * 2) * 30;
            const targetVy = smoothNoise(t * 0.25 + p.seed + 200, p.seed * 3) * 20;
            p.vx += (targetVx - p.vx) * 1.2 * dt;
            p.vy += (targetVy - p.vy) * 1.2 * dt;
            // Slight upward bias
            p.vy -= 3 * dt;
            // Keep in bounds vertically
            if (p.y < h * 0.1) p.vy += 15 * dt;
            if (p.y > groundY - 20) p.vy -= 15 * dt;
            break;
          }
          case 'wisp':
            p.vx += (wind * 0.3 + nx * 5) * dt;
            p.vy += (cfg.gravity + ny * 3) * dt;
            p.vx *= 0.99;
            p.vy *= 0.99;
            break;
          case 'firefly': {
            const targetVx = smoothNoise(t * 0.4 + p.seed, p.seed * 2) * 25;
            const targetVy = smoothNoise(t * 0.4 + p.seed + 200, p.seed * 3) * 20;
            p.vx += (targetVx - p.vx) * 1.5 * dt;
            p.vy += (targetVy - p.vy) * 1.5 * dt;
            break;
          }
          case 'raindrop':
            p.vx += wind * dt;
            p.vy += cfg.gravity * dt;
            p.vx *= 0.99;
            if (p.y > groundY) {
              p.splashing = true;
              p.splashTime = 0;
              p.splashX = p.x;
              p.splashY = p.y;
            }
            break;
          case 'cloud':
            // Clouds just drift slowly
            p.vx += (wind * 0.05) * dt;
            p.vx *= 0.999;
            break;
          case 'leaf':
            p.vx += (wind + nx * 25) * dt;
            p.vy += (cfg.gravity + ny * 8) * dt;
            p.vx *= 0.97;
            p.vy *= 0.995;
            p.rotation += p.rotSpeed * dt;
            p.vx += Math.sin(t * 2 + p.seed) * 8 * dt;
            // Settle on ground
            if (p.y >= groundY && settledCount < MAX_SETTLED) {
              p.settled = true;
              p.settledTime = 0;
              p.y = groundY - Math.random() * 3;
              p.vx = 0;
              p.vy = 0;
              settledCount++;
            }
            break;
          case 'snowflake':
            p.vx += (wind + nx * 20) * dt;
            p.vy += (cfg.gravity + ny * 5) * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.rotation += 0.3 * dt;
            p.vx += Math.sin(t * 1.2 + p.seed) * 6 * dt;
            // Settle on ground
            if (p.y >= groundY && settledCount < MAX_SETTLED) {
              p.settled = true;
              p.settledTime = 0;
              p.y = groundY - Math.random() * 4;
              p.vx = 0;
              p.vy = 0;
              settledCount++;
            }
            break;
          case 'star':
            p.x += smoothNoise(t * 0.1 + p.seed, p.seed) * 0.15;
            p.y += smoothNoise(t * 0.1 + p.seed + 100, p.seed) * 0.1;
            break;
        }

        // Apply velocity (except stars and clouds which handle their own)
        if (p.type !== 'star') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        // Wrap horizontally
        if (p.type === 'cloud') {
          // Clouds disappear offscreen right, respawn left
          if (p.x > w + p.size * 2) continue;
        } else {
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
        }

        // Kill if fell below ground (non-settling types) or below screen
        if (p.type !== 'star' && !p.settled && p.y > h + 20) continue;

        // Petals also settle
        if (p.type === 'petal' && p.y >= groundY && !p.settled && settledCount < MAX_SETTLED) {
          p.settled = true;
          p.settledTime = 0;
          p.y = groundY - Math.random() * 2;
          p.vx = 0;
          p.vy = 0;
          settledCount++;
        }

        drawParticle(ctx, p, t);
        alive.push(p);
      }
      particlesRef.current = alive;
    };

    const loop = () => {
      animate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-1 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* CSS gradient wash - light */}
      <div
        className="absolute inset-0 transition-all duration-[1.5s] ease-out dark:opacity-0"
        style={{ background: theme.bgGradient }}
      />
      {/* CSS gradient wash - dark */}
      <div
        className="absolute inset-0 opacity-0 transition-all duration-[1.5s] ease-out dark:opacity-100"
        style={{ background: theme.bgGradientDark }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 h-112.5 w-112.5 rounded-full blur-[120px] transition-all duration-[1.5s] dark:hidden"
        style={{ backgroundColor: theme.glowColor }}
      />
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 h-112.5 w-112.5 rounded-full blur-[120px] transition-all duration-[1.5s] hidden dark:block"
        style={{ backgroundColor: theme.glowColorDark }}
      />

      {/* Canvas particle layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

// ─── Panda Character (SVG) ───────────────────────────────────────────────────

function PandaBody({ level }: { level: number }) {
  const fur = level === 5 ? '#DEDEDE' : '#FAFAFA';
  const furStroke = level === 5 ? '#BDBDBD' : '#E8E8E8';
  const dark = level === 5 ? '#3A3A3A' : '#1A1A1A';
  const darkInner = level === 5 ? '#4A4A4A' : '#2A2A2A';
  const cheek = level === 5 ? '#BDBDBD' : '#FFCDD2';

  return (
    <g>
      {/* Tail */}
      <g className={level === 0 ? 'ps-tail-wag' : ''}>
        <ellipse cx="80" cy="86" rx="6" ry="5" fill={dark} className="pst" transform="rotate(-20, 80, 86)" />
      </g>
      <ellipse cx="50" cy="72" rx="26" ry="28" fill={fur} stroke={furStroke} strokeWidth="0.6" className="pst" />
      <ellipse cx="50" cy="74" rx="18" ry="20" fill={fur} opacity={0.6} className="pst" />

      <g className={level === 0 ? 'ps-wave-arm' : ''}>
        <ellipse cx="22" cy="66" rx="10" ry="14" fill={dark} className="pst" transform="rotate(15, 22, 66)" />
        <circle cx="18" cy="76" r="5" fill={darkInner} className="pst" />
        <circle cx="16" cy="74" r="1.5" fill="#5D4037" opacity={0.4} />
        <circle cx="20" cy="73" r="1.5" fill="#5D4037" opacity={0.4} />
        <circle cx="18" cy="78" r="2" fill="#5D4037" opacity={0.3} />
      </g>

      <ellipse cx="78" cy="66" rx="10" ry="14" fill={dark} className="pst" transform="rotate(-15, 78, 66)" />
      <circle cx="82" cy="76" r="5" fill={darkInner} className="pst" />
      <circle cx="80" cy="74" r="1.5" fill="#5D4037" opacity={0.4} />
      <circle cx="84" cy="73" r="1.5" fill="#5D4037" opacity={0.4} />
      <circle cx="82" cy="78" r="2" fill="#5D4037" opacity={0.3} />

      <ellipse cx="36" cy="96" rx="12" ry="8" fill={dark} className="pst" />
      <ellipse cx="64" cy="96" rx="12" ry="8" fill={dark} className="pst" />
      {[33, 36, 39].map((x, i) => (
        <circle key={`lt${i}`} cx={x} cy={100} r={1.8} fill="#5D4037" opacity={0.3} />
      ))}
      {[61, 64, 67].map((x, i) => (
        <circle key={`rt${i}`} cx={x} cy={100} r={1.8} fill="#5D4037" opacity={0.3} />
      ))}

      <circle cx="50" cy="30" r="26" fill={fur} stroke={furStroke} strokeWidth="0.6" className="pst" />

      <g className="ps-ear-twitch">
        <circle cx="26" cy="8" r="11" fill={dark} className="pst" />
        <circle cx="26" cy="8" r="6" fill="#F48FB1" opacity={0.25} className="pst" />
      </g>
      <g className="ps-ear-twitch-r">
        <circle cx="74" cy="8" r="11" fill={dark} className="pst" />
        <circle cx="74" cy="8" r="6" fill="#F48FB1" opacity={0.25} className="pst" />
      </g>

      <ellipse cx="37" cy="28" rx="11" ry="9.5" fill={dark} transform="rotate(-6, 37, 28)" className="pst" />
      <ellipse cx="63" cy="28" rx="11" ry="9.5" fill={dark} transform="rotate(6, 63, 28)" className="pst" />

      <ellipse cx="50" cy="38" rx="5" ry="3.5" fill="#1A1A1A" className="pst" />
      <ellipse cx="48.5" cy="37" rx="2.2" ry="1.2" fill="#333" className="pst" />
      <line x1="50" y1="41" x2="50" y2="44" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round" className="pst" />

      <ellipse cx="28" cy="38" rx="5" ry="3.5" fill={cheek} opacity={0.35} className="pst" />
      <ellipse cx="72" cy="38" rx="5" ry="3.5" fill={cheek} opacity={0.35} className="pst" />
    </g>
  );
}

function PandaEyes({ level }: { level: number }) {
  if (level === 0) {
    return (
      <g>
        <g className="ps-blink2">
          <circle cx="37" cy="27" r="5.5" fill="white" className="pst" />
          <circle cx="63" cy="27" r="5.5" fill="white" className="pst" />
          <circle cx="38.5" cy="26" r="3.2" fill="#111" className="pst" />
          <circle cx="64.5" cy="26" r="3.2" fill="#111" className="pst" />
          <circle cx="40" cy="24" r="1.6" fill="white" />
          <circle cx="66" cy="24" r="1.6" fill="white" />
          <circle cx="37" cy="28" r="0.7" fill="white" opacity={0.7} />
          <circle cx="63" cy="28" r="0.7" fill="white" opacity={0.7} />
        </g>
      </g>
    );
  }
  if (level === 1) {
    return (
      <g>
        <g className="ps-blink">
          <circle cx="37" cy="27" r="4.5" fill="white" className="pst" />
          <circle cx="63" cy="27" r="4.5" fill="white" className="pst" />
          <circle cx="36" cy="28" r="2.5" fill="#111" className="pst" />
          <circle cx="62" cy="28" r="2.5" fill="#111" className="pst" />
          <circle cx="37" cy="26.5" r="0.9" fill="white" />
          <circle cx="63" cy="26.5" r="0.9" fill="white" />
        </g>
        <line x1="30" y1="19" x2="42" y2="21.5" stroke="#FFF3E0" strokeWidth="2.2" strokeLinecap="round" className="pst" />
        <line x1="70" y1="19" x2="58" y2="21.5" stroke="#FFF3E0" strokeWidth="2.2" strokeLinecap="round" className="pst" />
      </g>
    );
  }
  if (level === 2) {
    return (
      <g>
        <circle cx="37" cy="27" r="4" fill="white" className="pst" />
        <circle cx="63" cy="27" r="4" fill="white" className="pst" />
        <circle cx="37" cy="28.5" r="2" fill="#111" className="pst" />
        <circle cx="63" cy="28.5" r="2" fill="#111" className="pst" />
        <path d="M31 24 Q37 21 43 24 L43 26 Q37 23 31 26 Z" fill="#1A1A1A" className="pst" />
        <path d="M57 24 Q63 21 69 24 L69 26 Q63 23 57 26 Z" fill="#1A1A1A" className="pst" />
        <text x="78" y="14" fill="currentColor" opacity={0.15} fontSize="8" fontFamily="monospace" className="ps-zzz">z</text>
        <text x="84" y="8" fill="currentColor" opacity={0.1} fontSize="6" fontFamily="monospace" className="ps-zzz2">z</text>
      </g>
    );
  }
  if (level === 3) {
    return (
      <g>
        <g className="ps-blink">
          <circle cx="37" cy="27" r="4" fill="white" className="pst" />
          <circle cx="63" cy="27" r="4" fill="white" className="pst" />
          <circle cx="37" cy="27" r="2.5" fill="#111" className="pst" />
          <circle cx="63" cy="27" r="2.5" fill="#111" className="pst" />
          <circle cx="38.5" cy="25.5" r="1" fill="white" />
          <circle cx="64.5" cy="25.5" r="1" fill="white" />
        </g>
      </g>
    );
  }
  if (level === 4) {
    return (
      <g className="ps-squint-happy">
        <path d="M30 29 Q37 22 44 29" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" className="pst" />
        <path d="M56 29 Q63 22 70 29" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" className="pst" />
      </g>
    );
  }
  if (level === 5) {
    return (
      <g>
        <line x1="34" y1="27" x2="40" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" className="pst" />
        <line x1="60" y1="27" x2="66" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" className="pst" />
        <circle cx="37" cy="27" r="8.5" fill="none" stroke="#6D4C41" strokeWidth="1.4" className="pst" />
        <circle cx="63" cy="27" r="8.5" fill="none" stroke="#6D4C41" strokeWidth="1.4" className="pst" />
        <path d="M45.5 26 Q50 23 54.5 26" fill="none" stroke="#6D4C41" strokeWidth="1.2" className="pst" />
        <line x1="28.5" y1="26" x2="20" y2="22" stroke="#6D4C41" strokeWidth="1.2" className="pst" />
        <line x1="71.5" y1="26" x2="80" y2="22" stroke="#6D4C41" strokeWidth="1.2" className="pst" />
        <path d="M33 23 Q34 22 35 23" fill="none" stroke="white" strokeWidth="0.6" opacity={0.35} />
        <path d="M59 23 Q60 22 61 23" fill="none" stroke="white" strokeWidth="0.6" opacity={0.35} />
      </g>
    );
  }
  return null;
}

function PandaMouth({ level }: { level: number }) {
  if (level === 0) {
    return (
      <g>
        <path d="M43 45 Q50 52 57 45" fill="none" stroke="#333" strokeWidth="1.4" strokeLinecap="round" className="pst" />
        <ellipse cx="50" cy="47.5" rx="3" ry="2" fill="#EF9A9A" opacity={0.5} className="pst" />
      </g>
    );
  }
  if (level === 1) return <ellipse cx="50" cy="45" rx="3" ry="2.5" fill="#333" className="pst" />;
  if (level === 2) {
    return (
      <g>
        <ellipse cx="50" cy="46" rx="4" ry="4.5" fill="#333" className="pst" />
        <ellipse cx="50" cy="48.5" rx="3" ry="2" fill="#EF9A9A" opacity={0.4} className="pst" />
      </g>
    );
  }
  if (level === 3) return <line x1="44" y1="45" x2="56" y2="45" stroke="#333" strokeWidth="1.2" strokeLinecap="round" className="pst" />;
  if (level === 4) return <path d="M44 44 Q50 49 56 44" fill="none" stroke="#333" strokeWidth="1.3" strokeLinecap="round" className="pst" />;
  if (level === 5) return <path d="M46 45 Q50 47 54 45" fill="none" stroke="#555" strokeWidth="1" strokeLinecap="round" className="pst" />;
  return null;
}

function PandaAccessories({ level }: { level: number }) {
  if (level === 3) {
    return (
      <g className="pst">
        <line x1="50" y1="-8" x2="50" y2="28" stroke="#5D4037" strokeWidth="2.2" />
        <path d="M50 28 Q50 34 46 34" fill="none" stroke="#5D4037" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M26 -4 Q50 -30 74 -4" fill="#EF5350" stroke="#C62828" strokeWidth="1" />
        <path d="M26 -4 Q38 -18 50 -4" fill="#E53935" opacity={0.25} />
        <path d="M50 -4 Q62 -18 74 -4" fill="#D32F2F" opacity={0.15} />
        <circle cx="50" cy="-26" r="1.5" fill="#C62828" />
      </g>
    );
  }
  if (level === 4) {
    return (
      <g className="pst">
        <path d="M30 52 Q50 48 70 52 Q72 52 72 54 Q50 50 30 54 Q28 54 30 52" fill="#E53935" />
        <rect x="64" y="52" width="9" height="18" rx="3" fill="#C62828" />
        <rect x="66" y="58" width="5" height="2" rx="1" fill="#EF5350" opacity={0.35} />
        <rect x="66" y="63" width="5" height="2" rx="1" fill="#EF5350" opacity={0.35} />
        {[36, 44, 52, 60].map((x, i) => (
          <circle key={i} cx={x} cy={52} r={1.2} fill="#FFCDD2" opacity={0.25} />
        ))}
      </g>
    );
  }
  if (level === 5) {
    return (
      <g className="pst">
        <path d="M14 100 Q50 114 86 100" fill="none" stroke="#6D4C41" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="100" x2="24" y2="68" stroke="#6D4C41" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="80" y1="100" x2="76" y2="68" stroke="#6D4C41" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="28" y1="70" x2="72" y2="70" stroke="#6D4C41" strokeWidth="2" />
        <line x1="26" y1="78" x2="74" y2="78" stroke="#6D4C41" strokeWidth="2" />
        <path d="M28 82 Q50 92 72 82 L70 98 Q50 106 30 98 Z" fill="#7E57C2" opacity={0.45} />
      </g>
    );
  }
  return null;
}

function GhostPanda() {
  return (
    <g className="ps-ghost">
      <defs>
        <radialGradient id="ps-ghost-aura">
          <stop offset="0%" stopColor="#CE93D8" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#CE93D8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#ps-ghost-aura)" className="ps-breathe" />
      <ellipse cx="50" cy="-2" rx="18" ry="5" fill="none" stroke="#FFD54F" strokeWidth="2.5" opacity={0.6} />
      <ellipse cx="50" cy="-2" rx="14" ry="3.5" fill="#FFD54F" opacity={0.1} />
      <path
        d="M28 30 Q28 4 50 4 Q72 4 72 30 L72 78 Q65 72 58 78 Q52 84 50 78 Q44 84 42 78 Q35 72 28 78 Z"
        fill="white" opacity={0.15} stroke="white" strokeWidth="0.8" strokeOpacity={0.3}
      />
      <ellipse cx="38" cy="30" rx="10" ry="8" fill="white" opacity={0.1} transform="rotate(-5, 38, 30)" />
      <ellipse cx="62" cy="30" rx="10" ry="8" fill="white" opacity={0.1} transform="rotate(5, 62, 30)" />
      <circle cx="38" cy="28" r="5.5" fill="none" stroke="white" strokeWidth="1.2" opacity={0.4} />
      <circle cx="62" cy="28" r="5.5" fill="none" stroke="white" strokeWidth="1.2" opacity={0.4} />
      <circle cx="38" cy="28" r="2" fill="#CE93D8" opacity={0.35} className="ps-glow-eye" />
      <circle cx="62" cy="28" r="2" fill="#CE93D8" opacity={0.35} className="ps-glow-eye2" />
      <ellipse cx="50" cy="37" rx="3" ry="2.2" fill="white" opacity={0.15} />
      <path d="M43 42 Q50 46 57 42" fill="none" stroke="white" strokeWidth="1" opacity={0.2} strokeLinecap="round" />
    </g>
  );
}

export function ScenePanda({ entropy }: { entropy: EntropyResult }) {
  const level = useMemo(() => getLevel(entropy.crackTime), [entropy.crackTime]);

  // Level-specific body class for idle animations
  const bodyClass = [
    'ps-body-bounce',  // 0: happy bounce
    'ps-body-sway',    // 1: gentle sway
    'ps-body-bob',     // 2: sleepy bob
    'ps-body-shudder', // 3: rain shudder
    'ps-body-bob',     // 4: content bob
    'ps-body-shiver',  // 5: cold shiver
  ][level] ?? '';

  return (
    <svg
      viewBox="-5 -35 110 150"
      className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-md"
      role="img"
      aria-label={`Panda character - ${entropy.crackTime} to crack`}
    >
      <defs>
        <style>{`
          .pst { transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }

          /* Breathing - subtle torso scale on all levels */
          .ps-breathe-body { transform-origin: 50px 72px; animation: ps-breathe-body 3.5s ease-in-out infinite; }
          @keyframes ps-breathe-body { 0%,100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.02) scaleX(0.99); } }

          /* Blinking - periodic squish on eye whites */
          .ps-blink { transform-origin: center; animation: ps-blink 4s ease-in-out infinite; }
          @keyframes ps-blink { 0%,42%,48%,100% { transform: scaleY(1); } 45% { transform: scaleY(0.08); } }
          .ps-blink2 { transform-origin: center; animation: ps-blink2 4s ease-in-out infinite; }
          @keyframes ps-blink2 { 0%,42%,48%,92%,98%,100% { transform: scaleY(1); } 45% { transform: scaleY(0.08); } 95% { transform: scaleY(0.08); } }

          /* Ear twitch */
          .ps-ear-twitch { transform-origin: 26px 8px; animation: ps-ear-twitch 5s ease-in-out infinite; }
          @keyframes ps-ear-twitch { 0%,90%,100% { transform: rotate(0deg); } 93% { transform: rotate(-12deg); } 96% { transform: rotate(4deg); } }
          .ps-ear-twitch-r { transform-origin: 74px 8px; animation: ps-ear-twitch-r 6s ease-in-out infinite; }
          @keyframes ps-ear-twitch-r { 0%,85%,100% { transform: rotate(0deg); } 88% { transform: rotate(8deg); } 92% { transform: rotate(-3deg); } }

          /* Level 0: happy bounce */
          .ps-body-bounce { transform-origin: 50px 96px; animation: ps-bounce 1.8s ease-in-out infinite; }
          @keyframes ps-bounce { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-3px); } 60% { transform: translateY(-3px); } }
          .ps-wave-arm { transform-origin: 30px 66px; animation: ps-wave 1.5s ease-in-out infinite; }
          @keyframes ps-wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-22deg); } 75% { transform: rotate(10deg); } }
          /* Level 0: tail wag */
          .ps-tail-wag { transform-origin: 50px 90px; animation: ps-tail-wag 0.8s ease-in-out infinite; }
          @keyframes ps-tail-wag { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }

          /* Level 1: gentle sway */
          .ps-body-sway { transform-origin: 50px 96px; animation: ps-sway 3s ease-in-out infinite; }
          @keyframes ps-sway { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(1.5deg); } }

          /* Level 2: sleepy bob */
          .ps-body-bob { transform-origin: 50px 96px; animation: ps-bob 4s ease-in-out infinite; }
          @keyframes ps-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
          .ps-zzz { animation: ps-float 2s ease-in-out infinite; }
          .ps-zzz2 { animation: ps-float 2s ease-in-out 0.5s infinite; }
          @keyframes ps-float { 0%,100% { transform: translateY(0); opacity: 0.15; } 50% { transform: translateY(-6px); opacity: 0.08; } }
          /* Level 2: head droop */
          .ps-head-droop { transform-origin: 50px 30px; animation: ps-droop 4s ease-in-out infinite; }
          @keyframes ps-droop { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(2deg) translateY(1px); } }

          /* Level 3: rain shudder (startled) */
          .ps-body-shudder { transform-origin: 50px 96px; animation: ps-shudder 6s ease-in-out infinite; }
          @keyframes ps-shudder { 0%,85%,100% { transform: translateX(0); } 87% { transform: translateX(-1.5px); } 89% { transform: translateX(1.5px); } 91% { transform: translateX(-1px); } 93% { transform: translateX(0); } }
          /* Level 3: looking up at rain */
          .ps-head-look-up { transform-origin: 50px 30px; animation: ps-look-up 5s ease-in-out infinite; }
          @keyframes ps-look-up { 0%,70%,100% { transform: rotate(0deg); } 80% { transform: rotate(-3deg); } }

          /* Level 4: happy squint + smile */
          .ps-squint-happy { transform-origin: center; animation: ps-squint 3s ease-in-out infinite; }
          @keyframes ps-squint { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.92); } }

          /* Level 5: cold shiver */
          .ps-body-shiver { transform-origin: 50px 96px; animation: ps-shiver 0.3s ease-in-out infinite; }
          @keyframes ps-shiver { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-0.8px); } 75% { transform: translateX(0.8px); } }
          .ps-cold-breath { transform-origin: 50px 48px; animation: ps-cold-puff 3s ease-in-out infinite; }
          @keyframes ps-cold-puff { 0%,60%,100% { opacity: 0; transform: scale(0.5) translateY(0); } 70% { opacity: 0.3; transform: scale(0.8) translateY(-2px); } 90% { opacity: 0; transform: scale(1.2) translateY(-8px); } }

          /* Ghost (level 6) */
          .ps-ghost { animation: ps-ghost-hover 5s ease-in-out infinite; }
          @keyframes ps-ghost-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          .ps-breathe { animation: ps-breathe 4s ease-in-out infinite; }
          @keyframes ps-breathe { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.06); } }
          .ps-glow-eye { animation: ps-glow 3s ease-in-out infinite; }
          .ps-glow-eye2 { animation: ps-glow 3s ease-in-out 0.5s infinite; }
          @keyframes ps-glow { 0%,100% { opacity: 0.15; } 50% { opacity: 0.5; } }
        `}</style>
      </defs>

      {level === 6 ? <GhostPanda /> : (
        <g className={bodyClass}>
          <g className="ps-breathe-body">
            <PandaBody level={level} />
          </g>
          <g className={level === 2 ? 'ps-head-droop' : level === 3 ? 'ps-head-look-up' : ''}>
            <PandaEyes level={level} />
          </g>
          <PandaMouth level={level} />
          <PandaAccessories level={level} />
          {/* Cold breath puff for level 5 */}
          {level === 5 && (
            <ellipse cx="50" cy="46" rx="4" ry="2.5" fill="white" opacity={0} className="ps-cold-breath" />
          )}
        </g>
      )}
    </svg>
  );
}
