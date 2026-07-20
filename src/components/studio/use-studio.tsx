'use client';

import {
  ActiveSelection,
  Canvas,
  Color,
  FabricImage,
  FabricObject,
  Group,
  IText,
  InteractiveFabricObject,
  Path,
  PencilBrush,
  Point,
  Rect,
  Shadow,
  StaticCanvas,
  type TMat2D,
  Textbox,
  filters
} from 'fabric';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  type AnimationPreset,
  type Keyframe,
  animationDuration,
  applyAnimationAtTime,
  getKeyframes,
  hasAnimation,
  presetKeyframes,
  readPose,
  removeKeyframeAt,
  upsertKeyframe
} from '@/lib/studio/animation';
import {
  FONT_BODY,
  FONT_DISPLAY,
  FONT_HANDWRITING,
  FONT_MARKER,
  STUDIO_FONTS,
  type StudioFont,
  ensureFontLoaded,
  registerCustomFont
} from '@/lib/studio/fonts';
import { StudioHistory } from '@/lib/studio/history';
import { createOverlay, type OverlayKind } from '@/lib/studio/overlays';
import { DEFAULT_PRESET_ID, getPreset } from '@/lib/studio/presets';
import {
  createRoughShape,
  type RoughShapeKind,
  type RoughShapeOptions
} from '@/lib/studio/rough-shapes';
import {
  clearAutosave,
  deleteTemplate,
  downloadBlob,
  downloadDataUrl,
  downloadImagesAsZip,
  downloadJson,
  fileToImageDataUrl,
  loadAutosave,
  loadTemplates,
  saveTemplate,
  urlToImageDataUrl,
  writeAutosave,
  type SavedTemplate
} from '@/lib/studio/storage';
import { BUILTIN_TEMPLATES } from '@/lib/studio/templates';
import {
  DEFAULT_TEXT_BRUSH,
  TextBrush,
  isTextBrushGroup,
  restyleTextBrushGroup,
  type TextBrushGroup,
  type TextBrushSettings,
  type TextBrushStroke
} from '@/lib/studio/text-brush';
import {
  type VideoFormat,
  recordPageVideo,
  supportedVideoFormats
} from '@/lib/studio/video';
import {
  type AudioClip,
  clampClip,
  clipEnd,
  createClip,
  decodeAudioFile,
  mixClips,
  splitClip
} from '@/lib/studio/audio-clips';

export type StudioObject = FabricObject & { name?: string; locked?: boolean };

export type TextKind =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'handwritten'
  | 'marker';
export type DrawMode = 'off' | 'pen' | 'marker' | 'glow' | 'text';
export type ExportOptions = {
  format: 'png' | 'jpeg';
  scale: 1 | 2 | 3;
  quality: number;
  pages: 'current' | 'all';
};

export type StudioPage = {
  id: string;
  /** Serialized canvas JSON. Refreshed for the active page on autosave/switch. */
  json: string | null;
  thumb: string | null;
};

let pageIdCounter = 0;
function newPageId(): string {
  pageIdCounter += 1;
  return `page-${Date.now().toString(36)}-${pageIdCounter}`;
}

/** Render a serialized page on an offscreen canvas (thumbnails, multi-page export). */
async function renderPageJson(
  json: string,
  width: number,
  height: number,
  options: { format?: 'png' | 'jpeg'; quality?: number; multiplier: number }
): Promise<string> {
  const offscreen = new StaticCanvas(undefined, {
    width,
    height,
    enableRetinaScaling: false
  });
  try {
    await offscreen.loadFromJSON(JSON.parse(json));
    offscreen.renderAll();
    return offscreen.toDataURL({
      format: options.format ?? 'jpeg',
      quality: options.quality ?? 0.75,
      multiplier: options.multiplier,
      enableRetinaScaling: false
    });
  } finally {
    void offscreen.dispose();
  }
}

const IDENTITY_VPT: TMat2D = [1, 0, 0, 1, 0, 0];

/**
 * Export the page region [0,0,width,height] at a multiplier, independent of the
 * current pan/zoom. The live canvas uses a viewport transform for panning, so we
 * temporarily reset it (offscreen - toDataURL renders to its own canvas, so this
 * never flashes on screen) and restore it.
 */
function pageDataUrl(
  canvas: Canvas | StaticCanvas,
  width: number,
  height: number,
  opts: { multiplier: number; format?: 'png' | 'jpeg'; quality?: number }
): string {
  const saved = canvas.viewportTransform.slice() as TMat2D;
  canvas.viewportTransform = IDENTITY_VPT;
  const url = canvas.toDataURL({
    left: 0,
    top: 0,
    width,
    height,
    multiplier: opts.multiplier,
    format: opts.format ?? 'jpeg',
    quality: opts.quality ?? 0.7,
    enableRetinaScaling: false
  });
  canvas.viewportTransform = saved;
  return url;
}

/** Clip the canvas to the page rectangle so the workspace reads as a page card. */
function ensurePageClip(canvas: Canvas, width: number, height: number): void {
  canvas.clipPath = new Rect({
    left: 0,
    top: 0,
    width,
    height,
    absolutePositioned: true
  });
}

const TEXT_PRESETS: Record<
  TextKind,
  {
    label: string;
    text: string;
    family: string;
    weight: string;
    sizeFactor: number;
  }
> = {
  heading: {
    label: 'Heading',
    text: 'Big headline',
    family: FONT_DISPLAY,
    weight: '400',
    sizeFactor: 0.11
  },
  subheading: {
    label: 'Subheading',
    text: 'A short subheading',
    family: FONT_BODY,
    weight: '600',
    sizeFactor: 0.05
  },
  body: {
    label: 'Body text',
    text: 'Write something here',
    family: FONT_BODY,
    weight: '400',
    sizeFactor: 0.034
  },
  handwritten: {
    label: 'Handwritten',
    text: 'a handwritten note',
    family: FONT_HANDWRITING,
    weight: '700',
    sizeFactor: 0.09
  },
  marker: {
    label: 'Marker',
    text: 'MARKER NOTE',
    family: FONT_MARKER,
    weight: '400',
    sizeFactor: 0.06
  }
};

function isTextLike(obj: FabricObject): obj is Textbox | IText {
  return obj instanceof Textbox || obj instanceof IText;
}

function isDarkColor(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  try {
    const [r, g, b] = new Color(value).getSource();
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
  } catch {
    return true;
  }
}

export function getObjectLabel(obj: StudioObject): string {
  if (obj.name) return obj.name;
  if (isTextLike(obj)) {
    const text = (obj.text ?? '').replace(/\s+/g, ' ').trim();
    return text ? (text.length > 22 ? `${text.slice(0, 22)}…` : text) : 'Text';
  }
  if (obj instanceof FabricImage) return 'Photo';
  if (obj instanceof Path) return 'Drawing';
  if (obj instanceof Group) return 'Shape';
  if (obj instanceof Rect) return 'Rectangle';
  return obj.type ?? 'Object';
}

let defaultsApplied = false;
function applyControlDefaults() {
  if (defaultsApplied) return;
  defaultsApplied = true;
  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults,
    // Fabric v7 changed the default origin to center; the studio's layout
    // math (templates, overlays, photo fitting) is written in top-left space.
    originX: 'left',
    originY: 'top',
    cornerStyle: 'circle',
    cornerColor: '#38bdf8',
    cornerStrokeColor: '#ffffff',
    borderColor: '#38bdf8',
    transparentCorners: false,
    cornerSize: 10,
    touchCornerSize: 26,
    borderScaleFactor: 1.5,
    borderOpacityWhenMoving: 0.6
  };
}

export function useStudio(
  canvasElRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const canvasRef = useRef<Canvas | null>(null);
  const historyRef = useRef<StudioHistory | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [presetId, setPresetIdState] = useState(DEFAULT_PRESET_ID);
  const [zoom, setZoomState] = useState(1);
  const [selected, setSelected] = useState<StudioObject[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawMode, setDrawModeState] = useState<DrawMode>('off');
  const [drawColor, setDrawColor] = useState('#FFE066');
  const [drawWidth, setDrawWidth] = useState(8);
  const [textBrush, setTextBrushState] = useState<TextBrushSettings>({
    ...DEFAULT_TEXT_BRUSH,
    fontFamily: FONT_DISPLAY
  });
  const updateTextBrushSettings = useCallback(
    (patch: Partial<TextBrushSettings>) =>
      setTextBrushState((prev) => ({ ...prev, ...patch })),
    []
  );
  const [historyState, setHistoryState] = useState({
    canUndo: false,
    canRedo: false
  });
  const [userTemplates, setUserTemplates] = useState<SavedTemplate[]>([]);
  const [storageWarning, setStorageWarning] = useState(false);
  const [layers, setLayers] = useState<StudioObject[]>([]);
  const [backgroundColor, setBackgroundColorState] = useState('#ffffff');
  const [version, bumpVersion] = useReducer((x: number) => x + 1, 0);
  const [pages, setPages] = useState<StudioPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // ---- Animation --------------------------------------------------------
  const [animateMode, setAnimateModeState] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [customFonts, setCustomFonts] = useState<StudioFont[]>([]);
  const [videoFormats] = useState(() => supportedVideoFormats());
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(
    () => supportedVideoFormats()[0] ?? 'webm'
  );
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const audioClipsRef = useRef<AudioClip[]>([]);
  audioClipsRef.current = audioClips;
  const audioCtxRef = useRef<AudioContext | null>(null);
  /** While true, canvas mutations are animation preview - never committed/saved. */
  const previewingRef = useRef(false);
  const previewBaseRef = useRef<Map<StudioObject, Keyframe> | null>(null);
  const playRafRef = useRef<number | null>(null);

  const preset = getPreset(presetId);
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const activePageRef = useRef(activePageIndex);
  activePageRef.current = activePageIndex;

  const THUMB_WIDTH = 140;

  /** Snapshot the live canvas into the active page entry (json + thumbnail). */
  const captureActivePage = useCallback((): StudioPage[] => {
    const canvas = canvasRef.current;
    const history = historyRef.current;
    if (!canvas || !history) return pagesRef.current;
    // Never snapshot an in-flight animation pose as the saved design.
    if (previewingRef.current) return pagesRef.current;
    const thumb = pageDataUrl(
      canvas,
      presetRef.current.width,
      presetRef.current.height,
      { multiplier: THUMB_WIDTH / presetRef.current.width }
    );
    const next = pagesRef.current.map((page, index) =>
      index === activePageRef.current
        ? { ...page, json: history.snapshot(), thumb }
        : page
    );
    pagesRef.current = next;
    setPages(next);
    return next;
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const history = historyRef.current;
      if (!history || previewingRef.current) return;
      const current = captureActivePage();
      const ok = writeAutosave({
        presetId: presetRef.current.id,
        pages: current.map((page) => page.json ?? '{}'),
        activeIndex: activePageRef.current,
        savedAt: Date.now()
      });
      setStorageWarning(!ok);
    }, 800);
  }, [captureActivePage]);

  const commitSoon = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => historyRef.current?.commit(), 500);
  }, []);

  const markChanged = useCallback(() => {
    bumpVersion();
    scheduleAutosave();
    const canvas = canvasRef.current;
    if (canvas) {
      setLayers([...canvas.getObjects()].reverse() as StudioObject[]);
      if (typeof canvas.backgroundColor === 'string')
        setBackgroundColorState(canvas.backgroundColor);
      const audioEnd = audioClipsRef.current.reduce(
        (m, c) => Math.max(m, clipEnd(c)),
        0
      );
      setDuration(Math.max(animationDuration(canvas), audioEnd));
    }
  }, [scheduleAutosave]);

  // Keep the timeline length in sync when audio clips are added/moved/trimmed.
  useEffect(() => {
    const canvas = canvasRef.current;
    const audioEnd = audioClips.reduce((m, c) => Math.max(m, clipEnd(c)), 0);
    setDuration(Math.max(canvas ? animationDuration(canvas) : 0, audioEnd));
  }, [audioClips]);

  // ---- Canvas lifecycle -------------------------------------------------
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;
    applyControlDefaults();

    const canvas = new Canvas(el, {
      preserveObjectStacking: true,
      selectionColor: 'rgba(56,189,248,0.12)',
      selectionBorderColor: '#38bdf8',
      selectionLineWidth: 1.5,
      backgroundColor: '#ffffff',
      // Suppress the browser menu so our own right-click menu can take over.
      stopContextMenu: true
    });
    canvasRef.current = canvas;
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__studioCanvas = canvas;
    }

    const history = new StudioHistory(canvas, () => {
      setHistoryState({ canUndo: history.canUndo, canRedo: history.canRedo });
    });
    historyRef.current = history;

    const refreshSelection = () =>
      setSelected([...canvas.getActiveObjects()] as StudioObject[]);
    canvas.on('selection:created', refreshSelection);
    canvas.on('selection:updated', refreshSelection);
    canvas.on('selection:cleared', () => setSelected([]));
    canvas.on('object:added', (e) => {
      if (previewingRef.current) return;
      const obj = e.target as StudioObject;
      if (obj instanceof Path && !(obj as StudioObject).name)
        obj.set({ name: 'Drawing' });
      history.commit();
      markChanged();
    });
    canvas.on('object:removed', () => {
      if (previewingRef.current) return;
      history.commit();
      markChanged();
    });
    canvas.on('object:modified', () => {
      if (previewingRef.current) return;
      history.commit();
      markChanged();
    });
    canvas.on('text:editing:exited', () => {
      if (previewingRef.current) return;
      history.commit();
      markChanged();
    });
    canvas.on('contextmenu', (opt) => {
      const target = opt.target as StudioObject | undefined;
      if (target && !target.locked) canvas.setActiveObject(target);
      else canvas.discardActiveObject();
      canvas.requestRenderAll();
      const e = opt.e as MouseEvent;
      setContextMenu(target ? { x: e.clientX, y: e.clientY } : null);
    });

    let cancelled = false;
    const init = async () => {
      const saved = loadAutosave();
      if (saved) {
        setPresetIdState(saved.presetId);
        const savedPreset = getPreset(saved.presetId);
        canvas.setDimensions({
          width: savedPreset.width,
          height: savedPreset.height
        });
        try {
          await history.suspendWhile(async () => {
            await canvas.loadFromJSON(
              JSON.parse(saved.pages[saved.activeIndex] ?? '{}')
            );
          });
          const initialPages = saved.pages.map((json) => ({
            id: newPageId(),
            json,
            thumb: null
          }));
          pagesRef.current = initialPages;
          setPages(initialPages);
          setActivePageIndex(saved.activeIndex);
          activePageRef.current = saved.activeIndex;
        } catch {
          // Don't wipe a valid autosave just because the effect was torn down
          // mid-load (strict-mode remount); only clear on genuine bad data.
          if (!cancelled) clearAutosave();
        }
      }
      // The canvas may have been disposed while awaiting above (React strict
      // mode remounts the effect); never touch it after that.
      if (cancelled) return;
      if (!pagesRef.current.length) {
        const defaultPreset = getPreset(DEFAULT_PRESET_ID);
        canvas.setDimensions({
          width: defaultPreset.width,
          height: defaultPreset.height
        });
        await history.suspendWhile(() =>
          BUILTIN_TEMPLATES[0].pages[0](
            canvas,
            defaultPreset.width,
            defaultPreset.height
          )
        );
        const first: StudioPage = { id: newPageId(), json: null, thumb: null };
        pagesRef.current = [first];
        setPages([first]);
        setActivePageIndex(0);
        activePageRef.current = 0;
      }
      if (cancelled) return;
      canvas.requestRenderAll();
      history.reset();
      setUserTemplates(loadTemplates());
      setReady(true);
      markChanged();
    };
    void init();

    return () => {
      cancelled = true;
      if (playRafRef.current !== null) cancelAnimationFrame(playRafRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close();
      canvasRef.current = null;
      historyRef.current = null;
      void canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- View: fit / zoom / pan ------------------------------------------
  // Figma-style: the canvas element fills the workspace and never resizes on
  // zoom. Pan/zoom move Fabric's viewportTransform imperatively (no React churn,
  // no re-rasterize), and a clipPath draws the page as a card on the workspace.
  const fitView = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const { width: pw, height: ph } = presetRef.current;
    canvas.setDimensions({ width: w, height: h });
    ensurePageClip(canvas, pw, ph);
    const z = Math.max(0.05, Math.min((w - 96) / pw, (h - 96) / ph, 2));
    canvas.setViewportTransform([
      z,
      0,
      0,
      z,
      (w - pw * z) / 2,
      (h - ph * z) / 2
    ]);
    canvas.requestRenderAll();
    setZoomState(z);
  }, [containerRef]);

  const setZoomAtCenter = useCallback(
    (target: number) => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const z = Math.min(8, Math.max(0.05, target));
      canvas.zoomToPoint(
        new Point(container.clientWidth / 2, container.clientHeight / 2),
        z
      );
      canvas.requestRenderAll();
      setZoomState(z);
    },
    [containerRef]
  );

  const zoomIn = useCallback(
    () => setZoomAtCenter((canvasRef.current?.getZoom() ?? 1) * 1.6),
    [setZoomAtCenter]
  );
  const zoomOut = useCallback(
    () => setZoomAtCenter((canvasRef.current?.getZoom() ?? 1) / 1.6),
    [setZoomAtCenter]
  );

  // Fit on ready / preset change; on window resize keep the current zoom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;
    fitView();
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        return; // observe() fires once immediately - fitView already ran
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight
      });
      canvas.requestRenderAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, preset.width, preset.height, fitView, containerRef]);

  // ---- Gesture zoom + pan (imperative viewportTransform) ----------------
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !ready) return;
    const MIN = 0.05;
    const MAX = 8;
    let spaceHeld = false;
    let panning = false;
    let displayRaf = 0;
    const syncDisplay = () => {
      if (displayRaf) return;
      displayRaf = requestAnimationFrame(() => {
        displayRaf = 0;
        setZoomState(canvas.getZoom());
      });
    };

    // ⌘/Ctrl + wheel (and trackpad pinch) zooms to the pointer; plain
    // two-finger scroll pans. Both just move the viewport - no resize.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const point = new Point(e.clientX - rect.left, e.clientY - rect.top);
      if (e.ctrlKey || e.metaKey) {
        const z = Math.min(
          MAX,
          Math.max(MIN, canvas.getZoom() * Math.exp(-e.deltaY * 0.0065))
        );
        canvas.zoomToPoint(point, z);
      } else {
        canvas.relativePan(new Point(-e.deltaX, -e.deltaY));
      }
      canvas.requestRenderAll();
      syncDisplay();
    };

    // Middle-mouse or space + drag pans. Capture phase beats Fabric's own
    // pointer handling (which would otherwise start a selection).
    let panMove: ((ev: PointerEvent) => void) | null = null;
    let panUp: (() => void) | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.button === 1 || (e.button === 0 && spaceHeld))) return;
      e.preventDefault();
      e.stopPropagation();
      panning = true;
      container.style.cursor = 'grabbing';
      panMove = (ev: PointerEvent) => {
        if (!panning) return;
        canvas.relativePan(new Point(ev.movementX, ev.movementY));
        canvas.requestRenderAll();
      };
      panUp = () => {
        panning = false;
        container.style.cursor = spaceHeld ? 'grab' : '';
        if (panMove) window.removeEventListener('pointermove', panMove);
        if (panUp) window.removeEventListener('pointerup', panUp);
        panMove = null;
        panUp = null;
      };
      window.addEventListener('pointermove', panMove);
      window.addEventListener('pointerup', panUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault(); // no middle-click autoscroll
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || spaceHeld) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return;
      spaceHeld = true;
      container.style.cursor = 'grab';
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceHeld = false;
      if (!panning) container.style.cursor = '';
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onPointerDown, true);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      cancelAnimationFrame(displayRaf);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onPointerDown, true);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (panMove) window.removeEventListener('pointermove', panMove);
      if (panUp) window.removeEventListener('pointerup', panUp);
    };
  }, [ready, containerRef]);

  // ---- Drawing mode -----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    if (drawMode === 'off') {
      canvas.isDrawingMode = false;
      return;
    }
    if (drawMode === 'text') {
      const brush = new TextBrush(canvas);
      brush.settings = { ...textBrush, text: textBrush.text || ' ' };
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
      void ensureFontLoaded(textBrush.fontFamily, textBrush.fontWeight);
      return;
    }
    const brush = new PencilBrush(canvas);
    brush.decimate = 2;
    if (drawMode === 'marker') {
      brush.color = new Color(drawColor).setAlpha(0.45).toRgba();
      brush.width = drawWidth * 2.5;
    } else {
      brush.color = drawColor;
      brush.width = drawWidth;
    }
    if (drawMode === 'glow') {
      brush.shadow = new Shadow({
        color: drawColor,
        blur: drawWidth * 2.5,
        offsetX: 0,
        offsetY: 0
      });
    }
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
  }, [drawMode, drawColor, drawWidth, textBrush, ready]);

  // ---- Object helpers ---------------------------------------------------
  const addAndSelect = useCallback((obj: FabricObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }, []);

  const addText = useCallback(
    async (kind: TextKind) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = presetRef.current;
      const config = TEXT_PRESETS[kind];
      await ensureFontLoaded(config.family, config.weight);
      const darkBg = isDarkColor(canvas.backgroundColor);
      const textbox = new Textbox(config.text, {
        left: width / 2,
        top: height * 0.42,
        width: width * 0.72,
        originX: 'center',
        textAlign: 'center',
        fontFamily: config.family,
        fontWeight: config.weight,
        fontSize: Math.round(Math.min(width, height) * config.sizeFactor),
        fill: darkBg ? '#ffffff' : '#111111'
      });
      textbox.set({ name: config.label });
      addAndSelect(textbox);
    },
    [addAndSelect]
  );

  const addShape = useCallback(
    (kind: RoughShapeKind, options?: Partial<RoughShapeOptions>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = presetRef.current;
      const darkBg = isDarkColor(canvas.backgroundColor);
      const shape = createRoughShape(kind, width * 0.35, {
        stroke: options?.stroke ?? (darkBg ? '#FFE066' : '#111111'),
        strokeWidth: options?.strokeWidth ?? 3,
        fill: options?.fill,
        fillStyle: options?.fillStyle
      });
      shape.set({
        left: width / 2 - (shape.width * shape.scaleX) / 2,
        top: height / 2 - (shape.height * shape.scaleY) / 2
      });
      addAndSelect(shape);
    },
    [addAndSelect]
  );

  const addOverlay = useCallback(
    (kind: OverlayKind) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = presetRef.current;
      const overlay = createOverlay(kind, width, height) as StudioObject;
      overlay.set({
        name: kind.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      });
      addAndSelect(overlay);
    },
    [addAndSelect]
  );

  const addPhoto = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = await fileToImageDataUrl(file);
      const image = await FabricImage.fromURL(dataUrl);
      const { width, height } = presetRef.current;
      const scale = Math.min(
        (width * 0.85) / image.width,
        (height * 0.85) / image.height,
        1
      );
      image.set({
        scaleX: scale,
        scaleY: scale,
        left: (width - image.width * scale) / 2,
        top: (height - image.height * scale) / 2,
        name: file.name.replace(/\.[^.]+$/, '') || 'Photo'
      });
      addAndSelect(image);
    },
    [addAndSelect]
  );

  const addPhotoFromUrl = useCallback(
    async (url: string, name?: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = await urlToImageDataUrl(url);
      const image = await FabricImage.fromURL(dataUrl);
      const { width, height } = presetRef.current;
      const scale = Math.min(
        (width * 0.85) / image.width,
        (height * 0.85) / image.height,
        1
      );
      image.set({
        scaleX: scale,
        scaleY: scale,
        left: (width - image.width * scale) / 2,
        top: (height - image.height * scale) / 2,
        name: name || 'Photo'
      });
      addAndSelect(image);
    },
    [addAndSelect]
  );

  const fitPhotoAsBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.getActiveObject();
    if (!(image instanceof FabricImage)) return;
    const { width, height } = presetRef.current;
    const scale = Math.max(width / image.width, height / image.height);
    image.set({
      scaleX: scale,
      scaleY: scale,
      left: (width - image.width * scale) / 2,
      top: (height - image.height * scale) / 2,
      angle: 0
    });
    canvas.sendObjectToBack(image);
    const background = canvas
      .getObjects()
      .find((o) => (o as StudioObject).name === 'Background');
    if (background) canvas.sendObjectToBack(background);
    canvas.requestRenderAll();
    historyRef.current?.commit();
    markChanged();
  }, [markChanged]);

  const setBackgroundColor = useCallback(
    (color: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.backgroundColor = color;
      canvas.requestRenderAll();
      commitSoon();
      markChanged();
    },
    [commitSoon, markChanged]
  );

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    canvas.discardActiveObject();
    objects.forEach((obj) => canvas.remove(obj));
    canvas.requestRenderAll();
  }, []);

  const duplicateSelected = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (!objects.length) return;
    canvas.discardActiveObject();
    const clones: FabricObject[] = [];
    for (const obj of objects) {
      const clone = await obj.clone();
      clone.set({ left: (obj.left ?? 0) + 24, top: (obj.top ?? 0) + 24 });
      canvas.add(clone);
      clones.push(clone);
    }
    if (clones.length === 1) canvas.setActiveObject(clones[0]);
    else canvas.setActiveObject(new ActiveSelection(clones, { canvas }));
    canvas.requestRenderAll();
  }, []);

  const selectObject = useCallback((obj: StudioObject) => {
    const canvas = canvasRef.current;
    if (!canvas || obj.locked) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    setSelected([obj]);
  }, []);

  const toggleLock = useCallback(
    (obj: StudioObject) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const locked = !obj.locked;
      obj.set({ locked, selectable: !locked, evented: !locked });
      if (locked && canvas.getActiveObjects().includes(obj))
        canvas.discardActiveObject();
      canvas.requestRenderAll();
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  const toggleVisible = useCallback(
    (obj: StudioObject) => {
      obj.set({ visible: !obj.visible });
      canvasRef.current?.requestRenderAll();
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  const removeObject = useCallback((obj: StudioObject) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.getActiveObjects().includes(obj)) canvas.discardActiveObject();
    canvas.remove(obj);
    canvas.requestRenderAll();
  }, []);

  const moveLayer = useCallback(
    (obj: StudioObject, direction: 'up' | 'down') => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (direction === 'up') canvas.bringObjectForward(obj);
      else canvas.sendObjectBackwards(obj);
      canvas.requestRenderAll();
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  const stackTo = useCallback(
    (obj: StudioObject, edge: 'front' | 'back') => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (edge === 'front') canvas.bringObjectToFront(obj);
      else canvas.sendObjectToBack(obj);
      canvas.requestRenderAll();
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  const renameObject = useCallback(
    (obj: StudioObject, name: string) => {
      obj.set({ name: name.trim() || undefined });
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  /** Drag-reorder in the layers panel. Indices are in displayed (top-first) order. */
  const reorderLayers = useCallback(
    (from: number, to: number) => {
      const canvas = canvasRef.current;
      if (!canvas || from === to) return;
      const display = [...canvas.getObjects()].reverse(); // top layer first
      if (from < 0 || to < 0 || from >= display.length || to >= display.length)
        return;
      const [moved] = display.splice(from, 1);
      display.splice(to, 0, moved);
      // Canvas stacking is bottom-first, the reverse of the displayed order.
      display
        .reverse()
        .forEach((obj, index) => canvas.moveObjectTo(obj, index));
      canvas.requestRenderAll();
      historyRef.current?.commit();
      markChanged();
    },
    [markChanged]
  );

  /** Mutate the current selection (or a specific object) and refresh/commit. */
  const updateObjects = useCallback(
    (mutate: (obj: StudioObject) => void, target?: StudioObject) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const targets = target
        ? [target]
        : (canvas.getActiveObjects() as StudioObject[]);
      targets.forEach(mutate);
      canvas.requestRenderAll();
      commitSoon();
      markChanged();
    },
    [commitSoon, markChanged]
  );

  /**
   * Re-stamp a text-brush stroke with new settings. The glyph count changes, so
   * the group is rebuilt and swapped in at the same stacking position.
   */
  const updateTextBrush = useCallback(
    (group: TextBrushGroup, patch: Partial<TextBrushStroke>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Slider drags fire faster than React re-renders, so `group` can already
      // be the previous stamp. Re-find the live one by stroke id (unless the
      // stroke was duplicated - then trust the reference we were handed).
      const matches = canvas
        .getObjects()
        .filter(
          (obj) =>
            isTextBrushGroup(obj) && obj.textBrush.id === group.textBrush.id
        );
      const target =
        matches.length === 1 ? (matches[0] as TextBrushGroup) : group;
      const next = restyleTextBrushGroup(target, patch);
      if (!next) return;
      const index = canvas.getObjects().indexOf(target);
      // Suppress the add/remove commits so one edit is one undo step.
      previewingRef.current = true;
      canvas.remove(target);
      canvas.add(next);
      if (index >= 0) canvas.moveObjectTo(next, index);
      next.setCoords();
      canvas.setActiveObject(next);
      previewingRef.current = false;
      canvas.requestRenderAll();
      setSelected([next as StudioObject]);
      commitSoon();
      markChanged();
    },
    [commitSoon, markChanged]
  );

  const setImageAdjust = useCallback(
    (
      image: FabricImage,
      adjust: { brightness: number; contrast: number; saturation: number }
    ) => {
      image.filters = [
        new filters.Brightness({ brightness: adjust.brightness }),
        new filters.Contrast({ contrast: adjust.contrast }),
        new filters.Saturation({ saturation: adjust.saturation })
      ];
      image.applyFilters();
      canvasRef.current?.requestRenderAll();
      commitSoon();
      markChanged();
    },
    [commitSoon, markChanged]
  );

  // ---- Pages ------------------------------------------------------------
  /** Replace canvas contents with a page's JSON (null = blank page). */
  const loadPageJson = useCallback(async (json: string | null) => {
    const canvas = canvasRef.current;
    const history = historyRef.current;
    if (!canvas || !history) return;
    await history.suspendWhile(async () => {
      canvas.discardActiveObject();
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      if (json) await canvas.loadFromJSON(JSON.parse(json));
    });
    ensurePageClip(canvas, presetRef.current.width, presetRef.current.height);
    canvas.requestRenderAll();
    history.reset();
    setSelected([]);
  }, []);

  const setPagesState = useCallback((next: StudioPage[], active: number) => {
    pagesRef.current = next;
    setPages(next);
    setActivePageIndex(active);
    activePageRef.current = active;
  }, []);

  const switchPage = useCallback(
    async (index: number) => {
      if (
        index === activePageRef.current ||
        index < 0 ||
        index >= pagesRef.current.length
      )
        return;
      const current = captureActivePage();
      setPagesState(current, index);
      await loadPageJson(current[index].json);
      markChanged();
    },
    [captureActivePage, loadPageJson, markChanged, setPagesState]
  );

  const addPage = useCallback(async () => {
    const current = captureActivePage();
    const next = [...current, { id: newPageId(), json: null, thumb: null }];
    setPagesState(next, next.length - 1);
    await loadPageJson(null);
    markChanged();
  }, [captureActivePage, loadPageJson, markChanged, setPagesState]);

  const duplicatePage = useCallback(
    async (index: number) => {
      const current = captureActivePage();
      const source = current[index];
      if (!source?.json) return;
      const copy: StudioPage = {
        id: newPageId(),
        json: source.json,
        thumb: source.thumb
      };
      const next = [
        ...current.slice(0, index + 1),
        copy,
        ...current.slice(index + 1)
      ];
      setPagesState(next, index + 1);
      await loadPageJson(copy.json);
      markChanged();
    },
    [captureActivePage, loadPageJson, markChanged, setPagesState]
  );

  const deletePage = useCallback(
    async (index: number) => {
      if (pagesRef.current.length <= 1) return;
      const current = captureActivePage();
      const next = current.filter((_, i) => i !== index);
      const active = activePageRef.current;
      if (index === active) {
        const newActive = Math.max(0, index - 1);
        setPagesState(next, newActive);
        await loadPageJson(next[newActive].json);
      } else {
        setPagesState(next, index < active ? active - 1 : active);
      }
      markChanged();
    },
    [captureActivePage, loadPageJson, markChanged, setPagesState]
  );

  const movePage = useCallback(
    (index: number, direction: 'left' | 'right') => {
      const target = index + (direction === 'left' ? -1 : 1);
      if (target < 0 || target >= pagesRef.current.length) return;
      const current = captureActivePage();
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      let active = activePageRef.current;
      if (active === index) active = target;
      else if (active === target) active = index;
      setPagesState(next, active);
      markChanged();
    },
    [captureActivePage, markChanged, setPagesState]
  );

  // Regenerate missing page thumbnails (after reload / template import) offscreen.
  const thumbJobRef = useRef(false);
  useEffect(() => {
    if (!ready || thumbJobRef.current) return;
    if (!pages.some((page) => page.json && !page.thumb)) return;
    thumbJobRef.current = true;
    const { width, height } = presetRef.current;
    void (async () => {
      try {
        for (const page of [...pagesRef.current]) {
          if (!page.json || page.thumb) continue;
          const thumb = await renderPageJson(page.json, width, height, {
            multiplier: THUMB_WIDTH / width
          });
          const next = pagesRef.current.map((p) =>
            p.id === page.id ? { ...p, thumb } : p
          );
          pagesRef.current = next;
          setPages(next);
        }
      } finally {
        thumbJobRef.current = false;
      }
    })();
  }, [ready, pages]);

  // ---- History ----------------------------------------------------------
  const undo = useCallback(async () => {
    await historyRef.current?.undo();
    setSelected([]);
    markChanged();
  }, [markChanged]);

  const redo = useCallback(async () => {
    await historyRef.current?.redo();
    setSelected([]);
    markChanged();
  }, [markChanged]);

  // ---- Templates --------------------------------------------------------
  const clearCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    const history = historyRef.current;
    if (!canvas || !history) return;
    await history.suspendWhile(() => {
      canvas.discardActiveObject();
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
    });
    ensurePageClip(canvas, presetRef.current.width, presetRef.current.height);
    setSelected([]);
  }, []);

  const newDesign = useCallback(async () => {
    await clearCanvas();
    canvasRef.current?.requestRenderAll();
    historyRef.current?.reset();
    setPagesState([{ id: newPageId(), json: null, thumb: null }], 0);
    clearAutosave();
    markChanged();
  }, [clearCanvas, markChanged, setPagesState]);

  const applyBuiltinTemplate = useCallback(
    async (id: string) => {
      const canvas = canvasRef.current;
      const history = historyRef.current;
      if (!canvas || !history) return;
      const template = BUILTIN_TEMPLATES.find((t) => t.id === id);
      if (!template) return;
      const { width, height } = presetRef.current;
      const builtPages: StudioPage[] = [];
      await history.suspendWhile(async () => {
        for (const buildPage of template.pages) {
          canvas.discardActiveObject();
          canvas.clear();
          canvas.backgroundColor = '#ffffff';
          ensurePageClip(canvas, width, height);
          await buildPage(canvas, width, height);
          canvas.requestRenderAll();
          builtPages.push({
            id: newPageId(),
            json: history.snapshot(),
            thumb: pageDataUrl(canvas, width, height, {
              multiplier: THUMB_WIDTH / width
            })
          });
        }
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        ensurePageClip(canvas, width, height);
        await canvas.loadFromJSON(JSON.parse(builtPages[0].json ?? '{}'));
      });
      canvas.requestRenderAll();
      setPagesState(builtPages, 0);
      history.reset();
      setSelected([]);
      markChanged();
    },
    [markChanged, setPagesState]
  );

  const applySavedTemplate = useCallback(
    async (template: SavedTemplate) => {
      const canvas = canvasRef.current;
      const history = historyRef.current;
      if (!canvas || !history) return;
      setPresetIdState(template.presetId);
      const templatePreset = getPreset(template.presetId);
      canvas.setDimensions({
        width: templatePreset.width,
        height: templatePreset.height
      });
      const newPages: StudioPage[] = template.pages.map((json) => ({
        id: newPageId(),
        json,
        thumb: null
      }));
      setPagesState(newPages, 0);
      await loadPageJson(newPages[0].json);
      markChanged();
    },
    [loadPageJson, markChanged, setPagesState]
  );

  const saveCurrentAsTemplate = useCallback(
    (name: string): boolean => {
      const canvas = canvasRef.current;
      const history = historyRef.current;
      if (!canvas || !history) return false;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const current = captureActivePage();
      const ok = saveTemplate({
        id: `tpl-${Date.now().toString(36)}`,
        name,
        presetId: presetRef.current.id,
        pages: current.map((page) => page.json ?? '{}'),
        preview: current[0].thumb ?? '',
        createdAt: Date.now()
      });
      setStorageWarning(!ok);
      if (ok) setUserTemplates(loadTemplates());
      return ok;
    },
    [captureActivePage]
  );

  const removeSavedTemplate = useCallback((id: string) => {
    setUserTemplates(deleteTemplate(id));
  }, []);

  const exportTemplateFile = useCallback((template: SavedTemplate) => {
    downloadJson(
      `${template.name.replace(/\s+/g, '-').toLowerCase()}.studio.json`,
      template
    );
  }, []);

  const importTemplateFile = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        const parsed = JSON.parse(await file.text()) as SavedTemplate & {
          json?: string;
        };
        const importedPages =
          Array.isArray(parsed.pages) && parsed.pages.length
            ? parsed.pages
            : typeof parsed.json === 'string'
              ? [parsed.json]
              : null;
        if (!importedPages || !parsed.presetId) return false;
        const template: SavedTemplate = {
          ...parsed,
          pages: importedPages,
          id: `tpl-${Date.now().toString(36)}`,
          name: parsed.name || 'Imported template',
          createdAt: Date.now()
        };
        const ok = saveTemplate(template);
        if (ok) setUserTemplates(loadTemplates());
        return ok;
      } catch {
        return false;
      }
    },
    []
  );

  // ---- Animation --------------------------------------------------------
  /**
   * Snapshot-keyframe model: each object stores absolute poses at times, and
   * the canvas at rest holds the base (design) transform used for stills/save.
   * Playing/scrubbing mutates objects transiently; endPreview restores the base
   * so an animated frame is never saved. Keyframe edits happen only at rest.
   */
  // ponytail: to pose at a mid-time you move the object at rest and keyframe it;
  // no scrub-and-edit. Presets + start/end keyframes cover the common case.
  const beginPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || previewingRef.current) return;
    const base = new Map<StudioObject, Keyframe>();
    for (const obj of canvas.getObjects() as StudioObject[])
      base.set(obj, { t: 0, ...readPose(obj) });
    previewBaseRef.current = base;
    previewingRef.current = true;
  }, []);

  const endPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewingRef.current) return;
    const base = previewBaseRef.current;
    const live = canvas.getObjects();
    base?.forEach((pose, obj) => {
      if (!live.includes(obj)) return;
      obj.set({
        left: pose.left,
        top: pose.top,
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
        angle: pose.angle,
        opacity: pose.opacity
      });
      obj.setCoords();
    });
    previewBaseRef.current = null;
    previewingRef.current = false;
    canvas.requestRenderAll();
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  /** Schedule every audio clip on a live context, aligned to the timeline. */
  const startAudioPlayback = useCallback(
    (from: number) => {
      stopAudioPlayback();
      const clips = audioClipsRef.current;
      if (!clips.length) return;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const base = ctx.currentTime + 0.06;
      for (const clip of clips) {
        if (clipEnd(clip) <= from) continue;
        const lateBy = Math.max(0, from - clip.start);
        const playDur = clip.duration - lateBy;
        if (playDur <= 0) continue;
        const source = ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.connect(ctx.destination);
        source.start(
          base + Math.max(0, clip.start - from),
          clip.offset + lateBy,
          playDur
        );
      }
    },
    [stopAudioPlayback]
  );

  const stopPlayback = useCallback(() => {
    if (playRafRef.current !== null) cancelAnimationFrame(playRafRef.current);
    playRafRef.current = null;
    stopAudioPlayback();
    setPlaying(false);
  }, [stopAudioPlayback]);

  const seek = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      stopPlayback();
      beginPreview();
      applyAnimationAtTime(canvas, t);
      canvas.requestRenderAll();
      setPlayhead(t);
    },
    [beginPreview, stopPlayback]
  );

  const play = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anim = animationDuration(canvas);
    const audioEnd = audioClipsRef.current.reduce(
      (m, c) => Math.max(m, clipEnd(c)),
      0
    );
    const total = Math.max(anim, audioEnd);
    if (total <= 0) return;
    beginPreview();
    canvas.discardActiveObject();
    setPlaying(true);
    const from = playhead >= total ? 0 : playhead;
    startAudioPlayback(from);
    const clock = performance.now() - from * 1000;
    const loop = () => {
      const c = canvasRef.current;
      if (!c) return;
      const t = (performance.now() - clock) / 1000;
      // Animation clamps at its own end; video holds the last frame for audio.
      applyAnimationAtTime(c, Math.min(t, anim));
      c.requestRenderAll();
      if (t >= total) {
        setPlayhead(total);
        stopPlayback();
        return;
      }
      setPlayhead(t);
      playRafRef.current = requestAnimationFrame(loop);
    };
    playRafRef.current = requestAnimationFrame(loop);
  }, [beginPreview, playhead, startAudioPlayback, stopPlayback]);

  const stopAnimation = useCallback(() => {
    stopPlayback();
    endPreview();
    setPlayhead(0);
  }, [endPreview, stopPlayback]);

  const setAnimateMode = useCallback(
    (on: boolean) => {
      if (!on) stopAnimation();
      setAnimateModeState(on);
    },
    [stopAnimation]
  );

  const addKeyframe = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    endPreview(); // capture the resting pose, not an animated frame
    const targets = canvas.getActiveObjects() as StudioObject[];
    if (!targets.length) return;
    const t = Math.round(playhead * 100) / 100;
    targets.forEach((obj) => upsertKeyframe(obj, { t, ...readPose(obj) }));
    historyRef.current?.commit();
    markChanged();
  }, [endPreview, playhead, markChanged]);

  const removeKeyframe = useCallback(
    (obj: StudioObject, t: number) => {
      endPreview();
      removeKeyframeAt(obj, t);
      historyRef.current?.commit();
      markChanged();
    },
    [endPreview, markChanged]
  );

  const applyAnimationPreset = useCallback(
    (preset: AnimationPreset) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      endPreview();
      const targets = canvas.getActiveObjects() as StudioObject[];
      if (!targets.length) return;
      targets.forEach((obj) => presetKeyframes(obj, preset));
      historyRef.current?.commit();
      markChanged();
    },
    [endPreview, markChanged]
  );

  const clearKeyframes = useCallback(
    (obj: StudioObject) => {
      endPreview();
      delete (obj as StudioObject & { keyframes?: Keyframe[] }).keyframes;
      historyRef.current?.commit();
      markChanged();
    },
    [endPreview, markChanged]
  );

  const exportVideo = useCallback(
    async (fps = 30) => {
      const canvas = canvasRef.current;
      const history = historyRef.current;
      if (!canvas || !history) return;
      stopAnimation();
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const json = history.snapshot();
      const { width, height } = presetRef.current;
      const stamp = new Date().toISOString().slice(0, 10);
      const audioEnd = audioClipsRef.current.reduce(
        (m, c) => Math.max(m, clipEnd(c)),
        0
      );
      const total = Math.max(animationDuration(canvas), audioEnd);
      setVideoProgress(0);
      try {
        const audio = await mixClips(audioClipsRef.current, total);
        const blob = await recordPageVideo(videoFormat, json, width, height, {
          fps,
          audio,
          extendToSeconds: total,
          onProgress: setVideoProgress
        });
        downloadBlob(`${presetRef.current.id}-${stamp}.${videoFormat}`, blob);
      } finally {
        setVideoProgress(null);
      }
    },
    [stopAnimation, videoFormat]
  );

  const addAudioClip = useCallback(async (file: File): Promise<boolean> => {
    try {
      const buffer = await decodeAudioFile(file);
      setAudioClips((prev) => [...prev, createClip(file.name, buffer)]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateAudioClip = useCallback(
    (id: string, patch: Partial<AudioClip>) => {
      setAudioClips((prev) =>
        prev.map((c) => (c.id === id ? clampClip({ ...c, ...patch }) : c))
      );
    },
    []
  );

  const removeAudioClip = useCallback((id: string) => {
    setAudioClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const splitAudioClipAt = useCallback((id: string, atTime: number) => {
    setAudioClips((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index < 0) return prev;
      const pair = splitClip(prev[index], atTime);
      if (!pair) return prev;
      return [
        ...prev.slice(0, index),
        pair[0],
        pair[1],
        ...prev.slice(index + 1)
      ];
    });
  }, []);

  const addCustomFont = useCallback(
    async (file: File): Promise<StudioFont | null> => {
      try {
        const font = await registerCustomFont(file);
        setCustomFonts((prev) => [
          ...prev.filter((f) => f.family !== font.family),
          font
        ]);
        return font;
      } catch {
        return null;
      }
    },
    []
  );

  // ---- Export -----------------------------------------------------------
  const exportImage = useCallback(
    async (options: ExportOptions) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const stamp = new Date().toISOString().slice(0, 10);
      const ext = options.format === 'jpeg' ? 'jpg' : 'png';

      if (options.pages === 'current' || pagesRef.current.length === 1) {
        const dataUrl = pageDataUrl(
          canvas,
          presetRef.current.width,
          presetRef.current.height,
          {
            format: options.format,
            quality: options.quality,
            multiplier: options.scale
          }
        );
        downloadDataUrl(`${presetRef.current.id}-${stamp}.${ext}`, dataUrl);
        return;
      }

      const current = captureActivePage();
      const { width, height } = presetRef.current;
      const images: { name: string; dataUrl: string }[] = [];
      for (let index = 0; index < current.length; index++) {
        const json = current[index].json;
        if (!json) continue;
        const dataUrl = await renderPageJson(json, width, height, {
          format: options.format,
          quality: options.quality,
          multiplier: options.scale
        });
        images.push({
          name: `slide-${String(index + 1).padStart(2, '0')}.${ext}`,
          dataUrl
        });
      }
      // Browsers block several programmatic downloads in a row - ship one zip.
      await downloadImagesAsZip(
        `${presetRef.current.id}-carousel-${stamp}.zip`,
        images
      );
    },
    [captureActivePage]
  );

  // ---- Preset change ----------------------------------------------------
  const setPresetId = useCallback(
    (id: string) => {
      setPresetIdState(id);
      const canvas = canvasRef.current;
      if (canvas) {
        // The view effect refits + re-clips to the new page size (preset dep).
        canvas.requestRenderAll();
        historyRef.current?.commit();
        // Thumbnails have the old aspect ratio - drop them so they regenerate.
        const stale = pagesRef.current.map((page) => ({
          ...page,
          thumb: null
        }));
        pagesRef.current = stale;
        setPages(stale);
        markChanged();
      }
    },
    [markChanged]
  );

  // ---- Keyboard shortcuts -----------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      )
        return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        void (event.shiftKey ? redo() : undo());
        return;
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        void redo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        void duplicateSelected();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (canvas.getActiveObjects().length) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (event.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
      }
      if (event.key.startsWith('Arrow')) {
        const objects = canvas.getActiveObjects();
        if (!objects.length) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx =
          event.key === 'ArrowLeft'
            ? -step
            : event.key === 'ArrowRight'
              ? step
              : 0;
        const dy =
          event.key === 'ArrowUp'
            ? -step
            : event.key === 'ArrowDown'
              ? step
              : 0;
        objects.forEach((obj) =>
          obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy })
        );
        canvas.requestRenderAll();
        commitSoon();
        scheduleAutosave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
    commitSoon,
    scheduleAutosave
  ]);

  return {
    ready,
    preset,
    presetId,
    setPresetId,
    zoom,
    zoomIn,
    zoomOut,
    zoomToFit: fitView,
    selected,
    layers,
    version,
    pages,
    activePageIndex,
    switchPage,
    addPage,
    duplicatePage,
    deletePage,
    movePage,
    drawMode,
    setDrawMode: setDrawModeState,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    textBrush,
    updateTextBrushSettings,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    undo,
    redo,
    addText,
    addShape,
    addOverlay,
    addPhoto,
    addPhotoFromUrl,
    fitPhotoAsBackground,
    setBackgroundColor,
    backgroundColor,
    deleteSelected,
    duplicateSelected,
    selectObject,
    toggleLock,
    toggleVisible,
    removeObject,
    moveLayer,
    reorderLayers,
    stackTo,
    renameObject,
    contextMenu,
    closeContextMenu: () => setContextMenu(null),
    updateObjects,
    updateTextBrush,
    setImageAdjust,
    newDesign,
    applyBuiltinTemplate,
    applySavedTemplate,
    saveCurrentAsTemplate,
    removeSavedTemplate,
    exportTemplateFile,
    importTemplateFile,
    userTemplates,
    exportImage,
    storageWarning,
    // Animation
    animateMode,
    setAnimateMode,
    playing,
    playhead,
    duration,
    play,
    pause: stopPlayback,
    stopAnimation,
    seek,
    addKeyframe,
    removeKeyframe,
    applyAnimationPreset,
    clearKeyframes,
    getKeyframes,
    hasAnimation: () =>
      canvasRef.current ? hasAnimation(canvasRef.current) : false,
    exportVideo,
    videoProgress,
    videoFormats,
    videoFormat,
    setVideoFormat,
    audioClips,
    addAudioClip,
    updateAudioClip,
    removeAudioClip,
    splitAudioClipAt,
    // Fonts
    fonts: [...STUDIO_FONTS, ...customFonts],
    addCustomFont
  };
}

export type StudioApi = ReturnType<typeof useStudio>;
