import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  deleteTemplate,
  loadAutosave,
  loadTemplates,
  migratePages,
  saveTemplate,
  writeAutosave,
  type AutosavePayload,
  type SavedTemplate
} from '@/lib/studio/storage';

function makeStorage(opts: { throwOnSet?: boolean } = {}) {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet)
        throw new DOMException('quota', 'QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    _map: map
  };
}

let store: ReturnType<typeof makeStorage>;

beforeEach(() => {
  store = makeStorage();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: store
  };
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('migratePages', () => {
  test('current shape returns pages as-is', () => {
    expect(migratePages({ pages: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  test('legacy shape migrates single json string into a one-page array', () => {
    expect(migratePages({ json: 'x' })).toEqual(['x']);
  });

  test('empty pages array falls through to legacy json', () => {
    expect(migratePages({ pages: [], json: 'x' })).toEqual(['x']);
  });

  test('neither present returns null', () => {
    expect(migratePages({})).toBeNull();
  });

  test('both present: current shape wins', () => {
    expect(migratePages({ pages: ['a'], json: 'x' })).toEqual(['a']);
  });
});

describe('loadAutosave', () => {
  test('round-trips a valid current payload through writeAutosave', () => {
    const payload: AutosavePayload = {
      presetId: 'preset-1',
      pages: ['a', 'b'],
      activeIndex: 1,
      savedAt: 123
    };
    expect(writeAutosave(payload)).toBe(true);
    expect(loadAutosave()).toEqual(payload);
  });

  test('legacy { json } payload migrates to pages (the f8253a4 crash surface)', () => {
    store._map.set(
      'studio:autosave',
      JSON.stringify({ json: 'legacy', activeIndex: 0 })
    );
    expect(loadAutosave()?.pages).toEqual(['legacy']);
  });

  test('malformed JSON does not throw, returns null', () => {
    store._map.set('studio:autosave', '{not json');
    expect(() => loadAutosave()).not.toThrow();
    expect(loadAutosave()).toBeNull();
  });

  test('missing key returns null', () => {
    expect(loadAutosave()).toBeNull();
  });

  test('activeIndex is clamped to the last page index', () => {
    store._map.set(
      'studio:autosave',
      JSON.stringify({ pages: ['a', 'b'], activeIndex: 9 })
    );
    expect(loadAutosave()?.activeIndex).toBe(1);
  });

  test('non-integer activeIndex defaults to 0', () => {
    store._map.set(
      'studio:autosave',
      JSON.stringify({ pages: ['a', 'b'], activeIndex: 0.5 })
    );
    expect(loadAutosave()?.activeIndex).toBe(0);
  });
});

describe('writeAutosave', () => {
  const payload: AutosavePayload = {
    presetId: 'preset-1',
    pages: ['a'],
    activeIndex: 0,
    savedAt: 1
  };

  test('normal write returns true', () => {
    expect(writeAutosave(payload)).toBe(true);
  });

  test('quota-exceeded write returns false and does not throw', () => {
    store = makeStorage({ throwOnSet: true });
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: store
    };
    expect(() => writeAutosave(payload)).not.toThrow();
    expect(writeAutosave(payload)).toBe(false);
  });
});

describe('templates', () => {
  const template: SavedTemplate = {
    id: 't1',
    name: 'My template',
    presetId: 'preset-1',
    pages: ['a', 'b'],
    preview: 'data:image/png;base64,',
    createdAt: 1
  };

  test('saveTemplate then loadTemplates returns the template', () => {
    expect(saveTemplate(template)).toBe(true);
    expect(loadTemplates()).toEqual([template]);
  });

  test('deleteTemplate removes it', () => {
    saveTemplate(template);
    expect(deleteTemplate(template.id)).toEqual([]);
    expect(loadTemplates()).toEqual([]);
  });
});
