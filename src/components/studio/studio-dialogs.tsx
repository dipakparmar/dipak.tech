'use client';

import { Download, FileUp, LayoutTemplate, Save, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { SliderField } from '@/components/studio/controls';
import type { ExportOptions, StudioApi } from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BUILTIN_TEMPLATES } from '@/lib/studio/templates';

export function TemplatesDialog({ studio }: { studio: StudioApi }) {
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <LayoutTemplate className="mr-1.5 h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Start from a preset layout, or save the current design as your own
            reusable template.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65dvh] pr-3">
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-sm font-semibold">Starter templates</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUILTIN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={async () => {
                      await studio.applyBuiltinTemplate(template.id);
                      setOpen(false);
                    }}
                    className="rounded-lg border p-3 text-left transition-colors hover:border-sky-500/40 hover:bg-muted/60"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {template.label}
                      {template.pages.length > 1 && (
                        <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-500">
                          {template.pages.length} pages
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Applying a starter template replaces the current canvas (undo
                brings it back).
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold">My templates</h4>
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Name this design (e.g. IG story base)"
                  className="h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!templateName.trim()}
                  onClick={() => {
                    const ok = studio.saveCurrentAsTemplate(
                      templateName.trim()
                    );
                    setMessage(
                      ok
                        ? `Saved "${templateName.trim()}"`
                        : 'Could not save - browser storage is full'
                    );
                    if (ok) setTemplateName('');
                  }}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save current
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => importInputRef.current?.click()}
                >
                  <FileUp className="mr-1.5 h-3.5 w-3.5" />
                  Import
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    const ok = await studio.importTemplateFile(file);
                    setMessage(
                      ok
                        ? 'Template imported'
                        : "That file doesn't look like a studio template"
                    );
                  }}
                />
              </div>
              {message && (
                <p className="mb-2 text-xs text-muted-foreground">{message}</p>
              )}
              {studio.userTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No saved templates yet. Design something you want to reuse -
                  brand colors, handle, layout - then save it here.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {studio.userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group overflow-hidden rounded-lg border"
                    >
                      <button
                        type="button"
                        className="block w-full"
                        onClick={async () => {
                          await studio.applySavedTemplate(template);
                          setOpen(false);
                        }}
                      >
                        {template.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={template.preview}
                            alt={template.name}
                            className="aspect-square w-full bg-muted object-contain"
                          />
                        ) : (
                          <span className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            No preview
                          </span>
                        )}
                      </button>
                      <div className="flex items-center justify-between gap-1 border-t px-2 py-1">
                        <span className="truncate text-xs font-medium">
                          {template.name}
                        </span>
                        <div className="flex shrink-0 items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            aria-label="Download template file"
                            onClick={() => studio.exportTemplateFile(template)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            aria-label="Delete template"
                            onClick={() =>
                              studio.removeSavedTemplate(template.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function ExportDialog({ studio }: { studio: StudioApi }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportOptions['format']>('png');
  const [scale, setScale] = useState<ExportOptions['scale']>(1);
  const [quality, setQuality] = useState(0.92);
  const [pagesMode, setPagesMode] = useState<ExportOptions['pages']>('all');
  const [exporting, setExporting] = useState(false);

  const { width, height } = studio.preset;
  const pageCount = studio.pages.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export image</DialogTitle>
          <DialogDescription>
            {studio.preset.group} · {studio.preset.label}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as ExportOptions['format'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Select
                value={String(scale)}
                onValueChange={(v) =>
                  setScale(Number(v) as ExportOptions['scale'])
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}x · {width * s}×{height * s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {pageCount > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pages</Label>
              <Select
                value={pagesMode}
                onValueChange={(v) => setPagesMode(v as ExportOptions['pages'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All {pageCount} pages (zip of slides)
                  </SelectItem>
                  <SelectItem value="current">Current page only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {format === 'jpeg' && (
            <SliderField
              label="JPEG quality"
              value={quality}
              min={0.5}
              max={1}
              step={0.02}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={setQuality}
            />
          )}
          <Button
            type="button"
            className="w-full"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await studio.exportImage({
                  format,
                  scale,
                  quality,
                  pages: pagesMode
                });
              } finally {
                setExporting(false);
              }
              setOpen(false);
            }}
          >
            {exporting
              ? 'Exporting…'
              : pageCount > 1 && pagesMode === 'all'
                ? `Download ${pageCount} slides (.zip)`
                : `Download ${format.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
