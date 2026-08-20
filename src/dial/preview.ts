/**
 * Dial look-dev preview — `?dial=1` (task spec: standalone page rendering
 * the canvas 1:1 for look-dev; P1.5's dial look-lock judges THIS page).
 *
 * Mounted INSTEAD of the engine boot (main.ts routes before boot()):
 * removes the loader/stage/app shells and shows the DialRenderer canvas at
 * device-pixel-exact size on an ink plinth, with controls:
 *
 *   wheel        synthetic geared scroll (velocity decays; clockScalar
 *                accumulates) — exercises the sweep↔tick regimes
 *   1 / 2 / 3    complication: depth / heartRate / compass
 *   A            toggle active ↔ AOD
 *
 * The header readout shows uploads/frames — live proof of the dirty-flag
 * contract (uploads ≈ 1/s at rest, never ≈ frames). `?dial=1&eval=1`
 * freezes the face at 10:09:30 (uploads stays at 1).
 *
 * Debug handle: `window.__ONE_HERTZ_DIAL__` (additive; separate from the
 * frozen __ONE_HERTZ__ schema).
 */

import { isEvalMode } from "../core/determinism";
import { DialRenderer, type ComplicationId, type DialMode, type DialStats } from "./renderer";

export interface OneHertzDialDebug {
  setMode(mode: DialMode): void;
  setComplication(id: ComplicationId): void;
  stats(): DialStats;
}

declare global {
  interface Window {
    __ONE_HERTZ_DIAL__?: OneHertzDialDebug;
  }
}

const COMPLICATIONS: ComplicationId[] = ["depth", "heartRate", "compass"];

export function mountDialPreview(): void {
  for (const id of ["loader", "stage", "app"]) document.getElementById(id)?.remove();
  document.title = "ONE HERTZ · dial";

  const dial = new DialRenderer();

  const root = document.createElement("div");
  root.id = "dial-preview";
  // Static markup only — no dynamic values interpolated.
  root.innerHTML = `
    <header class="dp__head">
      <p class="dp__title">DIAL · look-dev</p>
      <p class="dp__meta">
        font <span data-dp="font"></span> ·
        canvas <span data-dp="size"></span> ·
        uploads <span data-dp="uploads"></span>
      </p>
    </header>
    <div class="dp__stage"></div>
    <div class="dp__controls">
      <div class="dp__group" data-group="mode">
        <button class="dp__btn is-active" data-mode="active">active</button>
        <button class="dp__btn" data-mode="aod">aod</button>
      </div>
      <div class="dp__group" data-group="comp">
        <button class="dp__btn" data-comp="depth">depth</button>
        <button class="dp__btn is-active" data-comp="heartRate">heart rate</button>
        <button class="dp__btn" data-comp="compass">compass</button>
      </div>
    </div>
    <p class="dp__readout">
      mode <span data-dp="state"></span> ·
      sec <span data-dp="sec"></span> ·
      vel <span data-dp="vel"></span> ·
      clock <span data-dp="clock"></span>
    </p>
    <p class="dp__hint">wheel = geared sweep · 1/2/3 complication · A = AOD</p>
  `;
  document.body.appendChild(root);

  // 1:1 — device-pixel exact.
  const dpr = window.devicePixelRatio || 1;
  dial.canvas.style.width = `${dial.canvas.width / dpr}px`;
  dial.canvas.style.height = `${dial.canvas.height / dpr}px`;
  root.querySelector(".dp__stage")?.appendChild(dial.canvas);

  const out = (name: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-dp="${name}"]`);
  const setText = (name: string, text: string): void => {
    const el = out(name);
    if (el && el.textContent !== text) el.textContent = text;
  };
  setText("font", dial.font.name);
  setText("size", `${dial.canvas.width}×${dial.canvas.height}`);

  /* ---- controls ------------------------------------------------------------ */

  const markActive = (group: string, attr: string, value: string): void => {
    for (const b of root.querySelectorAll<HTMLElement>(`[data-group="${group}"] .dp__btn`)) {
      b.classList.toggle("is-active", b.dataset[attr] === value);
    }
  };
  const setMode = (mode: DialMode): void => {
    dial.setMode(mode);
    markActive("mode", "mode", mode);
  };
  const setComp = (id: ComplicationId): void => {
    dial.setComplication(id);
    markActive("comp", "comp", id);
  };

  root.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".dp__btn");
    if (!btn) return;
    const mode = btn.dataset["mode"] as DialMode | undefined;
    const comp = btn.dataset["comp"] as ComplicationId | undefined;
    if (mode) setMode(mode);
    if (comp) setComp(comp);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "a" || e.key === "A") {
      setMode(dial.stats().mode === "aod" ? "active" : "aod");
      return;
    }
    const idx = Number(e.key) - 1;
    const comp = COMPLICATIONS[idx];
    if (comp) setComp(comp);
  });

  /* ---- synthetic geared scroll (no Lenis here — look-dev only) ------------- */

  let velocityPxS = 0; // px/s, decays toward 0
  let clockScalar = 0; // fake page progress 0..1
  let simBpm = 58;
  const FAKE_PAGE_PX = 40000;

  window.addEventListener(
    "wheel",
    (e) => {
      velocityPxS += e.deltaY * 6;
    },
    { passive: true },
  );

  /* ---- loop ----------------------------------------------------------------- */

  let last = performance.now();
  let readoutAt = 0;

  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    velocityPxS *= Math.exp(-dt * 3);
    if (Math.abs(velocityPxS) < 1) velocityPxS = 0;
    clockScalar = Math.min(1, Math.max(0, clockScalar + (velocityPxS * dt) / FAKE_PAGE_PX));

    // Living-BPM sketch: simulated HR follows scroll energy 58↔142 (PLAN §2);
    // eval mode pins it to 64 inside setVitals.
    const bpmTarget = 58 + Math.min(1, Math.abs(velocityPxS) / 3000) * 84;
    simBpm += (bpmTarget - simBpm) * (1 - Math.exp(-dt * 1.5));
    dial.setVitals({ bpm: simBpm });

    // lenis.velocity is px/frame — approximate at 60fps.
    dial.update({ clockScalar, scrollVelocity: velocityPxS / 60 }, dt);

    if (now >= readoutAt) {
      readoutAt = now + 250;
      const s = dial.stats();
      setText("uploads", `${s.uploads}/${s.frames}`);
      setText("state", `${s.mode} · ${s.complication}${isEvalMode ? " · eval" : ""}`);
      setText("sec", s.seconds.toFixed(2));
      setText("vel", `${Math.round(velocityPxS)}px/s`);
      setText("clock", clockScalar.toFixed(4));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.__ONE_HERTZ_DIAL__ = {
    setMode,
    setComplication: setComp,
    stats: () => dial.stats(),
  };
}
