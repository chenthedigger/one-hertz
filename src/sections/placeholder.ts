/**
 * Placeholder section — holds a canonical track open until its P2 build
 * lands. Declares NO state requirements and NO guarantees (contract-
 * neutral: continuity folds straight through), renders a live dual-channel
 * progress readout, and marks itself `.is-center` while it owns the
 * viewport center line (lifecycle sanity you can see).
 */

import type { SectionName } from "../core/constants";
import { SectionBase, type ScrollDirection } from "../core/section";

export class PlaceholderSection extends SectionBase {
  private readonly domReadout: HTMLElement | null;
  private readonly webglReadout: HTMLElement | null;
  private lastDom = "";
  private lastWebgl = "";

  constructor(name: SectionName) {
    super({ name });
    this.domReadout = this.element.querySelector<HTMLElement>("[data-readout-dom]");
    this.webglReadout = this.element.querySelector<HTMLElement>("[data-readout-webgl]");
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);
    if (this.domReadout) {
      const text = progress.toFixed(2);
      if (text !== this.lastDom) {
        this.lastDom = text;
        this.domReadout.textContent = text;
      }
    }
  }

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress);
    if (this.webglReadout) {
      const text = progress.toFixed(2);
      if (text !== this.lastWebgl) {
        this.lastWebgl = text;
        this.webglReadout.textContent = text;
      }
    }
  }

  override onEnterCenter(_direction: ScrollDirection): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(_direction: ScrollDirection): void {
    this.element.classList.remove("is-center");
  }
}
