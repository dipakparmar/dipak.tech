import { Gradient, Rect, Shadow } from "fabric"

export type OverlayKind =
  | "scrim-bottom"
  | "scrim-top"
  | "shine"
  | "vignette"
  | "glass-card"
  | "color-wash"

export const OVERLAY_LABELS: { kind: OverlayKind; label: string; hint: string }[] = [
  { kind: "scrim-bottom", label: "Bottom Scrim", hint: "Dark fade for captions over photos" },
  { kind: "scrim-top", label: "Top Scrim", hint: "Dark fade at the top" },
  { kind: "shine", label: "Glossy Shine", hint: "Diagonal light sweep" },
  { kind: "vignette", label: "Vignette", hint: "Soft dark edges" },
  { kind: "glass-card", label: "Glass Card", hint: "Frosted panel behind text" },
  { kind: "color-wash", label: "Color Wash", hint: "Tint the whole design" },
]

/**
 * Overlay effects sized to the current canvas. All are regular objects so they
 * show up in the layers panel and can be tweaked or deleted like anything else.
 */
export function createOverlay(kind: OverlayKind, width: number, height: number, accent = "#38bdf8"): Rect {
  switch (kind) {
    case "scrim-bottom": {
      const h = Math.round(height * 0.55)
      return new Rect({
        left: 0,
        top: height - h,
        width,
        height: h,
        selectable: true,
        fill: new Gradient({
          type: "linear",
          gradientUnits: "pixels",
          coords: { x1: 0, y1: 0, x2: 0, y2: h },
          colorStops: [
            { offset: 0, color: "rgba(0,0,0,0)" },
            { offset: 0.45, color: "rgba(0,0,0,0.35)" },
            { offset: 1, color: "rgba(0,0,0,0.78)" },
          ],
        }),
      })
    }
    case "scrim-top": {
      const h = Math.round(height * 0.4)
      return new Rect({
        left: 0,
        top: 0,
        width,
        height: h,
        fill: new Gradient({
          type: "linear",
          gradientUnits: "pixels",
          coords: { x1: 0, y1: 0, x2: 0, y2: h },
          colorStops: [
            { offset: 0, color: "rgba(0,0,0,0.7)" },
            { offset: 1, color: "rgba(0,0,0,0)" },
          ],
        }),
      })
    }
    case "shine":
      return new Rect({
        left: 0,
        top: 0,
        width,
        height,
        globalCompositeOperation: "overlay",
        fill: new Gradient({
          type: "linear",
          gradientUnits: "pixels",
          coords: { x1: 0, y1: 0, x2: width, y2: height },
          colorStops: [
            { offset: 0, color: "rgba(255,255,255,0)" },
            { offset: 0.38, color: "rgba(255,255,255,0.06)" },
            { offset: 0.5, color: "rgba(255,255,255,0.42)" },
            { offset: 0.62, color: "rgba(255,255,255,0.06)" },
            { offset: 1, color: "rgba(255,255,255,0)" },
          ],
        }),
      })
    case "vignette": {
      const radius = Math.sqrt(width * width + height * height) / 2
      return new Rect({
        left: 0,
        top: 0,
        width,
        height,
        globalCompositeOperation: "multiply",
        fill: new Gradient({
          type: "radial",
          gradientUnits: "pixels",
          coords: { x1: width / 2, y1: height / 2, r1: radius * 0.45, x2: width / 2, y2: height / 2, r2: radius },
          colorStops: [
            { offset: 0, color: "rgba(255,255,255,1)" },
            { offset: 1, color: "rgba(140,140,140,1)" },
          ],
        }),
      })
    }
    case "glass-card": {
      const cardWidth = Math.round(width * 0.78)
      const cardHeight = Math.round(height * 0.3)
      return new Rect({
        left: Math.round((width - cardWidth) / 2),
        top: Math.round((height - cardHeight) / 2),
        width: cardWidth,
        height: cardHeight,
        rx: 28,
        ry: 28,
        fill: "rgba(255,255,255,0.14)",
        stroke: "rgba(255,255,255,0.4)",
        strokeWidth: 2,
        shadow: new Shadow({ color: "rgba(0,0,0,0.28)", blur: 40, offsetX: 0, offsetY: 12 }),
      })
    }
    case "color-wash":
      return new Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: accent,
        opacity: 0.25,
        globalCompositeOperation: "overlay",
      })
  }
}
