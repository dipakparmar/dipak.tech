'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { COLOR_SWATCHES } from '@/lib/studio/presets';
import { cn } from '@/lib/utils';

export function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Set ${label.toLowerCase()} to ${swatch}`}
            onClick={() => onChange(swatch)}
            className={cn(
              'h-8 w-8 rounded-full border transition-transform hover:scale-110',
              value.toLowerCase() === swatch.toLowerCase() &&
                'ring-2 ring-sky-500 ring-offset-2 ring-offset-background'
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]">
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`Custom ${label.toLowerCase()}`}
          />
        </label>
      </div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {format ? format(value) : Math.round(value)}
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
