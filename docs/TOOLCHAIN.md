# TOOLCHAIN — 3D asset pipeline (P0 bootstrap, verified 2026-08-20)

Everything below was executed and verified on this machine (macOS 26.4.1, arm64,
node v24.16.0). Smoke artifacts live in `research/smoke/`.

## Blender (headless)

- **Path**: `~/Applications/Blender.app/Contents/MacOS/Blender`
- **Version**: **Blender 4.5.12 LTS** (hash `84afd5f785f7`, built 2026-07-21, arm64 DMG)
- **Why 4.5 LTS, not 5.2**: 5.0–5.2 exist upstream; PLAN §4.1 names 4.x LTS. The LTS
  line has a frozen Python API — right tradeoff for a scripted multi-agent pipeline.
- **Install method** (reproducible): download DMG from
  `https://download.blender.org/release/Blender4.5/blender-4.5.12-macos-arm64.dmg`
  (294 MB, `curl -L --retry 3`), `hdiutil attach -nobrowse -readonly`, `cp -R
  /Volumes/Blender/Blender.app ~/Applications/`, `hdiutil detach`, then
  `xattr -dr com.apple.quarantine ~/Applications/Blender.app` (Gatekeeper would
  otherwise block first launch of a non-App-Store app copied from a DMG).

### Headless invocation pattern

```sh
# version / sanity
~/Applications/Blender.app/Contents/MacOS/Blender -b --version

# run a pipeline script (script owns scene setup + import/export)
~/Applications/Blender.app/Contents/MacOS/Blender -b -P script.py

# pass args to the script (everything after -- lands in sys.argv)
~/Applications/Blender.app/Contents/MacOS/Blender -b -P script.py -- --in a.usdz --out b.glb

# add --factory-startup for eval-grade determinism (ignores user prefs/addons)
```

Inside scripts: `bpy.ops.wm.read_factory_settings(use_empty=True)` for a clean scene,
`bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')` for GLB,
`bpy.ops.wm.usd_export(filepath=...)` / `bpy.ops.wm.usd_import(filepath=...)` for USD.

### Verified smoke results (script: scratchpad `smoke_torus.py`)

| Test | Result |
|---|---|
| Textured torus → GLB (`research/smoke/torus.glb`) | OK, 293,544 B, texture packed |
| Same scene → `.usdc` (`torus.usdc`) | OK, 191,083 B |
| Same scene → `.usdz` (`torus.usdz`) | OK, 196,828 B — **USDZ export is native** |
| Headless reimport `.usdc` | OK — 1 mesh, 2048 verts, material + image intact |
| Headless reimport `.usdz` | OK — identical stats; **USDZ import is native in 4.5** |
| USDZ → GLB re-export (`torus_from_usdz.glb`) | OK, 277,436 B — **Spike A route (a) chain proven** |

**USDZ status**: Blender 4.5 LTS reads and writes `.usdz` directly through the USD
importer/exporter — no unzip step, no addon. Geometry, material, and texture all
survived the round-trip. Caveat from PLAN §3 stands: UsdPreviewSurface carries no
clearcoat/anisotropy, so Apple USDZs are **geometry donors only**; all hero
materials get re-authored in Blender/three.

## gltfpack (meshopt + KTX2)

- **Path**: `~/.local/bin/gltfpack` — **native arm64 binary, v1.2**, from
  `https://github.com/zeux/meshoptimizer/releases/download/v1.2/gltfpack-macos.zip`
  (then `chmod +x` + `xattr -d com.apple.quarantine`).
- **GOTCHA (the big one)**: `npx -y gltfpack` runs the npm **WASM build, which has
  no BasisU** — `-tc` fails with *"gltfpack was built without BasisU support"*.
  The npx build is fine for meshopt-only (`-c/-cc`) but the PLAN pipeline needs
  KTX2, so **always use the native binary** for encodes. PLAN §3's literal
  `npx gltfpack -tc -kn` should be read as `~/.local/bin/gltfpack -tc -kn`.

### Verified command line

```sh
~/.local/bin/gltfpack -i in.glb -o out.ktx2.glb -tc -kn -cc
```

- `-tc` → all textures to KTX2/BasisU (default codec **ETC1S**; use `-tu` per-slot
  quality upgrade to UASTC for normal/roughness maps on the hero watch)
- `-kn` → keeps node names (raycast/explode targeting depends on this)
- `-cc` → max meshopt compression
- Result on smoke torus: 293,544 B → **63,436 B** (4.6×)

### Verified output (via `npx -y @gltf-transform/cli inspect out.ktx2.glb` — works)

- `extensionsRequired`: `KHR_mesh_quantization`, `EXT_meshopt_compression`,
  `KHR_texture_basisu` → three.js loader **must** wire `MeshoptDecoder` +
  `KTX2Loader` or the load throws.
- Texture: `image/ktx2`, ETC1S, 4.1 KB wire / 174.76 KB GPU (512²).
- Node names: `SmokeTorus` preserved. **Gotcha**: gltfpack inserts one *unnamed
  parent node* (dequantization transform) above the named mesh node — raycast code
  should match by name, never by "root child index".
- Attributes come back quantized (`POSITION:u16`, `NORMAL:i8_norm`,
  `TEXCOORD_0:u16_norm`) — expected, handled by `KHR_mesh_quantization` support
  built into three's GLTFLoader.

## Other gotchas logged

1. Blender is NOT on PATH — always invoke by full app-bundle path (or add
   `~/Applications/Blender.app/Contents/MacOS` to PATH in scripts that need it).
2. Blender GLB export defaults to Y-up (`export_yup=True`) — matches glTF/three;
   don't "fix" axes downstream.
3. Generated `bpy.data.images` must be `.pack()`ed (or saved to disk) before glTF
   export, else the texture silently drops.
4. `npx -y @gltf-transform/cli` is available and is the standard inspection step
   after every encode; no global install needed.
5. Draco is also available in Blender's exporter, but the pipeline standard is
   meshopt via gltfpack (single compressor, per PLAN §3) — leave Draco off.
