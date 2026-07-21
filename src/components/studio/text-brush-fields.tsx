'use client';

import { ColorField, SliderField } from '@/components/studio/controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ensureFontLoaded, type StudioFont } from '@/lib/studio/fonts';
import type {
  TextBrushColorMode,
  TextBrushSettings
} from '@/lib/studio/text-brush';

const COLOR_MODES: { mode: TextBrushColorMode; label: string }[] = [
  { mode: 'solid', label: 'Solid' },
  { mode: 'gradient', label: 'Gradient' },
  { mode: 'rainbow', label: 'Rainbow' }
];

/** Every text-brush knob. Shared by the Draw popover and the selection panel. */
export function TextBrushFields({
  id,
  value,
  fonts,
  onChange
}: {
  /** Prefix for input ids so the two mounts don't collide. */
  id: string;
  value: TextBrushSettings;
  fonts: StudioFont[];
  onChange: (patch: Partial<TextBrushSettings>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-text`} className="text-xs text-muted-foreground">
          Text
        </Label>
        <Input
          id={`${id}-text`}
          className="h-8"
          value={value.text}
          placeholder="make it yours "
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Font</Label>
        <Select
          value={value.fontFamily}
          onValueChange={async (fontFamily) => {
            await ensureFontLoaded(fontFamily, value.fontWeight);
            onChange({ fontFamily });
          }}
        >
          <SelectTrigger aria-label="Font" className="h-8">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((font) => (
              <SelectItem
                key={font.label}
                value={font.family}
                style={{ fontFamily: font.family }}
              >
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SliderField
        label="Size"
        value={value.fontSize}
        min={8}
        max={160}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <SliderField
        label="Letter spacing"
        value={value.spacing}
        min={-4}
        max={40}
        onChange={(spacing) => onChange({ spacing })}
      />
      <SliderField
        label="Smoothness"
        value={Math.round(value.smoothing * 100)}
        min={0}
        max={100}
        step={5}
        format={(v) => `${Math.round(v)}%`}
        onChange={(v) => onChange({ smoothing: v / 100 })}
      />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Colour</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLOR_MODES.map((item) => (
            <Button
              key={item.mode}
              type="button"
              size="sm"
              variant={value.colorMode === item.mode ? 'default' : 'outline'}
              onClick={() => onChange({ colorMode: item.mode })}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {value.colorMode !== 'rainbow' && (
        <ColorField
          label={
            value.colorMode === 'gradient' ? 'Gradient start' : 'Text color'
          }
          value={value.color}
          onChange={(color) => onChange({ color })}
        />
      )}
      {value.colorMode === 'gradient' && (
        <ColorField
          label="Gradient end"
          value={value.color2}
          onChange={(color2) => onChange({ color2 })}
        />
      )}
    </div>
  );
}
