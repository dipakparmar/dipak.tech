import type { Canvas } from 'fabric';

/** Custom props that must survive canvas JSON round-trips. */
export const SERIALIZED_PROPS = [
  'name',
  'locked',
  'selectable',
  'evented',
  'globalCompositeOperation',
  'rx',
  'ry',
  'keyframes',
  'textBrush'
];

const MAX_HISTORY = 50;

/**
 * Snapshot-based undo/redo. Fabric mutates objects in place, so the simplest
 * reliable history is serializing the whole canvas on every committed change.
 */
export class StudioHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private suspended = false;

  constructor(
    private canvas: Canvas,
    private onChange: () => void
  ) {}

  snapshot(): string {
    return JSON.stringify(this.canvas.toObject(SERIALIZED_PROPS));
  }

  /** Record the current state as a committed step. */
  commit(): void {
    if (this.suspended) return;
    const state = this.snapshot();
    if (this.undoStack[this.undoStack.length - 1] === state) return;
    this.undoStack.push(state);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
    this.onChange();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get current(): string | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  async undo(): Promise<void> {
    if (!this.canUndo) return;
    const state = this.undoStack.pop();
    if (state) this.redoStack.push(state);
    await this.restore(this.undoStack[this.undoStack.length - 1]);
  }

  async redo(): Promise<void> {
    const state = this.redoStack.pop();
    if (!state) return;
    this.undoStack.push(state);
    await this.restore(state);
  }

  /** Run a mutation without recording history (e.g. loading a template). */
  async suspendWhile(fn: () => Promise<void> | void): Promise<void> {
    this.suspended = true;
    try {
      await fn();
    } finally {
      this.suspended = false;
    }
  }

  /** Reset history to the canvas's current state (after load/new design). */
  reset(): void {
    this.undoStack = [this.snapshot()];
    this.redoStack = [];
    this.onChange();
  }

  private async restore(state: string | undefined): Promise<void> {
    if (!state) return;
    await this.suspendWhile(async () => {
      await this.canvas.loadFromJSON(JSON.parse(state));
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    });
    this.onChange();
  }
}
