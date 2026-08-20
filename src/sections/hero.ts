/**
 * Hero section — unpinned 100svh intro. DOM channel only: the title block
 * recedes as the reader commits to the scroll.
 */

import type { Section } from "../core/registry";
import { SectionRegistry, sectionDuration } from "../core/registry";

export function createHeroSection(): Section {
  const element = SectionRegistry.findElement("hero");
  const inner = element.querySelector<HTMLElement>(".hero");
  const hint = element.querySelector<HTMLElement>(".hero__hint");

  return {
    name: "hero",
    duration: sectionDuration("hero"),
    element,
    tick(progress: number): void {
      if (inner) {
        const fade = Math.min(1, progress * 1.6);
        inner.style.opacity = String(1 - fade);
        inner.style.transform = `translate3d(0, ${-progress * 8}vh, 0)`;
      }
      if (hint) {
        // The hint dies first — it has done its job.
        hint.style.opacity = String(Math.max(0, 1 - progress * 4));
      }
    },
  };
}
