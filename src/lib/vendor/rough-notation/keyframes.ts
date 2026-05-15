// Vendored from rough-notation v0.5.1 — MIT © 2020 Preet Shihn.
// Upstream: https://github.com/rough-stuff/rough-notation
// See ./LICENSE.

export function ensureKeyframes() {
  if (!(window as any).__rno_kf_s) {
    const style = (window as any).__rno_kf_s = document.createElement('style');
    style.textContent = `@keyframes rough-notation-dash { to { stroke-dashoffset: 0; } }`;
    document.head.appendChild(style);
  }
}