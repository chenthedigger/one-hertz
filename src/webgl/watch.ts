/**
 * Hero watch asset — Apple Watch Ultra 3 (research/asset-qa pipeline:
 * official USDZ → Blender rename pass → `gltfpack -tc -kn` → this loader).
 *
 * Contract facts every consumer must know (verified against the GLB JSON):
 *   - 114 renamed nodes on the part_* / grp_* / mat_* naming contract, BUT
 *     gltfpack inserts ANONYMOUS holder nodes: each named node (e.g.
 *     `part_screen`) parents one anonymous child that carries the mesh.
 *     ⇒ NEVER address by node index or by `mesh.name`; use
 *     `resolvePartName()` (raycast) / `WatchAsset.parts` (lookup), which
 *     climb to the nearest named ancestor.
 *   - The case sits TILTED ~45° inside the Ocean-band loop (the USDZ AR
 *     pose; root chain: +90°X · ×0.01 · +55°X · z−0.164). World axes are
 *     NOT case axes — camera math that wants "along the dial normal" must
 *     go through `WatchAsset.caseSpace`.
 *   - gltfpack quantized the UVs and compensated with KHR_texture_transform
 *     (screen emissive: repeat ≈ ×16.0037). Any texture swapped onto the
 *     screen mesh MUST inherit the baked texture's offset/repeat or the
 *     dial renders 1/16-size (handled in `retargetScreenTexture`).
 *   - Known material defects from the USDZ ceiling (DEVICE-DECISION §6.4)
 *     get their FIRST-PASS fixes here: sapphire crystal transparency,
 *     back-crystal marbled normal/colorspace artifact, washed Ocean band
 *     (the Ocean fix is a look-config override — see gl/look.ts).
 */

import {
  Box3,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Served GLB (copy of research/asset-qa/ultra-3-draft.ktx2.glb, 1.24MB). */
export const WATCH_GLB_URL = "/assets/watch/ultra-3.ktx2.glb";

/** KTX2 basis transcoder (copied from three/examples/jsm/libs/basis). */
export const BASIS_TRANSCODER_PATH = "/assets/basis/";

/**
 * Normalized presentation: the whole piece (band loop + head) is scaled to
 * this world height, centered on the origin (the camera rig orbits the
 * origin — engine contract).
 */
export const WATCH_WORLD_HEIGHT = 2.4;

/**
 * Case-local frame, derived from the `part_screen` mesh at load time
 * (single source of truth for the ~45° AR-pose tilt). Axes are world-space
 * unit vectors valid for the watch AT REST in its wrapper (before any
 * product-group idle rotation — express camera beats in case space, then
 * let the product transform carry both watch and beat together).
 */
export interface CaseSpace {
  /** Dial normal (out of the display), world space. */
  zAxis: Vector3;
  /** Dial "up" (toward 12 o'clock band lug), world space. */
  yAxis: Vector3;
  /** Dial right (crown side), world space: y × z. */
  xAxis: Vector3;
  /** Screen center, world space (wrapper-local == world at rest). */
  origin: Vector3;
  /** Rotation taking case-local (x,y,z) into world. */
  quaternion: Quaternion;
  /** Tilt of the dial normal off the world-horizontal plane, radians. */
  tiltRad: number;
  /** case-local direction/offset → world (rotation only). */
  toWorld(v: Vector3): Vector3;
  /** world direction/offset → case-local (rotation only). */
  toCase(v: Vector3): Vector3;
}

export interface WatchAsset {
  /** Normalized wrapper (name "watch_root") — parent this to the stage. */
  root: Group;
  /** The GLB's `part_screen` mesh — hand to `stage.adoptScreenMesh`. */
  screenMesh: Mesh | null;
  /** The baked-dial material's emissive texture (KHR_texture_transform donor + fallback). */
  bakedScreenTexture: Texture | null;
  /** All `mat_*` materials by name — the look-config override surface. */
  materials: Map<string, MeshStandardMaterial>;
  /** All NAMED nodes (part_*, grp_*, secondaries) by name. */
  parts: Map<string, Object3D>;
  /** Case-local axis helper (the 45°-tilt correction for camera math). */
  caseSpace: CaseSpace;
}

/**
 * Raycast contract: climb from a hit `intersection.object` to the nearest
 * NAMED ancestor (gltfpack's mesh holders are anonymous). Prefer `part_*`
 * names when one exists on the way up; otherwise the first named node wins
 * (secondaries like `crown_ring_orange` are legitimate hit results).
 * Returns null only above the asset root.
 */
export function resolvePartName(object: Object3D): string | null {
  let firstNamed: string | null = null;
  let current: Object3D | null = object;
  while (current !== null && current.name !== "watch_root") {
    const name = current.name;
    if (name.startsWith("part_")) return name;
    if (firstNamed === null && name !== "") firstNamed = name;
    current = current.parent;
  }
  return firstNamed;
}

/**
 * Load + normalize the hero GLB. `onProgress` receives real byte progress
 * 0..1 (feeds a loader task — loader honesty, PLAN §2).
 */
export async function loadWatch(
  renderer: WebGLRenderer,
  onProgress?: (p: number) => void,
): Promise<WatchAsset> {
  const ktx2 = new KTX2Loader()
    .setTranscoderPath(BASIS_TRANSCODER_PATH)
    .detectSupport(renderer);
  const loader = new GLTFLoader()
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder);

  try {
    const gltf = await loader.loadAsync(WATCH_GLB_URL, (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    });
    return buildAsset(gltf.scene);
  } finally {
    ktx2.dispose(); // transcoder workers; decoded textures are unaffected
  }
}

function buildAsset(scene: Group): WatchAsset {
  // ---- Index the naming contract ------------------------------------------
  const parts = new Map<string, Object3D>();
  const materials = new Map<string, MeshStandardMaterial>();
  scene.traverse((obj) => {
    if (obj.name !== "") parts.set(obj.name, obj);
    if (obj instanceof Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (mat instanceof MeshStandardMaterial && mat.name !== "") {
          materials.set(mat.name, mat);
        }
      }
    }
  });

  const screenMesh = meshUnder(parts.get("part_screen"));
  const bakedScreenTexture =
    screenMesh && screenMesh.material instanceof MeshStandardMaterial
      ? screenMesh.material.emissiveMap
      : null;

  fixMaterialDefects(scene, materials);

  // ---- Normalize: center on origin, uniform scale to WATCH_WORLD_HEIGHT ---
  const root = new Group();
  root.name = "watch_root";
  root.add(scene);
  scene.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = WATCH_WORLD_HEIGHT / size.y;
  scene.scale.setScalar(scale);
  scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  root.updateWorldMatrix(true, true);

  const caseSpace = buildCaseSpace(screenMesh);

  return { root, screenMesh, bakedScreenTexture, materials, parts, caseSpace };
}

/** First mesh under a named holder node (gltfpack anonymous-holder shape). */
function meshUnder(node: Object3D | undefined): Mesh | null {
  if (!node) return null;
  let found: Mesh | null = null;
  node.traverse((obj) => {
    if (found === null && obj instanceof Mesh) found = obj;
  });
  return found;
}

/**
 * Case-local frame from the screen mesh: dial normal = area-weighted mean
 * of the geometry's normals in world space (the Ultra crystal is flat, so
 * the mean IS the normal); dial-up = world-up projected onto the dial
 * plane (well-conditioned at the ~45° AR tilt; degenerate only for a dial
 * facing straight up/down, which this pose never is).
 */
function buildCaseSpace(screenMesh: Mesh | null): CaseSpace {
  const zAxis = new Vector3(0, 0, 1);
  const origin = new Vector3();

  if (screenMesh) {
    screenMesh.updateWorldMatrix(true, false);
    const geometry = screenMesh.geometry as BufferGeometry;
    const normalAttr = geometry.getAttribute("normal");
    const local = new Vector3();
    const sum = new Vector3();
    if (normalAttr !== undefined) {
      for (let i = 0; i < normalAttr.count; i++) {
        sum.add(local.fromBufferAttribute(normalAttr, i));
      }
    }
    if (sum.lengthSq() < 1e-8) sum.set(0, 0, 1);
    const normalMatrix = new Matrix3().getNormalMatrix(screenMesh.matrixWorld);
    zAxis.copy(sum.applyMatrix3(normalMatrix).normalize());

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      geometry.boundingBox.getCenter(origin);
      origin.applyMatrix4(screenMesh.matrixWorld);
    }
  }

  const worldUp = new Vector3(0, 1, 0);
  const yAxis = worldUp
    .clone()
    .sub(zAxis.clone().multiplyScalar(worldUp.dot(zAxis)))
    .normalize();
  if (yAxis.lengthSq() < 1e-8) yAxis.set(0, 0, 1); // dial facing straight up
  const xAxis = new Vector3().crossVectors(yAxis, zAxis).normalize();

  const quaternion = new Quaternion().setFromRotationMatrix(
    // Basis columns x,y,z → rotation case→world.
    new Matrix4().makeBasis(xAxis, yAxis, zAxis),
  );
  const tiltRad = Math.asin(Math.min(1, Math.abs(zAxis.y)));

  return {
    zAxis,
    yAxis,
    xAxis,
    origin,
    quaternion,
    tiltRad,
    toWorld: (v: Vector3) => v.clone().applyQuaternion(quaternion),
    toCase: (v: Vector3) => v.clone().applyQuaternion(quaternion.clone().invert()),
  };
}

/**
 * First-pass fixes for the known USDZ-ceiling material defects
 * (DEVICE-DECISION §6.4). Real material authorship is P1.5's — these make
 * the draft presentable and unblock look-dev:
 *
 * 1. `mat_crystal_sapphire` shipped OPAQUE black (USD opacity semantics
 *    lost) → replaced with a transparent MeshPhysicalMaterial (alpha route,
 *    not transmission: the dual-composer selective bloom hides transparent
 *    meshes during the bloom pass — see gl/post.ts — and a transmission
 *    buffer would cost a full extra scene render per frame for a first
 *    pass). Live dial reads THROUGH the crystal; fresnel comes from env
 *    reflectivity + clearcoat.
 * 2. Back-crystal cluster marbled artifact (normal/AO in wrong slots /
 *    colorspace) → strip the offending normal maps, re-seat the spun plate
 *    as opaque dark metal (it shipped alphaMode BLEND, α 0.1 — the marble).
 * 3. `mat_band_ocean` washed mint → NOT fixed here; corrected via the
 *    look-config materialOverrides hook (gl/look.ts DEFAULT_LOOK) so look
 *    agents own the color.
 */
function fixMaterialDefects(
  scene: Group,
  materials: Map<string, MeshStandardMaterial>,
): void {
  // 1 · Sapphire crystal — see-through with a glassy fresnel.
  const crystal = materials.get("mat_crystal_sapphire");
  if (crystal) {
    const fixed = new MeshPhysicalMaterial({
      name: "mat_crystal_sapphire",
      color: 0x090a0c,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.22,
      envMapIntensity: 1.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      ior: 1.76, // sapphire
      depthWrite: false, // the live screen must render behind it
    });
    replaceMaterial(scene, crystal, fixed);
    materials.set(fixed.name, fixed);
    crystal.dispose();
  }

  // 2 · Back-crystal cluster — kill the marble, keep the geometry.
  const spun = materials.get("mat_back_spun");
  if (spun) {
    spun.transparent = false;
    spun.opacity = 1;
    spun.color.setHex(0x232527);
    spun.metalness = 1.0;
    spun.roughness = 0.38;
    spun.needsUpdate = true;
  }
  for (const name of ["mat_back_ceramic", "mat_back_lens", "mat_back_matte"]) {
    const mat = materials.get(name);
    if (!mat) continue;
    if (mat.normalMap) {
      mat.normalMap = null;
      mat.needsUpdate = true;
    }
    if (mat.aoMap) {
      mat.aoMap = null;
      mat.needsUpdate = true;
    }
  }
  const ceramic = materials.get("mat_back_ceramic");
  if (ceramic) {
    ceramic.color.setHex(0x141517);
    ceramic.roughness = 0.32;
  }
}

/** Swap `from` for `to` on every mesh in the asset that carries it. */
function replaceMaterial(
  root: Object3D,
  from: MeshStandardMaterial,
  to: MeshStandardMaterial,
): void {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => (m === from ? to : m));
    } else if (obj.material === from) {
      obj.material = to;
    }
  });
}

/**
 * Upgrade a named material to MeshPhysicalMaterial IN PLACE across the
 * asset (look-config overrides may ask for anisotropy/clearcoat, which
 * MeshStandardMaterial lacks). Returns the physical material, or the
 * existing one if it already is physical. No-op-null if the name is absent.
 */
export function ensurePhysical(
  watch: WatchAsset,
  name: string,
): MeshPhysicalMaterial | null {
  const mat = watch.materials.get(name);
  if (!mat) return null;
  if (mat instanceof MeshPhysicalMaterial) return mat;

  const physical = new MeshPhysicalMaterial();
  // Transfer the standard slots explicitly (Material.copy across subclasses
  // is not contract-safe for the physical-only fields).
  physical.name = mat.name;
  physical.color.copy(mat.color);
  physical.map = mat.map;
  physical.metalness = mat.metalness;
  physical.roughness = mat.roughness;
  physical.metalnessMap = mat.metalnessMap;
  physical.roughnessMap = mat.roughnessMap;
  physical.normalMap = mat.normalMap;
  physical.normalScale.copy(mat.normalScale);
  physical.aoMap = mat.aoMap;
  physical.aoMapIntensity = mat.aoMapIntensity;
  physical.emissive.copy(mat.emissive);
  physical.emissiveMap = mat.emissiveMap;
  physical.emissiveIntensity = mat.emissiveIntensity;
  physical.envMapIntensity = mat.envMapIntensity;
  physical.transparent = mat.transparent;
  physical.opacity = mat.opacity;
  physical.side = mat.side;

  watch.root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => (m === mat ? physical : m));
    } else if (obj.material === mat) {
      obj.material = physical;
    }
  });
  watch.materials.set(name, physical);
  mat.dispose();
  return physical;
}

/**
 * Make an arbitrary texture (the live dial CanvasTexture) address the
 * screen mesh's QUANTIZED UVs: copy the baked emissive texture's
 * KHR_texture_transform (offset/repeat/rotation/center ≈ repeat ×16.0037)
 * and adopt glTF orientation (`flipY=false` — dial-lane pitfall #4).
 * Call BEFORE the first frame that samples the texture.
 */
export function retargetScreenTexture(texture: Texture, baked: Texture | null): void {
  if (baked) {
    texture.offset.copy(baked.offset);
    texture.repeat.copy(baked.repeat);
    texture.rotation = baked.rotation;
    texture.center.copy(baked.center);
  }
  texture.flipY = false;
  texture.needsUpdate = true; // flipY is an upload-time property
}
