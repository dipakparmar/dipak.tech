import { Circle, FabricText, Gradient, Group, Rect, Shadow, Textbox, type Canvas } from "fabric"

import {
  FONT_CONDENSED,
  FONT_GROTESK,
  FONT_HANDWRITING,
  FONT_MARKER,
  FONT_SERIF,
  ensureFontLoaded,
} from "@/lib/studio/fonts"
import { createOverlay } from "@/lib/studio/overlays"
import { createRoughShape } from "@/lib/studio/rough-shapes"

export type PageBuilder = (canvas: Canvas, width: number, height: number) => Promise<void>

export type BuiltinTemplate = {
  id: string
  label: string
  description: string
  pages: PageBuilder[]
}

type NamedOptions = { name?: string; locked?: boolean }

function named<T extends { set: (options: object) => unknown }>(obj: T, name: string): T {
  obj.set({ name } as NamedOptions)
  return obj
}

function backgroundRect(width: number, height: number, fill: Rect["fill"]): Rect {
  const rect = new Rect({ left: 0, top: 0, width, height, fill, selectable: false, evented: false })
  rect.set({ name: "Background", locked: true } as NamedOptions)
  return rect
}

function linearGradient(x2: number, y2: number, stops: [number, string][]): Gradient<"linear"> {
  return new Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: { x1: 0, y1: 0, x2, y2 },
    colorStops: stops.map(([offset, color]) => ({ offset, color })),
  })
}

/** Soft glowing blob - a circle whose radial gradient fades to transparent. */
function blob(cx: number, cy: number, radius: number, color: string, alpha = 0.2): Circle {
  const rgba = (a: number) => {
    const [r, g, b] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((h) => parseInt(h, 16))
    return `rgba(${r},${g},${b},${a})`
  }
  return new Circle({
    left: cx - radius,
    top: cy - radius,
    radius,
    selectable: true,
    fill: new Gradient({
      type: "radial",
      gradientUnits: "pixels",
      coords: { x1: radius, y1: radius, r1: 0, x2: radius, y2: radius, r2: radius },
      colorStops: [
        { offset: 0, color: rgba(alpha) },
        { offset: 0.65, color: rgba(alpha * 0.55) },
        { offset: 1, color: rgba(0) },
      ],
    }),
  })
}

type PillOptions = {
  left: number
  top: number
  fontSize: number
  family?: string
  textColor: string
  fill?: string
  stroke?: string
  charSpacing?: number
  originCenterX?: boolean
}

/** Rounded pill badge with centered label, like modern social sticker chips. */
function pill(text: string, options: PillOptions): Group {
  const label = new FabricText(text, {
    fontFamily: options.family ?? FONT_GROTESK,
    fontWeight: "500",
    fontSize: options.fontSize,
    fill: options.textColor,
    charSpacing: options.charSpacing ?? 160,
  })
  const padX = options.fontSize * 1.1
  const padY = options.fontSize * 0.62
  const pillHeight = label.height + padY * 2
  const rect = new Rect({
    left: 0,
    top: 0,
    width: label.width + padX * 2,
    height: pillHeight,
    rx: pillHeight / 2,
    ry: pillHeight / 2,
    fill: options.fill ?? "transparent",
    stroke: options.stroke,
    strokeWidth: options.stroke ? Math.max(2, options.fontSize * 0.09) : 0,
  })
  label.set({ left: padX, top: padY })
  const group = new Group([rect, label])
  group.set({
    left: options.originCenterX ? options.left - (label.width + padX * 2) / 2 : options.left,
    top: options.top,
  })
  return group
}

/** Carousel progress dots, `active` highlighted. */
function progressDots(count: number, active: number, centerX: number, y: number, unit: number, accent: string, muted: string): Group {
  const radius = unit * 0.008
  const gap = radius * 5.5
  const total = (count - 1) * gap
  const dots = Array.from({ length: count }, (_, i) => {
    return new Circle({
      left: i * gap,
      top: 0,
      radius: i === active ? radius * 1.35 : radius,
      fill: i === active ? accent : muted,
    })
  })
  const group = new Group(dots)
  group.set({ left: centerX - total / 2, top: y })
  return group
}

// ---------------------------------------------------------------------------
// 1. Bold statement - dark, huge condensed type, lime accent
// ---------------------------------------------------------------------------

const boldStatement: BuiltinTemplate = {
  id: "bold-statement",
  label: "Bold Statement",
  description: "Huge type on dark, lime accent - opinions and hot takes",
  pages: [
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500")])
      const unit = Math.min(width, height)
      const margin = width * 0.09
      const lime = "#CCFF00"

      canvas.add(backgroundRect(width, height, "#0A0A0A"))
      canvas.add(named(blob(width * 0.92, height * 0.08, unit * 0.55, "#CCFF00", 0.13), "Glow"))

      canvas.add(named(pill("UNPOPULAR OPINION", { left: margin, top: height * 0.12, fontSize: unit * 0.024, textColor: lime, stroke: lime, charSpacing: 260 }), "Badge"))

      const line1 = named(
        new Textbox("STOP EDITING", {
          left: margin,
          top: height * 0.3,
          width: width * 0.86,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.125,
          lineHeight: 1,
          fill: "#FAFAFA",
        }),
        "Headline 1",
      )
      const line2 = named(
        new Textbox("YOUR PHOTOS", {
          left: margin,
          top: height * 0.3 + unit * 0.13,
          width: width * 0.86,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.125,
          lineHeight: 1,
          fill: lime,
        }),
        "Headline 2",
      )
      const line3 = named(
        new Textbox("TO DEATH.", {
          left: margin,
          top: height * 0.3 + unit * 0.26,
          width: width * 0.86,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.125,
          lineHeight: 1,
          fill: "#FAFAFA",
        }),
        "Headline 3",
      )

      const underline = createRoughShape("scribble-underline", width * 0.34, { stroke: lime, strokeWidth: 2 })
      underline.set({ left: margin, top: height * 0.3 + unit * 0.395, name: "Underline" } as NamedOptions)

      const body = named(
        new Textbox("The best travel photos already happened in front of you. Your job is not to repaint them.", {
          left: margin,
          top: height * 0.62,
          width: width * 0.7,
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.034,
          lineHeight: 1.45,
          fill: "rgba(250,250,250,0.72)",
        }),
        "Body",
      )

      const handle = named(
        new Textbox("@dipak.tech", {
          left: margin,
          top: height * 0.88,
          width: width * 0.4,
          fontFamily: FONT_GROTESK,
          fontWeight: "700",
          fontSize: unit * 0.03,
          fill: "#FAFAFA",
        }),
        "Handle",
      )

      const arrow = createRoughShape("scribble-arrow", width * 0.13, { stroke: lime, strokeWidth: 2 })
      arrow.set({ left: width * 0.76, top: height * 0.855, name: "Arrow" } as NamedOptions)

      canvas.add(line1, line2, line3, underline, body, handle, arrow)
    },
  ],
}

// ---------------------------------------------------------------------------
// 2. Gradient announcement - vivid gradient, glass card, CTA pill
// ---------------------------------------------------------------------------

const gradientAnnouncement: BuiltinTemplate = {
  id: "gradient-announcement",
  label: "Announcement",
  description: "Vivid gradient with a glass card - launches and news",
  pages: [
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500")])
      const unit = Math.min(width, height)

      canvas.add(
        backgroundRect(
          width,
          height,
          linearGradient(width, height, [
            [0, "#6D28D9"],
            [0.5, "#DB2777"],
            [1, "#F59E0B"],
          ]),
        ),
      )
      canvas.add(named(blob(width * 0.12, height * 0.12, unit * 0.5, "#FFFFFF", 0.22), "Blob 1"))
      canvas.add(named(blob(width * 0.9, height * 0.85, unit * 0.55, "#FDE68A", 0.28), "Blob 2"))

      const cardWidth = width * 0.84
      const cardHeight = height * 0.46
      const cardLeft = (width - cardWidth) / 2
      const cardTop = (height - cardHeight) / 2
      const card = named(
        new Rect({
          left: cardLeft,
          top: cardTop,
          width: cardWidth,
          height: cardHeight,
          rx: unit * 0.045,
          ry: unit * 0.045,
          fill: "rgba(255,255,255,0.16)",
          stroke: "rgba(255,255,255,0.5)",
          strokeWidth: 2,
          shadow: new Shadow({ color: "rgba(40,10,60,0.35)", blur: 60, offsetX: 0, offsetY: 20 }),
        }),
        "Glass Card",
      )

      const label = named(
        new Textbox("NEW ON THE BLOG", {
          left: width / 2,
          top: cardTop + cardHeight * 0.14,
          width: cardWidth * 0.8,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.026,
          charSpacing: 480,
          fill: "rgba(255,255,255,0.85)",
        }),
        "Label",
      )

      const title = named(
        new Textbox("THE 2026\nEDIT GUIDE", {
          left: width / 2,
          top: cardTop + cardHeight * 0.26,
          width: cardWidth * 0.9,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.096,
          lineHeight: 1.04,
          fill: "#FFFFFF",
        }),
        "Title",
      )

      const subtitle = named(
        new Textbox("every preset, app and habit I actually use", {
          left: width / 2,
          top: cardTop + cardHeight * 0.72,
          width: cardWidth * 0.78,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.03,
          fill: "rgba(255,255,255,0.9)",
        }),
        "Subtitle",
      )

      const cta = named(
        pill("read it on dipak.tech →", {
          left: width / 2,
          top: cardTop + cardHeight + height * 0.05,
          fontSize: unit * 0.028,
          textColor: "#FFFFFF",
          fill: "#0A0A0A",
          originCenterX: true,
        }),
        "CTA",
      )

      canvas.add(card, label, title, subtitle, cta)
    },
  ],
}

// ---------------------------------------------------------------------------
// 3. Tips carousel - 3 pages: cover, tip, CTA (swipe post)
// ---------------------------------------------------------------------------

const CAROUSEL_BG = "#F6F1E7"
const CAROUSEL_INK = "#141414"
const CAROUSEL_ACCENT = "#FF4D00"

const tipsCarousel: BuiltinTemplate = {
  id: "tips-carousel",
  label: "Tips Carousel",
  description: "3-page swipe post - cover, tip layout, follow CTA",
  pages: [
    // Page 1 - cover
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500"), ensureFontLoaded(FONT_MARKER)])
      const unit = Math.min(width, height)
      const margin = width * 0.09

      canvas.add(backgroundRect(width, height, CAROUSEL_BG))
      canvas.add(named(pill("PHOTOGRAPHY · BASICS", { left: margin, top: height * 0.1, fontSize: unit * 0.023, textColor: CAROUSEL_INK, stroke: CAROUSEL_INK, charSpacing: 240 }), "Badge"))

      const number = named(
        new Textbox("5", {
          left: margin,
          top: height * 0.2,
          width: width * 0.4,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.38,
          lineHeight: 1,
          fill: CAROUSEL_ACCENT,
        }),
        "Big Number",
      )

      const ring = createRoughShape("scribble-circle", width * 0.36, { stroke: CAROUSEL_INK, strokeWidth: 2 })
      ring.set({ left: margin - width * 0.05, top: height * 0.235, scaleY: (ring.scaleY ?? 1) * 2.4, name: "Ring" } as NamedOptions)

      const title = named(
        new Textbox("TIPS FOR SHARPER\nTRAVEL PHOTOS", {
          left: margin,
          top: height * 0.56,
          width: width * 0.84,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.082,
          lineHeight: 1.08,
          fill: CAROUSEL_INK,
        }),
        "Title",
      )

      const subtitle = named(
        new Textbox("no new gear required", {
          left: margin,
          top: height * 0.75,
          width: width * 0.6,
          fontFamily: FONT_MARKER,
          fontSize: unit * 0.036,
          fill: CAROUSEL_ACCENT,
        }),
        "Subtitle",
      )

      const swipe = named(
        new Textbox("swipe", {
          left: width * 0.74,
          top: height * 0.885,
          width: width * 0.18,
          fontFamily: FONT_GROTESK,
          fontWeight: "700",
          fontSize: unit * 0.03,
          fill: CAROUSEL_INK,
        }),
        "Swipe",
      )
      const arrow = createRoughShape("scribble-arrow", width * 0.1, { stroke: CAROUSEL_ACCENT, strokeWidth: 2 })
      arrow.set({ left: width * 0.85, top: height * 0.875, name: "Arrow" } as NamedOptions)

      canvas.add(ring, number, title, subtitle, swipe, arrow)
    },
    // Page 2 - tip layout (duplicate this page per tip)
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500")])
      const unit = Math.min(width, height)
      const margin = width * 0.09

      canvas.add(backgroundRect(width, height, CAROUSEL_BG))

      const kicker = named(
        new Textbox("TIP", {
          left: margin,
          top: height * 0.11,
          width: width * 0.3,
          fontFamily: FONT_GROTESK,
          fontWeight: "700",
          fontSize: unit * 0.028,
          charSpacing: 600,
          fill: CAROUSEL_INK,
        }),
        "Kicker",
      )

      const number = named(
        new Textbox("01", {
          left: margin,
          top: height * 0.14,
          width: width * 0.5,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.17,
          lineHeight: 1,
          fill: CAROUSEL_ACCENT,
        }),
        "Number",
      )

      const title = named(
        new Textbox("SHOOT IN\nBLUE HOUR", {
          left: margin,
          top: height * 0.37,
          width: width * 0.84,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.085,
          lineHeight: 1.08,
          fill: CAROUSEL_INK,
        }),
        "Title",
      )

      const body = named(
        new Textbox(
          "Thirty minutes after sunset the sky becomes one giant softbox. No harsh shadows, no blown highlights - just even, flattering light.",
          {
            left: margin,
            top: height * 0.6,
            width: width * 0.8,
            fontFamily: FONT_GROTESK,
            fontWeight: "500",
            fontSize: unit * 0.034,
            lineHeight: 1.5,
            fill: "rgba(20,20,20,0.75)",
          },
        ),
        "Body",
      )

      canvas.add(kicker, number, title, body)
      canvas.add(named(progressDots(5, 1, width / 2, height * 0.92, unit, CAROUSEL_ACCENT, "rgba(20,20,20,0.18)"), "Progress"))
    },
    // Page 3 - CTA
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500"), ensureFontLoaded(FONT_HANDWRITING, "700")])
      const unit = Math.min(width, height)

      canvas.add(backgroundRect(width, height, CAROUSEL_INK))
      canvas.add(named(blob(width * 0.85, height * 0.15, unit * 0.5, "#FF4D00", 0.25), "Glow"))

      const kicker = named(
        new Textbox("was this helpful?", {
          left: width / 2,
          top: height * 0.28,
          width: width * 0.7,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_HANDWRITING,
          fontWeight: "700",
          fontSize: unit * 0.06,
          fill: CAROUSEL_ACCENT,
        }),
        "Kicker",
      )

      const title = named(
        new Textbox("SAVE THIS FOR\nYOUR NEXT TRIP", {
          left: width / 2,
          top: height * 0.38,
          width: width * 0.86,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.09,
          lineHeight: 1.08,
          fill: "#FAFAFA",
        }),
        "Title",
      )

      const follow = named(
        pill("follow @dipak.tech", {
          left: width / 2,
          top: height * 0.63,
          fontSize: unit * 0.03,
          textColor: CAROUSEL_INK,
          fill: CAROUSEL_ACCENT,
          originCenterX: true,
        }),
        "Follow CTA",
      )
      const share = named(
        pill("share with a friend", {
          left: width / 2,
          top: height * 0.72,
          fontSize: unit * 0.03,
          textColor: "#FAFAFA",
          stroke: "rgba(250,250,250,0.6)",
          originCenterX: true,
        }),
        "Share CTA",
      )

      canvas.add(kicker, title, follow, share)
      canvas.add(named(progressDots(5, 4, width / 2, height * 0.92, unit, CAROUSEL_ACCENT, "rgba(250,250,250,0.25)"), "Progress"))
    },
  ],
}

// ---------------------------------------------------------------------------
// 4. Photo story - caption stack over your photo
// ---------------------------------------------------------------------------

const photoStory: BuiltinTemplate = {
  id: "photo-story",
  label: "Photo Story",
  description: "Caption stack and location chip for a full-bleed photo",
  pages: [
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_HANDWRITING, "700"), ensureFontLoaded(FONT_GROTESK, "500")])
      const unit = Math.min(width, height)

      canvas.add(
        backgroundRect(
          width,
          height,
          linearGradient(0, height, [
            [0, "#1F2A33"],
            [1, "#0B0F14"],
          ]),
        ),
      )

      const hintBox = named(
        new Rect({
          left: width * 0.14,
          top: height * 0.3,
          width: width * 0.72,
          height: height * 0.24,
          rx: unit * 0.03,
          ry: unit * 0.03,
          fill: "transparent",
          stroke: "rgba(255,255,255,0.35)",
          strokeWidth: 3,
          strokeDashArray: [26, 20],
        }),
        "Photo Hint Box",
      )
      const hint = named(
        new Textbox("drop your photo here,\nthen use Photo → fill canvas as background", {
          left: width / 2,
          top: height * 0.39,
          width: width * 0.6,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.028,
          lineHeight: 1.5,
          fill: "rgba(255,255,255,0.55)",
        }),
        "Photo Hint",
      )

      const location = named(
        pill("📍 BANFF, ALBERTA", {
          left: width / 2,
          top: height * 0.055,
          fontSize: unit * 0.024,
          textColor: "#FFFFFF",
          fill: "rgba(10,10,10,0.4)",
          stroke: "rgba(255,255,255,0.35)",
          charSpacing: 300,
          originCenterX: true,
        }),
        "Location",
      )

      const scrim = createOverlay("scrim-bottom", width, height)
      scrim.set({ name: "Bottom Scrim" } as NamedOptions)

      const caption = named(
        new Textbox("chasing light", {
          left: width / 2,
          top: height * 0.72,
          width: width * 0.86,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_HANDWRITING,
          fontWeight: "700",
          fontSize: unit * 0.13,
          fill: "#FFFFFF",
          shadow: new Shadow({ color: "rgba(0,0,0,0.45)", blur: 22, offsetX: 0, offsetY: 5 }),
        }),
        "Caption",
      )

      const subline = named(
        new Textbox("DAY 03 · THE ROCKIES", {
          left: width / 2,
          top: height * 0.85,
          width: width * 0.7,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.026,
          charSpacing: 500,
          fill: "rgba(255,255,255,0.8)",
        }),
        "Subline",
      )

      const handle = named(
        new Textbox("@dipak.tech", {
          left: width / 2,
          top: height * 0.94,
          width: width * 0.5,
          originX: "center",
          textAlign: "center",
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.024,
          fill: "rgba(255,255,255,0.6)",
        }),
        "Handle",
      )

      canvas.add(hintBox, hint, scrim, location, caption, subline, handle)
    },
  ],
}

// ---------------------------------------------------------------------------
// 5. Editorial quote - serif pull-quote with author block
// ---------------------------------------------------------------------------

const editorialQuote: BuiltinTemplate = {
  id: "editorial-quote",
  label: "Editorial Quote",
  description: "Serif pull-quote with author block - magazine style",
  pages: [
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_SERIF, "600"), ensureFontLoaded(FONT_GROTESK, "700")])
      const unit = Math.min(width, height)
      const margin = width * 0.1
      const ink = "#161412"
      const accent = "#C2410C"

      canvas.add(backgroundRect(width, height, "#F7F3EC"))

      const label = named(
        new Textbox("FIELD NOTES · VOL. 12", {
          left: margin,
          top: height * 0.1,
          width: width * 0.7,
          fontFamily: FONT_GROTESK,
          fontWeight: "700",
          fontSize: unit * 0.022,
          charSpacing: 560,
          fill: "rgba(22,20,18,0.55)",
        }),
        "Label",
      )

      const mark = named(
        new Textbox("“", {
          left: margin - unit * 0.015,
          top: height * 0.13,
          width: width * 0.3,
          fontFamily: FONT_SERIF,
          fontSize: unit * 0.24,
          fill: accent,
        }),
        "Quote Mark",
      )

      const quote = named(
        new Textbox("Somewhere between the trailhead and the summit, I stopped taking photos for likes.", {
          left: margin,
          top: height * 0.33,
          width: width * 0.8,
          fontFamily: FONT_SERIF,
          fontWeight: "600",
          fontSize: unit * 0.062,
          lineHeight: 1.32,
          fill: ink,
        }),
        "Quote",
      )

      const divider = named(
        new Rect({ left: margin, top: height * 0.72, width: width * 0.14, height: unit * 0.006, fill: accent }),
        "Divider",
      )

      const avatar = named(
        new Circle({ left: margin, top: height * 0.775, radius: unit * 0.036, fill: "#D9CDBB", stroke: "rgba(22,20,18,0.25)", strokeWidth: 2 }),
        "Avatar",
      )
      const author = named(
        new Textbox("Dipak Parmar", {
          left: margin + unit * 0.095,
          top: height * 0.785,
          width: width * 0.5,
          fontFamily: FONT_GROTESK,
          fontWeight: "700",
          fontSize: unit * 0.032,
          fill: ink,
        }),
        "Author",
      )
      const handle = named(
        new Textbox("@dipak.tech", {
          left: margin + unit * 0.095,
          top: height * 0.785 + unit * 0.042,
          width: width * 0.5,
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.026,
          fill: "rgba(22,20,18,0.5)",
        }),
        "Handle",
      )

      canvas.add(label, mark, quote, divider, avatar, author, handle)
    },
  ],
}

// ---------------------------------------------------------------------------
// 6. Blog / OG cover - bold title card
// ---------------------------------------------------------------------------

const blogCover: BuiltinTemplate = {
  id: "blog-cover",
  label: "Blog / OG Cover",
  description: "Bold title card for posts and link previews",
  pages: [
    async (canvas, width, height) => {
      await Promise.all([ensureFontLoaded(FONT_CONDENSED), ensureFontLoaded(FONT_GROTESK, "500")])
      const unit = Math.min(width, height)
      const margin = width * 0.08
      const sky = "#38BDF8"

      canvas.add(
        backgroundRect(
          width,
          height,
          linearGradient(width, height, [
            [0, "#0F172A"],
            [1, "#020617"],
          ]),
        ),
      )
      canvas.add(named(blob(width * 0.92, height * 0.2, unit * 0.7, "#38BDF8", 0.18), "Glow"))

      canvas.add(named(pill("BLOG · PHOTOGRAPHY", { left: margin, top: height * 0.14, fontSize: unit * 0.045, textColor: sky, stroke: sky, charSpacing: 300 }), "Badge"))

      const title = named(
        new Textbox("HOW I EDIT\nTRAVEL PHOTOS", {
          left: margin,
          top: height * 0.34,
          width: width * 0.76,
          fontFamily: FONT_CONDENSED,
          fontSize: unit * 0.19,
          lineHeight: 1.06,
          fill: "#F8FAFC",
        }),
        "Title",
      )

      const underline = createRoughShape("scribble-underline", width * 0.24, { stroke: sky, strokeWidth: 2 })
      underline.set({ left: margin, top: height * 0.78, name: "Underline" } as NamedOptions)

      const url = named(
        new Textbox("dipak.tech/blog", {
          left: margin,
          top: height * 0.85,
          width: width * 0.5,
          fontFamily: FONT_GROTESK,
          fontWeight: "500",
          fontSize: unit * 0.055,
          fill: "rgba(248,250,252,0.6)",
        }),
        "URL",
      )

      canvas.add(title, underline, url)
    },
  ],
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  boldStatement,
  tipsCarousel,
  gradientAnnouncement,
  photoStory,
  editorialQuote,
  blogCover,
]
