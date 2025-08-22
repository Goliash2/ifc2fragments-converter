# ifc2fragments-converter

Convert IFC files to `.frag` files (That Open Fragments) from the command line.

Two modes:
- Standard: uses `convert.mjs` with external `web-ifc` wasm files.
- Inline: single-file bundle with the wasm embedded (`dist/convert-inline.cjs`).

## Install (local clone)
```bash
npm install
npm run build:cli
```

## Usage
```bash
# Source script
node convert.mjs input.ifc [output.frag] [--raw] [--wasm <dir>] [--threshold N]

# Bundled standard
npm run convert:dist -- input.ifc

# Bundled inline (recommended single-file bundle)
npm run convert:dist:inline -- input.ifc
```

Flags:
- `--raw` produce uncompressed fragments
- `--wasm <dir>` override wasm directory (standard script only)
- `--threshold N` distance filter (meters). Set large (e.g. 1e10) to disable practical filtering.

## Global CLI (after publishing)
```bash
npm install -g ifc2fragments-converter
ifc2fragments input.ifc
```

## Development
```bash
npm run build:cli
```

## License
ISC
