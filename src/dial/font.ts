/**
 * Dial typography resolver (PLAN §3: "SF-look glyphs RENDERED into the
 * canvas from a locally-installed face or metric-compatible substitute —
 * no font files shipped in the repo").
 *
 * Probe chain (task spec): 'SF Pro Display' → 'SF Compact Display' →
 * '-apple-system', each tested via document.fonts.check() first and a
 * measureText width-differencing probe as the fallback; if none resolve,
 * fall back to Inter with tight tracking (letterSpacing where the canvas
 * supports it). Resolved ONCE at DialRenderer construction.
 */

import { DIAL_FONT_CANDIDATES, DIAL_FONT_FALLBACK } from "./spec";

export interface ResolvedDialFont {
  /** CSS family list to splice into ctx.font (winner first, safe tail). */
  family: string;
  /** Which candidate won (surfaced in the preview + lane notes). */
  name: string;
  /** True when we fell back — renderer applies tight tracking. */
  tight: boolean;
}

/** Quote a family name unless it is a CSS keyword-style token. */
function cssFamily(name: string): string {
  return name.startsWith("-") ? name : `"${name}"`;
}

function checkViaFontsApi(name: string): boolean {
  try {
    // check() consults locally-installed system faces in Chrome/Safari.
    return document.fonts.check(`600 16px ${cssFamily(name)}`);
  } catch {
    return false;
  }
}

/**
 * Width-differencing probe: render a test string with the candidate backed
 * by two metric-divergent generics. If the candidate resolves, both
 * measurements collapse to the same width (the candidate's); if it does
 * not, they inherit the generics' differing widths.
 */
function checkViaMeasureText(ctx: CanvasRenderingContext2D, name: string): boolean {
  const probe = "10:09 WAYFINDER milli";
  ctx.font = "600 64px monospace";
  const mono = ctx.measureText(probe).width;
  ctx.font = "600 64px serif";
  const serif = ctx.measureText(probe).width;
  ctx.font = `600 64px ${cssFamily(name)}, monospace`;
  const a = ctx.measureText(probe).width;
  ctx.font = `600 64px ${cssFamily(name)}, serif`;
  const b = ctx.measureText(probe).width;
  // Resolved iff both fall through to the SAME face that is NEITHER generic.
  return a === b && (a !== mono || b !== serif);
}

/** Resolve the dial's type once. Never loads or ships a font file. */
export function resolveDialFont(): ResolvedDialFont {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  for (const name of DIAL_FONT_CANDIDATES) {
    const hit = checkViaFontsApi(name) || (ctx !== null && checkViaMeasureText(ctx, name));
    if (hit) {
      return {
        family: `${cssFamily(name)}, -apple-system, system-ui, sans-serif`,
        name,
        tight: false,
      };
    }
  }
  return {
    family: `"${DIAL_FONT_FALLBACK}", system-ui, sans-serif`,
    name: `${DIAL_FONT_FALLBACK} (fallback)`,
    tight: true,
  };
}

/**
 * Set ctx.font from the resolved family; applies the fallback's tight
 * tracking via canvas letterSpacing where the browser supports it.
 */
export function setDialFont(
  ctx: CanvasRenderingContext2D,
  font: ResolvedDialFont,
  sizePx: number,
  weight = 600,
): void {
  ctx.font = `${weight} ${Math.round(sizePx)}px ${font.family}`;
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = font.tight
      ? "-0.02em"
      : "0em";
  }
}
