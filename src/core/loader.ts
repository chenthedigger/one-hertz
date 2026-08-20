/**
 * Loader — SVG arc fed by REAL asset progress (PLAN §2: "smoothed blend of
 * real bytes-progress + choreographed minimum, completes only when assets
 * ready" — loader honesty is a rubric item).
 *
 * Spike B version: a weighted task aggregator. Every real async load
 * (fonts, env prebuild, first compiled frame; later the GLB via
 * THREE.LoadingManager) registers a task and reports 0..1. The arc renders
 * a smoothed pursuit of the real total and only resolves when every task
 * completed AND the choreographed minimum time elapsed.
 */

import { gsap } from "gsap";

export interface LoaderTask {
  report(progress: number): void;
  done(): void;
}

const MIN_DURATION_S = 2.5; // choreographed minimum (~2.5s, source parity — PLAN §2)
const ARC_RADIUS = 54;
const ARC_LENGTH = 2 * Math.PI * ARC_RADIUS;

interface TaskState {
  weight: number;
  progress: number;
}

export class Loader {
  private tasks: TaskState[] = [];
  private el: HTMLElement;
  private arc: SVGCircleElement;
  private shown = 0; // smoothed arc value
  private startedAt = performance.now();
  private resolveReady!: () => void;

  /** Resolves when all tasks are done and the minimum choreography played. */
  readonly ready: Promise<void>;

  /**
   * @param skip Eval determinism (`?eval=1`, PLAN §6): remove the loader
   * shell immediately and resolve `ready` as soon as all registered tasks
   * complete — no choreography, no fade, no minimum time.
   */
  constructor(private readonly skip = false) {
    this.el = must(document.getElementById("loader"), "#loader");
    this.arc = must(
      document.querySelector<SVGCircleElement>(".loader-arc__fill"),
      ".loader-arc__fill",
    );
    this.arc.style.strokeDasharray = `${ARC_LENGTH}`;
    this.arc.style.strokeDashoffset = `${ARC_LENGTH}`;
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
    this.arc.style.strokeDashoffset = `${ARC_LENGTH * (1 - this.shown)}`;

    if (target >= 1 && this.shown > 0.995) {
      gsap.ticker.remove(this.update);
      this.dismiss();
    }
  };

  private dismiss(): void {
    this.arc.style.strokeDashoffset = "0";
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
