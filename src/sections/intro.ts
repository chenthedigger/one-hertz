/**
 * Intro — unpinned 100svh hero. DOM channel only, expressed as a PAUSED
 * GSAP timeline through `timelineAdapter` (the canonical scrub-adapter
 * pattern P2 sections should copy).
 *
 * Raw-bounds grammar for the FIRST unpinned section: progress runs
 * [0 → top+height], i.e. 0 at page top, 1 when the hero has fully scrolled
 * past — front-load copy (Spike B feel note: the hint dies by p≈0.25).
 */

import { gsap } from "gsap";
import { SectionBase, timelineAdapter } from "../core/section";

export class IntroSection extends SectionBase {
  constructor() {
    super({
      name: "Intro",
      // State contract: the Intro consumes the page-load defaults and
      // changes nothing — it guarantees exactly what it received.
      requiredEnterState: { camera: "intro-hero", explode: "assembled" },
      guaranteedExitState: {},
    });

    const inner = this.element.querySelector<HTMLElement>(".hero");
    const hint = this.element.querySelector<HTMLElement>(".hero__hint");

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    if (hint) {
      // The hint dies first — it has done its job (gone by p=0.25).
      tl.to(hint, { opacity: 0, duration: 0.25 }, 0);
    }
    if (inner) {
      tl.to(inner, { opacity: 0, duration: 0.625 }, 0); // gone by p=0.625
      tl.to(inner, { yPercent: -30, duration: 1 }, 0); // recedes across the range
    }
    this.addDomAdapter(timelineAdapter(tl));
  }
}
