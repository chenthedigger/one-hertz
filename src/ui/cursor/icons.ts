/**
 * Cursor icon channel — one crisp inline SVG per token (PLAN §3 cursor
 * spec: designed object, not a font glyph). All glyphs live on a 24×24
 * grid, stroke `currentColor` (ink via CSS), 1.5px weight, round caps —
 * matched optical weight across the set.
 *
 * `finish-swatch` is the exception: a filled disc tinted by the payload
 * color (a real colorway hex from CONFIG's owner). The hex is validated
 * before it touches innerHTML — anything else falls back to titanium.
 */

import type { CursorIconName } from "../../core/events";

/** Natural-titanium fallback for an untinted finish swatch. */
const SWATCH_FALLBACK = "#c9cbd0";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function svg(inner: string): string {
  return (
    `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
  );
}

export function iconMarkup(icon: CursorIconName, color?: string): string {
  switch (icon) {
    case "finish-swatch": {
      const fill = color !== undefined && HEX_COLOR.test(color) ? color : SWATCH_FALLBACK;
      // Filled swatch with a hairline keyline so pale finishes stay visible.
      return svg(
        `<circle cx="12" cy="12" r="8" fill="${fill}" stroke="none"/>` +
          `<circle cx="12" cy="12" r="8.75" stroke-opacity="0.35"/>`,
      );
    }
    case "cross":
      return svg(`<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>`);
    case "arrow-left":
      return svg(`<path d="M19 12H5.5M11 6l-6 6 6 6"/>`);
    case "arrow-right":
      return svg(`<path d="M5 12h13.5M13 6l6 6-6 6"/>`);
    case "select":
      return svg(`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none"/>`);
  }
}
