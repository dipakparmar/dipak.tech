'use client';

/**
 * Visually-hidden live region for async status.
 *
 * Always rendered (never conditionally mounted) so screen readers observe it
 * before the content changes — a region added to the DOM at the same moment
 * its text appears is frequently not announced.
 *
 * `polite` waits for a pause in speech; `assertive` interrupts. Use polite for
 * results, assertive only for errors the user must act on.
 */
export function StatusAnnouncer({
  message,
  assertive = false
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
