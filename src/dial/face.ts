/**
 * Face layer — the STATIC background of the watchface, painted once per
 * (mode × size) into a cached offscreen canvas and blitted on every
 * composite (renderer.ts owns the cache + dirty logic).
 *
 * Wayfinder-class layout, proportions measured against the REAL extracted
 * Ultra Wayfinder texture (see spec.ts header). Outside-in:
 *   rounded-rect OLED slab → hairline containment rings → rotated degree
 *   numerals + cardinals (tangential, like a physical compass bezel; N in
 *   biosignal red) → rounded-dash tick band → minute track (dot minors,
 *   dash majors) → hour numerals 12/3/9 (6 dropped for the hot
 *   complication) → four corner slots as open-ring gauges.
 *
 * AOD variant (PLAN §2 Nocturne): reduced elements — degree numerals,
 * minute minors, and corner slots drop; cardinals + major dashes + hour
 * numerals stay, painted from the dim AOD palette.
 *
 * paintGlass — the Liquid Glass overlay sprite (PLAN §3 sanctioned
 * technique: prebaked highlight/refraction layers, no real-time
 * refraction). Painted once per (mode × size) into its own cached canvas,
 * composited ABOVE the hands so the crystal reads physically in front.
 */

import { setDialFont, type ResolvedDialFont } from "./font";
import {
  DIAL_CORNER,
  GLASS,
  GRID,
  LABEL_TRACKING,
  PALETTE,
  type DialMode,
} from "./spec";

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

/** Canvas arc() angle (radians, 0 at 3 o'clock) from dial degrees (0 at 12). */
export function arcRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

/** Stubby rounded-cap dash along the radial direction (ref tick truth). */
function dash(
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

function hairlineRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

export function roundedRectPath(
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

/** Rotated glyph, tangential to the ring (tops face outward — compass truth). */
function ringGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  deg: number,
  text: string,
): void {
  const p = polar(cx, cy, r, deg);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

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

  // Hairline containment rings (Wayfinder double-ring signature).
  hairlineRing(ctx, cx, cy, R * bezel.ringOuter, R * 0.004, pal.faint);
  hairlineRing(ctx, cx, cy, R * bezel.ringInner, R * 0.004, pal.faint);

  // Rounded-dash tick band (majors run deeper — long/short rhythm).
  for (let deg = 0; deg < 360; deg += bezel.minorEveryDeg) {
    const isMajor = deg % bezel.majorEveryDeg === 0;
    if (mode === "aod" && !isMajor) continue; // reduced elements
    dash(
      ctx,
      cx,
      cy,
      deg,
      R * bezel.dashOuter,
      R * (isMajor ? bezel.dashInnerMajor : bezel.dashInner),
      R * bezel.dashW,
      isMajor ? pal.dim : pal.faint,
    );
  }

  // Rotated numerals + cardinals OUTSIDE the dash band (ref truth).
  for (let deg = 0; deg < 360; deg += bezel.numeralEveryDeg) {
    const cardinal = CARDINALS[deg];
    if (cardinal !== undefined) {
      setDialFont(ctx, font, R * bezel.cardinalSize, 700);
      ctx.fillStyle = cardinal === "N" ? pal.accent : pal.dim;
      ringGlyph(ctx, cx, cy, R * bezel.numeralR, deg, cardinal);
      continue;
    }
    if (mode === "aod") continue; // reduced elements
    setDialFont(ctx, font, R * bezel.numeralSize, 500);
    ctx.fillStyle = pal.dim;
    ringGlyph(ctx, cx, cy, R * bezel.numeralR, deg, String(deg));
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
    if (major) {
      dash(
        ctx,
        cx,
        cy,
        i * 6,
        R * minute.outer,
        R * (minute.outer - minute.majorLen),
        R * minute.majorW,
        mode === "aod" ? pal.dim : pal.fg,
      );
      continue;
    }
    if (mode === "aod") continue; // reduced elements
    const p = polar(cx, cy, R * minute.outer, i * 6);
    ctx.fillStyle = pal.faint;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R * minute.minorDotR, 0, Math.PI * 2);
    ctx.fill();
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
const CORNER_ROUGHS: [big: string, small: string, frac: number][] = [
  ["87", "PWR", 0.87], // top-left
  ["23°", "AIR", 0.34], // top-right
  ["214M", "ALT", 0.58], // bottom-left
  ["18:42", "SET", 0.76], // bottom-right
];

/**
 * Corner slots as native watchOS open-ring gauges: a round-capped track
 * arc whose gap faces the display corner (outward diagonal), a brighter
 * progress segment, value + small-caps unit label inside.
 */
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
    const [big, small, frac] = rough;
    const x = cx + ux * R;
    const y = cy + uy * R;
    const r = corners.r * R;

    // Gap faces the outward diagonal of this corner.
    const outwardDeg = (Math.atan2(ux, -uy) * 180) / Math.PI;
    const sweep = corners.gaugeSweepDeg;
    const startDeg = outwardDeg + (360 - sweep) / 2;

    ctx.lineCap = "round";
    ctx.lineWidth = R * corners.gaugeW;
    ctx.strokeStyle = pal.faint;
    ctx.beginPath();
    ctx.arc(x, y, r, arcRad(startDeg), arcRad(startDeg + sweep));
    ctx.stroke();
    ctx.strokeStyle = pal.dim;
    ctx.beginPath();
    ctx.arc(x, y, r, arcRad(startDeg), arcRad(startDeg + sweep * frac));
    ctx.stroke();

    setDialFont(ctx, font, r * 0.46, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.fg;
    ctx.fillText(big, x, y - r * 0.1);
    setDialFont(ctx, font, r * 0.24, 600, LABEL_TRACKING);
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

/**
 * Liquid Glass overlay — prebaked crystal sprite, composited ABOVE the
 * hands (renderer caches this per mode × size; zero per-frame cost, zero
 * extra uploads). Contents: inner rim light (top-weighted), broad diagonal
 * sheen, top-left corner specular bloom, radial edge vignette. All clipped
 * to the rounded display rect so the alpha-0 glass mask stays clean.
 */
export function paintGlass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: DialMode,
): void {
  const k = mode === "aod" ? GLASS.aodScale : 1;
  const R = w / 2;
  const corner = w * DIAL_CORNER;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  roundedRectPath(ctx, w, h, corner);
  ctx.clip();

  // Radial edge vignette — OLED under curved glass.
  const vr = ctx.createRadialGradient(w / 2, h / 2, R * 0.55, w / 2, h / 2, R * 1.35);
  vr.addColorStop(0, "rgba(0,0,0,0)");
  vr.addColorStop(1, `rgba(0,0,0,${GLASS.vignette.alpha * k})`);
  ctx.fillStyle = vr;
  ctx.fillRect(0, 0, w, h);

  // Broad diagonal sheen across the upper-left (the crystal catch).
  if (mode === "active") {
    const sh = ctx.createLinearGradient(0, 0, w * 0.9, h * 0.75);
    sh.addColorStop(0, `rgba(255,255,255,${GLASS.sheen.alpha})`);
    sh.addColorStop(0.32, `rgba(255,255,255,${GLASS.sheen.alpha * 0.4})`);
    sh.addColorStop(0.55, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, w, h);

    // Specular bloom hugging the top-left corner radius.
    const bx = corner * 0.85;
    const by = corner * 0.85;
    const br = ctx.createRadialGradient(bx, by, 0, bx, by, R * GLASS.bloom.r);
    br.addColorStop(0, `rgba(255,255,255,${GLASS.bloom.alpha})`);
    br.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = br;
    ctx.fillRect(0, 0, w, h);
  }

  // Inner rim light along the display edge, brighter at the top.
  const rim = ctx.createLinearGradient(0, 0, 0, h);
  rim.addColorStop(0, `rgba(255,255,255,${GLASS.rim.alphaTop * k})`);
  rim.addColorStop(0.5, `rgba(255,255,255,${GLASS.rim.alphaBottom * k * 1.6})`);
  rim.addColorStop(1, `rgba(255,255,255,${GLASS.rim.alphaBottom * k})`);
  const rw = R * GLASS.rim.w;
  ctx.strokeStyle = rim;
  ctx.lineWidth = rw;
  roundedRectPath(ctx, w, h, corner);
  ctx.stroke();

  ctx.restore();
}
