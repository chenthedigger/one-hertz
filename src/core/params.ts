/**
 * Debug / deep-link query params — parsed ONCE at boot, exposed as a frozen
 * typed object (PLAN §1 debug params + §6 eval transport):
 *
 *   ?scroll=<sectionName>          jump to a section after load
 *   ?autoscroll                    scripted full-page scroll after load
 *   ?autoscrollspeed=<px/s>        override autoscroll velocity
 *   ?materials                     open the materials inspector stub
 *   ?eval=1                        determinism kit: seeded RNG, dial frozen
 *                                  10:09:30, BPM 64, ECG phase 0, loader
 *                                  skipped, idle motion frozen, gotoSection
 *                                  settles synchronously
 *   ?solo=<sectionName>            section sandbox: mount ONLY that section
 *                                  with its requiredEnterState stubbed in
 *   ?dial=1                        dial look-dev: mount the watchface
 *                                  canvas 1:1 INSTEAD of the engine boot
 *                                  (src/dial/preview.ts; combine with
 *                                  ?eval=1 for the frozen 10:09:30 face)
 *   ?look=<name>                   look config: fetch
 *                                  /assets/looks/<name>.json and hot-apply
 *                                  env + light rig + post tune + bg tokens +
 *                                  material overrides (src/gl/look.ts).
 *                                  Absent = built-in DEFAULT_LOOK (the
 *                                  current TEMP studio look).
 */

import { isSectionName, type SectionName } from "./constants";

export interface EngineParams {
  /** Deep link: section to jump to once the loader resolves. */
  readonly scroll: SectionName | null;
  /** Scripted fixed-velocity scroll after load. */
  readonly autoscroll: boolean;
  /** Autoscroll velocity override, px/s (null = full page in ~60s). */
  readonly autoscrollSpeed: number | null;
  /** Materials inspector stub. */
  readonly materials: boolean;
  /** Eval determinism mode (PLAN §6). */
  readonly eval: boolean;
  /** Section sandbox: run one section standalone with stubbed enter-state. */
  readonly solo: SectionName | null;
  /** Dial subsystem look-dev page (mounts instead of the engine boot). */
  readonly dial: boolean;
  /** Look config name (`/assets/looks/<name>.json`); null = built-in default. */
  readonly look: string | null;
}

function parse(search: string): EngineParams {
  const q = new URLSearchParams(search);

  const asSection = (v: string | null): SectionName | null =>
    v !== null && isSectionName(v) ? v : null;

  const speedRaw = q.get("autoscrollspeed");
  const speed = speedRaw !== null ? Number(speedRaw) : NaN;

  return Object.freeze({
    scroll: asSection(q.get("scroll")),
    autoscroll: q.has("autoscroll"),
    autoscrollSpeed: Number.isFinite(speed) && speed > 0 ? speed : null,
    materials: q.has("materials"),
    eval: q.get("eval") === "1" || q.get("eval") === "true",
    solo: asSection(q.get("solo")),
    dial: q.get("dial") === "1" || q.get("dial") === "true",
    look: sanitizeLookName(q.get("look")),
  });
}

/** Look names are file basenames — keep them path-safe. */
function sanitizeLookName(raw: string | null): string | null {
  if (raw === null) return null;
  return /^[a-z0-9][a-z0-9_-]*$/i.test(raw) ? raw : null;
}

/** The one parsed instance — import this everywhere. */
export const params: EngineParams = parse(window.location.search);
