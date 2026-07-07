import {
  Anton,
  Bebas_Neue,
  Caveat,
  Kalam,
  Montserrat,
  Permanent_Marker,
  Playfair_Display,
  Shadows_Into_Light,
  Space_Grotesk,
} from "next/font/google"

const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false })
const shadowsIntoLight = Shadows_Into_Light({ subsets: ["latin"], weight: "400", display: "swap", preload: false })
const permanentMarker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap", preload: false })
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false })
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap", preload: false })
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap", preload: false })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "800"], display: "swap", preload: false })
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap", preload: false })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", preload: false })

export type StudioFont = {
  label: string
  /** Full font-family value (with next/font fallback) for canvas + CSS. */
  family: string
  kind: "handwriting" | "display" | "body"
}

export const STUDIO_FONTS: StudioFont[] = [
  { label: "Caveat", family: caveat.style.fontFamily, kind: "handwriting" },
  { label: "Shadows Into Light", family: shadowsIntoLight.style.fontFamily, kind: "handwriting" },
  { label: "Permanent Marker", family: permanentMarker.style.fontFamily, kind: "handwriting" },
  { label: "Kalam", family: kalam.style.fontFamily, kind: "handwriting" },
  { label: "Anton", family: anton.style.fontFamily, kind: "display" },
  { label: "Bebas Neue", family: bebasNeue.style.fontFamily, kind: "display" },
  { label: "Playfair Display", family: playfair.style.fontFamily, kind: "display" },
  { label: "Space Grotesk", family: spaceGrotesk.style.fontFamily, kind: "body" },
  { label: "Montserrat", family: montserrat.style.fontFamily, kind: "body" },
  { label: "Georgia", family: "Georgia, serif", kind: "body" },
  { label: "System Sans", family: "ui-sans-serif, system-ui, sans-serif", kind: "body" },
  { label: "Monospace", family: "ui-monospace, SFMono-Regular, monospace", kind: "body" },
]

/** Class names that must be present on the page so next/font emits @font-face rules. */
export const STUDIO_FONT_CLASSES = [
  caveat.className,
  shadowsIntoLight.className,
  permanentMarker.className,
  kalam.className,
  playfair.className,
  bebasNeue.className,
  montserrat.className,
  anton.className,
  spaceGrotesk.className,
].join(" ")

export const FONT_HANDWRITING = caveat.style.fontFamily
export const FONT_MARKER = permanentMarker.style.fontFamily
export const FONT_DISPLAY = bebasNeue.style.fontFamily
export const FONT_SERIF = playfair.style.fontFamily
export const FONT_BODY = montserrat.style.fontFamily
export const FONT_CONDENSED = anton.style.fontFamily
export const FONT_GROTESK = spaceGrotesk.style.fontFamily

/** First family name only (no fallbacks), as required by the CSS Font Loading API. */
function primaryFamily(family: string): string {
  const first = family.split(",")[0].trim()
  return first.replace(/^['"]|['"]$/g, "")
}

/** Wait for the webfonts used on canvas text to be available before rendering. */
export async function ensureFontLoaded(family: string, weight = "400"): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return
  try {
    await document.fonts.load(`${weight} 24px "${primaryFamily(family)}"`)
  } catch {
    // Canvas falls back to a default font; not fatal.
  }
}
