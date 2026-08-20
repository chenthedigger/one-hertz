/**
 * Hot complication sub-dial — the slot the Details section hover-swaps
 * (PLAN §1 signature: "Details hover labels live-swap the dial
 * complication (depth gauge / heart rate / compass)").
 *
 * Art pass: the slot is a Liquid Glass slab — soft top-lit radial fill,
 * gradient rim (bright top-left → dark bottom-right), and an inner
 * specular arc catch — with the data drawn on the glass. All vector work
 * per composite (cheap); data arrives quantized via DialRenderer.setVitals
 * so it participates in the dirty key.
 */

import { setDialFont, type ResolvedDialFont } from "./font";
import { arcRad, polar } from "./face";
import {
  DEPTH_GAUGE_MAX_M,
  GRID,
  LABEL_TRACKING,
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

/** Liquid Glass slab base: lifted radial fill + gradient rim + specular arc. */
function slotBase(ctx: CanvasRenderingContext2D, s: Slot, mode: DialMode): void {
  const pal = PALETTE[mode];

  if (mode === "active") {
    // Top-lit glass fill — slightly lifted off the OLED ink.
    const g = ctx.createRadialGradient(
      s.x - s.r * 0.45,
      s.y - s.r * 0.55,
      s.r * 0.1,
      s.x,
      s.y,
      s.r * 1.15,
    );
    g.addColorStop(0, "rgba(145, 175, 190, 0.13)");
    g.addColorStop(0.55, "rgba(145, 175, 190, 0.055)");
    g.addColorStop(1, "rgba(145, 175, 190, 0.02)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    // Gradient rim: light enters top-left, falls off bottom-right.
    const rim = ctx.createLinearGradient(
      s.x - s.r,
      s.y - s.r,
      s.x + s.r,
      s.y + s.r,
    );
    rim.addColorStop(0, "rgba(255, 255, 255, 0.30)");
    rim.addColorStop(0.5, "rgba(255, 255, 255, 0.10)");
    rim.addColorStop(1, "rgba(255, 255, 255, 0.04)");
    ctx.strokeStyle = rim;
    ctx.lineWidth = s.r * 0.022;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner specular catch — short bright arc hugging the top-left.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
    ctx.lineWidth = s.r * 0.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.9, arcRad(285), arcRad(345));
    ctx.stroke();
  } else {
    // AOD: skeleton rim only — glass doesn't glow in the dark.
    ctx.strokeStyle = pal.faint;
    ctx.lineWidth = s.r * 0.02;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Small-caps instrument label at the top of the slab. */
function label(
  ctx: CanvasRenderingContext2D,
  s: Slot,
  mode: DialMode,
  font: ResolvedDialFont,
  text: string,
): void {
  if (mode === "aod") return; // reduced elements
  setDialFont(ctx, font, s.r * 0.15, 600, LABEL_TRACKING);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE[mode].dim;
  ctx.fillText(text, s.x, s.y - s.r * 0.62);
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
  const startDeg = 225; // 270° gauge, gap at the bottom
  const gaugeR = s.r * 0.78;

  ctx.lineCap = "round";
  ctx.lineWidth = s.r * 0.085;
  ctx.strokeStyle = pal.faint;
  ctx.beginPath();
  ctx.arc(s.x, s.y, gaugeR, arcRad(startDeg), arcRad(startDeg + 270));
  ctx.stroke();
  if (mode === "active") {
    ctx.strokeStyle = pal.depth;
    ctx.beginPath();
    ctx.arc(s.x, s.y, gaugeR, arcRad(startDeg), arcRad(startDeg + 270 * frac));
    ctx.stroke();
    // Progress head dot — the gauge's jewel.
    const head = polar(s.x, s.y, gaugeR, startDeg + 270 * frac);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(head.x, head.y, s.r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  setDialFont(ctx, font, s.r * 0.44, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = mode === "active" ? pal.fg : pal.dim;
  ctx.fillText(v.depthMeters.toFixed(1), s.x, s.y - s.r * 0.02);
  setDialFont(ctx, font, s.r * 0.17, 600, LABEL_TRACKING);
  ctx.fillStyle = pal.depth;
  ctx.fillText("M", s.x, s.y + s.r * 0.32);
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
  setDialFont(ctx, font, s.r * 0.54, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = mode === "active" ? pal.fg : pal.dim;
  ctx.fillText(String(Math.round(v.bpm)), s.x, s.y - s.r * 0.1);
  setDialFont(ctx, font, s.r * 0.16, 600, LABEL_TRACKING);
  ctx.fillStyle = pal.heart;
  ctx.fillText("BPM", s.x, s.y + s.r * 0.28);

  if (mode === "active") {
    // Micro QRS trace — the 1 Hz signature in miniature, clipped to the slab.
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.96, 0, Math.PI * 2);
    ctx.clip();
    const w = s.r * 1.16;
    const y0 = s.y + s.r * 0.6;
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
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const x = x0 + px * w;
      const y = y0 + py * s.r * 0.36;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
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

  // Rose: minor ticks every 15°, winds at 45°, cardinals longest/brightest.
  for (let deg = 0; deg < 360; deg += 15) {
    const cardinal = deg % 90 === 0;
    const wind = deg % 45 === 0;
    if (mode === "aod" && !wind) continue;
    const a = polar(s.x, s.y, s.r * 0.86, deg);
    const b = polar(s.x, s.y, s.r * (cardinal ? 0.72 : wind ? 0.76 : 0.8), deg);
    ctx.strokeStyle = cardinal ? pal.dim : pal.faint;
    ctx.lineWidth = s.r * (wind ? 0.03 : 0.02);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Needle: tapered north blade (compass orange) + short counter tail.
  const heading = v.headingDeg;
  const tip = polar(s.x, s.y, s.r * 0.6, heading);
  const left = polar(s.x, s.y, s.r * 0.075, heading - 90);
  const right = polar(s.x, s.y, s.r * 0.075, heading + 90);
  ctx.fillStyle = pal.compass;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fill();
  const tail = polar(s.x, s.y, s.r * 0.34, heading + 180);
  ctx.strokeStyle = mode === "active" ? "rgba(242, 243, 244, 0.75)" : pal.dim;
  ctx.lineWidth = s.r * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(tail.x, tail.y);
  ctx.stroke();
  // Center pin.
  ctx.fillStyle = mode === "active" ? "#FFFFFF" : pal.dim;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r * 0.055, 0, Math.PI * 2);
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
