/// <reference lib="webworker" />
// Stem-splitter worker: owns the ONNX session, runs HTDemucs separation off the
// main thread. Wraps the vendored DemucsProcessor (see ./vendor/README.md).
import * as ort from 'onnxruntime-web/webgpu';
// vendored JS (see ./vendor/README.md) — typed as any via allowJs
import { DemucsProcessor } from './vendor/index.js';

// Self-hosted WASM binaries (see public/ort/). Keeps everything same-origin:
// no CDN, works offline, and no audio-adjacent request leaves the device.
ort.env.wasm.wasmPaths = '/ort/';

const MODEL_URL =
  'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx';
const MODEL_CACHE = 'stem-splitter-models-v1';

type InMsg = {
  type: 'separate';
  left: Float32Array;
  right: Float32Array;
  modelUrl?: string;
};
type Stem = { name: string; left: Float32Array; right: Float32Array };

/** Fetch the model, caching it in the Cache API so later runs skip the download. */
async function loadModelBuffer(url: string): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE);
  const cached = await cache.match(url);
  if (cached) return cached.arrayBuffer();

  const res = await fetch(url);
  if (!res.ok || !res.body)
    throw new Error(`Model download failed: ${res.status}`);

  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    post({ type: 'download', loaded, total });
  }
  const buf = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  // Re-create a Response to cache; the reader consumed the original.
  await cache.put(
    url,
    new Response(buf, { headers: { 'Content-Length': String(loaded) } })
  );
  return buf.buffer;
}

function post(msg: Record<string, unknown>, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(msg, transfer);
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const { type } = e.data;
  if (type !== 'separate') return;
  try {
    const backend = 'gpu' in navigator && navigator.gpu ? 'webgpu' : 'wasm';
    post({ type: 'ready', backend });

    const modelBuffer = await loadModelBuffer(e.data.modelUrl || MODEL_URL);

    const proc = new DemucsProcessor({
      ort,
      onProgress: (p: {
        progress: number;
        currentSegment: number;
        totalSegments: number;
      }) => post({ type: 'progress', ...p }),
      onLog: (category: string, message: string) =>
        post({ type: 'log', category, message })
    });
    await proc.loadModel(modelBuffer);

    const t0 = performance.now();
    const out = await proc.separate(e.data.left, e.data.right);
    const processingTimeMs = performance.now() - t0;

    const stems: Stem[] = (['vocals', 'drums', 'bass', 'other'] as const).map(
      (name) => ({
        name,
        left: out[name].left as Float32Array,
        right: out[name].right as Float32Array
      })
    );
    const transfer = stems.flatMap((s) => [s.left.buffer, s.right.buffer]);
    post({ type: 'result', stems, processingTimeMs }, transfer);
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
};
