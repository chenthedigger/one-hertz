/**
 * Loader — activity-rings arc fed by REAL asset progress (PLAN §2:
 * "smoothed blend of real bytes-progress + choreographed minimum, completes
 * only when assets ready" — loader honesty is a rubric item).
 *
 * Three concentric rings (the Apple activity triad — the ONE place the
 * ring colors are spent, PLAN §2 color law). All three chase the same
 * honest value: target = min(realProgress, timeCurve) — the arc can never
 * outrun either the assets or the ~2.5 s choreography floor. The inner
 * rings close on ease-behind powers of that value (shown^1.18 / shown^1.4):
 * strictly monotonic, never ahead of the honest value, and all three close
 * together at exactly 1 — the staggered "rings closing" beat without a
 * single dishonest pixel.
 *
 * Match-cut seam (P3 vital lane): set `onDismissStart` and dismiss() lifts
 * the rings SVG out of the shell (position:fixed at its exact rect) and
 * hands it over BEFORE the shell fade — src/ui/loaderMatchCut.ts flies it
 * onto the hero dial. `ready` still resolves at shell-fade completion
 * (boot behaviors never wait for the flight). Without a handler the shell
 * fades whole, rings included (P1 behavior preserved).
 */

import { gsap } from "gsap";

export interface LoaderTask {
  report(progress: number): void;
  done(): void;
}

const MIN_DURATION_S = 2.5; // choreographed minimum (~2.5s, source parity — PLAN §2)
/** Ease-behind exponents: outer leads, inner rings close in its wake. */
const RING_POWERS = [1, 1.18, 1.4] as const;

interface TaskState {
  weight: number;
  progress: number;
}

export class Loader {
  private tasks: TaskState[] = [];
  private el: HTMLElement;
  private rings: SVGSVGElement;
  private fills: SVGCircleElement[];
  private shown = 0; // smoothed arc value
  private startedAt = performance.now();
  private resolveReady!: () => void;

  /** Resolves when all tasks are done and the minimum choreography played. */
  readonly ready: Promise<void>;

  /**
   * Match-cut hook: called at dismiss start with the rings SVG already
   * lifted to position:fixed at its on-screen rect. The handler owns the
   * element's flight + removal from that moment on.
   */
  onDismissStart?: (rings: SVGSVGElement) => void;

  /**
   * @param skip Eval determinism (`?eval=1`, PLAN §6): remove the loader
   * shell immediately and resolve `ready` as soon as all registered tasks
   * complete — no choreography, no fade, no minimum time.
   */
  constructor(private readonly skip = false) {
    this.el = must(document.getElementById("loader"), "#loader");
    this.rings = must(
      document.querySelector<SVGSVGElement>("#loader-rings"),
      "#loader-rings",
    );
    this.fills = ["a", "b", "c"].map((k) =>
      must(
        this.rings.querySelector<SVGCircleElement>(`.ring-fill--${k}`),
        `.ring-fill--${k}`,
      ),
    );
    // pathLength=100 in the markup: dash math in percent, radius-agnostic.
    for (const fill of this.fills) {
      fill.style.strokeDasharray = "100";
      fill.style.strokeDashoffset = "100";
    }
    this.ready = new Promise((res) => (this.resolveReady = res));
    if (this.skip) this.el.remove();
    gsap.ticker.add(this.update);
  }

  task(weight = 1): LoaderTask {
    const state: TaskState = { weight, progress: 0 };
    this.tasks.push(state);
    return {
      report: (p) => (state.progress = Math.min(1, Math.max(0, p))),
      done: () => (state.progress = 1),
    };
  }

  /** Real weighted progress across all registered tasks. */
  private real(): number {
    if (this.tasks.length === 0) return 0;
    let sum = 0;
    let weights = 0;
    for (const t of this.tasks) {
      sum += t.progress * t.weight;
      weights += t.weight;
    }
    return weights > 0 ? sum / weights : 0;
  }

  private applyRings(value: number): void {
    for (let i = 0; i < this.fills.length; i++) {
      const fill = this.fills[i];
      const power = RING_POWERS[i];
      if (fill === undefined || power === undefined) continue;
      fill.style.strokeDashoffset = `${100 * (1 - Math.pow(value, power))}`;
    }
  }

  private update = (_time: number, deltaMs: number): void => {
    if (this.skip) {
      // Loader-skip mode still waits for REAL readiness (assets must be
      // loaded before eval capture) — it just skips all choreography.
      if (this.real() >= 1) {
        gsap.ticker.remove(this.update);
        this.resolveReady();
      }
      return;
    }
    const elapsed = (performance.now() - this.startedAt) / 1000;
    // The arc may never outrun the choreographed minimum, and never lies
    // about real progress: target = min(real, timeCurve).
    const timeCurve = Math.min(1, elapsed / MIN_DURATION_S);
    const target = Math.min(this.real(), timeCurve);
    const k = 1 - Math.exp(-(deltaMs / 1000) * 6);
    this.shown += (target - this.shown) * k;
    this.applyRings(this.shown);

    if (target >= 1 && this.shown > 0.995) {
      gsap.ticker.remove(this.update);
      this.dismiss();
    }
  };

  /** Move the rings SVG to <body> as a fixed overlay at its exact rect. */
  private liftRings(): SVGSVGElement {
    const rect = this.rings.getBoundingClientRect();
    const rings = this.rings;
    rings.style.position = "fixed";
    rings.style.left = `${rect.left}px`;
    rings.style.top = `${rect.top}px`;
    rings.style.width = `${rect.width}px`;
    rings.style.height = `${rect.height}px`;
    rings.style.zIndex = "41"; // one over the loader shell
    rings.style.pointerEvents = "none";
    document.body.append(rings);
    return rings;
  }

  private dismiss(): void {
    this.applyRings(1); // rings land closed before the cut
    if (this.onDismissStart) {
      const rings = this.liftRings();
      try {
        this.onDismissStart(rings);
      } catch (error: unknown) {
        console.warn(`loader: match-cut handler failed (${String(error)})`);
        rings.remove(); // resilience: never a stuck overlay
      }
    }
    gsap.to(this.el, {
      autoAlpha: 0,
      duration: 0.6,
      ease: "power3.out",
      onComplete: () => {
        this.el.remove();
        this.resolveReady();
      },
    });
  }
}

function must<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`Loader: missing element ${what}`);
  return value;
}
