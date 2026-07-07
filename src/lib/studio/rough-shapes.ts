import { Group, Path } from "fabric"
import rough from "roughjs"

export type RoughShapeKind =
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "star"
  | "heart"
  | "scribble-circle"
  | "scribble-underline"
  | "scribble-arrow"
  | "scribble-highlight"

export type RoughShapeOptions = {
  stroke: string
  strokeWidth: number
  fill?: string
  fillStyle?: "hachure" | "solid" | "zigzag" | "cross-hatch"
  roughness?: number
  seed?: number
}

type PathInfo = { d: string; stroke: string; strokeWidth: number; fill?: string }

function pathInfoToFabric(info: PathInfo): Path {
  return new Path(info.d, {
    stroke: info.stroke && info.stroke !== "none" ? info.stroke : undefined,
    strokeWidth: info.strokeWidth,
    fill: info.fill && info.fill !== "none" ? info.fill : "",
    strokeLineCap: "round",
    strokeLineJoin: "round",
    objectCaching: true,
  })
}

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5): [number, number][] {
  const result: [number, number][] = []
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / points) * i - Math.PI / 2
    result.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return result
}

const HEART_PATH =
  "M 50 88 C 20 62, 2 44, 2 26 C 2 10, 14 2, 26 2 C 36 2, 45 8, 50 18 C 55 8, 64 2, 74 2 C 86 2, 98 10, 98 26 C 98 44, 80 62, 50 88 Z"

/**
 * Hand-drawn scribble annotations ported from the site's Scribble components
 * (src/components/scribble) so canvas designs match the blog's aesthetic.
 * Each entry: [pathData, strokeWidthScale, opacity][]
 */
const SCRIBBLES: Record<string, { viewBox: [number, number]; paths: [string, number, number][]; filled?: boolean }> = {
  "scribble-circle": {
    viewBox: [60, 28],
    paths: [
      ["M 32 5 C 17 4, 6 9, 5 14 C 4 21, 17 25, 32 24 C 47 24, 56 20, 55 13 C 54 7, 40 3, 26 4 C 18 5, 11 8, 8 12", 1.4, 0.92],
      ["M 30 4 C 16 6, 8 11, 8 15 C 7 22, 20 25, 32 25", 0.9, 0.55],
    ],
  },
  "scribble-underline": {
    viewBox: [100, 7],
    paths: [
      ["M 1 3 C 5 1, 11 4.5, 17 2.5 S 30 5, 37 2.5 S 51 1.5, 58 4 S 73 5, 81 2.5 S 93 4.5, 99 3", 1.6, 0.92],
      ["M 2 4.5 C 7 3, 14 5.5, 22 4 S 34 5.5, 42 4.5 S 54 3.5, 62 5 S 77 6, 85 4.5 S 95 5.5, 99 4.2", 1, 0.5],
    ],
  },
  "scribble-arrow": {
    viewBox: [60, 30],
    paths: [
      ["M 3 22 C 13 19, 27 13, 49 9", 1.4, 0.92],
      ["M 49 9 L 41 6 M 49 9 L 44 16", 1.4, 0.92],
    ],
  },
  "scribble-highlight": {
    viewBox: [100, 16],
    paths: [["M 1 4 C 25 2, 50 5, 99 3 L 99 13 C 75 14, 50 12, 1 13 Z", 0, 0.55]],
    filled: true,
  },
}

/**
 * Build a hand-drawn shape as a fabric Group of Paths.
 * `size` is the target width in canvas pixels; height keeps the shape's natural ratio.
 */
export function createRoughShape(kind: RoughShapeKind, size: number, options: RoughShapeOptions): Group {
  if (kind in SCRIBBLES) {
    const def = SCRIBBLES[kind]
    const [vw] = def.viewBox
    const scale = size / vw
    const paths = def.paths.map(([d, widthScale, opacity]) => {
      const path = new Path(d, {
        stroke: def.filled ? undefined : options.stroke,
        strokeWidth: widthScale,
        fill: def.filled ? options.stroke : "",
        strokeLineCap: "round",
        strokeLineJoin: "round",
        opacity,
      })
      return path
    })
    const group = new Group(paths)
    group.set({ scaleX: scale, scaleY: scale })
    return group
  }

  const generator = rough.generator()
  const roughOptions = {
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    fill: options.fill,
    fillStyle: options.fillStyle ?? "hachure",
    roughness: options.roughness ?? 1.8,
    seed: options.seed ?? Math.floor(Math.random() * 2 ** 31),
    bowing: 1.2,
  }

  const drawables = (() => {
    switch (kind) {
      case "rectangle":
        return [generator.rectangle(0, 0, size, size * 0.7, roughOptions)]
      case "ellipse":
        return [generator.ellipse(size / 2, size * 0.35, size, size * 0.7, roughOptions)]
      case "star": {
        const outer = size / 2
        return [generator.polygon(starPoints(outer, outer, outer, outer * 0.45), roughOptions)]
      }
      case "heart":
        return [generator.path(HEART_PATH, { ...roughOptions, strokeWidth: options.strokeWidth * 0.75 })]
      case "arrow": {
        const h = size * 0.5
        return [
          generator.line(0, h, size * 0.92, h * 0.2, roughOptions),
          generator.line(size * 0.92, h * 0.2, size * 0.72, h * 0.14, roughOptions),
          generator.line(size * 0.92, h * 0.2, size * 0.85, h * 0.42, roughOptions),
        ]
      }
      default:
        return [generator.rectangle(0, 0, size, size * 0.7, roughOptions)]
    }
  })()

  const paths = drawables.flatMap((drawable) => generator.toPaths(drawable).map(pathInfoToFabric))
  return new Group(paths)
}

export const ROUGH_SHAPE_LABELS: { kind: RoughShapeKind; label: string }[] = [
  { kind: "rectangle", label: "Sketch Box" },
  { kind: "ellipse", label: "Sketch Oval" },
  { kind: "arrow", label: "Sketch Arrow" },
  { kind: "star", label: "Star" },
  { kind: "heart", label: "Heart" },
  { kind: "scribble-circle", label: "Scribble Ring" },
  { kind: "scribble-underline", label: "Underline" },
  { kind: "scribble-arrow", label: "Doodle Arrow" },
  { kind: "scribble-highlight", label: "Highlight" },
]
