/**
 * `window.__ONE_HERTZ__` — debug + eval transport API (PLAN §5 P1 spec,
 * stubbed at Spike B). The eval harness addresses frames as
 * (sectionId, localProgress) through gotoSection; state() is the substrate
 * for structural assertions.
 */

import type { SectionName } from "./constants";
import { freezeClock, getClock } from "./clock";
import type { SectionRegistry } from "./registry";
import type { ScrollEngine } from "./scroll";
import type { Stage } from "../webgl/stage";

export interface OneHertzDebugApi {
  /** Section manifest: name, vh duration, absolute top, scrub range, live progress. */
  sections: ReturnType<SectionRegistry["manifest"]>;
  /** Jump to (sectionId, localProgress 0..1). Immediate — eval transport. */
  gotoSection(id: SectionName, localProgress?: number): void;
  /** Structural state snapshot for assertions. */
  state(): {
    scroll: number;
    clock: number;
    qualityTier: number;
    sections: ReturnType<SectionRegistry["manifest"]>;
  };
  /** Freeze the clock scalar at a deterministic value (eval determinism). */
  freezeClock(seed: number): void;
  /** Force a quality tier (tiers shed post, never smoothness). */
  forceQualityTier(tier: number): void;
}

declare global {
  interface Window {
    __ONE_HERTZ__: OneHertzDebugApi;
  }
}

export function installDebugApi(
  registry: SectionRegistry,
  engine: ScrollEngine,
  stage: Stage,
): OneHertzDebugApi {
  const api: OneHertzDebugApi = {
    get sections() {
      return registry.manifest();
    },
    gotoSection(id, localProgress = 0) {
      engine.scrollTo(registry.scrollPositionFor(id, localProgress), true);
    },
    state() {
      return {
        scroll: engine.lenis.scroll,
        clock: getClock(),
        qualityTier: stage.tier,
        sections: registry.manifest(),
      };
    },
    freezeClock,
    forceQualityTier(tier) {
      stage.forceQualityTier(tier);
    },
  };
  window.__ONE_HERTZ__ = api;
  return api;
}
