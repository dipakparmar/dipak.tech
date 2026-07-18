'use client';

import {
  ArrowLeft,
  Clapperboard,
  FilePlus2,
  Minus,
  Palette,
  Plus,
  Redo2,
  TriangleAlert,
  Undo2
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { PagesStrip } from '@/components/studio/pages-strip';
import { RightPanel } from '@/components/studio/right-panel';
import {
  ExportDialog,
  TemplatesDialog
} from '@/components/studio/studio-dialogs';
import { Timeline } from '@/components/studio/timeline';
import { ToolRail } from '@/components/studio/tool-rail';
import { useStudio } from '@/components/studio/use-studio';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { STUDIO_FONT_CLASSES } from '@/lib/studio/fonts';
import { presetGroups } from '@/lib/studio/presets';

export function DesignStudio({ backHref = '/tools' }: { backHref?: string }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const studio = useStudio(canvasElRef, containerRef);
  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/*
        Carries the studio font classes so next/font emits their @font-face rules,
        without letting any of them set the UI's base font (each class sets
        font-family, so applying them to a real container would override the app font).
      */}
      <span className={`${STUDIO_FONT_CLASSES} sr-only`} aria-hidden />

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b px-2 py-2 pr-16">
        <Link
          href={backHref}
          aria-label="Back to tools"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mr-1 hidden items-center gap-1.5 sm:flex">
          <Palette className="h-4 w-4 text-fuchsia-500" />
          <span className="text-sm font-semibold">Studio</span>
        </div>

        <Select value={studio.presetId} onValueChange={studio.setPresetId}>
          <SelectTrigger className="h-8 w-44 text-xs" aria-label="Canvas size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetGroups().map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.presets.map((preset) => (
                  <SelectItem
                    key={preset.id}
                    value={preset.id}
                    className="text-xs"
                  >
                    {preset.label} · {preset.width}×{preset.height}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!studio.canUndo}
              onClick={() => void studio.undo()}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!studio.canRedo}
              onClick={() => void studio.redo()}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⇧⌘Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom out"
            onClick={studio.zoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={studio.zoomToFit}
            aria-label="Fit to screen"
            title="Fit to screen"
            className="w-11 text-center text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground"
          >
            {Math.round(studio.zoom * 100)}%
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Zoom in"
            onClick={studio.zoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {studio.storageWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <TriangleAlert className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                Browser storage is full - autosave/templates may not persist.
                Export your design to keep it safe.
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            type="button"
            variant={studio.animateMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => studio.setAnimateMode(!studio.animateMode)}
          >
            <Clapperboard className="mr-1.5 h-4 w-4" />
            Animate
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <FilePlus2 className="mr-1.5 h-4 w-4" />
                New
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new design?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears the canvas. Save it as a template first if you
                  want to reuse it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void studio.newDesign()}>
                  Clear canvas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <TemplatesDialog studio={studio} />
          <ExportDialog studio={studio} />
        </div>
      </div>

      {/* Workspace */}
      <div className="flex min-h-0 flex-1">
        <ToolRail studio={studio} onToggleLayers={() => setLayersOpen(true)} />

        <div
          ref={containerRef}
          className="relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-neutral-200/70 bg-[radial-gradient(circle,_rgba(120,120,120,0.18)_1px,_transparent_1px)] bg-[size:18px_18px] dark:bg-neutral-900"
        >
          {/* The canvas fills the workspace; the page is drawn as a clipped card.
              Pan/zoom move Fabric's viewportTransform (see useStudio). */}
          <canvas ref={canvasElRef} className="absolute inset-0" />
          {!studio.ready && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Preparing your studio…
              </div>
            </div>
          )}
        </div>

        <aside className="hidden w-72 shrink-0 border-l bg-background/60 lg:block">
          <RightPanel studio={studio} />
        </aside>
      </div>

      {/* Animation timeline */}
      {studio.animateMode && <Timeline studio={studio} />}

      {/* Pages / carousel strip */}
      <PagesStrip studio={studio} />

      {/* Mobile layers/properties sheet */}
      <Sheet open={layersOpen} onOpenChange={setLayersOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="border-b px-3 py-2">
            <SheetTitle className="text-sm">Layers & properties</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100dvh-3.5rem)]">
            <RightPanel studio={studio} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
