// Build two Node CLI bundles: standard (needs web-ifc folder) and inline (embeds wasm)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outdir = path.join(root, 'dist');

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [path.join(root, 'convert.mjs')],
  outfile: path.join(outdir, 'convert.cjs'),
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  bundle: true,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
});

// Copy wasm assets for standard bundle
const wasmSrc = path.join(root, 'node_modules', 'web-ifc');
const wasmDst = path.join(outdir, 'web-ifc');
if (fs.existsSync(wasmSrc)) {
  fs.mkdirSync(wasmDst, { recursive: true });
  const files = fs.readdirSync(wasmSrc).filter((f) => /\.(wasm|data|js)$/i.test(f));
  for (const f of files) fs.copyFileSync(path.join(wasmSrc, f), path.join(wasmDst, f));
}

await build({
  entryPoints: [path.join(root, 'convert-inline.mjs')],
  outfile: path.join(outdir, 'convert-inline.cjs'),
  platform: 'node',
  target: ['node18'],
  format: 'cjs',
  bundle: true,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  loader: { '.wasm': 'binary' },
});

console.log('Built:');
console.log('  dist/convert.cjs (expects web-ifc folder)');
console.log('  dist/convert-inline.cjs (wasm inlined)');
