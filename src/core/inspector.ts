/**
 * `?materials` — materials inspector STUB (PLAN §1 debug params).
 *
 * Read-only overlay listing every mesh/material in the scene with its key
 * PBR numbers, refreshed on demand. The full editing inspector (live
 * tweak → copy values into the material sheet) lands with the look-dev
 * phase; the param + overlay contract is what P1 owes.
 */

import type { Stage } from "../webgl/stage";

export function installMaterialsInspector(stage: Stage): void {
  const el = document.createElement("aside");
  el.id = "materials-inspector";
  el.setAttribute("aria-label", "Materials inspector");
  document.body.appendChild(el);

  const render = (): void => {
    const rows = stage
      .listMaterials()
      .map(
        (m) =>
          `<tr><td>${esc(m.mesh)}</td><td>${esc(m.type)}</td>` +
          `<td>${m.color ?? "—"}</td><td>${fmt(m.roughness)}</td>` +
          `<td>${fmt(m.metalness)}</td><td>${fmt(m.envMapIntensity)}</td></tr>`,
      )
      .join("");
    el.innerHTML =
      `<header><strong>materials</strong>` +
      `<button type="button" data-refresh>refresh</button></header>` +
      `<table><thead><tr><th>mesh</th><th>type</th><th>color</th>` +
      `<th>rough</th><th>metal</th><th>envInt</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
    el.querySelector("[data-refresh]")?.addEventListener("click", render);
  };
  render();
}

function fmt(v: number | null): string {
  return v === null ? "—" : v.toFixed(2);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
