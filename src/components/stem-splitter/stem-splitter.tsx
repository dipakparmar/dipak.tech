'use client'

// Client-side HTDemucs stem separation. Decodes on the main thread (Web Audio),
// runs the model in a worker (see src/lib/stem-splitter/worker.ts), encodes each
// stem to WAV, and previews them in a synced multitrack player.
import { Download, FileAudio, Loader2, X } from 'lucide-react'
import { PlayerStem, StemPlayer } from '@/components/stem-splitter/stem-player'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { audioBufferToWav } from '@/lib/eight-d-audio'
import { zipSync } from 'fflate'

type WorkerStem = { name: string; left: Float32Array; right: Float32Array }
type Stem = PlayerStem & { blob: Blob }

const HTDEMUCS_RATE = 44100
const STEM_ORDER = ['vocals', 'drums', 'bass', 'other'] as const

export function StemSplitter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [backend, setBackend] = useState<string | null>(null)
  const [target, setTarget] = useState<number | null>(null) // real progress target 0..100
  const [displayed, setDisplayed] = useState(0) // eased value shown in the bar
  const [stems, setStems] = useState<Stem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  // Ease the bar toward the real target so per-segment updates glide instead of jump.
  useEffect(() => {
    if (target === null) return
    let raf = 0
    const step = () => {
      setDisplayed((d) => {
        const next = d + (target - d) * 0.12
        return Math.abs(target - next) < 0.2 ? target : next
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])

  const reset = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    stems.forEach((s) => URL.revokeObjectURL(s.url))
    setFileName(null)
    setStems([])
    setError(null)
    setBusy(false)
    setStatus('')
    setBackend(null)
    setTarget(null)
    setDisplayed(0)
  }, [stems])

  const run = useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    setStems([])
    setBackend(null)
    setTarget(null)
    setDisplayed(0)
    setFileName(file.name)
    setStatus('Decoding audio…')

    let ctx: AudioContext
    let buf: AudioBuffer
    try {
      // decodeAudioData resamples to the context rate — force 44.1kHz for the model.
      ctx = new AudioContext({ sampleRate: HTDEMUCS_RATE })
      buf = await ctx.decodeAudioData(await file.arrayBuffer())
    } catch {
      setError('Could not decode that file. Try MP3, WAV, M4A, FLAC, or OGG.')
      setBusy(false)
      return
    }

    const left = buf.getChannelData(0)
    const right = buf.numberOfChannels > 1 ? buf.getChannelData(1) : left
    const len = buf.length

    const worker = new Worker(new URL('../../lib/stem-splitter/worker.ts', import.meta.url), {
      type: 'module'
    })
    workerRef.current?.terminate()
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const m = e.data
      switch (m.type) {
        case 'ready':
          setBackend(m.backend)
          setStatus(m.backend === 'webgpu' ? 'Loading model (GPU accelerated)…' : 'Loading model…')
          break
        case 'download':
          setTarget(m.total ? Math.round((m.loaded / m.total) * 100) : 0)
          setStatus(`Downloading model, one time only… ${(m.loaded / 1e6).toFixed(0)} MB`)
          break
        case 'progress':
          setTarget(Math.round(m.progress * 100))
          setStatus(`Separating stems… ${Math.round(m.progress * 100)}%`)
          break
        case 'result': {
          const out: Stem[] = (m.stems as WorkerStem[]).map((s) => {
            const ab = ctx.createBuffer(2, len, HTDEMUCS_RATE)
            ab.getChannelData(0).set(s.left)
            ab.getChannelData(1).set(s.right)
            const blob = audioBufferToWav(ab)
            return { name: s.name, buffer: ab, blob, url: URL.createObjectURL(blob) }
          })
          out.sort((a, b) => STEM_ORDER.indexOf(a.name as never) - STEM_ORDER.indexOf(b.name as never))
          setStems(out)
          setTarget(null)
          setStatus(`Done in ${(m.processingTimeMs / 1000).toFixed(1)}s`)
          setBusy(false)
          worker.terminate()
          break
        }
        case 'error':
          setError(m.message)
          setBusy(false)
          worker.terminate()
          break
      }
    }

    worker.postMessage({ type: 'separate', left, right }, [
      left.buffer,
      ...(right !== left ? [right.buffer] : [])
    ])
  }, [])

  const downloadAll = useCallback(async () => {
    const base = (fileName?.replace(/\.[^.]+$/, '') || 'audio').replace(/[^\w.-]+/g, '_')
    const entries: Record<string, Uint8Array> = {}
    for (const s of stems) {
      entries[`${s.name}.wav`] = new Uint8Array(await s.blob.arrayBuffer())
    }
    // ponytail: level 0 (store) — WAV PCM barely deflates, don't waste CPU.
    const zip = zipSync(entries, { level: 0 })
    const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}-stems.zip`
    a.click()
    URL.revokeObjectURL(url)
  }, [stems, fileName])

  const base = fileName?.replace(/\.[^.]+$/, '') || 'audio'

  return (
    <div className={`mx-auto transition-[max-width] duration-300 ${fileName ? 'max-w-4xl' : 'max-w-2xl'}`}>
      {!fileName && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/50 p-12 text-center transition-colors hover:border-violet-500/40 hover:bg-violet-500/5">
          <FileAudio className="h-10 w-10 text-violet-500" />
          <div>
            <p className="font-medium">Drop a track or click to choose</p>
            <p className="mt-1 text-sm text-muted-foreground">
              MP3, WAV, M4A, FLAC, OGG · processed entirely in your browser
            </p>
          </div>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && run(e.target.files[0])}
          />
        </label>
      )}

      {fileName && (
        <div className="rounded-2xl border bg-card/50 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileAudio className="h-4 w-4 shrink-0 text-violet-500" />
              <span className="truncate text-sm font-medium">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              {backend && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {backend === 'webgpu' ? 'GPU' : 'CPU'}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove file" disabled={busy && !error}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <>
              {busy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{status}</span>
                </div>
              )}
              {target !== null && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${displayed}%` }} />
                </div>
              )}

              {stems.length > 0 && (
                <div className="mt-2">
                  <p className="mb-3 text-sm text-muted-foreground">{status}</p>
                  <StemPlayer stems={stems} filenameBase={base} />
                  <Button className="mt-4 w-full" onClick={downloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download all stems (.zip)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
