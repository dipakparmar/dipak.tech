export type CanvasPreset = {
  id: string
  label: string
  group: string
  width: number
  height: number
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  // Instagram
  { id: "ig-story", label: "Story / Reel", group: "Instagram", width: 1080, height: 1920 },
  { id: "ig-portrait", label: "Post (Portrait)", group: "Instagram", width: 1080, height: 1350 },
  { id: "ig-square", label: "Post (Square)", group: "Instagram", width: 1080, height: 1080 },
  { id: "ig-landscape", label: "Post (Landscape)", group: "Instagram", width: 1080, height: 566 },
  // X / Twitter
  { id: "x-post", label: "Post Image", group: "X / Twitter", width: 1600, height: 900 },
  { id: "x-header", label: "Profile Header", group: "X / Twitter", width: 1500, height: 500 },
  // Facebook
  { id: "fb-post", label: "Post / Link", group: "Facebook", width: 1200, height: 630 },
  { id: "fb-cover", label: "Page Cover", group: "Facebook", width: 820, height: 312 },
  // Blog & video
  { id: "blog-cover", label: "Blog Cover / OG", group: "Blog & Video", width: 1200, height: 630 },
  { id: "yt-thumb", label: "YouTube Thumbnail", group: "Blog & Video", width: 1280, height: 720 },
  // Wallpapers
  { id: "wall-desktop", label: "Desktop Wallpaper", group: "Wallpaper", width: 2560, height: 1440 },
  { id: "wall-phone", label: "Phone Wallpaper", group: "Wallpaper", width: 1170, height: 2532 },
]

export const DEFAULT_PRESET_ID = "ig-portrait"

export function getPreset(id: string): CanvasPreset {
  return CANVAS_PRESETS.find((p) => p.id === id) ?? CANVAS_PRESETS[1]
}

/** Preset groups in display order, for the size picker. */
export function presetGroups(): { group: string; presets: CanvasPreset[] }[] {
  const groups: { group: string; presets: CanvasPreset[] }[] = []
  for (const preset of CANVAS_PRESETS) {
    const existing = groups.find((g) => g.group === preset.group)
    if (existing) existing.presets.push(preset)
    else groups.push({ group: preset.group, presets: [preset] })
  }
  return groups
}

/** Brand-ish default swatches offered in every color picker. */
export const COLOR_SWATCHES = [
  "#ffffff",
  "#0a0a0a",
  "#FFE066", // scribble yellow used across the site
  "#f43f5e",
  "#fb923c",
  "#34d399",
  "#38bdf8",
  "#818cf8",
  "#e879f9",
]
