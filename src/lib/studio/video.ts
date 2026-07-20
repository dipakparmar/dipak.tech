import { StaticCanvas } from 'fabric';

import {
  animationDuration,
  applyAnimationAtTime
} from '@/lib/studio/animation';

export type VideoFormat = 'mp4' | 'webm';

export type VideoRenderOptions = {
  fps?: number;
  /** Extra seconds to hold the final frame at the end. */
  holdSeconds?: number;
  /**
   * Minimum video length in seconds - the render holds the final animation
   * frame until this time so a longer audio track plays out in full.
   */
  extendToSeconds?: number;
  /** Optional decoded audio track, muxed in and trimmed to the video length. */
  audio?: AudioBuffer | null;
  onProgress?: (fraction: number) => void;
};

/** MP4/H.264 export (Instagram-compatible) needs WebCodecs + a canvas source. */
export function isMp4ExportSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
  );
}

/** Pick the best WebM codec MediaRecorder can produce (fallback path). */
function pickWebmMime(withAudio = false): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = withAudio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export function isWebmExportSupported(): boolean {
  return (
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype &&
    pickWebmMime() !== null
  );
}

/** Feed a decoded AudioBuffer into an AAC AudioEncoder, trimmed to maxSeconds. */
function encodeAudioBuffer(
  encoder: AudioEncoder,
  buffer: AudioBuffer,
  maxSeconds: number
): void {
  const channelCount = buffer.numberOfChannels;
  const { sampleRate, length } = buffer;
  const maxSamples = Math.min(length, Math.ceil(maxSeconds * sampleRate));
  const channels = Array.from({ length: channelCount }, (_, c) =>
    buffer.getChannelData(c)
  );
  const FRAME = 1024;
  for (let start = 0; start < maxSamples; start += FRAME) {
    const n = Math.min(FRAME, maxSamples - start);
    // Planar layout: all of channel 0, then channel 1, ...
    const planar = new Float32Array(n * channelCount);
    for (let c = 0; c < channelCount; c++)
      planar.set(channels[c].subarray(start, start + n), c * n);
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: n,
      numberOfChannels: channelCount,
      timestamp: Math.round((start / sampleRate) * 1_000_000),
      data: planar
    });
    encoder.encode(audioData);
    audioData.close();
  }
}

export function supportedVideoFormats(): VideoFormat[] {
  const formats: VideoFormat[] = [];
  if (isMp4ExportSupported()) formats.push('mp4');
  if (isWebmExportSupported()) formats.push('webm');
  return formats;
}

/** Load a page's JSON onto an offscreen full-res canvas and return it + duration. */
async function prepareOffscreen(json: string, width: number, height: number) {
  // H.264 requires even dimensions (yuv420). Presets are 1080-wide; guard anyway.
  const w = width - (width % 2);
  const h = height - (height % 2);
  const offscreen = new StaticCanvas(undefined, {
    width: w,
    height: h,
    enableRetinaScaling: false
  });
  await offscreen.loadFromJSON(JSON.parse(json));
  const duration = animationDuration(offscreen);
  return { offscreen, width: w, height: h, duration };
}

/**
 * Render the animation to an MP4/H.264 blob via WebCodecs, muxed with mp4-muxer.
 * Frame-exact (renders each frame offline, not in real time) and Instagram-ready:
 * H.264 video, moov atom at the front (fastStart).
 */
async function recordPageMp4(
  json: string,
  width: number,
  height: number,
  options: VideoRenderOptions
): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const fps = options.fps ?? 30;
  const hold = options.holdSeconds ?? 0.6;

  const {
    offscreen,
    width: w,
    height: h,
    duration: animDuration
  } = await prepareOffscreen(json, width, height);
  try {
    const duration = Math.max(animDuration, options.extendToSeconds ?? 0);
    if (duration <= 0)
      throw new Error('This design has no animation or audio to record.');

    // Prefer High profile, fall back to Main/Baseline at level 4.0.
    const codec = await firstSupportedCodec(
      ['avc1.640028', 'avc1.4D0028', 'avc1.42E028'],
      w,
      h,
      fps
    );
    if (!codec) throw new Error('No supported H.264 encoder configuration.');

    const audio = options.audio ?? null;
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: w, height: h },
      ...(audio && {
        audio: {
          codec: 'aac',
          numberOfChannels: audio.numberOfChannels,
          sampleRate: audio.sampleRate
        }
      }),
      fastStart: 'in-memory'
    });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        throw e;
      }
    });
    encoder.configure({
      codec,
      width: w,
      height: h,
      bitrate: 10_000_000,
      framerate: fps
    });

    const total = duration + hold;
    const el = offscreen.getElement();
    const totalFrames = Math.max(1, Math.ceil(total * fps));
    const frameMicros = 1_000_000 / fps;
    for (let i = 0; i < totalFrames; i++) {
      applyAnimationAtTime(offscreen, Math.min(i / fps, animDuration));
      offscreen.renderAll();
      const frame = new VideoFrame(el, {
        timestamp: Math.round(i * frameMicros),
        duration: Math.round(frameMicros)
      });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      options.onProgress?.((i + 1) / totalFrames);
      // Keep the encoder queue bounded so memory stays flat on long clips.
      if (encoder.encodeQueueSize > 8)
        await new Promise((r) => setTimeout(r, 0));
    }
    await encoder.flush();

    if (audio) {
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
          throw e;
        }
      });
      audioEncoder.configure({
        codec: 'mp4a.40.2', // AAC-LC
        numberOfChannels: audio.numberOfChannels,
        sampleRate: audio.sampleRate,
        bitrate: 128_000
      });
      encodeAudioBuffer(audioEncoder, audio, total);
      await audioEncoder.flush();
    }

    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  } finally {
    void offscreen.dispose();
  }
}

async function firstSupportedCodec(
  candidates: string[],
  width: number,
  height: number,
  framerate: number
): Promise<string | null> {
  for (const codec of candidates) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        framerate
      });
      if (supported) return codec;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Render the animation to a WebM blob via MediaRecorder (fallback for browsers
 * without WebCodecs). Records in real time at full canvas resolution.
 */
async function recordPageWebm(
  json: string,
  width: number,
  height: number,
  options: VideoRenderOptions
): Promise<Blob> {
  const audio = options.audio ?? null;
  const mimeType = pickWebmMime(!!audio);
  if (!mimeType) throw new Error('This browser cannot record WebM video.');
  const fps = options.fps ?? 30;
  const hold = options.holdSeconds ?? 0.6;

  const { offscreen, duration: animDuration } = await prepareOffscreen(
    json,
    width,
    height
  );
  const duration = Math.max(animDuration, options.extendToSeconds ?? 0);
  let audioCtx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  try {
    if (duration <= 0)
      throw new Error('This design has no animation or audio to record.');

    const videoStream = offscreen.getElement().captureStream(fps);
    let stream = videoStream;
    if (audio) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      source = audioCtx.createBufferSource();
      source.buffer = audio;
      source.connect(dest);
      stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 12_000_000
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    applyAnimationAtTime(offscreen, 0);
    offscreen.renderAll();
    recorder.start();
    source?.start();

    const total = duration + hold;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const elapsed = (performance.now() - start) / 1000;
        applyAnimationAtTime(offscreen, Math.min(elapsed, animDuration));
        offscreen.renderAll();
        options.onProgress?.(Math.min(elapsed / total, 1));
        if (elapsed >= total) {
          resolve();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    recorder.stop();
    return await stopped;
  } finally {
    try {
      source?.stop();
    } catch {
      // already stopped
    }
    void audioCtx?.close();
    void offscreen.dispose();
  }
}

/** Render a page's keyframe animation to a video blob in the requested format. */
export async function recordPageVideo(
  format: VideoFormat,
  json: string,
  width: number,
  height: number,
  options: VideoRenderOptions = {}
): Promise<Blob> {
  return format === 'mp4'
    ? recordPageMp4(json, width, height, options)
    : recordPageWebm(json, width, height, options);
}
