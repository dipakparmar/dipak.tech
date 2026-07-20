'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Lock,
  LockOpen,
  Trash2
} from 'lucide-react';
import { useEffect } from 'react';

import type { StudioApi } from '@/components/studio/use-studio';
import { cn } from '@/lib/utils';

function Item({
  onClick,
  danger,
  children
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
        danger && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {children}
    </button>
  );
}

export function CanvasContextMenu({ studio }: { studio: StudioApi }) {
  const menu = studio.contextMenu;
  const obj = studio.selected[0];

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') studio.closeContextMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, studio]);

  if (!menu || !obj) return null;

  // Keep the menu on screen (rough clamp against its max size).
  const x = Math.min(menu.x, window.innerWidth - 192);
  const y = Math.min(menu.y, window.innerHeight - 300);
  const run = (fn: () => void) => () => {
    fn();
    studio.closeContextMenu();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onPointerDown={studio.closeContextMenu}
        onContextMenu={(e) => {
          e.preventDefault();
          studio.closeContextMenu();
        }}
      />
      <div
        className="fixed z-50 min-w-44 rounded-md border bg-popover p-1 shadow-md"
        style={{ left: x, top: y }}
      >
        <Item onClick={run(() => void studio.duplicateSelected())}>
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </Item>
        <div className="my-1 h-px bg-border" />
        <Item onClick={run(() => studio.stackTo(obj, 'front'))}>
          <ChevronsUp className="h-3.5 w-3.5" /> Bring to front
        </Item>
        <Item onClick={run(() => studio.moveLayer(obj, 'up'))}>
          <ChevronUp className="h-3.5 w-3.5" /> Bring forward
        </Item>
        <Item onClick={run(() => studio.moveLayer(obj, 'down'))}>
          <ChevronDown className="h-3.5 w-3.5" /> Send backward
        </Item>
        <Item onClick={run(() => studio.stackTo(obj, 'back'))}>
          <ChevronsDown className="h-3.5 w-3.5" /> Send to back
        </Item>
        <div className="my-1 h-px bg-border" />
        <Item onClick={run(() => studio.toggleLock(obj))}>
          {obj.locked ? (
            <LockOpen className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          {obj.locked ? 'Unlock' : 'Lock'}
        </Item>
        <Item danger onClick={run(() => studio.deleteSelected())}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Item>
      </div>
    </>
  );
}
