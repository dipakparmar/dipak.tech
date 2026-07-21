'use client';

import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';

import type { StudioApi } from '@/components/studio/use-studio';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function PagesStrip({ studio }: { studio: StudioApi }) {
  const aspect = studio.preset.width / studio.preset.height;
  const thumbHeight = 64;
  const thumbWidth = Math.max(40, Math.min(thumbHeight * aspect, 148));

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t bg-background/80 px-3 py-2">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Pages
      </span>
      {studio.pages.map((page, index) => {
        const isActive = index === studio.activePageIndex;
        return (
          <div key={page.id} className="group relative shrink-0">
            <button
              type="button"
              onClick={() => void studio.switchPage(index)}
              aria-label={`Go to page ${index + 1}`}
              aria-current={isActive}
              className={cn(
                'relative overflow-hidden rounded-md border bg-muted/40 transition-all',
                isActive
                  ? 'ring-2 ring-sky-500 ring-offset-1 ring-offset-background'
                  : 'hover:border-sky-500/40'
              )}
              style={{ width: thumbWidth, height: thumbHeight }}
            >
              {page.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.thumb}
                  alt={`Page ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  {index + 1}
                </span>
              )}
              <span className="absolute bottom-0.5 left-1 rounded bg-black/55 px-1 text-[10px] font-medium leading-4 text-white">
                {index + 1}
              </span>
            </button>
            {/* Hover actions - centered over the thumbnail so the strip's
                overflow-x-auto (which also clips vertically) can't hide them. */}
            <div className="pointer-events-auto absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-md border bg-popover/95 p-0.5 opacity-100 shadow-md backdrop-blur-sm transition-opacity focus-within:opacity-100 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move page left"
                disabled={index === 0}
                onClick={() => studio.movePage(index, 'left')}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Duplicate page"
                onClick={() => void studio.duplicatePage(index)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Delete page"
                disabled={studio.pages.length <= 1}
                onClick={() => void studio.deletePage(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move page right"
                disabled={index === studio.pages.length - 1}
                onClick={() => studio.movePage(index, 'right')}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label="Add page"
            className="h-16 w-10 shrink-0 rounded-md border-dashed p-0"
            onClick={() => void studio.addPage()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add page (carousel slide)</TooltipContent>
      </Tooltip>
      <p className="ml-2 hidden shrink-0 text-[11px] text-muted-foreground md:block">
        Multiple pages export as numbered slides - perfect for carousels.
      </p>
    </div>
  );
}
