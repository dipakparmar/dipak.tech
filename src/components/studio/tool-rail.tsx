'use client';

import {
  ArrowRight,
  ArrowUpRight,
  Circle,
  CircleDashed,
  Heart,
  Highlighter,
  ImagePlus,
  Images,
  Layers2,
  MousePointer2,
  PaintBucket,
  PenLine,
  Shapes,
  Sparkles,
  Square,
  Star,
  Type,
  Underline
} from 'lucide-react';
import { useRef, useState } from 'react';

import { ColorField, SliderField } from '@/components/studio/controls';
import { TextBrushFields } from '@/components/studio/text-brush-fields';
import { UnsplashPanel } from '@/components/studio/unsplash-panel';
import type {
  DrawMode,
  StudioApi,
  TextKind
} from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  FONT_BODY,
  FONT_DISPLAY,
  FONT_HANDWRITING,
  FONT_MARKER
} from '@/lib/studio/fonts';
import { OVERLAY_LABELS } from '@/lib/studio/overlays';
import {
  ROUGH_SHAPE_LABELS,
  type RoughShapeKind
} from '@/lib/studio/rough-shapes';
import { cn } from '@/lib/utils';

const SHAPE_ICONS: Record<RoughShapeKind, typeof Circle> = {
  rectangle: Square,
  ellipse: Circle,
  arrow: ArrowRight,
  star: Star,
  heart: Heart,
  'scribble-circle': CircleDashed,
  'scribble-underline': Underline,
  'scribble-arrow': ArrowUpRight,
  'scribble-highlight': Highlighter
};

const TEXT_BUTTONS: {
  kind: TextKind;
  label: string;
  family: string;
  className: string;
}[] = [
  {
    kind: 'heading',
    label: 'Big Headline',
    family: FONT_DISPLAY,
    className: 'text-2xl'
  },
  {
    kind: 'subheading',
    label: 'Subheading',
    family: FONT_BODY,
    className: 'text-base font-semibold'
  },
  {
    kind: 'body',
    label: 'A little body text',
    family: FONT_BODY,
    className: 'text-sm'
  },
  {
    kind: 'handwritten',
    label: 'a handwritten note',
    family: FONT_HANDWRITING,
    className: 'text-2xl'
  },
  {
    kind: 'marker',
    label: 'Marker note',
    family: FONT_MARKER,
    className: 'text-base'
  }
];

const DRAW_MODES: { mode: DrawMode; label: string }[] = [
  { mode: 'pen', label: 'Pen' },
  { mode: 'marker', label: 'Marker' },
  { mode: 'glow', label: 'Glow' },
  { mode: 'text', label: 'Text' }
];

function RailButton({
  label,
  active,
  onClick,
  children
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn('h-10 w-10', active && 'text-sky-500')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ToolRail({
  studio,
  onToggleLayers
}: {
  studio: StudioApi;
  onToggleLayers: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shapeColor, setShapeColor] = useState('#FFE066');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [unsplashOpen, setUnsplashOpen] = useState(false);

  const selectedImage =
    studio.selected.length === 1 && studio.selected[0].isType('image');

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 border-r bg-background/60 p-1.5">
      <RailButton
        label="Select (esc)"
        active={studio.drawMode === 'off'}
        onClick={() => studio.setDrawMode('off')}
      >
        <MousePointer2 className="h-5 w-5" />
      </RailButton>

      {/* Text */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Add text">
              <Type className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-64 p-2">
          <div className="flex flex-col gap-1">
            {TEXT_BUTTONS.map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={() => void studio.addText(item.kind)}
                className={cn(
                  'rounded-md px-3 py-2 text-left transition-colors hover:bg-muted',
                  item.className
                )}
                style={{ fontFamily: item.family }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Shapes */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Hand-drawn shapes">
              <Shapes className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-64 space-y-3 p-3"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {ROUGH_SHAPE_LABELS.map((shape) => {
              const Icon = SHAPE_ICONS[shape.kind];
              return (
                <button
                  key={shape.kind}
                  type="button"
                  onClick={() =>
                    studio.addShape(shape.kind, {
                      stroke: shapeColor,
                      strokeWidth: 3
                    })
                  }
                  className="flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-center transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 opacity-60" />
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {shape.label}
                  </span>
                </button>
              );
            })}
          </div>
          <ColorField
            label="Shape color"
            value={shapeColor}
            onChange={setShapeColor}
          />
        </PopoverContent>
      </Popover>

      {/* Draw */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Draw" active={studio.drawMode !== 'off'}>
              <PenLine className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-64 space-y-3 p-3"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {DRAW_MODES.map((item) => (
              <Button
                key={item.mode}
                type="button"
                size="sm"
                variant={studio.drawMode === item.mode ? 'default' : 'outline'}
                onClick={() =>
                  studio.setDrawMode(
                    studio.drawMode === item.mode ? 'off' : item.mode
                  )
                }
              >
                {item.label}
              </Button>
            ))}
          </div>
          {studio.drawMode === 'text' ? (
            <TextBrushFields
              id="draw-text-brush"
              value={studio.textBrush}
              fonts={studio.fonts}
              onChange={studio.updateTextBrushSettings}
            />
          ) : (
            <>
              <ColorField
                label="Brush color"
                value={studio.drawColor}
                onChange={studio.setDrawColor}
              />
              <SliderField
                label="Brush size"
                value={studio.drawWidth}
                min={2}
                max={60}
                onChange={studio.setDrawWidth}
              />
            </>
          )}
          {studio.drawMode !== 'off' && (
            <p className="text-xs text-muted-foreground">
              {studio.drawMode === 'text'
                ? 'Drag on the canvas - your text repeats along the stroke. Select it afterwards to keep tweaking.'
                : 'Drawing mode is on - draw directly on the canvas. Press Select when done.'}
            </p>
          )}
        </PopoverContent>
      </Popover>

      {/* Photo */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Add photo">
              <ImagePlus className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-64 space-y-2 p-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setPhotoBusy(true);
              try {
                await studio.addPhoto(file);
              } finally {
                setPhotoBusy(false);
              }
            }}
          />
          <Button
            type="button"
            className="w-full"
            disabled={photoBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {photoBusy ? 'Adding…' : 'Upload a photo'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!selectedImage}
            onClick={studio.fitPhotoAsBackground}
          >
            Fill canvas as background
          </Button>
          <p className="text-xs text-muted-foreground">
            Photos stay in your browser - nothing is uploaded to a server.
          </p>
        </PopoverContent>
      </Popover>

      {/* Stock photos (Unsplash) */}
      <Popover open={unsplashOpen} onOpenChange={setUnsplashOpen}>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Stock photos">
              <Images className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-72 p-3">
          <UnsplashPanel
            studio={studio}
            onInserted={() => setUnsplashOpen(false)}
          />
        </PopoverContent>
      </Popover>

      {/* Overlays */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Overlay effects">
              <Sparkles className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-72 p-2">
          <div className="flex flex-col gap-1">
            {OVERLAY_LABELS.map((overlay) => (
              <button
                key={overlay.kind}
                type="button"
                onClick={() => studio.addOverlay(overlay.kind)}
                className="rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Highlighter className="h-3.5 w-3.5 text-sky-500" />
                  {overlay.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {overlay.hint}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Background */}
      <Popover>
        <PopoverTrigger asChild>
          <span>
            <RailButton label="Background color">
              <PaintBucket className="h-5 w-5" />
            </RailButton>
          </span>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-64 p-3">
          <ColorField
            label="Canvas background"
            value={studio.backgroundColor}
            onChange={studio.setBackgroundColor}
          />
        </PopoverContent>
      </Popover>

      <div className="mt-auto lg:hidden">
        <RailButton label="Layers & properties" onClick={onToggleLayers}>
          <Layers2 className="h-5 w-5" />
        </RailButton>
      </div>
    </div>
  );
}
