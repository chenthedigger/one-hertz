/**
 * Hot complication sub-dial — the slot the Details section hover-swaps
 * (PLAN §1 signature: "Details hover labels live-swap the dial
 * complication (depth gauge / heart rate / compass)").
 *
 * Painted per composite (cheap vector work); data arrives quantized via
 * DialRenderer.setVitals so it participates in the dirty key. Rough
 * layouts on the correct grid; P1.5 beautifies via spec.ts.
 */

import { setDialFont, type ResolvedDialFont } from "./font";
import { polar } from "./face";
import {
  DEPTH_GAUGE_MAX_M,
  GRID,
  PALETTE,
  type ComplicationId,
  type DialMode,
} from "./spec";

/** Live data feed (P3 mechanics own the writes; defaults are deterministic). */
export interface DialVitals {
  /** Heart rate, bpm — pass through core/determinism `bpm()` upstream. */
  bpm: number;
  /** Depth, meters (Ultra depth-gauge story, INTERNALS-REF §7). */
  depthMeters: number;
  /** Compass heading, degrees clockwise from north. */
  headingDeg: number;
}

export const DEFAULT_VITALS: Readonly<DialVitals> = Object.freeze({
  bpm: 64,
  depthMeters: 12.4,
  headingDeg: 328,
});

interface Slot {
  x: number;
  y: number;
  r: number;
}

function slotBase(ctx: CanvasRenderingContext2D, s: Slot, mode: DialMode): void {
  const pal = PALETTE[mode];
  ctx.fillStyle = "rgba(233, 233, 231, 0.04)";
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  if (mode === "active") ctx.fill();
  ctx.strokeStyle = pal.faint;
  ctx.lineWidth = s.r * 0.03;
  ctx.stroke();
}

function label(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  mode: DialMode,
  font: ResolvedDialFont,
  text: string,
): void {
  if (mode === "aod") return; // reduced elements
  setDialFont(ctx, font, s.r * 0.16, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE[mode].faint;
  ctx.fillText(text, s.x, s.y - s.r * 0.58);
}

function drawDepth(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  mode: DialMode,
  font: ResolvedDialFont,
  v: DialVitals,
): void {
  const pal = PALETTE[mode];
  const frac = Math.min(1, Math.max(0, v.depthMeters / DEPTH_GAUGE_MAX_M));
  const start = Math.PI * 0.75; // 270° gauge, gap at the bottom
  const gaugeR = s.r * 0.78;

  ctx.lineCap = "round";
  ctx.lineWidth = s.r * 0.09;
  ctx.strokeStyle = pal.faint;
  ctx.beginPath();
  ctx.arc(s.x, s.y, gaugeR, start, start + Math.PI * 1.5);
  ctx.stroke();
  if (mode === "active") {
    ctx.strokeStyle = pal.depth;
    ctx.beginPath();
    ctx.arc(s.x, s.y, gaugeR, start, start + Math.PI * 1.5 * frac);
    ctx.stroke();
  }

  setDialFont(ctx, font, s.r * 0.42, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = mode === "active" ? pal.fg : pal.dim;
  ctx.fillText(v.depthMeters.toFixed(1), s.x, s.y - s.r * 0.02);
  setDialFont(ctx, font, s.r * 0.18, 500);
  ctx.fillStyle = pal.depth;
  ctx.fillText("M", s.x, s.y + s.r * 0.34);
  label(ctx, s, mode, font, "DEPTH");
}

function drawHeartRate(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  mode: DialMode,
  font: ResolvedDialFont,
  v: DialVitals,
): void {
  const pal = PALETTE[mode];
  setDialFont(ctx, font, s.r * 0.52, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = mode === "active" ? pal.fg : pal.dim;
  ctx.fillText(String(Math.round(v.bpm)), s.x, s.y - s.r * 0.08);
  setDialFont(ctx, font, s.r * 0.18, 500);
  ctx.fillStyle = pal.heart;
  ctx.fillText("BPM", s.x, s.y + s.r * 0.3);

  if (mode === "active") {
    // Micro QRS trace — the 1 Hz signature in miniature.
    const w = s.r * 1.1;
    const y0 = s.y + s.r * 0.62;
    const x0 = s.x - w / 2;
    const pts: [number, number][] = [
      [0, 0],
      [0.3, 0],
      [0.38, -0.1],
      [0.46, 0.32],
      [0.54, -0.5],
      [0.6, 0.12],
      [0.68, 0],
      [1, 0],
    ];
    ctx.strokeStyle = pal.heart;
    ctx.lineWidth = s.r * 0.045;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const x = x0 + px * w;
      const y = y0 + py * s.r * 0.4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  label(ctx, s, mode, font, "HEART RATE");
}

function drawCompass(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  mode: DialMode,
  font: ResolvedDialFont,
  v: DialVitals,
): void {
  const pal = PALETTE[mode];

  // Rose ticks at the 8 winds.
  for (let deg = 0; deg < 360; deg += 45) {
    const a = polar(s.x, s.y, s.r * 0.86, deg);
    const b = polar(s.x, s.y, s.r * 0.74, deg);
    ctx.strokeStyle = deg % 90 === 0 ? pal.dim : pal.faint;
    ctx.lineWidth = s.r * 0.035;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Needle to the heading; tail dim.
  const tip = polar(s.x, s.y, s.r * 0.6, v.headingDeg);
  const tail = polar(s.x, s.y, s.r * 0.34, v.headingDeg + 180);
  ctx.strokeStyle = pal.compass;
  ctx.lineWidth = s.r * 0.07;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = pal.dim;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(tail.x, tail.y);
  ctx.stroke();
  ctx.fillStyle = pal.compass;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  setDialFont(ctx, font, s.r * 0.2, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = mode === "active" ? pal.fg : pal.dim;
  ctx.fillText(`${Math.round(v.headingDeg)}°`, s.x, s.y + s.r * 0.52);
  label(ctx, s, mode, font, "COMPASS");
}

/** Paint the hot complication into its sub-dial slot. */
export function paintComplication(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: ComplicationId,
  mode: DialMode,
  font: ResolvedDialFont,
  vitals: DialVitals,
): void {
  const R = w / 2;
  const slot: Slot = {
    x: w / 2 + GRID.hot.x * R,
    y: h / 2 + GRID.hot.y * R,
    r: GRID.hot.r * R,
  };
  slotBase(ctx, slot, mode);
  switch (id) {
    case "depth":
      drawDepth(ctx, slot, mode, font, vitals);
      break;
    case "heartRate":
      drawHeartRate(ctx, slot, mode, font, vitals);
      break;
    case "compass":
      drawCompass(ctx, slot, mode, font, vitals);
      break;
  }
}
