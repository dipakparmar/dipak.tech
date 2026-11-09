// Copies MapLibre's tile-decoder worker into public/maplibre so the browser can
// fetch it from our own origin (worker-src 'self'). The bundler emits no asset
// for it. Runs before `dev` and `build`; the output is gitignored.
//
// Two files: the worker imports the shared runtime chunk beside it by relative path.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
const outDir = join(import.meta.dir, '..', 'public', 'maplibre');
// Resolved by file: the package is ESM-only and publishes no `require` condition
// for its bare name, but its ./dist/* export resolves.
const distDir = dirname(require.resolve(`maplibre-gl/dist/${FILES[0]}`));

await mkdir(outDir, { recursive: true });
for (const file of FILES) {
  await copyFile(join(distDir, file), join(outDir, file));
}
console.log(`map worker: ${FILES.length} file(s) copied to public/maplibre`);
