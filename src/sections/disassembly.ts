/**
 * Disassembly — horology-to-silicon exploded view (PLAN §2 beat 4, P2 build).
 *
 * P2 scope: structure / camera / DOM. The raycast drag+tap explode
 * interaction is P3 — this lane ships the exploded LAYOUT on the hero GLB's
 * real separate meshes (crystal, screen, backCrystal, lug screws) plus the
 * in-house internals roster (sip / battery / taptic — all landed, stubs
 * keep slots if an asset ever fails), the copy grammar (struck-through
 * horology terms over silicon truths), and the authored camera + attitude.
 *
 * Motion law (docs/p15/motion-bible.md — nothing invented):
 *   - WebGL channel = scrub-FRACTION domain, timeline padded to 1 (law 4);
 *     beats on the grid: dolly .75 @0 · explode .75 @0 · re-assembly .25
 *     @.75 · screw cascade inside .1–.35 · attitude restored by .9+.1
 *     (stage-restore law class, §4).
 *   - DOM channel = raw progress fraction; split-char reveals ride
 *     power3.out + linear opacity (scrub:true grammar); grey-line color
 *     reveals are the ONLY lagged consumer (scrub:2 grammar, text color
 *     only) — live lag k=1.8 (τ≈0.55s, ≈2s visual catch-up), EVAL MODE
 *     SNAPS (pure function of scroll, no Snappable needed).
 *   - Camera: ONE big dolly per beat via rig.authorTimeline; parallax gated
 *     OFF during the macro (law 7); longpress zoomMultiplier 1.6 (law 8).
 *   - The watch ATTITUDE is authored (the object turns — source grammar):
 *     `watch.root` is counter-rotated against the product group's idle spin
 *     by quaternion (product⁻¹ · authored · caseSpace⁻¹), blended 0→1→0
 *     inside the webgl window so neighbours and eval captures see the watch
 *     untouched outside this section. The one-frame staleness of the
 *     product quaternion read is exact at rest (captures) and <0.15°/frame
 *     live.
 *
 * Look law (docs/LOOKBIBLE.md): lighting keyframe = instrument.json
 *   Disassembly {rot 70°, envInt 1.1, exposure 1.10} via the infra-gl
 *   driver (sections never invent lighting); scrims per §7.1 from the
 *   ground token; copy inside §8 budgets (P4 polishes wording); type on the
 *   §4 tokens only.
 *
 * State contract: enters needing {explode:"assembled"}, exits guaranteeing
 * {explode:"assembled"} — truthfully: the scrub explode is transient and
 * fully re-assembled by webgl p=1 (and this section never writes the
 * StateStore; P3 mechanics own store writes).
 */

import { gsap } from "gsap";
import { Group, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { EASE } from "../core/constants";
import { extendState } from "../core/debug";
import { isEvalMode } from "../core/determinism";
import { SectionBase, timelineAdapter } from "../core/section";
import type { CameraRig, OrbitProxy } from "../webgl/cameraRig";
import type { Stage } from "../webgl/stage";
import type { WatchAsset } from "../webgl/watch";
import { loadInternals, type LoadedInternal } from "./disassemblyInternals";
import { getStage } from "./stageRef";

/* ------------------------------------------------------------------------- *
 * Explode roster — distances in watch world units along the case dial
 * normal (+z), twist = decorative part yaw at full explode (source
 * xplodRotation grammar, ±.1π class). Order here = screen order left→right
 * under the authored attitude (case anchor unlisted, backCrystal behind).
 * ------------------------------------------------------------------------- */

interface HeroSlot {
  part: string;
  dist: number;
  twist: number;
}

const HERO_SLOTS: HeroSlot[] = [
  { part: "part_crystal", dist: 2.05, twist: 0.18 },
  { part: "part_screen", dist: 1.6, twist: -0.12 },
  { part: "part_backCrystal", dist: -0.8, twist: 0.16 },
];

/** Internals stack: base = resting offset under the display, inside the case. */
interface InternalSlot {
  part: string;
  base: number;
  dist: number;
}

const INTERNAL_LAYOUT: InternalSlot[] = [
  { part: "part_sip", base: -0.04, dist: 1.3 },
  { part: "part_battery", base: -0.1, dist: 0.92 },
  { part: "part_taptic", base: -0.16, dist: 0.58 },
];

const SCREW_PARTS = [
  "band_lugScrew_01",
  "band_lugScrew_02",
  "band_lugScrew_03",
  "band_lugScrew_04",
  "band_lugScrew_05",
  "band_lugScrew_06",
  "band_lugScrew_07",
  "band_lugScrew_08",
];
const SCREW_LIFT = 0.2; // world units along +z
const SCREW_SPIN = -Math.PI * 2; // one full counter-turn (source grammar)

/* The copy grammar: struck horology term → silicon truth (name ≤22 chars,
 * LOOKBIBLE §8 explode-label budget; unique descriptions land with P3's
 * click-explore overlay). Anchor = explode node the hairline tracks. */
interface LabelSpec {
  anchor: string;
  index: string;
  struck: string;
  real: string;
}

const LABELS: LabelSpec[] = [
  { anchor: "part_crystal", index: "01", struck: "hesalite dome", real: "sapphire crystal" },
  { anchor: "part_screen", index: "02", struck: "guilloché dial", real: "LTPO3 OLED · 1 Hz" },
  { anchor: "part_sip", index: "03", struck: "mainplate", real: "S10 SiP" },
  { anchor: "part_battery", index: "04", struck: "mainspring barrel", real: "35.3 mAh cell" },
  { anchor: "part_taptic", index: "05", struck: "hammer & gongs", real: "Taptic Engine" },
  { anchor: "part_backCrystal", index: "06", struck: "tourbillon", real: "optical heart sensor" },
];

/* Authored attitude (case axes → world): yaw about world Y drifts across
 * the beat (the object turns — the section's one orbit-class move), slight
 * pitch looks down the explode line. Values tuned on rendered frames. */
const ATT_YAW_IN = -0.55; // rad — dial 3/4 toward camera, parts open left-near
const ATT_YAW_OUT = -0.95; // rad — the fan settles toward the flatter line read
const ATT_PITCH = 0.1; // rad — gentle cascade on the line

/* ------------------------------------------------------------------------- *
 * Section
 * ------------------------------------------------------------------------- */

interface ExplodeNode {
  node: Object3D;
  basePos: Vector3;
  baseQuat: Quaternion;
  /** Parent-local direction that equals +1 world unit along case +z. */
  dirLocal: Vector3;
  /** Case +z expressed in the node's local frame (twist/spin axis). */
  axisLocal: Vector3;
  dist: number;
  twist: number;
}

interface ScrewNode extends ExplodeNode {
  phase: number; // cascade offset 0..1
}

/** Per-frame animated values — driven ONLY by the paused webgl timeline. */
interface FxState {
  explode: number;
  attitude: number;
  screws: number;
  turn: number;
}

export class DisassemblySection extends SectionBase {
  private readonly stage: Stage | null;
  private watch: WatchAsset | null = null;

  private readonly fx: FxState = { explode: 0, attitude: 0, screws: 0, turn: 0 };
  private heroNodes: ExplodeNode[] = [];
  private screwNodes: ScrewNode[] = [];
  private internalWrappers = new Map<string, Group>();
  private internals: LoadedInternal[] | null = null;
  private internalsReady = false;
  private explodeInitDone = false;
  private wasActive = false;
  private inViewFlag = false;

  /* Label DOM */
  private labelEls: { spec: LabelSpec; el: HTMLElement; rule: HTMLElement; textH: number }[] = [];
  private labelsWrap: HTMLElement | null = null;

  /* Grey-line lag (scrub:2 grammar — text color only, motion bible law 5) */
  private colorTl: gsap.core.Timeline | null = null;
  private colorCurrent = 0;
  private colorTarget = 0;
  private lastLagMs: number | null = null;
  private static readonly COLOR_LAG_K = 1.8;

  /* Scratch (no per-frame allocation) */
  private readonly qProduct = new Quaternion();
  private readonly qAuthored = new Quaternion();
  private readonly qCaseInv = new Quaternion();
  private readonly qRoot = new Quaternion();
  private readonly qTmp = new Quaternion();
  private readonly qIdentity = new Quaternion();
  private readonly vTmp = new Vector3();
  private readonly vTmp2 = new Vector3();
  private readonly mTmp = new Matrix4();

  constructor(private readonly rig: CameraRig) {
    super({
      name: "Disassembly",
      startOffset: -0.25,
      endOffset: 0.25,
      requiredEnterState: { explode: "assembled" },
      guaranteedExitState: { explode: "assembled" },
      // Macro beat: hold-zoom dives deeper here (motion bible law 8).
      zoomMultiplier: 1.6,
    });

    this.stage = getStage();
    injectStyles();
    this.renderDom();
    this.buildDomTimeline();
    this.buildWebglTimeline();
    this.authorCamera();

    // Internals load starts at construction (needed by the time the user
    // scrolls to section 4; NOT a loader task — first paint never waits on
    // them, source-parity progressive loading).
    if (this.stage) {
      void loadInternals(this.stage.renderer).then((loaded) => {
        this.internals = loaded;
        this.internalsReady = true;
      });
    } else {
      this.internalsReady = true; // exotic embedding: slots become stubs
    }

    extendState("disassembly", () => ({
      internals: this.internalWrappers.size,
      internalsReady: this.internalsReady && (this.explodeInitDone || this.stage?.watch == null),
      explode: Math.round(this.fx.explode * 1e4) / 1e4,
    }));
  }

  /* ---- channels ---------------------------------------------------------- */

  override tickWebgl(progress: number): void {
    super.tickWebgl(progress); // scrubs the fx timeline
    this.rig.setProgress(progress); // camera master (rig lerps internally)
    this.applyExplode();
    this.projectLabels();
  }

  override tickDom(progress: number): void {
    super.tickDom(progress); // scrubs the main DOM timeline
    this.tickColorLag(progress);
  }

  override onEnter(): void {
    this.inViewFlag = true;
  }

  override onLeave(): void {
    this.inViewFlag = false;
  }

  /* ---- DOM --------------------------------------------------------------- */

  private renderDom(): void {
    const pin = this.element.querySelector<HTMLElement>(".pin");
    if (!pin) return;
    pin.innerHTML = `
      <div class="dis">
        <div class="dis__ghost dis__ghost--four" aria-hidden="true"><s>4&nbsp;Hz</s></div>
        <div class="dis__ghost dis__ghost--one" aria-hidden="true">1&nbsp;Hz</div>
        <div class="dis__hint">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="13" cy="13" r="11" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3.4"/>
            <circle class="dis__hint-dot" cx="13" cy="13" r="2.4" fill="currentColor"/>
          </svg>
          <span>Drag &amp; tap to explore</span>
        </div>
        <div class="dis__copy dis__copy--a">
          <p class="dis__eyebrow">Movement, opened</p>
          <h2 class="dis__headline">Every mechanism has a pulse.</h2>
          <p class="dis__body">Haute horlogerie worships the 4&nbsp;Hz balance wheel.</p>
        </div>
        <div class="dis__lines" aria-hidden="false">
          <p class="dis__line">No mainspring. No going train.</p>
          <p class="dis__line">A cell, a brain, a coil.</p>
          <p class="dis__line">Nothing here needs winding.</p>
        </div>
        <div class="dis__copy dis__copy--b">
          <p class="dis__eyebrow">Regulation</p>
          <h2 class="dis__headline">This one beats at 1&nbsp;Hz.</h2>
          <p class="dis__body">Twelve parts stand in for four hundred. An optical heart reads yours, and answers once a second.</p>
        </div>
        <div class="dis__labels">
          <div class="dis__labelscrim" aria-hidden="true"></div>
        </div>
      </div>`;

    this.labelsWrap = pin.querySelector<HTMLElement>(".dis__labels");
    if (this.labelsWrap) {
      for (const spec of LABELS) {
        const el = document.createElement("div");
        el.className = "dis__label";
        el.innerHTML =
          `<span class="dis__label-rule"></span>` +
          `<p class="dis__label-text"><span class="dis__label-index tnum">${spec.index}</span>` +
          `&nbsp;&nbsp;<s>${spec.struck}</s>&nbsp;&nbsp;<em>${spec.real}</em></p>`;
        this.labelsWrap.appendChild(el);
        const rule = el.querySelector<HTMLElement>(".dis__label-rule");
        if (rule) this.labelEls.push({ spec, el, rule, textH: 0 });
      }
    }
  }

  /**
   * DOM scrub timeline — raw-progress fraction domain, padded to 1.
   * Split-char reveals: chars slide x -100%→0 power3.out with linear
   * opacity over the first half (the scrub:true transform grammar).
   */
  private buildDomTimeline(): void {
    const q = (sel: string): HTMLElement | null =>
      this.element.querySelector<HTMLElement>(sel);
    const hint = q(".dis__hint");
    const ghostFour = q(".dis__ghost--four");
    const ghostOne = q(".dis__ghost--one");
    const copyA = q(".dis__copy--a");
    const copyB = q(".dis__copy--b");
    const lines = q(".dis__lines");
    const lineEls = [...this.element.querySelectorAll<HTMLElement>(".dis__line")];

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    if (hint) {
      tl.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.03);
      tl.to(hint, { opacity: 0, duration: 0.05 }, 0.85);
    }

    // Ghost thesis: the horology frequency departs (power3.in — violent-ish
    // background-letter grammar), ours arrives from off-frame (power3.out).
    if (ghostFour) {
      tl.to(ghostFour, { x: "-60vw", ease: "power3.in", duration: 0.45 }, 0.1);
    }
    if (ghostOne) {
      tl.fromTo(
        ghostOne,
        { x: "58vw" },
        { x: "0vw", ease: EASE.exit, duration: 0.3 },
        0.3,
      );
    }

    // Copy A — split-char in, departure up (power2.in).
    if (copyA) {
      tl.fromTo(copyA, { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.04);
      const chars = splitChars(copyA.querySelector<HTMLElement>(".dis__headline"));
      chars.forEach((c, i) => {
        const at = 0.055 + i * 0.0035;
        // Catalog-title char grammar: rise from below the clip (partial
        // glyphs read as emerging, never mirrored — clean at any scrub).
        tl.fromTo(c, { yPercent: 110 }, { yPercent: 0, ease: EASE.exit, duration: 0.07 }, at);
        tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.035 }, at);
      });
      tl.to(copyA, { opacity: 0, yPercent: -22, ease: EASE.enter, duration: 0.05 }, 0.28);
    }

    // Grey-line reveal block visibility (color tweens live in colorTl).
    if (lines) {
      tl.fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.32);
      tl.to(lines, { opacity: 0, duration: 0.05 }, 0.62);
    }

    // Explode labels — linear opacity (source label grammar).
    if (this.labelsWrap) {
      tl.fromTo(this.labelsWrap, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.36);
      tl.to(this.labelsWrap, { opacity: 0, duration: 0.04 }, 0.7);
    }

    // Copy B — arrives as the movement re-assembles.
    if (copyB) {
      tl.fromTo(copyB, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.7);
      const chars = splitChars(copyB.querySelector<HTMLElement>(".dis__headline"));
      chars.forEach((c, i) => {
        const at = 0.71 + i * 0.004;
        tl.fromTo(c, { yPercent: 110 }, { yPercent: 0, ease: EASE.exit, duration: 0.07 }, at);
        tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.035 }, at);
      });
      tl.to(copyB, { opacity: 0, yPercent: -18, ease: EASE.enter, duration: 0.05 }, 0.93);
    }

    tl.set({}, {}, 1); // pad — every timeline states its domain (law 4)
    this.addDomAdapter(timelineAdapter(tl));

    // scrub:2 color reveals — separate lagged timeline, per-line windows
    // alternating offsets (source 15/25 pattern), greys per LOOKBIBLE §7.3
    // (#BCBCBC → #323232 on light ground).
    const ctl = gsap.timeline({ paused: true, defaults: { ease: EASE.default } });
    lineEls.forEach((line, i) => {
      const offset = i % 2 === 0 ? 0 : 0.02; // the 15/25 alternation, scaled
      ctl.fromTo(
        line,
        { color: "#BCBCBC" },
        { color: "#323232", duration: 0.09 },
        0.36 + i * 0.055 + offset,
      );
    });
    ctl.set({}, {}, 1);
    this.colorTl = ctl;
  }

  /** Live-only exponential catch-up (k=1.8); eval mode snaps (determinism). */
  private tickColorLag(progress: number): void {
    if (this.colorTl === null) return;
    this.colorTarget = progress;
    if (isEvalMode) {
      this.colorCurrent = progress;
    } else {
      const now = performance.now();
      const dt = this.lastLagMs === null ? 0 : Math.min(0.1, (now - this.lastLagMs) / 1000);
      this.lastLagMs = now;
      const k = 1 - Math.exp(-dt * DisassemblySection.COLOR_LAG_K);
      this.colorCurrent += (this.colorTarget - this.colorCurrent) * k;
    }
    this.colorTl.progress(this.colorCurrent);
  }

  /* ---- WebGL ------------------------------------------------------------- */

  /** Fx timeline — scrub-fraction domain, beats on the motion-bible grid. */
  private buildWebglTimeline(): void {
    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE.default } });
    tl.to(this.fx, { attitude: 1, duration: 0.25 }, 0); // authored attitude in
    tl.to(this.fx, { turn: 1, ease: "none", duration: 1 }, 0); // slow object turn
    tl.to(this.fx, { explode: 1, duration: 0.75 }, 0); // the fan-out
    tl.to(this.fx, { screws: 1, duration: 0.25 }, 0.1); // unscrew cascade
    tl.to(this.fx, { explode: 0, duration: 0.25 }, 0.75); // re-assembly (law)
    tl.to(this.fx, { screws: 0, duration: 0.15 }, 0.8);
    tl.to(this.fx, { attitude: 0, duration: 0.1 }, 0.9); // restored before handoff
    tl.set({}, {}, 1);
    this.addWebglAdapter(timelineAdapter(tl));
  }

  /**
   * Camera beats (rig.authorTimeline — replaces the Spike-B proving-ground
   * beats, keeping the wiring; docs/p1/engine.md anticipated exactly this).
   * ONE dolly per beat; parallax gated off for the macro; pull-back handoff
   * pose lands near the hero read for Mechanism.
   */
  private authorCamera(): void {
    this.rig.authorTimeline((proxy: OrbitProxy) => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE.default } });
      tl.to(proxy, { parallaxMultiplier: 0, duration: 0.1 }, 0);
      tl.to(
        proxy,
        {
          theta: 0.16,
          phi: 1.36,
          radius: 5.15,
          targetX: -0.62,
          targetY: -0.1,
          fov: 33,
          duration: 0.75,
        },
        0,
      );
      tl.to(
        proxy,
        {
          theta: 0.2,
          phi: 1.33,
          radius: 5.9,
          targetX: 0,
          targetY: 0.15,
          fov: 35,
          duration: 0.25,
        },
        0.75,
      );
      tl.to(proxy, { parallaxMultiplier: 1, duration: 0.1 }, 0.9);
      tl.set({}, {}, 1);
      return tl;
    });
  }

  /** Lazy explode init once the hero GLB is adopted. */
  private initExplode(watch: WatchAsset): void {
    this.watch = watch;
    this.qCaseInv.copy(watch.caseSpace.quaternion).invert();

    watch.root.updateWorldMatrix(true, true);
    const rootQuat = watch.root.getWorldQuaternion(this.qTmp);
    // Case +z in CURRENT world space (product rotation cancels in the
    // parent-local conversion below because both matrices share it).
    const worldDir = watch.caseSpace.zAxis.clone().applyQuaternion(rootQuat);
    const worldOrigin = watch.root.getWorldPosition(new Vector3());

    const capture = (node: Object3D, dist: number, twist: number): ExplodeNode => {
      const parent = node.parent ?? watch.root;
      this.mTmp.copy(parent.matrixWorld).invert();
      const a = worldOrigin.clone().applyMatrix4(this.mTmp);
      const b = worldOrigin.clone().add(worldDir).applyMatrix4(this.mTmp);
      const dirLocal = b.sub(a); // parent-local, scale-aware (NOT normalized)
      const nodeInv = this.mTmp.copy(node.matrixWorld).invert();
      const a2 = worldOrigin.clone().applyMatrix4(nodeInv);
      const b2 = worldOrigin.clone().add(worldDir).applyMatrix4(nodeInv);
      const axisLocal = b2.sub(a2).normalize();
      return {
        node,
        basePos: node.position.clone(),
        baseQuat: node.quaternion.clone(),
        dirLocal,
        axisLocal,
        dist,
        twist,
      };
    };

    this.heroNodes = [];
    for (const slot of HERO_SLOTS) {
      const node = watch.parts.get(slot.part);
      if (node) this.heroNodes.push(capture(node, slot.dist, slot.twist));
      else console.warn(`disassembly: hero part "${slot.part}" missing from GLB`);
    }
    this.screwNodes = [];
    SCREW_PARTS.forEach((name, k) => {
      const node = watch.parts.get(name);
      if (node) {
        this.screwNodes.push({ ...capture(node, SCREW_LIFT, 0), phase: k / SCREW_PARTS.length });
      }
    });

    this.explodeInitDone = true;
  }

  /** Attach loaded internals under the watch root (case-frame aligned). */
  private attachInternals(watch: WatchAsset): void {
    if (this.internals === null) return;
    const cs = watch.caseSpace;
    for (const item of this.internals) {
      if (this.internalWrappers.has(item.spec.name)) continue;
      const wrapper = item.wrapper;
      wrapper.quaternion.copy(cs.quaternion); // case frame: +z = dial normal
      wrapper.visible = false;
      watch.root.add(wrapper);
      this.internalWrappers.set(item.spec.name, wrapper);
    }
  }

  /** Per-frame explode application — pure function of the fx values. */
  private applyExplode(): void {
    const stage = this.stage;
    if (stage === null) return;
    if (!this.explodeInitDone) {
      const watch = stage.watch;
      if (watch === null) return;
      this.initExplode(watch);
    }
    const watch = this.watch;
    if (watch === null) return;
    if (this.internals !== null && this.internalWrappers.size === 0) {
      this.attachInternals(watch);
    }

    const { explode, attitude, screws, turn } = this.fx;
    const active = explode > 0 || attitude > 0 || screws > 0;
    if (!active) {
      if (this.wasActive) this.restoreBase(watch);
      return;
    }
    this.wasActive = true;

    // --- Authored attitude: root counter-rotated against the product spin.
    const product = watch.root.parent;
    if (product && attitude > 0) {
      product.getWorldQuaternion(this.qProduct);
      const yaw = ATT_YAW_IN + (ATT_YAW_OUT - ATT_YAW_IN) * turn;
      this.qAuthored.setFromAxisAngle(this.vTmp.set(0, 1, 0), yaw);
      this.qTmp.setFromAxisAngle(this.vTmp.set(1, 0, 0), ATT_PITCH);
      this.qAuthored.premultiply(this.qTmp); // pitch ∘ yaw
      this.qRoot
        .copy(this.qProduct)
        .invert()
        .multiply(this.qAuthored)
        .multiply(this.qCaseInv);
      watch.root.quaternion.copy(this.qIdentity).slerp(this.qRoot, attitude);
    } else {
      watch.root.quaternion.identity();
    }

    // --- Hero parts fan out along the dial normal (+ decorative twist).
    for (const h of this.heroNodes) {
      h.node.position
        .copy(h.basePos)
        .addScaledVector(h.dirLocal, h.dist * explode);
      if (h.twist !== 0) {
        this.qTmp.setFromAxisAngle(h.axisLocal, h.twist * explode);
        h.node.quaternion.copy(h.baseQuat).multiply(this.qTmp);
      }
    }

    // --- Lug screws: counter-rotate + lift, cascade (source grammar).
    for (const s of this.screwNodes) {
      const t = clamp01(screws * 1.5 - s.phase * 0.5);
      s.node.position.copy(s.basePos).addScaledVector(s.dirLocal, SCREW_LIFT * t);
      this.qTmp.setFromAxisAngle(s.axisLocal, SCREW_SPIN * t);
      s.node.quaternion.copy(s.baseQuat).multiply(this.qTmp);
    }

    // --- Internals ride the same axis in root space (case frame).
    const cs = watch.caseSpace;
    for (const slot of INTERNAL_LAYOUT) {
      const wrapper = this.internalWrappers.get(slot.part);
      if (!wrapper) continue;
      wrapper.visible = explode > 0.02;
      const d = slot.base + slot.dist * explode;
      wrapper.position.copy(cs.origin).addScaledVector(cs.zAxis, d);
    }
  }

  private restoreBase(watch: WatchAsset): void {
    watch.root.quaternion.identity();
    for (const h of this.heroNodes) {
      h.node.position.copy(h.basePos);
      h.node.quaternion.copy(h.baseQuat);
    }
    for (const s of this.screwNodes) {
      s.node.position.copy(s.basePos);
      s.node.quaternion.copy(s.baseQuat);
    }
    for (const wrapper of this.internalWrappers.values()) wrapper.visible = false;
    this.wasActive = false;
  }

  /* ---- Label projection (hairlines track their parts) --------------------- */

  private projectLabels(): void {
    if (!this.inViewFlag || this.stage === null || this.labelEls.length === 0) return;
    const camera = this.stage.camera;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const bottomPad = vh * 0.05; // matches .dis__label bottom: 5svh

    for (const entry of this.labelEls) {
      const anchor = this.resolveAnchor(entry.spec.anchor);
      if (!anchor) {
        entry.el.style.visibility = "hidden";
        continue;
      }
      anchor.getWorldPosition(this.vTmp2);
      this.vTmp2.project(camera);
      if (this.vTmp2.z > 1) {
        entry.el.style.visibility = "hidden";
        continue;
      }
      const x = (this.vTmp2.x * 0.5 + 0.5) * vw;
      const y = (-this.vTmp2.y * 0.5 + 0.5) * vh;
      if (x < 30 || x > vw - 30) {
        entry.el.style.visibility = "hidden";
        continue;
      }
      if (entry.textH === 0) {
        const text = entry.el.querySelector<HTMLElement>(".dis__label-text");
        entry.textH = text ? text.getBoundingClientRect().height : 120;
      }
      const ruleTopTarget = y + vh * 0.16; // clearance below the part
      const ruleBottom = vh - bottomPad - entry.textH - 12;
      const h = Math.max(18, ruleBottom - ruleTopTarget);
      entry.el.style.visibility = "visible";
      entry.el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      entry.rule.style.height = `${h.toFixed(0)}px`;
    }
  }

  private resolveAnchor(name: string): Object3D | null {
    const wrapper = this.internalWrappers.get(name);
    if (wrapper) return wrapper;
    return this.watch?.parts.get(name) ?? null;
  }
}

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Split a headline into word-wrapped char spans (words keep their wrap
 * points; chars are the animated unit — split-char word reveal grammar).
 */
function splitChars(el: HTMLElement | null): HTMLElement[] {
  if (!el) return [];
  const text = el.textContent ?? "";
  el.textContent = "";
  const chars: HTMLElement[] = [];
  for (const word of text.split(" ")) {
    const wordEl = document.createElement("span");
    wordEl.className = "dis__word";
    for (const ch of word) {
      const clip = document.createElement("span");
      clip.className = "dis__char-clip";
      const c = document.createElement("span");
      c.className = "dis__char";
      c.textContent = ch;
      clip.appendChild(c);
      wordEl.appendChild(clip);
      chars.push(c);
    }
    el.appendChild(wordEl);
    el.appendChild(document.createTextNode(" "));
  }
  return chars;
}

/** Section-scoped styles, injected once (self-rendered DOM, no index.html
 * or shared-stylesheet edits). Everything rides the LOOKBIBLE tokens. */
let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.dataset["disassembly"] = "";
  style.textContent = `
.dis {
  position: absolute;
  inset: 0;
  overflow: clip;
}

/* Ghost thesis layer — LOOKBIBLE §4 tone hierarchy (30% ghost), corners
   only (§7.5: never over the watch at low contrast). */
.dis__ghost {
  position: absolute;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(7rem, 19vw, 19rem);
  letter-spacing: var(--track-colossal);
  line-height: 0.8;
  color: color-mix(in srgb, var(--ink) 30%, transparent);
  pointer-events: none;
  user-select: none;
  will-change: transform;
}
.dis__ghost--four { top: 7svh; left: 4vw; }
.dis__ghost--one { bottom: 5svh; right: 4vw; }
.dis__ghost s {
  text-decoration-thickness: 0.045em;
  text-decoration-color: color-mix(in srgb, var(--ink) 60%, transparent);
}

.dis__hint {
  position: absolute;
  top: 5svh;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: var(--track-caps-wide);
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ink) 55%, transparent);
  opacity: 0;
}
.dis__hint-dot {
  animation: dis-hint-pulse 1s steps(2, jump-none) infinite; /* 1 Hz */
}
@keyframes dis-hint-pulse {
  0% { opacity: 1; }
  100% { opacity: 0.25; }
}

.dis__copy {
  position: absolute;
  inset-inline: 0;
  bottom: 9svh;
  display: grid;
  gap: 0.6rem;
  justify-items: center;
  text-align: center;
  padding-inline: 1.5rem;
  padding-block: 3.5rem 1.25rem;
  opacity: 0;
  will-change: transform, opacity;
  /* §7.1 scrim — gradient from the ground token, never a hard panel. */
  background: radial-gradient(
    55% 150% at 50% 100%,
    color-mix(in srgb, var(--porcelain) 82%, transparent),
    transparent 70%
  );
}
.dis__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: var(--track-caps-wide);
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ink) 55%, transparent);
}
.dis__headline {
  font-family: var(--font-display);
  font-size: var(--type-headline);
  font-weight: 300;
  letter-spacing: var(--track-title);
  line-height: 1.05;
  color: var(--ink);
}
.dis__word { display: inline-block; white-space: nowrap; }
.dis__char-clip { display: inline-block; overflow: clip; vertical-align: top; }
.dis__char { display: inline-block; will-change: transform; }
.dis__body {
  font-size: clamp(0.95rem, 1.6vw, 1.15rem);
  color: color-mix(in srgb, var(--ink) 65%, transparent);
}

/* Grey-line color reveals (scrub:2 grammar) — upper-left, clear of the
   explode line; scrim from the ground token fading to 0 (§7.1). */
.dis__lines {
  position: absolute;
  left: 5vw;
  top: 15svh;
  display: grid;
  gap: 0.55rem;
  padding: 2rem 5rem 2.5rem 1.75rem;
  opacity: 0;
  background: radial-gradient(
    130% 120% at 12% 40%,
    color-mix(in srgb, var(--porcelain) 55%, transparent),
    transparent 72%
  );
}
.dis__line {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--type-title);
  letter-spacing: var(--track-title);
  color: #bcbcbc; /* reveal start grey — motion-bible §3 / LOOKBIBLE §7.3 */
}

/* Explode labels — hairline drops to rotated struck-horology captions
   (source Disassembly grammar). */
.dis__labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}
.dis__labelscrim {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 36svh;
  background: linear-gradient(
    0deg,
    color-mix(in srgb, var(--porcelain) 55%, transparent),
    transparent
  );
}
.dis__label {
  position: absolute;
  bottom: 5svh;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 0;
  visibility: hidden;
  will-change: transform;
}
.dis__label-rule {
  width: 1px;
  height: 120px;
  background: color-mix(in srgb, var(--ink) 22%, transparent);
}
.dis__label-text {
  margin-top: 0.7rem;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 0.72rem;
  letter-spacing: var(--track-caps);
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ink) 85%, transparent);
}
.dis__label-text .dis__label-index {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: color-mix(in srgb, var(--ink) 35%, transparent);
}
.dis__label-text s {
  font-family: var(--font-mono);
  font-weight: 400;
  font-size: 0.62rem;
  color: color-mix(in srgb, var(--ink) 45%, transparent);
  text-decoration-color: color-mix(in srgb, var(--ink) 45%, transparent);
}
.dis__label-text em { font-style: normal; }

/* Mobile: labels thin out (P3 owns the tap-explore detail surface). */
@media (max-width: 720px) {
  .dis__lines { top: 12svh; padding-right: 2rem; }
  .dis__line { font-size: clamp(1.05rem, 4.2vw, 1.375rem); }
  .dis__label-text s { display: none; }
  .dis__ghost { font-size: 26vw; }
}
`;
  document.head.appendChild(style);
}
