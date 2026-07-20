/** One audio region placed on the timeline. Buffers stay in memory (not serialized). */
export type AudioClip = {
  id: string;
  name: string;
  /** Decoded source audio. */
  buffer: AudioBuffer;
  /** Precomputed waveform peaks (max abs amplitude per bucket) for the whole source. */
  peaks: Float32Array;
  peaksPerSecond: number;
  /** Seconds on the timeline where this clip starts playing. */
  start: number;
  /** Seconds into the source buffer where playback begins (trim-in). */
  offset: number;
  /** Seconds of source to play. */
  duration: number;
};

let clipCounter = 0;
export function newClipId(): string {
  clipCounter += 1;
  return `clip-${clipCounter}`;
}

export const clipEnd = (clip: AudioClip): number => clip.start + clip.duration;

/** Keep start/offset/duration within the source buffer's bounds after an edit. */
export function clampClip(clip: AudioClip): AudioClip {
  const srcLen = clip.buffer.duration;
  const offset = Math.min(Math.max(0, clip.offset), Math.max(0, srcLen - 0.05));
  const duration = Math.min(Math.max(0.05, clip.duration), srcLen - offset);
  const start = Math.max(0, clip.start);
  return { ...clip, offset, duration, start };
}

/** Decode an uploaded audio file into an AudioBuffer. */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } finally {
    void ctx.close();
  }
}

/** Downsample channel 0 to per-bucket peak amplitudes for waveform rendering. */
export function computePeaks(
  buffer: AudioBuffer,
  peaksPerSecond = 120
): Float32Array {
  const data = buffer.getChannelData(0);
  const bucketCount = Math.max(1, Math.ceil(buffer.duration * peaksPerSecond));
  const samplesPerBucket = Math.max(1, Math.floor(data.length / bucketCount));
  const peaks = new Float32Array(bucketCount);
  for (let b = 0; b < bucketCount; b++) {
    let peak = 0;
    const start = b * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, data.length);
    for (let i = start; i < end; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
    peaks[b] = peak;
  }
  return peaks;
}

export function createClip(name: string, buffer: AudioBuffer): AudioClip {
  return {
    id: newClipId(),
    name,
    buffer,
    peaks: computePeaks(buffer),
    peaksPerSecond: 120,
    start: 0,
    offset: 0,
    duration: buffer.duration
  };
}

/** Split a clip at a timeline time, returning [left, right] (or null if out of range). */
export function splitClip(
  clip: AudioClip,
  atTime: number
): [AudioClip, AudioClip] | null {
  const local = atTime - clip.start;
  if (local <= 0.01 || local >= clip.duration - 0.01) return null;
  const left: AudioClip = { ...clip, duration: local };
  const right: AudioClip = {
    ...clip,
    id: newClipId(),
    start: atTime,
    offset: clip.offset + local,
    duration: clip.duration - local
  };
  return [left, right];
}

/**
 * Mix all clips into a single AudioBuffer covering [0, totalSeconds], each clip
 * placed at its timeline position. Lets the video exporter stay single-track:
 * it always receives one buffer regardless of how many clips are arranged.
 */
export async function mixClips(
  clips: AudioClip[],
  totalSeconds: number
): Promise<AudioBuffer | null> {
  if (!clips.length || totalSeconds <= 0) return null;
  const sampleRate = clips[0].buffer.sampleRate;
  const frames = Math.ceil(totalSeconds * sampleRate);
  const ctx = new OfflineAudioContext(2, frames, sampleRate);
  for (const clip of clips) {
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    source.connect(ctx.destination);
    // start(when, offsetIntoSource, playDuration)
    source.start(clip.start, clip.offset, clip.duration);
  }
  return await ctx.startRendering();
}
