/**
 * 8D Audio Engine + Smart Analysis
 *
 * Creates immersive spatial audio entirely client-side using the Web Audio API.
 * The sound is positioned around the listener's head (best with headphones) with
 * an HRTF PannerNode whose X/Z position is driven by a computed *angle curve*.
 * Because the position comes from a curve (not a fixed oscillator) the rotation
 * can speed up, slow down, fully STOP (hold at a direction) or move between
 * arbitrary directions - all automatable over time.
 *
 * On top of the raw effect it can *analyse* a track (energy, tempo, sections,
 * onsets) and auto-generate an automation timeline - "Smart 8D".
 *
 * The same graph + scheduling powers both real-time preview (AudioContext) and
 * offline export (OfflineAudioContext) so exports match what you hear.
 */

// ---------------------------------------------------------------------------
// Settings & presets (static mode)
// ---------------------------------------------------------------------------

export interface EightDSettings {
  /** Seconds for one full rotation. 0 = rotation stopped (hold at `angle`). */
  rotationSpeed: number
  /** Base direction in degrees (0 = front, 90 = right, 180 = back, 270 = left). */
  angle: number
  /** 0..1 — how wide the panning is (interaural intensity). */
  panDepth: number
  /** 0..1 — wet reverb mix for spaciousness. */
  reverbAmount: number
  /** 0..24 — low-shelf gain in dB. */
  bassBoost: number
  /** 0..1.5 — master output volume. */
  volume: number
  /** Rotation direction. */
  direction: "cw" | "ccw"
}

export const DEFAULT_SETTINGS: EightDSettings = {
  rotationSpeed: 8,
  angle: 0,
  panDepth: 0.7,
  reverbAmount: 0.35,
  bassBoost: 3,
  volume: 1,
  direction: "cw",
}

export interface EightDPreset {
  id: string
  name: string
  description: string
  settings: EightDSettings
}

export const PRESETS: EightDPreset[] = [
  {
    id: "classic",
    name: "Classic 8D",
    description: "The signature slow orbit with a touch of reverb",
    settings: { rotationSpeed: 8, angle: 0, panDepth: 0.7, reverbAmount: 0.35, bassBoost: 3, volume: 1, direction: "cw" },
  },
  {
    id: "deep",
    name: "Deep Space",
    description: "Wide panning, heavy reverb and bass",
    settings: { rotationSpeed: 12, angle: 0, panDepth: 0.95, reverbAmount: 0.6, bassBoost: 6, volume: 1, direction: "cw" },
  },
  {
    id: "fast",
    name: "Fast Spin",
    description: "Quick, energetic rotation",
    settings: { rotationSpeed: 4, angle: 0, panDepth: 0.85, reverbAmount: 0.25, bassBoost: 2, volume: 1, direction: "cw" },
  },
  {
    id: "hold",
    name: "Hold (no spin)",
    description: "Rotation stopped - sound sits at the chosen direction",
    settings: { rotationSpeed: 0, angle: 90, panDepth: 0.8, reverbAmount: 0.4, bassBoost: 3, volume: 1, direction: "cw" },
  },
]

// ---------------------------------------------------------------------------
// Automation keyframes
// ---------------------------------------------------------------------------

/** A single automation point. Every field is interpolated over time. */
export interface Keyframe {
  id: string
  time: number
  rotationSpeed: number
  angle: number
  panDepth: number
  reverbAmount: number
  bassBoost: number
}

export type AutomatableParam = "rotationSpeed" | "angle" | "panDepth" | "reverbAmount" | "bassBoost"

export interface ParamMeta {
  key: AutomatableParam
  label: string
  min: number
  max: number
  step: number
  /** RGB triple for the timeline lane colour. */
  color: string
  format: (v: number) => string
}

const DIRECTION_LABEL = (deg: number): string => {
  const d = ((deg % 360) + 360) % 360
  if (d < 23 || d >= 338) return "front"
  if (d < 68) return "fr-right"
  if (d < 113) return "right"
  if (d < 158) return "bk-right"
  if (d < 203) return "back"
  if (d < 248) return "bk-left"
  if (d < 293) return "left"
  return "fr-left"
}

export const PARAM_META: Record<AutomatableParam, ParamMeta> = {
  rotationSpeed: {
    key: "rotationSpeed",
    label: "Rotation",
    min: 0,
    max: 20,
    step: 0.5,
    color: "56, 189, 248", // sky-400
    format: (v) => (v <= 0.05 ? "Hold" : `${v.toFixed(1)}s`),
  },
  angle: {
    key: "angle",
    label: "Direction",
    min: 0,
    max: 360,
    step: 5,
    color: "245, 158, 11", // amber-500
    format: (v) => `${Math.round(v)}° ${DIRECTION_LABEL(v)}`,
  },
  panDepth: {
    key: "panDepth",
    label: "Pan width",
    min: 0,
    max: 1,
    step: 0.01,
    color: "16, 185, 129", // emerald-500
    format: (v) => `${Math.round(v * 100)}%`,
  },
  reverbAmount: {
    key: "reverbAmount",
    label: "Reverb",
    min: 0,
    max: 1,
    step: 0.01,
    color: "168, 85, 247", // purple-500
    format: (v) => `${Math.round(v * 100)}%`,
  },
  bassBoost: {
    key: "bassBoost",
    label: "Bass",
    min: 0,
    max: 18,
    step: 0.5,
    color: "244, 63, 94", // rose-500
    format: (v) => `+${v.toFixed(1)}dB`,
  },
}

export const PARAM_ORDER: AutomatableParam[] = ["rotationSpeed", "angle", "panDepth", "reverbAmount", "bassBoost"]

let keyframeCounter = 0
export function makeKeyframe(time: number, values: Omit<Keyframe, "id" | "time">): Keyframe {
  keyframeCounter += 1
  return { id: `kf-${keyframeCounter}`, time, ...values }
}

export function keyframeFromSettings(time: number, s: EightDSettings): Keyframe {
  return makeKeyframe(time, {
    rotationSpeed: s.rotationSpeed,
    angle: s.angle,
    panDepth: s.panDepth,
    reverbAmount: s.reverbAmount,
    bassBoost: s.bassBoost,
  })
}

export interface AutomationValues {
  rotationSpeed: number
  angle: number
  panDepth: number
  reverbAmount: number
  bassBoost: number
}

/** Linearly interpolates automation values at a given song time. */
export function sampleAutomation(keyframes: Keyframe[], time: number): AutomationValues {
  if (keyframes.length === 0) {
    return { rotationSpeed: 8, angle: 0, panDepth: 0.7, reverbAmount: 0.35, bassBoost: 3 }
  }
  const s = keyframes
  if (time <= s[0].time) return pick(s[0])
  if (time >= s[s.length - 1].time) return pick(s[s.length - 1])
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]
    const b = s[i + 1]
    if (time >= a.time && time <= b.time) {
      const t = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time)
      return {
        rotationSpeed: lerp(a.rotationSpeed, b.rotationSpeed, t),
        angle: lerpAngle(a.angle, b.angle, t),
        panDepth: lerp(a.panDepth, b.panDepth, t),
        reverbAmount: lerp(a.reverbAmount, b.reverbAmount, t),
        bassBoost: lerp(a.bassBoost, b.bassBoost, t),
      }
    }
  }
  return pick(s[s.length - 1])
}

function pick(k: Keyframe): AutomationValues {
  return {
    rotationSpeed: k.rotationSpeed,
    angle: k.angle,
    panDepth: k.panDepth,
    reverbAmount: k.reverbAmount,
    bassBoost: k.bassBoost,
  }
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
/** Interpolate angles along the shortest path (handles 350° → 10°). */
function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180
  return a + diff * t
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

function radiusFor(panDepth: number): number {
  return 0.6 + panDepth * 9.4
}
function dryFor(reverbAmount: number): number {
  return 1 - reverbAmount * 0.6
}
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}
function isSpinning(rotationSpeed: number): boolean {
  return rotationSpeed > 0.05
}

/**
 * Generates a synthetic room impulse response (exponentially decaying stereo
 * noise) for the convolution reverb. Avoids shipping an audio asset.
 */
export function createReverbImpulse(ctx: BaseAudioContext, duration = 2.6, decay = 3.2): AudioBuffer {
  const rate = ctx.sampleRate
  const length = Math.max(1, Math.floor(rate * duration))
  const impulse = ctx.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
    }
  }
  return impulse
}

export interface EightDGraph {
  panner: PannerNode
  bass: BiquadFilterNode
  dryGain: GainNode
  wetGain: GainNode
  convolver: ConvolverNode
  master: GainNode
}

/**
 * Builds the 8D processing graph from `source` to the context destination.
 * Position is scheduled separately via `scheduleTimeline`. When `analyser` is
 * provided (real-time preview) it is tapped off the master bus.
 */
export function buildGraph(ctx: BaseAudioContext, source: AudioNode, analyser?: AnalyserNode | null): EightDGraph {
  const bass = ctx.createBiquadFilter()
  bass.type = "lowshelf"
  bass.frequency.value = 220
  bass.gain.value = 0

  const panner = ctx.createPanner()
  panner.panningModel = "HRTF"
  panner.distanceModel = "linear"
  panner.rolloffFactor = 0
  panner.positionY.value = 0

  const convolver = ctx.createConvolver()
  convolver.buffer = createReverbImpulse(ctx)

  const dryGain = ctx.createGain()
  const wetGain = ctx.createGain()
  const master = ctx.createGain()

  source.connect(bass)
  bass.connect(panner)
  panner.connect(dryGain)
  panner.connect(convolver)
  convolver.connect(wetGain)
  dryGain.connect(master)
  wetGain.connect(master)
  master.connect(ctx.destination)
  if (analyser) master.connect(analyser)

  return { panner, bass, dryGain, wetGain, convolver, master }
}

/** Disconnects every node so a superseded graph can be garbage collected. */
export function disposeGraph(graph: EightDGraph): void {
  for (const node of [graph.bass, graph.panner, graph.dryGain, graph.wetGain, graph.convolver, graph.master]) {
    try {
      node.disconnect()
    } catch {
      /* ignore */
    }
  }
}

const CONTROL_RATE = 60 // position curve samples per second

/**
 * Computes the panner X/Z position curves over [fromTime, toTime] by integrating
 * the rotation speed (spin phase) and adding the base `angle` offset. Rotation
 * stops wherever rotationSpeed is ~0, holding the last direction.
 */
function computeCurves(
  keyframes: Keyframe[],
  direction: "cw" | "ccw",
  fromTime: number,
  toTime: number
): { posX: Float32Array; posZ: Float32Array; duration: number } {
  const dir = direction === "cw" ? 1 : -1
  const dt = 1 / CONTROL_RATE
  const span = Math.max(dt, toTime - fromTime)
  const n = Math.max(2, Math.ceil(span * CONTROL_RATE) + 1)
  const posX = new Float32Array(n)
  const posZ = new Float32Array(n)

  // Spin phase accumulated from the very start up to fromTime (continuity).
  let phase = 0
  for (let t = 0; t < fromTime; t += dt) {
    const speed = sampleAutomation(keyframes, t + dt / 2).rotationSpeed
    if (isSpinning(speed)) phase += (Math.PI * 2 * dt) / speed
  }

  for (let i = 0; i < n; i++) {
    const t = fromTime + i * dt
    const s = sampleAutomation(keyframes, t)
    const r = radiusFor(s.panDepth)
    const total = phase * dir + degToRad(s.angle)
    posX[i] = r * Math.sin(total)
    posZ[i] = r * Math.cos(total)
    if (isSpinning(s.rotationSpeed)) phase += (Math.PI * 2 * dt) / s.rotationSpeed
  }
  return { posX, posZ, duration: (n - 1) * dt }
}

/** Orbit angle (radians) at a song time - used by the visualiser. */
export function orbitAngleAt(keyframes: Keyframe[], direction: "cw" | "ccw", time: number): number {
  const dir = direction === "cw" ? 1 : -1
  const dt = 1 / 30
  let phase = 0
  for (let t = 0; t < time; t += dt) {
    const speed = sampleAutomation(keyframes, t + dt / 2).rotationSpeed
    if (isSpinning(speed)) phase += (Math.PI * 2 * dt) / speed
  }
  return phase * dir + degToRad(sampleAutomation(keyframes, time).angle)
}

/**
 * Schedules the automation timeline onto a graph, relative to playback start
 * (`startWhen`, context time), the song offset playback begins from
 * (`songOffset`), and the song's total duration.
 */
export function scheduleTimeline(
  ctx: BaseAudioContext,
  graph: EightDGraph,
  keyframes: Keyframe[],
  direction: "cw" | "ccw",
  volume: number,
  startWhen: number,
  songOffset: number,
  songDuration: number
): void {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  const at = sampleAutomation(sorted, songOffset)

  graph.master.gain.cancelScheduledValues(startWhen)
  graph.master.gain.setValueAtTime(volume, startWhen)

  const anchor = (param: AudioParam, value: number) => {
    param.cancelScheduledValues(startWhen)
    param.setValueAtTime(value, startWhen)
  }
  anchor(graph.wetGain.gain, at.reverbAmount)
  anchor(graph.dryGain.gain, dryFor(at.reverbAmount))
  anchor(graph.bass.gain, at.bassBoost)

  for (const kf of sorted) {
    if (kf.time <= songOffset) continue
    const when = startWhen + (kf.time - songOffset)
    graph.wetGain.gain.linearRampToValueAtTime(kf.reverbAmount, when)
    graph.dryGain.gain.linearRampToValueAtTime(dryFor(kf.reverbAmount), when)
    graph.bass.gain.linearRampToValueAtTime(kf.bassBoost, when)
  }

  // Position curves (rotation + direction, incl. stops).
  const { posX, posZ, duration } = computeCurves(sorted, direction, songOffset, songDuration)
  graph.panner.positionX.cancelScheduledValues(startWhen)
  graph.panner.positionZ.cancelScheduledValues(startWhen)
  graph.panner.positionX.setValueCurveAtTime(posX, startWhen, Math.max(0.02, duration))
  graph.panner.positionZ.setValueCurveAtTime(posZ, startWhen, Math.max(0.02, duration))
}

/** Renders an automation timeline to a new stereo AudioBuffer offline. */
export async function render8D(
  audioBuffer: AudioBuffer,
  keyframes: Keyframe[],
  direction: "cw" | "ccw",
  volume: number
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(2, audioBuffer.length, audioBuffer.sampleRate)
  const source = offline.createBufferSource()
  source.buffer = audioBuffer
  const graph = buildGraph(offline, source)
  scheduleTimeline(offline, graph, keyframes, direction, volume, 0, 0, audioBuffer.duration)
  source.start()
  return offline.startRendering()
}

/** Encodes an AudioBuffer to a 16-bit PCM WAV Blob. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numFrames * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" })
}

// ---------------------------------------------------------------------------
// Smart analysis
// ---------------------------------------------------------------------------

export type EnergyBand = "low" | "mid" | "high"

export interface Section {
  start: number
  end: number
  level: number
  band: EnergyBand
}

export interface AnalysisResult {
  duration: number
  bpm: number | null
  peaks: number[]
  energy: number[]
  hop: number
  sections: Section[]
  onsets: number[]
}

/**
 * Analyses a decoded AudioBuffer: waveform, energy envelope, tempo (via onset
 * autocorrelation), low/mid/high sections and prominent onsets. Synchronous.
 */
export function analyzeAudio(buffer: AudioBuffer): AnalysisResult {
  const sr = buffer.sampleRate
  const length = buffer.length
  const duration = buffer.duration

  const mono = new Float32Array(length)
  const chans = buffer.numberOfChannels
  for (let c = 0; c < chans; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) mono[i] += data[i] / chans
  }

  const PEAK_BUCKETS = 2000
  const peaks = new Array(PEAK_BUCKETS).fill(0)
  const bucketSize = Math.max(1, Math.floor(length / PEAK_BUCKETS))
  let peakMax = 1e-6
  for (let b = 0; b < PEAK_BUCKETS; b++) {
    let m = 0
    const start = b * bucketSize
    const end = Math.min(length, start + bucketSize)
    for (let i = start; i < end; i++) {
      const v = Math.abs(mono[i])
      if (v > m) m = v
    }
    peaks[b] = m
    if (m > peakMax) peakMax = m
  }
  for (let b = 0; b < PEAK_BUCKETS; b++) peaks[b] /= peakMax

  const hopSamples = Math.max(1, Math.floor(sr * 0.05))
  const hop = hopSamples / sr
  const numHops = Math.max(1, Math.floor(length / hopSamples))
  const rawEnergy = new Float32Array(numHops)
  let energyMax = 1e-6
  for (let h = 0; h < numHops; h++) {
    let sum = 0
    const start = h * hopSamples
    const end = Math.min(length, start + hopSamples)
    for (let i = start; i < end; i++) sum += mono[i] * mono[i]
    const rms = Math.sqrt(sum / Math.max(1, end - start))
    rawEnergy[h] = rms
    if (rms > energyMax) energyMax = rms
  }

  const energy: number[] = new Array(numHops)
  const win = 3
  for (let h = 0; h < numHops; h++) {
    let s = 0
    let n = 0
    for (let k = -win; k <= win; k++) {
      const idx = h + k
      if (idx >= 0 && idx < numHops) {
        s += rawEnergy[idx]
        n++
      }
    }
    energy[h] = s / n / energyMax
  }

  const flux = new Float32Array(numHops)
  for (let h = 1; h < numHops; h++) {
    const d = energy[h] - energy[h - 1]
    flux[h] = d > 0 ? d : 0
  }

  const bpm = estimateBpm(flux, hop)
  const onsets = detectOnsets(flux, hop, energy)
  const sections = detectSections(energy, hop, duration)

  return { duration, bpm, peaks, energy, hop, sections, onsets }
}

function estimateBpm(flux: Float32Array, hop: number): number | null {
  const n = flux.length
  if (n < 20) return null
  const minLag = Math.max(1, Math.round(60 / 180 / hop))
  const maxLag = Math.min(n - 1, Math.round(60 / 60 / hop))
  let bestLag = -1
  let bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0
    for (let i = lag; i < n; i++) score += flux[i] * flux[i - lag]
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  if (bestLag <= 0) return null
  let bpm = 60 / (bestLag * hop)
  while (bpm < 70) bpm *= 2
  while (bpm > 180) bpm /= 2
  return Math.round(bpm)
}

function detectOnsets(flux: Float32Array, hop: number, energy: number[]): number[] {
  const n = flux.length
  const onsets: number[] = []
  const w = 10
  const minGap = Math.max(1, Math.round(0.4 / hop))
  let lastIdx = -minGap
  for (let h = 1; h < n - 1; h++) {
    let mean = 0
    let cnt = 0
    for (let k = -w; k <= w; k++) {
      const idx = h + k
      if (idx >= 0 && idx < n) {
        mean += flux[idx]
        cnt++
      }
    }
    mean /= cnt
    const isPeak = flux[h] > flux[h - 1] && flux[h] >= flux[h + 1]
    if (isPeak && flux[h] > mean * 2.2 && flux[h] > 0.02 && energy[h] > 0.25) {
      if (h - lastIdx >= minGap) {
        onsets.push(h * hop)
        lastIdx = h
      }
    }
  }
  return onsets
}

function detectSections(energy: number[], hop: number, duration: number): Section[] {
  const n = energy.length
  if (n === 0) return [{ start: 0, end: duration, level: 0.5, band: "mid" }]

  const sorted = [...energy].sort((a, b) => a - b)
  const lowT = sorted[Math.floor(n * 0.33)]
  const highT = sorted[Math.floor(n * 0.66)]
  const bandFor = (v: number): EnergyBand => (v < lowT ? "low" : v > highT ? "high" : "mid")

  const minHops = Math.max(1, Math.round(3 / hop))
  const raw: { band: EnergyBand; start: number; end: number; sum: number; count: number }[] = []
  let cur = { band: bandFor(energy[0]), start: 0, end: 1, sum: energy[0], count: 1 }
  for (let h = 1; h < n; h++) {
    const band = bandFor(energy[h])
    if (band === cur.band) {
      cur.end = h + 1
      cur.sum += energy[h]
      cur.count++
    } else {
      raw.push(cur)
      cur = { band, start: h, end: h + 1, sum: energy[h], count: 1 }
    }
  }
  raw.push(cur)

  const merged: typeof raw = []
  for (const seg of raw) {
    if (seg.end - seg.start < minHops && merged.length > 0) {
      const prev = merged[merged.length - 1]
      prev.end = seg.end
      prev.sum += seg.sum
      prev.count += seg.count
    } else {
      merged.push({ ...seg })
    }
  }

  return merged.map((seg) => {
    const level = seg.sum / seg.count
    return { start: seg.start * hop, end: Math.min(duration, seg.end * hop), level, band: bandFor(level) }
  })
}

// ---------------------------------------------------------------------------
// Smart 8D keyframe generation
// ---------------------------------------------------------------------------

export interface SmartOptions {
  direction: "cw" | "ccw"
  intensity?: number
}

/**
 * Generates an automation timeline from an analysis: derives a musical base
 * rotation from the tempo, sets per-section targets (high energy = faster/wider,
 * quiet = slower/narrower with more reverb), nudges the base direction per
 * section for variety, and adds gentle accents at prominent onsets.
 */
export function generateSmart8D(analysis: AnalysisResult, opts: SmartOptions): Keyframe[] {
  const intensity = opts.intensity ?? 1
  const { bpm, sections, duration, onsets } = analysis

  let baseRotation = 8
  if (bpm && bpm > 0) baseRotation = clamp((8 * 60) / bpm, 3, 16)

  const targetFor = (band: EnergyBand, angle: number): AutomationValues => {
    if (band === "high")
      return { rotationSpeed: clamp(baseRotation * 0.6, 2, 20), angle, panDepth: clamp(0.75 + 0.2 * intensity, 0, 1), reverbAmount: 0.28, bassBoost: 5 }
    if (band === "low")
      return { rotationSpeed: clamp(baseRotation * 1.6, 2, 20), angle, panDepth: clamp(0.4 + 0.05 * intensity, 0, 1), reverbAmount: 0.55, bassBoost: 2 }
    return { rotationSpeed: baseRotation, angle, panDepth: clamp(0.6 + 0.1 * intensity, 0, 1), reverbAmount: 0.4, bassBoost: 3 }
  }

  const keyframes: Keyframe[] = []
  const pushAt = (time: number, v: AutomationValues) => keyframes.push(makeKeyframe(clamp(time, 0, duration), { ...v }))

  if (sections.length === 0) {
    pushAt(0, targetFor("mid", 0))
    pushAt(duration, targetFor("mid", 0))
    return keyframes
  }

  pushAt(0, targetFor(sections[0].band, 0))
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]
    const t = i === 0 ? Math.min(0.5, sec.start) : sec.start
    pushAt(t, targetFor(sec.band, 0))
  }
  pushAt(duration, targetFor(sections[sections.length - 1].band, 0))

  for (const onset of onsets) {
    if (onset < 1 || onset > duration - 1) continue
    const base = sampleAutomation(
      keyframes.slice().sort((a, b) => a.time - b.time),
      onset
    )
    pushAt(onset, {
      ...base,
      panDepth: clamp(base.panDepth + 0.15 * intensity, 0, 1),
      rotationSpeed: clamp(base.rotationSpeed * 0.85, 2, 20),
    })
  }

  return keyframes.sort((a, b) => a.time - b.time)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export const BAND_COLORS: Record<EnergyBand, string> = {
  low: "148, 163, 184",
  mid: "56, 189, 248",
  high: "168, 85, 247",
}
