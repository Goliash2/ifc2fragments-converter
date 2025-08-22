// Inline-wasm variant of the converter.
// Build using esbuild with loader { '.wasm': 'binary' }.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IfcImporter as FragmentsSerializer } from '@thatopen/fragments';
import wasmBinary from 'web-ifc/web-ifc.wasm';
import wasmNodeBinary from 'web-ifc/web-ifc-node.wasm';

function printUsage(exitCode = 1) {
  console.log([
    'Usage:',
    '  node convert-inline.cjs <input.ifc> [output.frag]',
    '',
    'Options:',
    '  --raw          Output uncompressed FRAG (defaults to compressed)',
    '  --threshold N  Distance threshold in meters to filter distant objects (default 1e5; set large to disable)',
    '',
    'Notes:',
    '  The web-ifc wasm binary is inlined; --wasm flag is unnecessary.'
  ].join('\n'));
  process.exit(exitCode);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) printUsage(1);
  let raw = false; let threshold = null; const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--raw') { raw = true; continue; }
    if (a === '--threshold') { i++; if (i >= args.length) { console.error('Missing value for --threshold'); printUsage(1);} const v = Number(args[i]); if(!Number.isFinite(v)){ console.error('Threshold must be a finite number'); printUsage(1);} threshold = v; continue; }
    positionals.push(a);
  }
  const inputIfc = positionals[0]; if (!inputIfc) printUsage(1);
  let outputFrag = positionals[1];
  if (!outputFrag) { const base = path.basename(inputIfc, path.extname(inputIfc)); outputFrag = path.join(path.dirname(inputIfc), `${base}.frag`); }

  const wasmTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-ifc-'));
  const wasmFile = path.join(wasmTempDir, 'web-ifc.wasm');
  const wasmNodeFile = path.join(wasmTempDir, 'web-ifc-node.wasm');
  const u8 = wasmBinary instanceof Uint8Array ? wasmBinary : new Uint8Array(wasmBinary);
  const u8n = wasmNodeBinary instanceof Uint8Array ? wasmNodeBinary : new Uint8Array(wasmNodeBinary);
  fs.writeFileSync(wasmFile, Buffer.from(u8));
  fs.writeFileSync(wasmNodeFile, Buffer.from(u8n));

  const ifcBuffer = fs.readFileSync(inputIfc);
  const bytes = new Uint8Array(ifcBuffer.buffer, ifcBuffer.byteOffset, ifcBuffer.byteLength);
  const serializer = new FragmentsSerializer();
  serializer.wasm = { absolute: true, path: wasmTempDir.endsWith(path.sep) ? wasmTempDir : wasmTempDir + path.sep };
  const desiredThreshold = threshold ?? 1e10; serializer.distanceThreshold = desiredThreshold;
  console.log(`Converting: ${inputIfc}`);
  console.log(`WASM:       inlined -> ${wasmFile}, ${wasmNodeFile}`);
  console.log(`Threshold:  ${desiredThreshold}`);
  const progressCallback = (p, info) => { const pct = Math.round(p * 100); if (info && info.process) { process.stdout.write(`\r[${pct}%] ${info.process} ${info.state ?? ''}     `);} else { process.stdout.write(`\r[${pct}%]`);} };
  const outBytes = await serializer.process({ bytes, raw, progressCallback });
  fs.writeFileSync(outputFrag, Buffer.from(outBytes));
  process.stdout.write('\n');
  console.log(`Wrote: ${outputFrag}`);
}
main().catch((err) => { console.error(err); process.exit(1); });
