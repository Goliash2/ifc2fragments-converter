import fs from 'fs';
import path from 'path';
import url from 'url';
import { IfcImporter as FragmentsSerializer } from '@thatopen/fragments';

function printUsage(exitCode = 1) {
  console.log(
    [
      'Usage:',
      '  node convert.mjs <input.ifc> [output.frag]',
      '',
      'Options:',
      '  --raw          Output uncompressed FRAG (defaults to compressed)',
  '  --wasm <dir>   Absolute path to web-ifc wasm directory (defaults to node_modules/web-ifc)',
  '  --threshold N  Distance threshold in meters to filter distant objects (default 1e5; set large to disable)',
    ].join('\n')
  );
  process.exit(exitCode);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) printUsage(1);

  // Flags
  let raw = false;
  let wasmDir = null;
  let threshold = null;

  // Positional
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--raw') {
      raw = true;
      continue;
    }
    if (a === '--wasm') {
      i++;
      if (i >= args.length) {
        console.error('Missing value for --wasm');
        printUsage(1);
      }
      wasmDir = args[i];
      continue;
    }
    if (a === '--threshold') {
      i++;
      if (i >= args.length) {
        console.error('Missing value for --threshold');
        printUsage(1);
      }
      const v = Number(args[i]);
      if (!Number.isFinite(v)) {
        console.error('Threshold must be a finite number');
        printUsage(1);
      }
      threshold = v;
      continue;
    }
    positionals.push(a);
  }

  const inputIfc = positionals[0];
  if (!inputIfc) printUsage(1);
  let outputFrag = positionals[1];
  if (!outputFrag) {
    const base = path.basename(inputIfc, path.extname(inputIfc));
    outputFrag = path.join(path.dirname(inputIfc), `${base}.frag`);
  }

  // Resolve wasm directory
  if (!wasmDir) {
    const baseDir = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(url.fileURLToPath(import.meta.url));
    const nodeModulesWasm = path.resolve(baseDir, 'node_modules', 'web-ifc');
    const bundledWasm = path.resolve(baseDir, 'web-ifc');
    if (fs.existsSync(nodeModulesWasm)) {
      wasmDir = nodeModulesWasm;
    } else if (fs.existsSync(bundledWasm)) {
      wasmDir = bundledWasm;
    } else {
      wasmDir = nodeModulesWasm; // default fallback
    }
  }

  // Ensure wasmDir exists
  if (!fs.existsSync(wasmDir)) {
    console.error(`web-ifc wasm directory not found: ${wasmDir}`);
    process.exit(2);
  }

  // Read IFC as bytes
  const ifcBuffer = fs.readFileSync(inputIfc);
  const bytes = new Uint8Array(ifcBuffer.buffer, ifcBuffer.byteOffset, ifcBuffer.byteLength);

  // Instantiate serializer and set wasm path (absolute)
  const serializer = new FragmentsSerializer();
  serializer.wasm = { absolute: true, path: wasmDir.endsWith(path.sep) ? wasmDir : wasmDir + path.sep };
  // Set distanceThreshold (unconditionally assign; property may not be typed)
  const desiredThreshold = threshold ?? 1e10; // default to very large as requested
  serializer.distanceThreshold = desiredThreshold;

  console.log(`Converting: ${inputIfc}`);
  console.log(`WASM dir:   ${serializer.wasm.path}`);
  console.log(`Threshold:  ${desiredThreshold}`);

  const progressCallback = (p, info) => {
    const pct = Math.round(p * 100);
    if (info && info.process) {
      process.stdout.write(`\r[${pct}%] ${info.process} ${info.state ?? ''}     `);
    } else {
      process.stdout.write(`\r[${pct}%]`);
    }
  };

  const outBytes = await serializer.process({ bytes, raw, progressCallback });
  fs.writeFileSync(outputFrag, Buffer.from(outBytes));
  process.stdout.write('\n');
  console.log(`Wrote: ${outputFrag}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
