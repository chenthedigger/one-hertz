/**
 * Images — the gallery (unpinned 100svh; source grammar: static `<picture>`
 * grid, min-width:1024 art direction, 5 stills, captions — motion bible §8
 * row 11). Ours is an editorial CONTACT SHEET: copy column on the light
 * ground, five ink-plate stills at four scales (LOOKBIBLE §6 shot list
 * frames 1–5 — hero-diagonal, crown-knurl, dial-faceon, side-12mm,
 * back-crystal), the 12 mm edge-on running as a wide grid-breaking strip.
 *
 * Dual timelines (engine contract, docs/p1/engine.md §1):
 *   - DOM channel: one PAUSED fraction-domain GSAP timeline via
 *     `timelineAdapter` — split-char headline reveal (chars xPercent
 *     −110→0 power3.out + linear opacity, the scrub:true grammar §3),
 *     the source's Images signature IMAGE RISE (`y:300, stagger .1,
 *     power3.out` translated to the fraction domain: y 140→0, stagger .05),
 *     caption-bar arrival — plus imperative scrub:2 grey-line color reveals
 *     (#BCBCBC → #323232 on light ground, staggered 15/25-shape windows;
 *     live lag k≈2.2 ≈ the 2 s catch-up, EVAL SNAPS — Mechanism precedent).
 *   - WebGL channel: EMPTY BY SOURCE LAW — "Images group: webgl class is
 *     EMPTY (watch hidden, pure DOM gallery)" (motion bible §4/§8 row 11;
 *     law 10: inventing a camera beat here would be an unsanctioned
 *     deviation). The hide is achieved by the plate itself: an OPAQUE
 *     ground-token surface over the fixed canvas (images.css). The section
 *     lighting keyframe (instrument.json Images: rot 250 · envInt 1.05 —
 *     LOOKBIBLE §1.5 #11 "DOM section — hold", = Straps' azimuth, so zero
 *     light motion across the seam) is held by the infra-gl driver; this
 *     section invents no lighting and no camera.
 *
 * Colorway src-swap wiring (PLAN §1 mechanic 4 · motion bible §8 row 11
 * "gallery re-src on CONFIG_CHANGE instant"): stills resolve from the
 * template `/assets/gallery/${finish}_${n}.webp` (n = 1..5 in LOOKBIBLE §6
 * shot order). On CONFIG_CHANGE the new finish's set is preflighted with
 * one probe image, then all five `<picture>` sets + the caption's colorway
 * label swap in the same tick (instant, no tween). Per-colorway masters
 * are a pure FILE DROP; a missing set warns once and keeps the current
 * stills (never a broken-image frame). P4 shipped real Cycles masters for
 * all four configs (research/lookdev/instrument/scripts/
 * render_gallery_masters.py + postprocess_gallery.py — the P2 TEMP
 * lookdev conversions are gone).
 *
 * State contract (truthful): requires nothing (a 2D gallery cannot care
 * about camera/explode axes), writes nothing, guarantees nothing. It only
 * LISTENS to CONFIG_CHANGE; the colorway state axis is owned by the P3
 * swap mechanic. DOM-only section ⇒ longpress zoomMultiplier 1 (motion
 * bible law 8 zoom table).
 */

import { gsap } from "gsap";
import { EngineEvent, bus } from "../core/events";
import { isEvalMode } from "../core/determinism";
import { params } from "../core/params";
import { SectionBase, timelineAdapter } from "../core/section";
import { DEFAULT_CONFIG_ID, configById, resolveConfig } from "../ui/colorway";
import type { CameraRig } from "../webgl/cameraRig";
import "./images.css";

/* ---- copy (working copy inside LOOKBIBLE §8 budgets — P4 polishes) -------- */

const EYEBROW = "11 · THE GALLERY"; // 16 ≤18 chars caps
/** Headline, tier-2 (≤28/line): ghost line + solid line (§4 hierarchy). */
const TITLE_GHOST = "STILL";
const TITLE_SOLID = "LIFE.";
const TITLE_ARIA = "STILL LIFE.";
/** Grey-reveal aside — ≤34 chars each, one thought per line. */
const ASIDE_LINES = [
  "Five frames. One light rig.",
  "Rendered, never photographed.",
  "The stage is part of the watch.",
] as const;
/** The source caption grammar: fixed phrase + live colorway label. */
const CAPTION_PHRASE = "the tireless electrical watch";

/** Gallery asset template — ${finish}_${n}.webp (P4 file-drop contract). */
const GALLERY_BASE = "/assets/gallery/";
const STILL_COUNT = 5;

/** LOOKBIBLE §6 shot list, frames 1–5 (n = index+1 in the asset names). */
const SHOTS: readonly { name: string; alt: string }[] = [
  {
    name: "HERO-DIAGONAL",
    alt: "Watch three-quarter hero on the ink and porcelain diagonal stage",
  },
  {
    name: "CROWN-KNURL",
    alt: "Macro of the crown and knurl, per-tooth glints, dial soft behind",
  },
  {
    name: "DIAL-FACEON",
    alt: "Full dial face-on, one continuous specular line on the bezel rim",
  },
  {
    // 12 mm case depth — apple.com Ultra 3 tech specs ("Depth: 12mm"),
    // re-verified 2026-08-26 (14.4 mm was the Ultra 2). LOOKBIBLE §6 #4
    // renamed side-14mm → side-12mm (P5 council co-sign 2026-08-26).
    name: "SIDE-12MM",
    alt: "Edge-on profile, 12 millimeters, chamfer streaks live",
  },
  {
    name: "BACK-CRYSTAL",
    alt: "Back crystal macro, engraved DIVE-40M and WR-100M ring legible",
  },
];

/* ---- beat windows (fraction grid {.05,.1,.15,.2,.25,.4,.5,.75} anchors;
 * fine beats .04–.15 per the motion-bible §2 scrub clusters; every beat
 * SETTLED by .5 — evidence captures land on the {.25,.5,.75} grid and a
 * straddling entrance photographs half-faded, Straps lane pitfall 1) ------ */

/** Image rise cadence — the source's stagger .1 shape in our window.
 *  T0 .16 (was .1) + a fast opacity snap (gate-4 tune 2): cells hold at
 *  opacity 0 until their own rise starts, so the plate edge enters clean —
 *  no half-faded ink cell reading as a bare grey rectangle at p≈.12. */
const FIG_T0 = 0.16;
const FIG_STEP = 0.045; /* last still lands .34 + .14 = .48 — settled by .5 */
/** scrub:2 grey-line windows — offsets alternate (the 15/25 pattern). */
const REVEAL_WINDOWS: readonly [number, number][] = [
  [0.3, 0.41],
  [0.325, 0.455],
  [0.35, 0.47],
];

/** Light-ground grammar (LOOKBIBLE §7.3 / Straps+Timeless precedent). */
const REVEAL_FROM = 0xbcbcbc;
const REVEAL_TO = 0x323232;
/** scrub:2 catch-up rate (≈2 s visual settle — Mechanism's constant). */
const REVEAL_LAG_K = 2.2;

/* ---- pure helpers --------------------------------------------------------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function win(p: number, [a, b]: readonly [number, number]): number {
  return clamp01((p - a) / (b - a));
}

/** power3.inOut — the site default (grey reveals ride it, §7.3). */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mixHex(from: number, to: number, t: number): string {
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const r = Math.round(fr + (((to >> 16) & 255) - fr) * t);
  const g = Math.round(fg + (((to >> 8) & 255) - fg) * t);
  const b = Math.round(fb + ((to & 255) - fb) * t);
  return `rgb(${r} ${g} ${b})`;
}

/** Config id → the config table's honest display label ("natural-anchor-blue"
 *  → "Natural Titanium · Anchor Blue"); id-derived words as the fallback so
 *  an unknown id can never render an empty caption. */
function configLabel(id: string): string {
  const cfg = configById(id);
  if (cfg) return cfg.label;
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface RevealLine {
  el: HTMLElement;
  win: readonly [number, number];
  value: number;
  target: number;
}

export class ImagesSection extends SectionBase {
  private readonly reveals: RevealLine[];
  private readonly colorwayEl: HTMLElement;
  private readonly stills: { source: HTMLSourceElement; img: HTMLImageElement }[];

  /** The finish whose stills are on screen (colorway axis is P3-owned;
   *  we start from the INITIAL_STATE default and follow CONFIG_CHANGE). */
  private finish = DEFAULT_CONFIG_ID;
  /** Latest requested finish — preflight loads resolve out of order. */
  private pendingFinish: string | null = null;
  private readonly warnedFinishes = new Set<string>();

  constructor(_rig: CameraRig) {
    super({
      name: "Images",
      requiredEnterState: {},
      guaranteedExitState: {},
      zoomMultiplier: 1, // DOM-only section (motion bible law 8 zoom table)
    });

    this.buildDom();

    // Solo-sandbox runways (Timeless/Intro pattern): an unpinned 100svh
    // track alone on the page has maxScroll 0, so localProgress can never
    // persist. One plain viewport of ground BEFORE restores the
    // enters-from-below traversal (200vh window) and one AFTER restores
    // maxScroll — solo geometry then equals the full page exactly.
    // Injected in the constructor, before boot's registry.measure() +
    // engine.refresh() (engine pitfall #1). Sandbox only.
    if (params.solo === "Images") {
      for (const where of ["beforebegin", "afterend"] as const) {
        const runway = document.createElement("div");
        runway.style.height = "100svh";
        runway.setAttribute("aria-hidden", "true");
        this.element.insertAdjacentElement(where, runway);
      }
    }

    this.colorwayEl = this.mustQuery("[data-colorway]");
    this.stills = Array.from(
      this.element.querySelectorAll<HTMLElement>(".gal__fig"),
    ).map((fig) => {
      const source = fig.querySelector<HTMLSourceElement>("source");
      const img = fig.querySelector<HTMLImageElement>("img");
      if (!source || !img) throw new Error("Images: figure missing picture parts");
      return { source, img };
    });
    if (this.stills.length !== STILL_COUNT) {
      throw new Error("Images: still count drifted from the shot list");
    }

    this.reveals = Array.from(
      this.element.querySelectorAll<HTMLElement>(".gal__line"),
    ).map((el, i) => {
      const w = REVEAL_WINDOWS[i];
      if (!w) throw new Error("Images: reveal line without a window");
      return { el, win: w, value: 0, target: 0 };
    });

    this.addDomAdapter(timelineAdapter(this.buildDomTimeline()));

    // Colorway src-swap wiring — instant on CONFIG_CHANGE (§8 row 11).
    // resolveConfig normalizes every payload shape (canonical `{config}`,
    // legacy `{finish, band}`) to the config whose id IS the asset token.
    bus.on(EngineEvent.ConfigChange, (payload) => {
      const cfg = resolveConfig(payload);
      if (cfg) this.applyFinish(cfg.id);
    });

    // scrub:2 catch-up lag rides the shared ticker LIVE only — eval applies
    // targets directly in tickDom (deterministic captures, Mechanism model).
    if (!isEvalMode) {
      gsap.ticker.add((_t, deltaMs) => this.tickLag(deltaMs / 1000));
    }
  }

  /* ---- DOM (self-rendered — index.html holds only the empty track) ------- */

  private buildDom(): void {
    const src = (n: number): string => `${GALLERY_BASE}${this.finish}_${n}.webp`;
    const figures = SHOTS.map((shot, i) => {
      const n = i + 1;
      return `
        <figure class="gal__fig gal__fig--${n}">
          <picture>
            <source media="(min-width: 1024px)" srcset="${src(n)}" />
            <img src="${src(n)}" alt="${shot.alt}" loading="eager" decoding="async" />
          </picture>
          <figcaption class="gal__label">
            <span class="tnum">0${n}</span>${shot.name}
          </figcaption>
        </figure>`;
    }).join("");

    this.element.innerHTML = `
      <div class="gal">
        <div class="gal__copy">
          <p class="gal__eyebrow">${EYEBROW}</p>
          <h2 class="gal__title" aria-label="${TITLE_ARIA}">
            <span class="gal__t-line gal__t-ghost" aria-hidden="true">${splitChars(TITLE_GHOST)}</span>
            <span class="gal__t-line gal__t-solid" aria-hidden="true">${splitChars(TITLE_SOLID)}</span>
          </h2>
          <div class="gal__lines">
            ${ASIDE_LINES.map((l) => `<p class="gal__line">${l}</p>`).join("\n            ")}
          </div>
          <div class="gal__caption">
            <p class="gal__phrase">${CAPTION_PHRASE}</p>
            <p class="gal__colorway"><span data-colorway>${configLabel(this.finish)}</span></p>
          </div>
        </div>
        <div class="gal__sheet" data-gallery>${figures}
        </div>
      </div>`;
  }

  private mustQuery(selector: string): HTMLElement {
    const el = this.element.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Images: missing ${selector}`);
    return el;
  }

  /* ---- DOM scrub timeline (fraction domain 0..1, padded to 1) ------------ */

  private buildDomTimeline(): gsap.core.Timeline {
    const eyebrow = this.mustQuery(".gal__eyebrow");
    const caption = this.mustQuery(".gal__caption");
    const ghostChars = this.element.querySelectorAll<HTMLElement>(".gal__t-ghost .gal__char");
    const solidChars = this.element.querySelectorAll<HTMLElement>(".gal__t-solid .gal__char");
    const figures = Array.from(this.element.querySelectorAll<HTMLElement>(".gal__fig"));

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    // Eyebrow: arrival power3.out + linear opacity (motion law 2).
    tl.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.16);
    tl.fromTo(eyebrow, { y: 12 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.16);

    // Split-char headline (scrub:true grammar §3): chars slide xPercent
    // −110→0 power3.out; opacity linear over the first half.
    tl.fromTo(
      ghostChars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.008 },
      0.18,
    );
    tl.fromTo(ghostChars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.008 }, 0.18);
    tl.fromTo(
      solidChars,
      { xPercent: -110 },
      { xPercent: 0, duration: 0.1, ease: "power3.out", stagger: 0.008 },
      0.21,
    );
    tl.fromTo(solidChars, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.008 }, 0.21);

    // THE Images beat — the source's image-grid rise (`y:300, stagger .1,
    // power3.out` §1/§3) in the fraction domain: each still rises in shot
    // order, all landed by .44 (settled well before the .5 money frame).
    figures.forEach((fig, i) => {
      const t0 = FIG_T0 + i * FIG_STEP;
      tl.fromTo(fig, { y: 140 }, { y: 0, duration: 0.14, ease: "power3.out" }, t0);
      // opacity snaps in over the rise's first quarter — the ghost-grey
      // partial-opacity phase is too short to photograph (gate-4 tune 2)
      tl.fromTo(fig, { opacity: 0 }, { opacity: 1, duration: 0.04 }, t0);
    });

    // Caption bar joins once the sheet is up.
    tl.fromTo(caption, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.4);
    tl.fromTo(caption, { y: 14 }, { y: 0, duration: 0.06, ease: "power3.out" }, 0.4);

    tl.call(() => {}, [], 1); // pad to exactly 1 (motion-bible law 4)
    return tl;
  }

  override tickDom(progress: number): void {
    super.tickDom(progress);
    // Grey-line targets from progress windows; eval applies instantly.
    for (const line of this.reveals) {
      line.target = win(progress, line.win);
      if (isEvalMode) {
        line.value = line.target;
        this.applyReveal(line);
      }
    }
  }

  /** Live-only scrub:2 catch-up (text color is the only lagged channel). */
  private tickLag(dt: number): void {
    const k = 1 - Math.exp(-dt * REVEAL_LAG_K);
    for (const line of this.reveals) {
      const delta = line.target - line.value;
      if (Math.abs(delta) < 0.001) continue;
      line.value += delta * k;
      this.applyReveal(line);
    }
  }

  private applyReveal(line: RevealLine): void {
    line.el.style.color = mixHex(REVEAL_FROM, REVEAL_TO, easeInOutCubic(clamp01(line.value)));
  }

  /* ---- colorway src-swap (CONFIG_CHANGE → instant re-src, §8 row 11) ----- */

  private applyFinish(finish: string): void {
    if (finish === this.finish || !finish) return;
    // Preflight ONE probe from the new set: a colorway whose gallery
    // masters have not landed yet (P4 file-drop contract) keeps the
    // current stills — never a broken-image frame.
    this.pendingFinish = finish;
    const probe = new Image();
    probe.onload = () => {
      if (this.pendingFinish !== finish) return; // superseded mid-flight
      this.pendingFinish = null;
      this.finish = finish;
      for (let i = 0; i < this.stills.length; i++) {
        const url = `${GALLERY_BASE}${finish}_${i + 1}.webp`;
        const still = this.stills[i];
        if (!still) continue;
        still.source.srcset = url;
        still.img.src = url;
      }
      this.colorwayEl.textContent = configLabel(finish);
    };
    probe.onerror = () => {
      if (this.pendingFinish === finish) this.pendingFinish = null;
      if (!this.warnedFinishes.has(finish)) {
        this.warnedFinishes.add(finish);
        console.warn(
          `Images: no gallery set at ${GALLERY_BASE}${finish}_{1..${STILL_COUNT}}.webp — ` +
            "keeping current stills (P4 file-drop pending)",
        );
      }
    };
    probe.src = `${GALLERY_BASE}${finish}_1.webp`;
  }

  /* ---- lifecycle ---------------------------------------------------------- */

  override onEnterCenter(): void {
    this.element.classList.add("is-center");
  }

  override onLeaveCenter(): void {
    this.element.classList.remove("is-center");
  }
}

/* ---- markup helpers -------------------------------------------------------- */

function splitChars(word: string): string {
  return Array.from(word)
    .map((c) => `<span class="gal__char">${c === " " ? "&nbsp;" : c}</span>`)
    .join("");
}
