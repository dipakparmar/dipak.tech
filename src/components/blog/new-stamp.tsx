import { ScribbleCircle } from '@/components/scribble';

/**
 * Hand-stamped "new" marker.
 *
 * Designed to be positioned absolutely by its parent — typically peeking from
 * the top-left corner of the first character of a title. The parent must be
 * `position: relative`.
 */
export function NewStamp() {
  return (
    <span
      aria-label="New"
      className="absolute -top-2 -left-9 -rotate-[30deg] origin-center pointer-events-none select-none z-10"
    >
      <span className="relative inline-flex items-center justify-center px-2.5 pt-0.5 pb-1.5 leading-none">
        <ScribbleCircle className="absolute inset-0 w-full h-full overflow-visible" />
        <span className="relative z-10 font-handwritten text-[16px] leading-none text-amber-700/90 dark:text-amber-300/90">
          new
        </span>
      </span>
    </span>
  );
}
