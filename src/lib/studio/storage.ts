export type SavedTemplate = {
  id: string;
  name: string;
  presetId: string;
  /** Serialized fabric canvas JSON, one entry per page. */
  pages: string[];
  /** Small preview data URL of the first page. */
  preview: string;
  createdAt: number;
};

export type AutosavePayload = {
  presetId: string;
  /** Serialized fabric canvas JSON, one entry per page. */
  pages: string[];
  activeIndex: number;
  savedAt: number;
};

/** Accept both the current multi-page shape and the original single-page `json` field. */
function migratePages(value: {
  pages?: string[];
  json?: string;
}): string[] | null {
  if (Array.isArray(value.pages) && value.pages.length) return value.pages;
  if (typeof value.json === 'string') return [value.json];
  return null;
}

const TEMPLATES_KEY = 'studio:templates';
const AUTOSAVE_KEY = 'studio:autosave';

function safeRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Returns false when the write failed (usually quota - designs with photos are big). */
function safeWrite(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadTemplates(): SavedTemplate[] {
  const raw =
    safeRead<(SavedTemplate & { json?: string })[]>(TEMPLATES_KEY) ?? [];
  return raw.flatMap((t) => {
    const pages = migratePages(t);
    return pages ? [{ ...t, pages }] : [];
  });
}

export function saveTemplate(template: SavedTemplate): boolean {
  const templates = loadTemplates().filter((t) => t.id !== template.id);
  templates.unshift(template);
  return safeWrite(TEMPLATES_KEY, templates);
}

export function deleteTemplate(id: string): SavedTemplate[] {
  const templates = loadTemplates().filter((t) => t.id !== id);
  safeWrite(TEMPLATES_KEY, templates);
  return templates;
}

export function loadAutosave(): AutosavePayload | null {
  const raw = safeRead<AutosavePayload & { json?: string }>(AUTOSAVE_KEY);
  if (!raw) return null;
  const pages = migratePages(raw);
  if (!pages) return null;
  const activeIndex = Number.isInteger(raw.activeIndex)
    ? Math.min(raw.activeIndex, pages.length - 1)
    : 0;
  return { ...raw, pages, activeIndex };
}

export function writeAutosave(payload: AutosavePayload): boolean {
  return safeWrite(AUTOSAVE_KEY, payload);
}

export function clearAutosave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

/** Download a JSON file (template export). */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Download a data URL (PNG/JPEG export). */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

/**
 * Bundle multiple exported images into one zip download. Browsers block
 * several programmatic downloads in a row, so multi-page exports ship as
 * a single archive instead.
 */
export async function downloadImagesAsZip(
  filename: string,
  images: { name: string; dataUrl: string }[]
): Promise<void> {
  const { zipSync } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  for (const image of images) {
    const base64 = image.dataUrl.split(',')[1] ?? '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // Images are already compressed; store instead of deflating.
    files[image.name] = bytes;
  }
  const zipped = zipSync(files, { level: 0 });
  const blob = new Blob([zipped as unknown as BlobPart], {
    type: 'application/zip'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Read an image file, downscale it so the longest edge is at most `maxEdge`,
 * and return a data URL. Data URLs (vs blob URLs) survive JSON serialization,
 * which keeps autosave and saved templates self-contained.
 */
export function fileToImageDataUrl(
  file: File,
  maxEdge = 2400
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        if (scale === 1 && file.type === 'image/jpeg') {
          resolve(reader.result as string);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const hasAlpha =
          file.type === 'image/png' || file.type === 'image/webp';
        resolve(
          hasAlpha
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.9)
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
