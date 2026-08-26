/**
 * DialRenderer — the live watchface as ONE module (PLAN §3 "dial
 * subsystem: one canvas-renderer module consumed by hero / Details /
 * Nocturne / loader match-cut").
 *
 * Contract:
 *   - Offscreen canvas at the Ultra 3 display aspect (422×514), ≥2× logical
 *     pixels, long side capped 1024 device px. SRGB.
 *   - Layered draw: cached static face layer (per mode) → hot complication
 *     → date → hands. Composited into the texture canvas ONLY when the
 *     dirty key changes (hand angles quantized, mode, complication,
 *     quantized vitals) — NEVER per frame. `stats().uploads` vs
 *     `stats().frames` is the machine-checkable proof.
 *   - `texture` is a THREE.CanvasTexture; `needsUpdate` is set exactly once
 *     per redraw. Wire it with `createDialScreenMaterial` (toneMapped=false
 *     so the display stays luminous under ACES — PLAN §3). When mapping
 *     onto a GLB screen mesh, set `dial.texture.flipY = false` BEFORE the
 *     first render (glTF UV convention).
 *   - Modes: "active" (full luminance) / "aod" (dim, reduced elements, 1 Hz
 *     tick on wall-clock seconds — the Nocturne organ, PLAN §2).
 *   - `setComplication("depth" | "heartRate" | "compass")` hot-swaps the
 *     sub-dial (Details hover-swap). `applyDialToken` bridges the
 *     StateStore `dialMode` axis tokens (core/state.ts).
 *   - Seconds hand: geared `{clockScalar, scrollVelocity}` input — sweeps
 *     with the (Lenis-smoothed) scroll, ticks 1/s at rest, frozen at
 *     10:09:30 in eval mode (gear.ts).
 *
 * Determinism: all time/data reads go through core/determinism.ts
 * (`wallSeconds`, `bpm`, `calendarDay`) — under `?eval=1` the whole face is
 * a pure function of its inputs and repaints exactly once.
 *
 * Engine wiring (consumers):
 *   engine.onFrame((_, dt) =>
 *     dial.update({ clockScalar: getClock(), scrollVelocity: engine.lenis.velocity }, dt));
 */

import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";
import { bpm, calendarDay, wallSeconds } from "../core/determinism";
import {
  DEFAULT_VITALS,
  paintComplication,
  type DialVitals,
} from "./complications";
import { paintFace, paintGlass, polar } from "./face";
import { resolveDialFont, setDialFont, type ResolvedDialFont } from "./font";
import { GearedSeconds, type DialGear } from "./gear";
import {
  DIAL_ASPECT,
  DIAL_LOGICAL_HEIGHT,
  DIAL_MIN_SCALE,
  DIAL_PX_CAP,
  GRID,
  PALETTE,
  SECONDS_DRAW_EPS,
  type ComplicationId,
  type DialMode,
} from "./spec";

export type { ComplicationId, DialMode } from "./spec";
export type { DialGear } from "./gear";
export type { DialVitals } from "./complications";

/** Dirty-flag instrumentation — uploads must stay ≪ frames at rest. */
export interface DialStats {
  frames: number;
  uploads: number;
  width: number;
  height: number;
  fontName: string;
  mode: DialMode;
  complication: ComplicationId;
  /** Displayed seconds (fractional) — eval mode pins this to 30. */
  seconds: number;
  /** Quantized heart rate currently painted — eval mode pins this to 64. */
  bpm: number;
  /** Active accent token (biosignal red; Nocturne variant in AOD). */
  accent: string;
}

export class DialRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly texture: CanvasTexture;
  readonly font: ResolvedDialFont;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly faceLayer: HTMLCanvasElement;
  private readonly faceCtx: CanvasRenderingContext2D;
  private faceMode: DialMode | null = null;
  /** Prebaked Liquid Glass sprite (PLAN §3) — cached like the face layer. */
  private readonly glassLayer: HTMLCanvasElement;
  private readonly glassCtx: CanvasRenderingContext2D;
  private glassMode: DialMode | null = null;

  private mode: DialMode = "active";
  private complication: ComplicationId = "heartRate";
  /** Colorway accent override (P3 swap — second hand + axle pin; null =
   *  the palette's authored biosignal). AOD drops the seconds hand, so the
   *  override only ever paints in active mode — the §5 AOD grammar holds. */
  private accentOverride: string | null = null;
  private vitals: DialVitals = { ...DEFAULT_VITALS };
  private readonly gearbox = new GearedSeconds();

  private lastKey = "";
  private lastSeconds = 0;
  private frames = 0;
  private uploads = 0;

  constructor(logicalHeight: number = DIAL_LOGICAL_HEIGHT) {
    const scale = Math.max(DIAL_MIN_SCALE, Math.min(window.devicePixelRatio || 1, 3));
    const h = Math.min(DIAL_PX_CAP, Math.round(logicalHeight * scale));
    const w = Math.round(h * (DIAL_ASPECT.w / DIAL_ASPECT.h));

    this.canvas = document.createElement("canvas");
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = must2d(this.canvas);

    this.faceLayer = document.createElement("canvas");
    this.faceLayer.width = w;
    this.faceLayer.height = h;
    this.faceCtx = must2d(this.faceLayer);

    this.glassLayer = document.createElement("canvas");
    this.glassLayer.width = w;
    this.glassLayer.height = h;
    this.glassCtx = must2d(this.glassLayer);

    this.font = resolveDialFont();

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
  }

  /* ---- controls ----------------------------------------------------------- */

  setMode(mode: DialMode): void {
    this.mode = mode; // dirty key picks the change up next update()
  }

  setComplication(id: ComplicationId): void {
    this.complication = id;
  }

  /**
   * Colorway accent (P3 swap — CONFIG_CHANGE consumer). Repaints the
   * second hand + axle pin in the config's tempered biosignal; the face
   * layer (cardinal N marker) keeps the authored palette. The boot config's
   * accent equals the palette value, so nothing regrades at rest.
   */
  setAccent(accent: string): void {
    if (accent === this.accentOverride) return;
    this.accentOverride = accent;
    this.lastKey = ""; // force a repaint + upload on the next update()
  }

  /**
   * Feed live data (P3 mechanics). Values are quantized here so they
   * participate in the dirty key without per-frame churn: bpm → 1, depth →
   * 0.1 m, heading → 1°. Heart rate passes through determinism `bpm()` so
   * eval captures pin at 64.
   */
  setVitals(partial: Partial<DialVitals>): void {
    const next = { ...this.vitals, ...partial };
    this.vitals = {
      bpm: Math.round(bpm(next.bpm)),
      depthMeters: Math.round(next.depthMeters * 10) / 10,
      headingDeg: Math.round(((next.headingDeg % 360) + 360) % 360),
    };
  }

  /**
   * Bridge from the StateStore `dialMode` axis (core/state.ts tokens:
   * "wayfinder" | "aod" | "depth" | "heart" | "compass"). Sections apply
   * store partials; something (P2/P3 glue) forwards the token here.
   */
  applyDialToken(token: string): void {
    switch (token) {
      case "aod":
        this.setMode("aod");
        break;
      case "depth":
      case "compass":
        this.setMode("active");
        this.setComplication(token);
        break;
      case "heart":
      case "heartRate":
        this.setMode("active");
        this.setComplication("heartRate");
        break;
      default: // "wayfinder" — the default face
        this.setMode("active");
        break;
    }
  }

  /* ---- frame -------------------------------------------------------------- */

  /**
   * Call once per engine frame. Cheap when clean: computes the dirty key
   * and returns. Repaints + uploads ONLY when the key changed.
   * dt in seconds (0 during eval settleSync — gear snaps).
   */
  update(gear: DialGear, dt: number): void {
    this.frames++;
    const wall = wallSeconds();

    // AOD ticks on wall-clock seconds ONLY — the one moment the watch
    // itself moves on real time (PLAN §2 Nocturne). Active mode is geared.
    const seconds =
      this.mode === "aod" ? Math.floor(wall) % 60 : this.gearbox.update(gear, dt);
    this.lastSeconds = seconds;

    const key = [
      this.mode,
      this.complication,
      `${this.vitals.bpm}/${this.vitals.depthMeters}/${this.vitals.headingDeg}`,
      Math.round(seconds / SECONDS_DRAW_EPS),
      Math.floor(wall), // hour/minute hands move on whole seconds
    ].join("|");

    if (key === this.lastKey) return;
    this.lastKey = key;
    this.composite(wall, seconds);
    this.texture.needsUpdate = true;
    this.uploads++;
  }

  stats(): DialStats {
    return {
      frames: this.frames,
      uploads: this.uploads,
      width: this.canvas.width,
      height: this.canvas.height,
      fontName: this.font.name,
      mode: this.mode,
      complication: this.complication,
      seconds: this.lastSeconds,
      bpm: this.vitals.bpm,
      accent: this.accentOverride ?? PALETTE[this.mode].accent,
    };
  }

  dispose(): void {
    this.texture.dispose();
  }

  /* ---- painting ------------------------------------------------------------ */

  private composite(wall: number, seconds: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    if (this.faceMode !== this.mode) {
      paintFace(this.faceCtx, w, h, this.mode, this.font);
      this.faceMode = this.mode;
    }
    if (this.glassMode !== this.mode) {
      paintGlass(this.glassCtx, w, h, this.mode);
      this.glassMode = this.mode;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.faceLayer, 0, 0);
    paintComplication(ctx, w, h, this.complication, this.mode, this.font, this.vitals);
    this.paintDate(w, h);
    this.paintHands(w, h, wall, seconds);
    // Crystal LAST — the glass physically sits above the hands (depth pass).
    ctx.drawImage(this.glassLayer, 0, 0);
  }

  /** Date as a hairline capsule pill under 12 (native watchOS slot). */
  private paintDate(w: number, h: number): void {
    const pal = PALETTE[this.mode];
    const R = w / 2;
    const { weekday, day } = calendarDay();
    const text = `${weekday} ${day}`;
    const x = w / 2;
    const y = h / 2 + GRID.date.y * R;
    setDialFont(this.ctx, this.font, R * GRID.date.size, 600, "0.04em");
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    if (this.mode === "active") {
      const tw = this.ctx.measureText(text).width;
      const ph = R * (GRID.date.size + GRID.date.padY * 2);
      const pw = tw + R * GRID.date.padX * 2;
      const r = ph / 2;
      this.ctx.strokeStyle = pal.faint;
      this.ctx.lineWidth = R * 0.006;
      this.ctx.beginPath();
      this.ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, r);
      this.ctx.stroke();
    }
    this.ctx.fillStyle = pal.dim;
    this.ctx.fillText(text, x, y);
  }

  private paintHands(w: number, h: number, wall: number, seconds: number): void {
    const pal = PALETTE[this.mode];
    const accent = this.accentOverride ?? pal.accent;
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;
    const R = w / 2;
    const { hands } = GRID;
    const aod = this.mode === "aod";

    const minutes = (wall / 60) % 60;
    const hours = (wall / 3600) % 12;
    const hourDeg = hours * 30;
    const minuteDeg = minutes * 6;
    const secondDeg = seconds * 6;

    // Shadow pass — every stroke below casts onto the face (depth illusion;
    // canvas shadows cost only at redraw time, dirty economics untouched).
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${aod ? 0.35 : hands.shadow.alpha})`;
    ctx.shadowBlur = R * hands.shadow.blur;
    ctx.shadowOffsetY = R * hands.shadow.dy;

    for (const [spec, deg] of [
      [hands.hour, hourDeg],
      [hands.minute, minuteDeg],
    ] as const) {
      if (aod) {
        // AOD hollows its hands (native watchOS AOD grammar): rim only.
        this.baton(cx, cy, deg, spec.stem, spec.len, spec.w, pal.fg);
        this.baton(
          cx,
          cy,
          deg,
          spec.stem + 0.015,
          spec.len - 0.015,
          spec.w - hands.aodRim * 2,
          pal.bg,
        );
      } else {
        // Outlined baton with a dark stem near the pivot (LOOKBIBLE §5
        // tune 3): ink outline over the full run separates the hand from
        // anything below; the narrower metal stem sits inside it; the lume
        // baton starts past the stem — never solid white to the hub.
        const stemEnd = spec.stem + hands.stemDark.len;
        this.baton(cx, cy, deg, spec.stem, spec.len, spec.w + spec.outline * 2, pal.bg);
        this.baton(cx, cy, deg, spec.stem, stemEnd, spec.w * hands.stemDark.wScale, pal.handStem);
        this.baton(cx, cy, deg, stemEnd, spec.len, spec.w, pal.fg);
      }
    }

    // Seconds — biosignal red hairline + counterweight ball (1 Hz organ).
    // AOD drops the seconds hand entirely (LOOKBIBLE §5 tune 1 — real
    // watchOS AOD grammar); the dirty key still ticks 1/s for the minute step.
    if (!aod) {
      this.baton(cx, cy, secondDeg, -hands.second.tail, hands.second.len, hands.second.w, accent);
      const ball = polar(cx, cy, R * hands.second.tail, secondDeg + 180);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R * hands.second.ballR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hub: white collar → ink gap → red pin (seconds axle). With the AOD
    // seconds hand dropped (tune 1), the red axle pin goes with it.
    ctx.fillStyle = pal.fg;
    ctx.beginPath();
    ctx.arc(cx, cy, R * hands.hubR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore(); // shadows off for the flat pin
    ctx.fillStyle = pal.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, R * hands.hubR * 0.62, 0, Math.PI * 2);
    ctx.fill();
    if (!aod) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, R * hands.hubR * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** One hand as a round-capped baton from tail×R to len×R along `deg`. */
  private baton(
    cx: number,
    cy: number,
    deg: number,
    tail: number,
    len: number,
    width: number,
    color: string,
  ): void {
    const R = this.canvas.width / 2;
    const a = polar(cx, cy, R * tail, deg);
    const b = polar(cx, cy, R * len, deg);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = R * width;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }
}

/**
 * Screen material for the hero GLB / Details / Nocturne consumers:
 * unlit + toneMapped=false so the emissive display stays luminous under
 * ACES (PLAN §3 dial subsystem). Transparent — the canvas corners outside
 * the rounded display rect are alpha 0, so the glass mask stays clean.
 */
export function createDialScreenMaterial(dial: DialRenderer): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map: dial.texture, transparent: true });
  material.toneMapped = false;
  return material;
}

function must2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("DialRenderer: 2d context unavailable");
  return ctx;
}
