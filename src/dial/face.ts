/**
 * Face layer — the STATIC background of the watchface, painted once per
 * (mode × size) into a cached offscreen canvas and blitted on every
 * composite (renderer.ts owns the cache + dirty logic).
 *
 * Wayfinder-class layout, roughed to correct proportions (beauty pass is
 * P1.5 — edit src/dial/spec.ts, not this painter):
 *   rounded-rect OLED slab → compass-scale bezel ring (degree ticks +
 *   numerals, N/E/S/W cardinals, N in biosignal red) → minute track →
 *   hour numerals 12/3/9 (6 dropped for the hot complication sub-dial) →
 *   four corner complication slots (static roughs; live data is P3's).
 *
 * AOD variant (PLAN §2 Nocturne): reduced elements — bezel numerals,
 * minute minors, and corner slots are dropped; everything else paints from
 * the dim AOD palette.
 */

import { setDialFont, type ResolvedDialFont } from "./font";
import { DIAL_CORNER, GRID, PALETTE, type DialMode } from "./spec";

/** Point on a circle: angle in degrees, 0 at 12 o'clock, clockwise. */
export function polar(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + Math.sin(rad) * r, y: cy - Math.cos(rad) * r };
}

function tick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  deg: number,
  rOuter: number,
  rInner: number,
  width: number,
  color: string,
): void {
  const a = polar(cx, cy, rOuter, deg);
  const b = polar(cx, cy, rInner, deg);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(w, 0, w, h, radius);
  ctx.arcTo(w, h, 0, h, radius);
  ctx.arcTo(0, h, 0, 0, radius);
  ctx.arcTo(0, 0, w, 0, radius);
  ctx.closePath();
}

const CARDINALS: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

function paintBezel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  mode: DialMode,
  font: ResolvedDialFont,
): void {
  const pal = PALETTE[mode];
  const { bezel } = GRID;
  const numeralR = R * ((bezel.outer + bezel.inner) / 2);

  for (let deg = 0; deg < 360; deg += bezel.minorEveryDeg) {
    const isNumeral = deg % bezel.numeralEveryDeg === 0;
    const isMajor = deg % bezel.majorEveryDeg === 0;
    if (isNumeral) {
      // Numeral (or cardinal) replaces the tick at this angle.
      const cardinal = CARDINALS[deg];
      if (mode === "aod" && cardinal === undefined) continue; // reduced
      const p = polar(cx, cy, numeralR, deg);
      setDialFont(ctx, font, R * bezel.numeralSize, cardinal ? 700 : 500);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = cardinal === "N" ? pal.accent : cardinal ? pal.fg : pal.dim;
      ctx.fillText(cardinal ?? String(deg), p.x, p.y);
      continue;
    }
    if (mode === "aod" && !isMajor) continue; // reduced elements
    tick(
      ctx,
      cx,
      cy,
      deg,
      R * bezel.outer,
      R * (isMajor ? bezel.inner + 0.02 : bezel.inner + 0.06),
      R * (isMajor ? 0.008 : 0.005),
      isMajor ? pal.dim : pal.faint,
    );
  }
}

function paintMinuteTrack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  mode: DialMode,
): void {
  const pal = PALETTE[mode];
  const { minute } = GRID;
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    if (mode === "aod" && !major) continue; // reduced elements
    tick(
      ctx,
      cx,
      cy,
      i * 6,
      R * minute.outer,
      R * (major ? minute.majorInner : minute.minorInner),
      R * (major ? 0.012 : 0.006),
      major ? pal.fg : pal.faint,
    );
  }
}

function paintNumerals(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  mode: DialMode,
  font: ResolvedDialFont,
): void {
  const pal = PALETTE[mode];
  const { numerals } = GRID;
  setDialFont(ctx, font, R * numerals.size, 600);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = pal.fg;
  // 6 is dropped — the hot complication sub-dial owns that sector.
  const slots: [string, number][] = [
    ["12", 0],
    ["3", 90],
    ["9", 270],
  ];
  for (const [label, deg] of slots) {
    const p = polar(cx, cy, R * numerals.radius, deg);
    ctx.fillText(label, p.x, p.y);
  }
}

/** Static rough content for the four corner slots (live data lands in P3). */
const CORNER_ROUGHS: [big: string, small: string][] = [
  ["87", "PWR"], // top-left
  ["23°", "AIR"], // top-right
  ["214M", "ALT"], // bottom-left
  ["18:42", "SET"], // bottom-right
];

function paintCornerSlots(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  mode: DialMode,
  font: ResolvedDialFont,
): void {
  if (mode === "aod") return; // reduced elements
  const pal = PALETTE[mode];
  const { corners } = GRID;
  const positions: [number, number][] = [
    [-corners.x, -corners.y],
    [corners.x, -corners.y],
    [-corners.x, corners.y],
    [corners.x, corners.y],
  ];
  positions.forEach(([ux, uy], i) => {
    const rough = CORNER_ROUGHS[i];
    if (!rough) return;
    const [big, small] = rough;
    const x = cx + ux * R;
    const y = cy + uy * R;
    const r = corners.r * R;
    ctx.strokeStyle = pal.faint;
    ctx.lineWidth = R * 0.008;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    setDialFont(ctx, font, r * 0.52, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.dim;
    ctx.fillText(big, x, y - r * 0.14);
    setDialFont(ctx, font, r * 0.26, 500);
    ctx.fillStyle = pal.faint;
    ctx.fillText(small, x, y + r * 0.42);
  });
}

/** Paint the full static face into `ctx` (canvas of w×h device px). */
export function paintFace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: DialMode,
  font: ResolvedDialFont,
): void {
  const pal = PALETTE[mode];
  const cx = w / 2;
  const cy = h / 2;
  const R = w / 2;

  ctx.clearRect(0, 0, w, h);
  roundedRectPath(ctx, w, h, w * DIAL_CORNER);
  ctx.fillStyle = pal.bg;
  ctx.fill();

  paintBezel(ctx, cx, cy, R, mode, font);
  paintMinuteTrack(ctx, cx, cy, R, mode);
  paintNumerals(ctx, cx, cy, R, mode, font);
  paintCornerSlots(ctx, cx, cy, R, mode, font);
}
