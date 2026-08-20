/**
 * Disassembly internals — the A2 parts roster for the exploded view.
 *
 * Loads the in-house internals GLBs (research/internals-models → shipped
 * copies in public/assets/watch/internals/): `part_sip`, `part_battery`,
 * `part_taptic` — all three exist as of the internals-tune lane
 * (docs/p2/internals-tune.md). Each part is normalized into a wrapper Group
 * sized for the Ultra 3 case interior and oriented so its plate face looks
 * along case +z (the dial normal — the explode axis).
 *
 * Resilience contract (brief): load what exists, stub the rest with
 * CONTRACT-NAMED EMPTIES — a failed fetch yields an empty Group carrying
 * the same `part_*` name, so the explode layout, labels and hairlines keep
 * their slots and the section never breaks on a missing asset.
 *
 * Packed with `gltfpack -tc -kn` (KTX2 textures, quantized attributes,
 * anonymous holder nodes) — same loader stack as the hero watch
 * (KTX2Loader + MeshoptDecoder; resolve nodes by NAME, never index —
 * docs/p15/plumbing.md §4).
 */

import { Box3, Group, MeshStandardMaterial, Vector3, type WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BASIS_TRANSCODER_PATH } from "../webgl/watch";

/** One internals slot: asset + its presentation inside the case frame. */
export interface InternalSlotSpec {
  /** Contract node name (`part_*`) — also the wrapper Group's name. */
  name: string;
  /** Served GLB URL (absent = known-future part, stub immediately). */
  url: string | null;
  /** Target size (largest bbox dimension) in watch world units. */
  worldSize: number;
  /**
   * Pre-rotation (radians, XYZ euler applied to the loaded scene inside the
   * wrapper) turning the part's authoring pose to "plate face along +z".
   * The Blender parts are built plate-up (+Y after glTF export).
   */
  preRotation: [number, number, number];
}

/**
 * The roster. Sizes are proportioned against the case interior (case width
 * ≈ 0.95 watch world units at WATCH_WORLD_HEIGHT 2.4).
 */
export const INTERNAL_SLOTS: InternalSlotSpec[] = [
  {
    name: "part_sip",
    url: "/assets/watch/internals/part_sip.glb",
    worldSize: 0.58,
    preRotation: [Math.PI / 2, 0, 0],
  },
  {
    name: "part_battery",
    url: "/assets/watch/internals/part_battery.glb",
    worldSize: 0.6,
    preRotation: [Math.PI / 2, 0, 0],
  },
  {
    name: "part_taptic",
    url: "/assets/watch/internals/part_taptic.glb",
    worldSize: 0.5,
    preRotation: [Math.PI / 2, 0, 0],
  },
];

export interface LoadedInternal {
  spec: InternalSlotSpec;
  /** Wrapper group (named `spec.name`) — empty when the asset is stubbed. */
  wrapper: Group;
  /** True when real geometry landed (false = contract-named empty). */
  loaded: boolean;
}

/**
 * Load every roster slot (parallel), never rejecting: failures resolve as
 * contract-named empties with a console.warn (reviewer-resilience rule —
 * a missing internal must not black out the section).
 */
export async function loadInternals(renderer: WebGLRenderer): Promise<LoadedInternal[]> {
  const ktx2 = new KTX2Loader()
    .setTranscoderPath(BASIS_TRANSCODER_PATH)
    .detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);

  const jobs = INTERNAL_SLOTS.map(async (spec): Promise<LoadedInternal> => {
    const wrapper = new Group();
    wrapper.name = spec.name;
    if (spec.url === null) return { spec, wrapper, loaded: false };
    try {
      const gltf = await loader.loadAsync(spec.url);
      const scene = gltf.scene;
      // Pre-rotate to "plate face along +z", then normalize scale + center.
      scene.rotation.set(...spec.preRotation);
      scene.updateWorldMatrix(true, true);
      const box = new Box3().setFromObject(scene);
      const size = box.getSize(new Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
      const s = spec.worldSize / maxDim;
      scene.scale.setScalar(s);
      scene.updateWorldMatrix(true, true);
      const scaled = new Box3().setFromObject(scene);
      const center = scaled.getCenter(new Vector3());
      scene.position.sub(center);
      // Env grading: the internals were authored/QA'd under the instrument
      // HDR; live parts inherit scene.environment automatically. Mild
      // envMapIntensity trim keeps the small parts from out-speccing the
      // hero titanium at the shared keyframe (LOOKBIBLE §1.5 Disassembly
      // envInt 1.1 is tuned for the case set).
      scene.traverse((obj) => {
        const mesh = obj as { material?: unknown };
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m instanceof MeshStandardMaterial) m.envMapIntensity = 0.9;
        }
      });
      wrapper.add(scene);
      return { spec, wrapper, loaded: true };
    } catch (error: unknown) {
      console.warn(
        `disassembly: internals "${spec.name}" failed (${String(error)}) — contract-named stub keeps the slot`,
      );
      return { spec, wrapper, loaded: false };
    }
  });

  try {
    return await Promise.all(jobs);
  } finally {
    ktx2.dispose(); // worker teardown; decoded textures unaffected
  }
}
