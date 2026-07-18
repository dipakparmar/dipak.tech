'use client';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
  Upload
} from 'lucide-react';
import { FabricImage, Group, IText, Textbox, filters } from 'fabric';
import { useRef } from 'react';

import { ColorField, SliderField } from '@/components/studio/controls';
import {
  getObjectLabel,
  type StudioApi,
  type StudioObject
} from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ensureFontLoaded } from '@/lib/studio/fonts';
import { cn } from '@/lib/utils';

function isTextLike(
  obj: StudioObject
): obj is (Textbox | IText) & StudioObject {
  return obj instanceof Textbox || obj instanceof IText;
}

function readImageAdjust(image: FabricImage) {
  const find = <T,>(Ctor: new (...args: never[]) => T): T | undefined =>
    image.filters?.find((f) => f instanceof Ctor) as T | undefined;
  return {
    brightness: find(filters.Brightness)?.brightness ?? 0,
    contrast: find(filters.Contrast)?.contrast ?? 0,
    saturation: find(filters.Saturation)?.saturation ?? 0
  };
}

function TextProperties({
  studio,
  text
}: {
  studio: StudioApi;
  text: (Textbox | IText) & StudioObject;
}) {
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const fontGroups = [
    { label: 'Handwriting', kind: 'handwriting' as const },
    { label: 'Display', kind: 'display' as const },
    { label: 'Body', kind: 'body' as const }
  ];
  const applyFont = async (family: string) => {
    await ensureFontLoaded(family, String(text.fontWeight ?? '400'));
    studio.updateObjects((obj) => {
      if (isTextLike(obj)) obj.set({ fontFamily: family });
    });
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Font</Label>
        <div className="flex items-center gap-1.5">
          <Select value={text.fontFamily} onValueChange={applyFont}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {fontGroups.map((group) => (
                <SelectGroup key={group.kind}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {studio.fonts
                    .filter((font) => font.kind === group.kind)
                    .map((font) => (
                      <SelectItem
                        key={font.label}
                        value={font.family}
                        style={{ fontFamily: font.family }}
                      >
                        {font.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Upload custom font"
            onClick={() => fontUploadRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fontUploadRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const font = await studio.addCustomFont(file);
              if (font) await applyFont(font.family);
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={text.textAlign ?? 'left'}
          onValueChange={(value) => {
            if (!value) return;
            studio.updateObjects((obj) => {
              if (isTextLike(obj)) obj.set({ textAlign: value });
            });
          }}
          className="justify-start"
        >
          <ToggleGroupItem
            value="left"
            aria-label="Align left"
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Align center"
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Align right"
            className="h-8 w-8 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          type="button"
          variant={String(text.fontWeight) === '700' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          aria-label="Toggle bold"
          onClick={() => {
            const next = String(text.fontWeight) === '700' ? '400' : '700';
            void ensureFontLoaded(text.fontFamily ?? '', next);
            studio.updateObjects((obj) => {
              if (isTextLike(obj)) obj.set({ fontWeight: next });
            });
          }}
        >
          <Bold className="h-4 w-4" />
        </Button>
      </div>

      <SliderField
        label="Size"
        value={Math.round(text.fontSize ?? 40)}
        min={12}
        max={400}
        onChange={(fontSize) =>
          studio.updateObjects((obj) => {
            if (isTextLike(obj)) obj.set({ fontSize });
          })
        }
      />
      <SliderField
        label="Letter spacing"
        value={text.charSpacing ?? 0}
        min={-100}
        max={1000}
        step={10}
        onChange={(charSpacing) =>
          studio.updateObjects((obj) => {
            if (isTextLike(obj)) obj.set({ charSpacing });
          })
        }
      />
      <SliderField
        label="Line height"
        value={text.lineHeight ?? 1.16}
        min={0.8}
        max={2.2}
        step={0.02}
        format={(v) => v.toFixed(2)}
        onChange={(lineHeight) =>
          studio.updateObjects((obj) => {
            if (isTextLike(obj)) obj.set({ lineHeight });
          })
        }
      />
      {typeof text.fill === 'string' && (
        <ColorField
          label="Text color"
          value={text.fill}
          onChange={(fill) =>
            studio.updateObjects((obj) => {
              if (isTextLike(obj)) obj.set({ fill });
            })
          }
        />
      )}
    </div>
  );
}

function ImageProperties({
  studio,
  image
}: {
  studio: StudioApi;
  image: FabricImage & StudioObject;
}) {
  const adjust = readImageAdjust(image);
  return (
    <div className="space-y-3">
      <SliderField
        label="Brightness"
        value={adjust.brightness}
        min={-0.5}
        max={0.5}
        step={0.02}
        format={(v) => v.toFixed(2)}
        onChange={(brightness) =>
          studio.setImageAdjust(image, { ...adjust, brightness })
        }
      />
      <SliderField
        label="Contrast"
        value={adjust.contrast}
        min={-0.5}
        max={0.5}
        step={0.02}
        format={(v) => v.toFixed(2)}
        onChange={(contrast) =>
          studio.setImageAdjust(image, { ...adjust, contrast })
        }
      />
      <SliderField
        label="Saturation"
        value={adjust.saturation}
        min={-1}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(saturation) =>
          studio.setImageAdjust(image, { ...adjust, saturation })
        }
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          studio.setImageAdjust(image, {
            brightness: 0,
            contrast: 0,
            saturation: 0
          })
        }
      >
        Reset adjustments
      </Button>
    </div>
  );
}

function ShapeProperties({
  studio,
  shape
}: {
  studio: StudioApi;
  shape: StudioObject;
}) {
  const isGroup = shape instanceof Group;
  const fillValue =
    typeof shape.fill === 'string' && shape.fill ? shape.fill : '#FFE066';
  return (
    <div className="space-y-3">
      <ColorField
        label={isGroup ? 'Shape color' : 'Fill color'}
        value={fillValue}
        onChange={(color) =>
          studio.updateObjects((obj) => {
            if (obj instanceof Group) {
              obj.getObjects().forEach((child) => {
                if (child.stroke) child.set({ stroke: color });
                if (child.fill) child.set({ fill: color });
                child.set({ dirty: true });
              });
              obj.set({ dirty: true });
            } else if (typeof obj.fill === 'string') {
              obj.set({ fill: color });
            }
          }, shape)
        }
      />
    </div>
  );
}

function LayerRow({ studio, obj }: { studio: StudioApi; obj: StudioObject }) {
  const isActive = studio.selected.includes(obj);
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-sm transition-colors',
        isActive ? 'border-sky-500/40 bg-sky-500/10' : 'hover:bg-muted/60'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground"
        aria-label={obj.visible ? 'Hide layer' : 'Show layer'}
        onClick={() => studio.toggleVisible(obj)}
      >
        {obj.visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </Button>
      <button
        type="button"
        className={cn(
          'min-w-0 flex-1 truncate text-left',
          obj.locked && 'text-muted-foreground'
        )}
        onClick={() => studio.selectObject(obj)}
      >
        {getObjectLabel(obj)}
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Move layer up"
          onClick={() => studio.moveLayer(obj, 'up')}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Move layer down"
          onClick={() => studio.moveLayer(obj, 'down')}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label="Delete layer"
          onClick={() => studio.removeObject(obj)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 shrink-0',
          obj.locked ? 'text-amber-500' : 'text-muted-foreground/50'
        )}
        aria-label={obj.locked ? 'Unlock layer' : 'Lock layer'}
        onClick={() => studio.toggleLock(obj)}
      >
        {obj.locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <LockOpen className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export function RightPanel({ studio }: { studio: StudioApi }) {
  const single = studio.selected.length === 1 ? studio.selected[0] : null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Properties */}
      <div className="border-b p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {studio.selected.length
            ? studio.selected.length === 1
              ? getObjectLabel(studio.selected[0])
              : `${studio.selected.length} objects`
            : 'Nothing selected'}
        </h3>
        {studio.selected.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Select something on the canvas, or add text, shapes, and photos from
            the left rail.
          </p>
        )}
        {studio.selected.length > 0 && (
          <div className="space-y-3">
            {single && isTextLike(single) && (
              <TextProperties studio={studio} text={single} />
            )}
            {single && single instanceof FabricImage && (
              <ImageProperties studio={studio} image={single} />
            )}
            {single &&
              !isTextLike(single) &&
              !(single instanceof FabricImage) && (
                <ShapeProperties studio={studio} shape={single} />
              )}
            <SliderField
              label="Opacity"
              value={Math.round(
                (single?.opacity ?? studio.selected[0].opacity ?? 1) * 100
              )}
              min={2}
              max={100}
              format={(v) => `${Math.round(v)}%`}
              onChange={(value) =>
                studio.updateObjects((obj) => obj.set({ opacity: value / 100 }))
              }
            />
            <Separator />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void studio.duplicateSelected()}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={studio.deleteSelected}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Layers */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layers ({studio.layers.length})
        </h3>
        <ScrollArea className="min-h-0 flex-1 -mx-1 px-1">
          <div className="flex flex-col gap-0.5">
            {studio.layers.map((obj, index) => (
              <LayerRow
                key={`${index}-${getObjectLabel(obj)}`}
                studio={studio}
                obj={obj}
              />
            ))}
            {!studio.layers.length && (
              <p className="text-xs text-muted-foreground">
                The canvas is empty.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
