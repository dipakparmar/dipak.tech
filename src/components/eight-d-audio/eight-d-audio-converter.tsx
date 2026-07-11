'use client';

import {
  Compass,
  Download,
  FileAudio,
  Gauge,
  Headphones,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
  Speaker,
  Square,
  Trash2,
  Upload,
  Volume2,
  Waves,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AudioVisualizer } from '@/components/eight-d-audio/audio-visualizer';
import { SmartTimeline } from '@/components/eight-d-audio/smart-timeline';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  AnalysisResult,
  AutomatableParam,
  DEFAULT_SETTINGS,
  EightDGraph,
  EightDSettings,
  Keyframe,
  PARAM_META,
  PARAM_ORDER,
  PRESETS,
  analyzeAudio,
  audioBufferToWav,
  buildGraph,
  disposeGraph,
  formatDuration,
  generateSmart8D,
  keyframeFromSettings,
  makeKeyframe,
  orbitAngleAt,
  render8D,
  sampleAutomation,
  scheduleTimeline
} from '@/lib/eight-d-audio';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 60 * 1024 * 1024; // 60 MB
type PlaybackState = 'stopped' | 'playing' | 'paused';
type Mode = 'static' | 'smart';

export function EightDAudioConverter() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<Mode>('static');

  const [settings, setSettings] = useState<EightDSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<string | null>('classic');

  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeParam, setActiveParam] =
    useState<AutomatableParam>('rotationSpeed');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [playback, setPlayback] = useState<PlaybackState>('stopped');
  const [currentTime, setCurrentTime] = useState(0);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<EightDGraph | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const ctxStartRef = useRef(0);
  const offsetRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const manualStopRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const playbackRef = useRef<PlaybackState>('stopped');
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  // The active automation timeline for playback/export: keyframes in smart mode,
  // a single constant keyframe derived from the sliders in static mode.
  const activeKeyframes = useMemo<Keyframe[]>(() => {
    if (mode === 'smart' && keyframes.length > 0) return keyframes;
    return [keyframeFromSettings(0, settings)];
  }, [mode, keyframes, settings]);
  const activeKeyframesRef = useRef(activeKeyframes);
  const settingsRef = useRef(settings);
  useEffect(() => {
    activeKeyframesRef.current = activeKeyframes;
  }, [activeKeyframes]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const selectedKeyframe = keyframes.find((k) => k.id === selectedId) ?? null;

  const getElapsed = useCallback((): number => {
    const ctx = audioCtxRef.current;
    if (playbackRef.current === 'playing' && ctx) {
      return Math.min(
        duration,
        offsetRef.current + (ctx.currentTime - ctxStartRef.current)
      );
    }
    return pausedElapsedRef.current;
  }, [duration]);

  const getAngle = useCallback(
    () =>
      orbitAngleAt(
        activeKeyframesRef.current,
        settingsRef.current.direction,
        getElapsed()
      ),
    [getElapsed]
  );

  // Progress ticker while playing.
  useEffect(() => {
    if (playback !== 'playing') return;
    const tick = () => {
      setCurrentTime(getElapsed());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playback, getElapsed]);

  const teardownSource = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      manualStopRef.current = true;
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
      sourceRef.current = null;
    }
    if (graphRef.current) {
      disposeGraph(graphRef.current);
      graphRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(
    async (offset: number) => {
      if (!audioBuffer) return;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        an.smoothingTimeConstant = 0.8;
        analyserRef.current = an;
        setAnalyser(an);
      }
      if (ctx.state === 'suspended') await ctx.resume();

      teardownSource();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const graph = buildGraph(ctx, source, analyserRef.current);
      sourceRef.current = source;
      graphRef.current = graph;

      const startWhen = ctx.currentTime + 0.02;
      scheduleTimeline(
        ctx,
        graph,
        activeKeyframesRef.current,
        settingsRef.current.direction,
        settingsRef.current.volume,
        startWhen,
        offset,
        duration
      );

      manualStopRef.current = false;
      source.onended = () => {
        if (manualStopRef.current) return;
        setPlayback('stopped');
        pausedElapsedRef.current = 0;
        setCurrentTime(0);
        teardownSource();
      };

      ctxStartRef.current = startWhen;
      offsetRef.current = offset;
      source.start(startWhen, offset);
      setPlayback('playing');
    },
    [audioBuffer, teardownSource, duration]
  );

  const handlePlayPause = useCallback(() => {
    if (playback === 'playing') {
      pausedElapsedRef.current = getElapsed();
      teardownSource();
      setPlayback('paused');
    } else {
      const from = playback === 'paused' ? pausedElapsedRef.current : 0;
      void startPlayback(from >= duration ? 0 : from);
    }
  }, [playback, getElapsed, teardownSource, startPlayback, duration]);

  const handleStop = useCallback(() => {
    teardownSource();
    pausedElapsedRef.current = 0;
    setCurrentTime(0);
    setPlayback('stopped');
  }, [teardownSource]);

  const handleSeek = useCallback(
    (time: number) => {
      const target = Math.max(0, Math.min(duration, time));
      pausedElapsedRef.current = target;
      setCurrentTime(target);
      if (playback === 'playing') void startPlayback(target);
    },
    [duration, playback, startPlayback]
  );

  // Reschedule the running graph live when the active automation/globals change.
  useEffect(() => {
    if (
      playbackRef.current === 'playing' &&
      audioCtxRef.current &&
      graphRef.current
    ) {
      const ctx = audioCtxRef.current;
      const elapsed = getElapsed();
      const startWhen = ctx.currentTime + 0.02;
      // Re-anchor timing so getElapsed stays continuous.
      ctxStartRef.current = startWhen;
      offsetRef.current = elapsed;
      scheduleTimeline(
        ctx,
        graphRef.current,
        activeKeyframes,
        settings.direction,
        settings.volume,
        startWhen,
        elapsed,
        duration
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKeyframes, settings.direction, settings.volume]);

  const decodeFile = useCallback(
    async (file: File) => {
      setError(null);
      if (
        !file.type.startsWith('audio/') &&
        !/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)
      ) {
        setError('Please choose an audio file (MP3, WAV, OGG, M4A, FLAC…).');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('File is too large. Please use a file under 60 MB.');
        return;
      }
      handleStop();
      setKeyframes([]);
      setAnalysis(null);
      setSelectedId(null);
      setIsDecoding(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        if (!analyserRef.current) {
          const an = ctx.createAnalyser();
          an.fftSize = 512;
          an.smoothingTimeConstant = 0.8;
          analyserRef.current = an;
          setAnalyser(an);
        }
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        setAudioBuffer(decoded);
        setDuration(decoded.duration);
        setFileName(file.name);
        setCurrentTime(0);
        pausedElapsedRef.current = 0;
        // Analyse in the background so the BPM pulse + timeline work in both
        // modes without blocking the UI.
        setTimeout(() => {
          try {
            setAnalysis(analyzeAudio(decoded));
          } catch {
            /* non-fatal - Smart mode can re-run it */
          }
        }, 60);
      } catch {
        setError('Could not decode this audio file. Try a different format.');
      } finally {
        setIsDecoding(false);
      }
    },
    [handleStop]
  );

  const generateFromAnalysis = useCallback(
    (
      result: AnalysisResult,
      intensityValue: number,
      direction: 'cw' | 'ccw'
    ) => {
      setKeyframes(
        generateSmart8D(result, { direction, intensity: intensityValue })
      );
      setSelectedId(null);
    },
    []
  );

  const runSmartAnalysis = useCallback(
    (
      buffer: AudioBuffer,
      intensityValue: number,
      direction: 'cw' | 'ccw',
      existing?: AnalysisResult | null
    ) => {
      if (existing) {
        generateFromAnalysis(existing, intensityValue, direction);
        return;
      }
      setIsAnalyzing(true);
      setError(null);
      // Defer so the spinner paints before the (synchronous) analysis blocks.
      setTimeout(() => {
        try {
          const result = analyzeAudio(buffer);
          setAnalysis(result);
          generateFromAnalysis(result, intensityValue, direction);
        } catch {
          setError('Analysis failed. You can still add keyframes manually.');
        } finally {
          setIsAnalyzing(false);
        }
      }, 30);
    },
    [generateFromAnalysis]
  );

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next);
      if (
        next === 'smart' &&
        audioBuffer &&
        keyframes.length === 0 &&
        !isAnalyzing
      ) {
        runSmartAnalysis(audioBuffer, intensity, settings.direction, analysis);
      }
    },
    [
      audioBuffer,
      keyframes.length,
      isAnalyzing,
      runSmartAnalysis,
      intensity,
      settings.direction,
      analysis
    ]
  );

  const handleExport = useCallback(async () => {
    if (!audioBuffer) return;
    setIsRendering(true);
    setError(null);
    try {
      const rendered = await render8D(
        audioBuffer,
        activeKeyframes,
        settings.direction,
        settings.volume
      );
      const blob = audioBufferToWav(rendered);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = (fileName ?? 'audio').replace(/\.[^.]+$/, '');
      a.href = url;
      a.download = `${base}-8d${mode === 'smart' ? '-smart' : ''}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Export failed while rendering. Try again.');
    } finally {
      setIsRendering(false);
    }
  }, [
    audioBuffer,
    activeKeyframes,
    settings.direction,
    settings.volume,
    fileName,
    mode
  ]);

  const clearFile = useCallback(() => {
    handleStop();
    setAudioBuffer(null);
    setFileName(null);
    setDuration(0);
    setCurrentTime(0);
    setKeyframes([]);
    setAnalysis(null);
    setSelectedId(null);
    setMode('static');
  }, [handleStop]);

  const updateSetting = useCallback(
    <K extends keyof EightDSettings>(key: K, value: EightDSettings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
      setActivePreset(null);
    },
    []
  );

  const applyPreset = useCallback((id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSettings(preset.settings);
    setActivePreset(id);
  }, []);

  // Keyframe editing (smart mode).
  const updateSelectedKeyframe = useCallback(
    (param: AutomatableParam, value: number) => {
      if (!selectedId) return;
      setKeyframes((ks) =>
        ks.map((k) => (k.id === selectedId ? { ...k, [param]: value } : k))
      );
    },
    [selectedId]
  );

  const moveKeyframe = useCallback(
    (id: string, time: number, value: number) => {
      setKeyframes((ks) =>
        ks.map((k) => (k.id === id ? { ...k, time, [activeParam]: value } : k))
      );
    },
    [activeParam]
  );

  const addKeyframeAt = useCallback((time: number) => {
    setKeyframes((ks) => {
      const at = sampleAutomation(
        ks.length ? ks : activeKeyframesRef.current,
        time
      );
      const kf = makeKeyframe(time, at);
      setSelectedId(kf.id);
      return [...ks, kf].sort((a, b) => a.time - b.time);
    });
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setKeyframes((ks) => ks.filter((k) => k.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      teardownSource();
      audioCtxRef.current?.close();
    };
  }, [teardownSource]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void decodeFile(file);
    },
    [decodeFile]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  if (!audioBuffer) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors',
            dragOver
              ? 'border-sky-500 bg-sky-500/5'
              : 'border-border hover:border-sky-500/50 hover:bg-muted/30'
          )}
        >
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void decodeFile(file);
            }}
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10">
            {isDecoding ? (
              <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
            ) : (
              <Upload className="h-7 w-7 text-sky-500" />
            )}
          </div>
          <div>
            <p className="text-base font-medium">
              {isDecoding
                ? 'Decoding audio…'
                : 'Drop an audio file or click to browse'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              MP3, WAV, OGG, M4A, FLAC · up to 60 MB · processed entirely in
              your browser
            </p>
          </div>
        </label>
        {error && (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Visualizer + transport */}
        <div className="min-w-0 space-y-4">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/40 to-background">
            <AudioVisualizer
              analyser={analyser}
              getAngle={getAngle}
              getTime={getElapsed}
              bpm={analysis?.bpm ?? null}
              className="block aspect-square w-full max-w-full"
            />
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
              <Headphones className="h-3.5 w-3.5 text-sky-500" />
              Use headphones for the full effect
            </div>
          </div>

          {/* File info */}
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              <FileAudio className="h-4.5 w-4.5 text-sky-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(duration)}
                {analysis?.bpm ? ` · ~${analysis.bpm} BPM` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Seek bar */}
          <div className="space-y-2">
            <Slider
              value={[progress * 1000]}
              max={1000}
              step={1}
              onValueChange={(v) => handleSeek((v[0] / 1000) * duration)}
              aria-label="Seek"
            />
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={handlePlayPause}
              className="min-w-28 flex-1"
              size="lg"
            >
              {playback === 'playing' ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Play
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleStop}
              disabled={playback === 'stopped'}
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExport}
              disabled={isRendering}
              aria-label="Export WAV"
            >
              {isRendering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isRendering ? 'Rendering…' : 'Export'}
              </span>
            </Button>
          </div>
        </div>

        {/* Controls panel */}
        <div className="min-w-0 space-y-5 rounded-2xl border bg-card p-5">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => switchMode('static')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'static'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Static
            </button>
            <button
              onClick={() => switchMode('smart')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'smart'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> Smart
            </button>
          </div>

          {mode === 'static' ? (
            <StaticControls
              settings={settings}
              activePreset={activePreset}
              onPreset={applyPreset}
              onChange={updateSetting}
            />
          ) : (
            <SmartControls
              analysis={analysis}
              isAnalyzing={isAnalyzing}
              keyframeCount={keyframes.length}
              intensity={intensity}
              onIntensity={setIntensity}
              onRegenerate={() =>
                audioBuffer &&
                runSmartAnalysis(
                  audioBuffer,
                  intensity,
                  settings.direction,
                  analysis
                )
              }
              selected={selectedKeyframe}
              onSelectedChange={updateSelectedKeyframe}
              onDeleteSelected={deleteSelected}
              settings={settings}
              onGlobalChange={updateSetting}
            />
          )}
        </div>
      </div>

      {/* Timeline (smart mode) */}
      {mode === 'smart' && (
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {PARAM_ORDER.map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveParam(p)}
                  style={
                    activeParam === p
                      ? { color: `rgb(${PARAM_META[p].color})` }
                      : undefined
                  }
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeParam === p
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `rgb(${PARAM_META[p].color})` }}
                  />
                  {PARAM_META[p].label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addKeyframeAt(currentTime)}
              >
                <Plus className="h-3.5 w-3.5" /> Add point
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteSelected}
                disabled={!selectedId}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="flex h-42 items-center justify-center gap-2 rounded-xl border bg-muted/20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing track…
            </div>
          ) : (
            <SmartTimeline
              keyframes={keyframes}
              duration={duration}
              analysis={analysis}
              currentTime={currentTime}
              activeParam={activeParam}
              selectedId={selectedId}
              onSeek={handleSeek}
              onSelect={setSelectedId}
              onMoveKeyframe={moveKeyframe}
              onAddKeyframe={addKeyframeAt}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Click to seek · click a point to select · drag to move ·
            double-click to add. Colored bands show low / mid / high energy
            sections; purple ticks mark detected drops.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static controls
// ---------------------------------------------------------------------------

interface StaticControlsProps {
  settings: EightDSettings;
  activePreset: string | null;
  onPreset: (id: string) => void;
  onChange: <K extends keyof EightDSettings>(
    key: K,
    value: EightDSettings[K]
  ) => void;
}

function StaticControls({
  settings,
  activePreset,
  onPreset,
  onChange
}: StaticControlsProps) {
  return (
    <>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Music className="h-3.5 w-3.5" /> Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPreset(preset.id)}
              title={preset.description}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                activePreset === preset.id
                  ? 'border-sky-500 bg-sky-500/10 text-foreground'
                  : 'border-border hover:border-sky-500/40 hover:bg-muted/50'
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <ControlSlider
          icon={<Gauge className="h-4 w-4" />}
          label="Rotation speed"
          value={settings.rotationSpeed}
          min={0}
          max={20}
          step={0.5}
          display={
            settings.rotationSpeed <= 0.05
              ? 'Hold (no spin)'
              : `${settings.rotationSpeed.toFixed(1)}s / spin`
          }
          onChange={(v) => onChange('rotationSpeed', v)}
        />
        <ControlSlider
          icon={<Compass className="h-4 w-4" />}
          label={
            settings.rotationSpeed <= 0.05 ? 'Direction' : 'Start direction'
          }
          value={settings.angle}
          min={0}
          max={360}
          step={5}
          display={PARAM_META.angle.format(settings.angle)}
          onChange={(v) => onChange('angle', v)}
        />
        <ControlSlider
          icon={<Waves className="h-4 w-4" />}
          label="Pan width"
          value={settings.panDepth}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(settings.panDepth * 100)}%`}
          onChange={(v) => onChange('panDepth', v)}
        />
        <ControlSlider
          icon={<Speaker className="h-4 w-4" />}
          label="Reverb"
          value={settings.reverbAmount}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(settings.reverbAmount * 100)}%`}
          onChange={(v) => onChange('reverbAmount', v)}
        />
        <ControlSlider
          icon={<Music className="h-4 w-4" />}
          label="Bass boost"
          value={settings.bassBoost}
          min={0}
          max={18}
          step={0.5}
          display={`+${settings.bassBoost.toFixed(1)} dB`}
          onChange={(v) => onChange('bassBoost', v)}
        />
        <ControlSlider
          icon={<Volume2 className="h-4 w-4" />}
          label="Volume"
          value={settings.volume}
          min={0}
          max={1.5}
          step={0.01}
          display={`${Math.round(settings.volume * 100)}%`}
          onChange={(v) => onChange('volume', v)}
        />
        <DirectionToggle
          direction={settings.direction}
          onChange={(d) => onChange('direction', d)}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Smart controls
// ---------------------------------------------------------------------------

interface SmartControlsProps {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  keyframeCount: number;
  intensity: number;
  onIntensity: (v: number) => void;
  onRegenerate: () => void;
  selected: Keyframe | null;
  onSelectedChange: (param: AutomatableParam, value: number) => void;
  onDeleteSelected: () => void;
  settings: EightDSettings;
  onGlobalChange: <K extends keyof EightDSettings>(
    key: K,
    value: EightDSettings[K]
  ) => void;
}

function SmartControls({
  analysis,
  isAnalyzing,
  keyframeCount,
  intensity,
  onIntensity,
  onRegenerate,
  selected,
  onSelectedChange,
  settings,
  onGlobalChange
}: SmartControlsProps) {
  return (
    <div className="space-y-5">
      {/* Analysis summary */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Smart 8D
          </span>
          {analysis && (
            <span className="text-xs text-muted-foreground">
              {keyframeCount} points · {analysis.sections.length} sections
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {analysis
            ? 'Rotation, width, reverb and bass follow the music. Tweak the timeline below or a single point here.'
            : 'Analyze the track to auto-place 8D automation synced to its energy and beats.'}
        </p>
        <div className="mt-3 space-y-3">
          <ControlSlider
            icon={<Sparkles className="h-4 w-4" />}
            label="Intensity"
            value={intensity}
            min={0.4}
            max={1.6}
            step={0.05}
            display={`${Math.round(intensity * 100)}%`}
            onChange={onIntensity}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onRegenerate}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {analysis ? 'Regenerate' : 'Analyze & Generate'}
          </Button>
        </div>
      </div>

      {/* Selected keyframe editor */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selected
            ? `Point @ ${formatDuration(selected.time)}`
            : 'Selected point'}
        </p>
        {selected ? (
          <div className="space-y-4">
            {PARAM_ORDER.map((p) => {
              const m = PARAM_META[p];
              return (
                <ControlSlider
                  key={p}
                  dotColor={m.color}
                  label={m.label}
                  value={selected[p]}
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  display={m.format(selected[p])}
                  onChange={(v) => onSelectedChange(p, v)}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            Select a point on the timeline to edit its values.
          </p>
        )}
      </div>

      {/* Globals */}
      <div className="space-y-4 border-t pt-4">
        <ControlSlider
          icon={<Volume2 className="h-4 w-4" />}
          label="Volume"
          value={settings.volume}
          min={0}
          max={1.5}
          step={0.01}
          display={`${Math.round(settings.volume * 100)}%`}
          onChange={(v) => onGlobalChange('volume', v)}
        />
        <DirectionToggle
          direction={settings.direction}
          onChange={(d) => onGlobalChange('direction', d)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

interface ControlSliderProps {
  icon?: React.ReactNode;
  dotColor?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function ControlSlider({
  icon,
  dotColor,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange
}: ControlSliderProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon && <span className="text-sky-500">{icon}</span>}
          {dotColor && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `rgb(${dotColor})` }}
            />
          )}
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {display}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
      />
    </div>
  );
}

function DirectionToggle({
  direction,
  onChange
}: {
  direction: 'cw' | 'ccw';
  onChange: (d: 'cw' | 'ccw') => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Direction</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange('cw')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
            direction === 'cw'
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <RotateCw className="h-4 w-4" /> Clockwise
        </button>
        <button
          onClick={() => onChange('ccw')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
            direction === 'ccw'
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <RotateCcw className="h-4 w-4" /> Counter
        </button>
      </div>
    </div>
  );
}
