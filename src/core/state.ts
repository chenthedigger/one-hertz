/**
 * Engine state contract (PLAN §3 "Section sandbox + state contract" — the
 * P1 gate before ANY P2 section work).
 *
 * Five axes describe everything a section may depend on from its
 * predecessors. Sections declare `requiredEnterState` (what they assume)
 * and `guaranteedExitState` (what they leave behind) as PARTIAL records —
 * an absent key means "don't care" / "unchanged". The registry folds exit
 * states over the canonical order and throws AT REGISTRATION if any
 * section's requirement contradicts what the previous sections guarantee
 * (contract continuity — broken handoffs fail at boot, not mid-scroll).
 *
 * Values are open string tokens on purpose: the vocabularies (camera pose
 * names, colorway ids, post-stack presets) belong to P1.5/P2 owners. The
 * contract only needs equality, plus the documented defaults below as the
 * page's initial state.
 */

export interface EngineStateContract {
  /** Named camera pose token, e.g. "intro-hero", "macro-crown". */
  camera: string;
  /** Explode rig state: "assembled" | "exploded" | "part-focus" (open set). */
  explode: string;
  /** Colorway/finish id, e.g. "natural-titanium". */
  colorway: string;
  /** Dial face mode: "wayfinder" | "aod" | "depth" | "heart" | "compass". */
  dialMode: string;
  /** Post-processing preset: "default" | "macro-dof" | "nocturne". */
  postStack: string;
}

export type StateKey = keyof EngineStateContract;
export type PartialState = Partial<Readonly<EngineStateContract>>;

export const STATE_KEYS: readonly StateKey[] = [
  "camera",
  "explode",
  "colorway",
  "dialMode",
  "postStack",
];

/** Page-load defaults — the enter-state of the first section. */
export const INITIAL_STATE: Readonly<EngineStateContract> = Object.freeze({
  camera: "intro-hero",
  explode: "assembled",
  colorway: "natural-titanium",
  dialMode: "wayfinder",
  postStack: "default",
});

/** Non-contract UI flags surfaced through `state().uiFlags`. */
export interface UiFlags {
  loaderDone: boolean;
  evalMode: boolean;
  autoscroll: boolean;
  materialsInspector: boolean;
  soloSection: string | null;
  soundOn: boolean;
}

/**
 * Live runtime store for the contract axes + UI flags. Sections and
 * mechanics mutate it through `apply`; `state()` snapshots read from it.
 * (This is runtime truth; the static contracts on sections are promises
 * ABOUT this store.)
 */
export class StateStore {
  private current: EngineStateContract = { ...INITIAL_STATE };
  readonly uiFlags: UiFlags;

  constructor(flags: Partial<UiFlags> = {}) {
    this.uiFlags = {
      loaderDone: false,
      evalMode: false,
      autoscroll: false,
      materialsInspector: false,
      soloSection: null,
      soundOn: false,
      ...flags,
    };
  }

  get(): Readonly<EngineStateContract> {
    return this.current;
  }

  /** Merge a partial state (e.g. a stubbed enter-state, a colorway swap). */
  apply(partial: PartialState): void {
    this.current = { ...this.current, ...partial };
  }

  snapshot(): EngineStateContract {
    return { ...this.current };
  }
}

/**
 * Fold `exit` over `carried`: keys the section guarantees overwrite the
 * carried value; everything else passes through unchanged.
 */
export function foldExitState(
  carried: Readonly<EngineStateContract>,
  exit: PartialState,
): EngineStateContract {
  return { ...carried, ...exit };
}

/**
 * Check `required` against `carried`. Returns the list of human-readable
 * conflicts (empty = compatible).
 */
export function contractConflicts(
  carried: Readonly<EngineStateContract>,
  required: PartialState,
): string[] {
  const conflicts: string[] = [];
  for (const key of STATE_KEYS) {
    const want = required[key];
    if (want !== undefined && want !== carried[key]) {
      conflicts.push(`${key}: requires "${want}" but predecessors leave "${carried[key]}"`);
    }
  }
  return conflicts;
}
