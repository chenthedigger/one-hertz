/**
 * Exploded-view interaction system — recon mechanic 3, full P3 build
 * (PLAN §1 mechanic 3 / evals/rubric.yaml explode ×8 sub-mechanics).
 *
 * Owned by DisassemblySection (one instance). Responsibilities:
 *
 *   1. PROXY HITBOXES — every roster part gets an invisible bounding-box
 *      proxy Mesh (node-local bbox × margin, dimensions floored so thin
 *      wafers stay generously clickable). The raycaster sees ONLY proxies,
 *      never the high-poly meshes (three-mesh-bvh not needed — 10 boxes).
 *   2. TAP/CLICK SELECT — pointerup with ≤15 px travel and a hold shorter
 *      than the longpress arm (500 ms) raycasts the proxies and emits
 *      SET_CLICKED_MESH; the camera lookAt LERPS to the part (blend tween
 *      2 s open / 1.6 s close, power3.inOut — motion-bible §5 pacing) via
 *      `rig.setPoseOverride`; the selected part idle-rotates
 *      rotation.y += dt·0.15 (source-exact); a DOM overlay anchored to the
 *      part's projected screen position carries the unique
 *      horology-to-silicon copy (LOOKBIBLE §8 budgets), a close button
 *      (cross cursor icon) and prev/next arrows
 *      (NEXT_PREVIOUS_CLICKED_MESH, arrow cursor icons).
 *   3. XPLOD_ALL — bus event fans every part out (2 s on / 1 s off,
 *      dist ×1.65 at full — source constants); the scroll-driven fan beat
 *      reports mode "all" at full spread too.
 *   4. DRAG-TO-PAN — horizontal drag yaws the exploded cluster; gated OFF
 *      while a part is selected (rubric explode-drag-gating). Touch drags
 *      stop Lenis + preventDefault for their lifetime (gesture
 *      arbitration, PLAN §3); vertical-dominant touch travel stays a
 *      scroll. Drag input is applied directly (no added smoothing lerp —
 *      single-smoothing-owner law; Lenis glide + pointer cadence carry the
 *      feel).
 *   5. TAPTIC TICK-BACK graft (PLAN §2): hovering part_taptic oscillates
 *      `taptic_mass` ±0.4 mm at ~8 Hz along its local X (1.2 mm clearance
 *      honored), phase from wallSeconds() — real-time live, FROZEN under
 *      `?eval=1` (determinism kit). navigator.vibrate(10) fires as
 *      Android-only garnish where supported; the visual is primary.
 *   6. NOCTURNE LED — while Nocturne owns the viewport center (gate wired
 *      from the registry lifecycle in main.ts), the sensor array's
 *      `led_green` material pulses at real 1 Hz wall-clock (the only
 *      sanctioned wall-time consumer class — it derives from wallSeconds(),
 *      frozen in eval); `led_red` is forced dark.
 *
 * State: registers the `explode` extension on state() — the rubric's
 * mechanic-3 substrate {parts[], selected, selectedRotationY,
 * selectedScreenPos, mode, clusterRotation, …}. The StateStore `explode`
 * axis keeps its token bridge (assembled / exploded / part-focus) via
 * api.applyState; the token also rides the snapshot as `token`.
 *
 * Determinism: everything scrub-driven stays a pure function of scroll.
 * The wall-clock tweens (focus blend, XPLOD_ALL ramp) and the selected-part
 * idle rotation live in the interaction-intensity domain (same class as
 * the longpress ramp); taptic/LED phases derive from wallSeconds() and
 * freeze under ?eval=1.
 */

import { gsap } from "gsap";
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { EASE, LONGPRESS_HOLD_MS } from "../core/constants";
import {
  extendState,
  type ExplodePartSnapshot,
  type ExplodeStateSnapshot,
  type OneHertzDebugApi,
} from "../core/debug";
import { wallSeconds } from "../core/determinism";
import { bus, EngineEvent } from "../core/events";
import type { CameraPoseOverride, CameraRig } from "../webgl/cameraRig";
import type { Stage } from "../webgl/stage";

/* ------------------------------------------------------------------------- *
 * Roster + copy (LOOKBIBLE §8: name ≤22 chars, description 90–140 chars,
 * UNIQUE per part — outdoing the source's shared placeholder, PLAN §1).
 * PART_ORDER is the manifest order prev/next cycles through (screen order
 * along the fan, dial side → case back, laterals after their plane).
 * ------------------------------------------------------------------------- */

export interface ExplodePartCopy {
  name: string;
  desc: string;
}

export const PART_ORDER: readonly string[] = [
  "part_crystal",
  "part_screen",
  "part_display",
  "part_sip",
  "part_battery",
  "part_speaker",
  "part_taptic",
  "part_sensor_array",
  "part_crown_asm",
  "part_backCrystal",
];

export const PART_COPY: Record<string, ExplodePartCopy> = {
  part_crystal: {
    name: "Sapphire crystal",
    desc: "Grown, not ground: a single synthetic corundum disc, 9 on Mohs. The hesalite dome it replaces scratched if you looked at it wrong.",
  },
  part_screen: {
    name: "LTPO3 OLED · 1 Hz",
    desc: "A dial that breathes at one hertz: LTPO3 silicon slows the refresh to a heartbeat, so the always-on face sips power all night long.",
  },
  part_display: {
    // The sapphire is part 01 — this laminate is what lives beneath it.
    name: "Display laminate",
    desc: "Three wafers in a sandwich: the touch layer, the OLED itself, and a stamped steel shield whose kapton tails feed the case one brain.",
  },
  part_sip: {
    name: "S10 SiP",
    desc: "An entire movement poured into resin: CPU, GPU, neural engine and storage in one system-in-package where a mainplate would carry gears.",
  },
  part_battery: {
    // 42 hours = the Apple-published power reserve (apple.com Ultra 3 specs)
    // — a barrel is specced by its reserve, so the cell is too.
    name: "42-hour cell",
    desc: "The mainspring barrel, replaced: a crimped-foil pouch holding a 42-hour reserve. It winds itself from a puck every night, never from a key.",
  },
  part_speaker: {
    name: "Speaker cassette",
    desc: "A racetrack voice coil that doubles as a pump: after a dive it plays a tone tuned to shove the water back out of its own grille.",
  },
  part_taptic: {
    name: "Taptic Engine",
    desc: "Hammer and gongs, condensed: tungsten masses on a sprung rail, snapped by a copper coil to tick against your wrist once per detent.",
  },
  part_sensor_array: {
    name: "Optical heart sensor",
    desc: "The tourbillon of this movement: green LEDs and photodiodes read the blood under your skin and regulate the whole watch, once a second.",
  },
  part_crown_asm: {
    name: "Digital Crown",
    desc: "Still a crown, still knurled, but it winds an optical encoder drum instead of a spring, and its dome reads the current of your heart.",
  },
  part_backCrystal: {
    name: "Back crystal",
    desc: "A ceramic-and-sapphire porthole: the engraved dive ring outside, the sensor bay within, and not a single jewel bearing between them.",
  },
};

/* ---- Tunables ------------------------------------------------------------- */

/** Proxy hitbox inflation over the part's tight bbox (generous hit areas). */
const PROXY_MARGIN = 1.18;
/** Minimum proxy dimension, world units — thin wafers stay clickable. */
const PROXY_MIN_DIM = 0.16;
/** Tap tolerance: press travel ≤ this is a select, beyond is a drag (px). */
const TAP_TOLERANCE_PX = 15;
/** Cluster drag sensitivity (rad of yaw per px of horizontal travel). */
const DRAG_YAW_PER_PX = 0.006;
/** Selected-part idle spin (rad/s — source-exact `rotation.y += dt*0.15`). */
const SELECTED_SPIN_RAD_S = 0.15;
/** Focus (click-zoom) pacing: 2 s open / 1.6 s close (motion bible §5). */
const FOCUS_OPEN_S = 2;
const FOCUS_CLOSE_S = 1.6;
/** Focus target chase constant (k=3 — the source's lookAt dt·3, bible §6). */
const FOCUS_TARGET_LERP = 3;
/** XPLOD_ALL pacing: 2 s on / 1 s off; dist multiplier 1.65 at full. */
const XPLOD_ON_S = 2;
const XPLOD_OFF_S = 1;
const XPLOD_DIST_MULT = 0.65;
/** Scrub fan spread at/above this reports mode "all" (rubric xplod-all). */
const MODE_ALL_THRESHOLD = 0.7;
/** Focus camera pose (the fan-beat neighborhood; radius = base 4.7 × 0.6). */
const FOCUS_POSE = { theta: 0.16, phi: 1.36, radius: 2.85, fov: 33 };
/** Taptic tick-back: ±0.4 mm on the mass's local X (parts authored in m). */
const TAPTIC_AMP_LOCAL = 0.0004;
const TAPTIC_HZ = 8;
/** Nocturne LED pulse: peak multiple of the shipped emissive strength. */
const LED_PULSE_FLOOR = 0.18;

/* ---- Nocturne gate (wired from the registry lifecycle in main.ts) --------- */

let nocturneLedGate = false;

/** True while Nocturne owns the viewport center line (main.ts lifecycle). */
export function setNocturneLedGate(on: boolean): void {
  nocturneLedGate = on;
}

/* state() shapes live in core/debug.ts (ExplodePartSnapshot /
 * ExplodeStateSnapshot) — the established extension pattern. */

interface PartEntry {
  id: string;
  node: Object3D;
  proxy: Mesh;
  offsetFromRest(): number;
  /** Internals wrappers need their quaternion re-based each frame. */
  baseQuatEachFrame: Quaternion | null;
}

/* ---- shared invisible proxy material (raycast still hits it) -------------- */

const proxyMaterial = new MeshBasicMaterial({ visible: false });
const UNIT_BOX = new BoxGeometry(1, 1, 1);

/* ------------------------------------------------------------------------- */

export class ExplodeInteraction {
  private readonly parts = new Map<string, PartEntry>();
  private ordered: PartEntry[] = [];

  private selectedId: string | null = null;
  private selectedRotY = 0;
  private hoveredId: string | null = null;

  /* focus (click-zoom) */
  private readonly focus = { blend: 0 };
  private focusTween: gsap.core.Tween | null = null;
  private readonly focusTarget = new Vector3();
  private overrideOn = false;
  private readonly poseOverride: CameraPoseOverride = {
    theta: FOCUS_POSE.theta,
    phi: FOCUS_POSE.phi,
    radius: FOCUS_POSE.radius,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    fov: FOCUS_POSE.fov,
    parallaxScale: 0, // macro law: parallax off while focused
    blend: 0,
  };

  /* XPLOD_ALL */
  private readonly xplod = { value: 0 };
  private xplodTween: gsap.core.Tween | null = null;

  /* drag-pan */
  private dragYaw = 0;
  private gateOpen = false;

  /* pointer gesture */
  private pointerId: number | null = null;
  private downX = 0;
  private downY = 0;
  private downT = 0;
  private lastX = 0;
  private gesture: "idle" | "pending" | "drag" | "scroll" = "idle";
  private touchLenisStopped = false;

  /* taptic tick-back */
  private tapticMass: Object3D | null = null;
  private tapticBaseX = 0;
  private tapticActive = false;
  private tapticOffset = 0;
  private vibrated = false;

  /* nocturne LED */
  private ledGreen: MeshStandardMaterial | null = null;
  private ledRed: MeshStandardMaterial | null = null;
  private ledGreenBase = 1;

  /* overlay DOM */
  private overlayEl: HTMLElement;
  private overlayName: HTMLElement;
  private overlayIndex: HTMLElement;
  private overlayDesc: HTMLElement;
  private overlayH = 0;
  /** Pointer over the card: freeze the anchor so buttons never slide away
   *  from the cursor while the focus lerp is still settling. */
  private overlayHovered = false;

  /* store-token bridge */
  private lastToken = "assembled";

  /* scratch */
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly vTmp = new Vector3();
  private readonly qTmp = new Quaternion();
  private readonly yAxis = new Vector3(0, 1, 0);
  private lastNow: number | null = null;

  private readonly unsub: (() => void)[] = [];

  constructor(
    private readonly stage: Stage,
    private readonly rig: CameraRig,
    pin: HTMLElement,
  ) {
    const overlay = buildOverlay();
    pin.appendChild(overlay.root);
    this.overlayEl = overlay.root;
    this.overlayName = overlay.name;
    this.overlayIndex = overlay.index;
    this.overlayDesc = overlay.desc;
    this.wireOverlay();

    /* Typed bus = the ONE mutation path (pointer input emits into it too —
     * evals drive the same events through api.bus). */
    this.unsub.push(
      bus.on(EngineEvent.SetClickedMesh, ({ part }) => this.select(part)),
      bus.on(EngineEvent.LeaveClickedMesh, () => this.close()),
      bus.on(EngineEvent.NextPreviousClickedMesh, ({ direction }) => this.step(direction)),
      bus.on(EngineEvent.XplodAll, ({ on }) => this.xplodAll(on)),
    );

    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerCancel);
    window.addEventListener("keydown", this.onKeyDown);

    extendState("explode", () => this.snapshot());
  }

  dispose(): void {
    for (const off of this.unsub) off();
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);
    window.removeEventListener("keydown", this.onKeyDown);
    this.endTouchDrag();
    this.overlayEl.remove();
  }

  /* ---- registration ------------------------------------------------------- */

  /**
   * Register a roster part: builds its invisible proxy hitbox as a child of
   * `node` (so it rides every explode/attitude transform for free).
   * `baseQuatEachFrame`: internals wrappers get their orientation re-based
   * to this quaternion every frame BEFORE idle-rotation composition (their
   * quaternion is otherwise written once at attach).
   */
  registerPart(
    id: string,
    node: Object3D,
    offsetFromRest: () => number,
    baseQuatEachFrame: Quaternion | null = null,
  ): void {
    if (this.parts.has(id)) return;
    const proxy = buildProxy(node);
    node.add(proxy);
    proxy.userData["partId"] = id;
    this.parts.set(id, { id, node, proxy, offsetFromRest, baseQuatEachFrame });
    this.ordered = PART_ORDER.filter((p) => this.parts.has(p)).map(
      (p) => this.parts.get(p) as PartEntry,
    );
  }

  /** Find the graft targets inside the loaded internals wrappers. */
  adoptInternalExtras(wrappers: Map<string, Group>): void {
    const taptic = wrappers.get("part_taptic");
    if (taptic && this.tapticMass === null) {
      const mass = taptic.getObjectByName("taptic_mass");
      if (mass) {
        this.tapticMass = mass;
        this.tapticBaseX = mass.position.x;
      }
    }
    const sensor = wrappers.get("part_sensor_array");
    if (sensor && this.ledGreen === null) {
      sensor.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!(mesh as { isMesh?: boolean }).isMesh) return;
        const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!(m instanceof MeshStandardMaterial)) continue;
          if (m.name === "led_green") {
            this.ledGreen = m;
            this.ledGreenBase = m.emissiveIntensity;
          } else if (m.name === "led_red") {
            this.ledRed = m;
            m.emissiveIntensity = 0; // stays dark — red discipline
          }
        }
      });
    }
  }

  /* ---- values the section's applyExplode composes with -------------------- */

  /** Interactive fan value composed with the scrub beat (max, not sum). */
  effectiveExplode(scrub: number): number {
    return Math.max(scrub, this.xplod.value);
  }

  /** XPLOD_ALL spreads the fan wider (source xplodedPosMultiplier 1.65). */
  distMultiplier(): number {
    return 1 + XPLOD_DIST_MULT * this.xplod.value;
  }

  /** Drag-pan cluster yaw (radians) — composed into the authored attitude. */
  get clusterYaw(): number {
    return this.dragYaw;
  }

  get selected(): string | null {
    return this.selectedId;
  }

  /** True when interaction state forces the explode pipeline active. */
  get engaged(): boolean {
    return this.selectedId !== null || this.xplod.value > 0.001 || Math.abs(this.dragYaw) > 1e-4;
  }

  /** Section gate: fan open enough for tap/drag/hover input to make sense. */
  setGate(open: boolean): void {
    this.gateOpen = open;
    if (!open && this.hoveredId !== null) this.setHovered(null);
  }

  /** Section left the viewport: close + neutralize everything transient. */
  reset(): void {
    if (this.selectedId !== null) this.close(true);
    this.dragYaw = 0;
    this.gesture = "idle";
    this.pointerId = null;
    this.endTouchDrag();
    this.setHovered(null);
  }

  /* ---- per-frame (called from tickWebgl AFTER applyExplode) --------------- */

  frame(): void {
    const now = performance.now();
    const dt = this.lastNow === null ? 0 : Math.min(0.1, (now - this.lastNow) / 1000);
    this.lastNow = now;

    // Selected part: idle rotation (interaction-intensity domain, dt-driven
    // like the source's `rotation.y += dt * 0.15`). applyExplode re-wrote
    // the node pose this frame, so composing here never accumulates.
    const sel = this.selectedId !== null ? this.parts.get(this.selectedId) : undefined;
    if (sel) {
      this.selectedRotY += dt * SELECTED_SPIN_RAD_S;
      if (sel.baseQuatEachFrame) sel.node.quaternion.copy(sel.baseQuatEachFrame);
      this.qTmp.setFromAxisAngle(this.yAxis, this.selectedRotY);
      sel.node.quaternion.multiply(this.qTmp);
    }

    // Focus camera: chase the selected part's live position (k=3 — the
    // source lookAt constant), blend from the wall-clock tween.
    if (this.focus.blend > 0.0001 && sel) {
      sel.proxy.getWorldPosition(this.vTmp);
      const k = dt === 0 ? 1 : 1 - Math.exp(-dt * FOCUS_TARGET_LERP);
      this.focusTarget.lerp(this.vTmp, k);
      const o = this.poseOverride;
      o.targetX = this.focusTarget.x;
      o.targetY = this.focusTarget.y;
      o.targetZ = this.focusTarget.z;
      o.blend = this.focus.blend;
      this.overrideOn = true;
      this.rig.setPoseOverride(o);
    } else if (this.focus.blend > 0.0001 && this.selectedId === null) {
      // closing — target frozen, blend ramping out
      this.poseOverride.blend = this.focus.blend;
      this.overrideOn = true;
      this.rig.setPoseOverride(this.poseOverride);
    } else if (this.overrideOn) {
      this.overrideOn = false;
      this.rig.setPoseOverride(null);
    }

    // Taptic tick-back: ±0.4 mm at ~8 Hz on the mass's local X. Phase from
    // wallSeconds() — real-time live, frozen (still, deterministic) in eval.
    if (this.tapticMass) {
      const active = this.tapticActive && this.gateOpen;
      this.tapticOffset = active
        ? TAPTIC_AMP_LOCAL * Math.sin(2 * Math.PI * TAPTIC_HZ * wallSeconds())
        : 0;
      this.tapticMass.position.x = this.tapticBaseX + this.tapticOffset;
    }

    // Nocturne LED: led_green pulses at real 1 Hz while Nocturne holds the
    // center line; led_red stays dark. wallSeconds() freezes under ?eval=1.
    if (this.ledGreen) {
      const phase = wallSeconds() % 1;
      const pulse = Math.exp(-5 * phase); // sharp attack, exponential decay
      const target = nocturneLedGate
        ? this.ledGreenBase * (LED_PULSE_FLOOR + (1 - LED_PULSE_FLOOR) * pulse) * 1.6
        : this.ledGreenBase;
      if (this.ledGreen.emissiveIntensity !== target) {
        this.ledGreen.emissiveIntensity = target;
      }
    }

    this.projectOverlay();
    this.bridgeToken();
  }

  /* ---- selection state machine -------------------------------------------- */

  private select(id: string): void {
    const entry = this.parts.get(id);
    if (!entry) return;
    this.selectedId = id;
    this.selectedRotY = 0;
    // Fresh open: seed the chase target at the part so the blend tween is
    // the ONLY motion (monotonic approach, never a snap). Reselect or
    // mid-decay re-open: leave the target where it is — the k=3 chase pans
    // it over (prev/next reuses the open pacing, source grammar) — and
    // resume the blend at constant rate (the longpress resume pattern).
    if (this.focus.blend < 0.001) entry.proxy.getWorldPosition(this.focusTarget);
    if (this.focus.blend < 0.999) {
      this.focusTween?.kill();
      this.focusTween = gsap.to(this.focus, {
        blend: 1,
        duration: FOCUS_OPEN_S * (1 - this.focus.blend),
        ease: EASE.default,
      });
    }
    this.renderOverlayCopy(entry.id);
    this.overlayEl.classList.add("is-open");
  }

  private close(immediate = false): void {
    if (this.selectedId === null) return;
    this.selectedId = null;
    this.overlayEl.classList.remove("is-open");
    this.overlayHovered = false; // hidden elements fire no mouseleave
    bus.emit(EngineEvent.SetCursorIcon, { icon: null });
    this.focusTween?.kill();
    if (immediate) {
      this.focus.blend = 0;
    } else {
      this.focusTween = gsap.to(this.focus, {
        blend: 0,
        duration: FOCUS_CLOSE_S,
        ease: EASE.default,
      });
    }
  }

  private step(direction: 1 | -1): void {
    if (this.selectedId === null || this.ordered.length === 0) return;
    const idx = this.ordered.findIndex((p) => p.id === this.selectedId);
    const next = this.ordered[(idx + direction + this.ordered.length) % this.ordered.length];
    if (next) this.select(next.id);
  }

  private xplodAll(on: boolean): void {
    this.xplodTween?.kill();
    this.xplodTween = gsap.to(this.xplod, {
      value: on ? 1 : 0,
      duration: on ? XPLOD_ON_S : XPLOD_OFF_S,
      ease: EASE.default,
    });
  }

  /* ---- pointer input ------------------------------------------------------- */

  private onPointerDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isUiTarget(e.target)) return; // overlay buttons own their clicks
    this.pointerId = e.pointerId;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.lastX = e.clientX;
    this.downT = performance.now();
    this.gesture = "pending";
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === this.pointerId && this.gesture !== "idle") {
      const dxTotal = e.clientX - this.downX;
      const dyTotal = e.clientY - this.downY;
      if (this.gesture === "pending") {
        const travel = Math.hypot(dxTotal, dyTotal);
        if (travel > TAP_TOLERANCE_PX) {
          // Direction lock: horizontal-dominant = cluster drag (when the
          // fan is open and nothing is selected); vertical = scroll intent.
          const wantDrag =
            this.gateOpen && this.selectedId === null && Math.abs(dxTotal) >= Math.abs(dyTotal);
          this.gesture = wantDrag ? "drag" : "scroll";
          if (this.gesture === "drag" && e.pointerType === "touch") this.beginTouchDrag();
        }
      }
      if (this.gesture === "drag") {
        this.dragYaw += (e.clientX - this.lastX) * DRAG_YAW_PER_PX;
      }
      this.lastX = e.clientX;
      return;
    }

    // Hover channel (fine pointers): part under cursor → select icon +
    // taptic tick-back arming. Over UI the buttons own the icon channel —
    // compat mouseenter fires BEFORE pointermove, so clearing here would
    // stomp the button's icon the same instant it was set.
    if (e.pointerType === "mouse" && this.gesture === "idle") {
      if (isUiTarget(e.target)) return;
      const id = this.gateOpen ? this.raycast(e.clientX, e.clientY) : null;
      if (id !== this.hoveredId) this.setHovered(id);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const gesture = this.gesture;
    this.gesture = "idle";
    this.pointerId = null;
    this.endTouchDrag();

    if (gesture !== "pending") return; // drags and scrolls never select
    const heldMs = performance.now() - this.downT;
    if (heldMs >= LONGPRESS_HOLD_MS) return; // the longpress mechanic owns holds
    if (!this.gateOpen || isUiTarget(e.target)) return;
    const hit = this.raycast(e.clientX, e.clientY);
    if (hit !== null) {
      bus.emit(EngineEvent.SetClickedMesh, { part: hit });
    } else if (this.selectedId !== null) {
      bus.emit(EngineEvent.LeaveClickedMesh);
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.gesture = "idle";
    this.pointerId = null;
    this.endTouchDrag();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.selectedId !== null) {
      bus.emit(EngineEvent.LeaveClickedMesh);
    }
  };

  /** Touch drags freeze the page under the finger (gesture arbitration). */
  private beginTouchDrag(): void {
    if (this.touchLenisStopped) return;
    this.touchLenisStopped = true;
    engineLenis()?.stop();
    window.addEventListener("touchmove", preventTouchMove, { passive: false });
  }

  private endTouchDrag(): void {
    if (!this.touchLenisStopped) return;
    this.touchLenisStopped = false;
    engineLenis()?.start();
    window.removeEventListener("touchmove", preventTouchMove);
  }

  private setHovered(id: string | null): void {
    this.hoveredId = id;
    const taptic = id === "part_taptic";
    if (taptic && !this.tapticActive) {
      // Android garnish — visual oscillation is the primary effect.
      if ("vibrate" in navigator && !this.vibrated) {
        navigator.vibrate(10);
        this.vibrated = true;
      }
    }
    if (!taptic) this.vibrated = false;
    this.tapticActive = taptic;
    bus.emit(EngineEvent.SetCursorIcon, { icon: id !== null ? "select" : null });
  }

  private raycast(clientX: number, clientY: number): string | null {
    if (this.ordered.length === 0) return null;
    this.ndc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.stage.camera);
    const proxies = this.ordered.map((p) => p.proxy);
    const hits = this.raycaster.intersectObjects(proxies, false);
    if (hits.length === 0) return null;
    const firstId = (hits[0]?.object.userData["partId"] as string) ?? null;
    if (hits.length === 1) return firstId;
    // Generous boxes overlap along the oblique fan axis, so nearest-hit
    // alone mis-selects a neighbour whose deep proxy fronts the ray.
    // Among ALL hit proxies, pick the one whose CENTER projects closest to
    // the pointer — "select what the pointer points at", deterministic.
    let best: string | null = firstId;
    let bestD = Infinity;
    const seen = new Set<string>();
    for (const h of hits) {
      const id = h.object.userData["partId"] as string;
      if (seen.has(id)) continue;
      seen.add(id);
      h.object.getWorldPosition(this.vTmp).project(this.stage.camera);
      const sx = (this.vTmp.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-this.vTmp.y * 0.5 + 0.5) * window.innerHeight;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  /* ---- overlay ------------------------------------------------------------- */

  private wireOverlay(): void {
    const q = (sel: string): HTMLElement | null => this.overlayEl.querySelector(sel);
    const closeBtn = q("[data-explode-close]");
    const prevBtn = q("[data-explode-prev]");
    const nextBtn = q("[data-explode-next]");
    const icon = (el: HTMLElement | null, name: "cross" | "arrow-left" | "arrow-right"): void => {
      if (!el) return;
      el.addEventListener("mouseenter", () => bus.emit(EngineEvent.SetCursorIcon, { icon: name }));
      el.addEventListener("mouseleave", () => bus.emit(EngineEvent.SetCursorIcon, { icon: null }));
    };
    icon(closeBtn, "cross");
    icon(prevBtn, "arrow-left");
    icon(nextBtn, "arrow-right");
    this.overlayEl.addEventListener("mouseenter", () => {
      this.overlayHovered = true;
    });
    this.overlayEl.addEventListener("mouseleave", () => {
      this.overlayHovered = false;
    });
    closeBtn?.addEventListener("click", () => bus.emit(EngineEvent.LeaveClickedMesh));
    prevBtn?.addEventListener("click", () =>
      bus.emit(EngineEvent.NextPreviousClickedMesh, { direction: -1 }),
    );
    nextBtn?.addEventListener("click", () =>
      bus.emit(EngineEvent.NextPreviousClickedMesh, { direction: 1 }),
    );
  }

  private renderOverlayCopy(id: string): void {
    const copy = PART_COPY[id];
    const idx = PART_ORDER.indexOf(id);
    this.overlayIndex.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(PART_ORDER.length)}`;
    this.overlayName.textContent = copy?.name ?? id;
    this.overlayDesc.textContent = copy?.desc ?? "";
    this.overlayH = 0; // re-measure after content change
  }

  /** Anchor the overlay ROOT's left edge + vertical center at the part's
   *  projected screen position (HOVER_POSITION pattern; assert measures the
   *  bounding box's left-middle against selectedScreenPos, ≤8 px). */
  private projectOverlay(): void {
    if (this.selectedId === null) return;
    if (this.overlayHovered) return; // anchor frozen under the pointer
    const pos = this.screenPosOf(this.selectedId);
    if (pos === null) return;
    if (this.overlayH === 0) this.overlayH = this.overlayEl.offsetHeight;
    this.overlayEl.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(pos.y - this.overlayH / 2).toFixed(1)}px, 0)`;
    // Viewport clamp: the ROOT stays exactly at the anchor (the ≤8px
    // contract); the CARD inside shifts left when it would overflow the
    // right edge (mobile portrait mostly).
    const card = this.overlayEl.querySelector<HTMLElement>(".xpl__card");
    if (card) {
      const overflow = pos.x + card.offsetLeft + card.offsetWidth + 12 - window.innerWidth;
      const maxLeftShift = Math.max(0, pos.x + card.offsetLeft - 8);
      const shift = -Math.min(Math.max(0, overflow), maxLeftShift);
      this.overlayEl.style.setProperty("--xpl-shift", `${shift.toFixed(0)}px`);
    }
    bus.emit(EngineEvent.HoverPosition, { x: pos.x, y: pos.y, part: this.selectedId });
  }

  private screenPosOf(id: string): { x: number; y: number } | null {
    const entry = this.parts.get(id);
    if (!entry) return null;
    entry.proxy.getWorldPosition(this.vTmp);
    this.vTmp.project(this.stage.camera);
    if (this.vTmp.z > 1) return null;
    return {
      x: (this.vTmp.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.vTmp.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  /* ---- StateStore token bridge --------------------------------------------- */

  private currentToken(): string {
    if (this.selectedId !== null) return "part-focus";
    // The scrub component is folded in by the section via setGate; the
    // interactive ramp alone can also open the fan.
    return this.gateOpen || this.xplod.value > 0.05 ? "exploded" : "assembled";
  }

  private bridgeToken(): void {
    const token = this.currentToken();
    if (token === this.lastToken) return;
    this.lastToken = token;
    api()?.applyState({ explode: token });
  }

  /* ---- snapshot ------------------------------------------------------------ */

  private lastScrub = 0;

  /** The section reports its scrub fan value here every frame (for mode). */
  reportScrub(explode: number): void {
    this.lastScrub = explode;
  }

  snapshot(): ExplodeStateSnapshot {
    const parts: ExplodePartSnapshot[] = this.ordered.map((p) => ({
      id: p.id,
      hasProxyHitbox: true,
      screenPos: this.screenPosOf(p.id) ?? { x: -1, y: -1 },
      offsetFromRest: Math.round(p.offsetFromRest() * 1e5) / 1e5,
    }));
    const eff = this.effectiveExplode(this.lastScrub);
    const mode: ExplodeStateSnapshot["mode"] =
      this.selectedId !== null
        ? "selected"
        : eff >= MODE_ALL_THRESHOLD
          ? "all"
          : eff > 0.02
            ? "exploded"
            : "assembled";
    return {
      token: this.lastToken,
      mode,
      parts,
      selected: this.selectedId,
      selectedRotationY: Math.round(this.selectedRotY * 1e5) / 1e5,
      selectedScreenPos: this.selectedId !== null ? this.screenPosOf(this.selectedId) : null,
      clusterRotation: Math.round(this.dragYaw * 1e5) / 1e5,
      xplodAll: Math.round(this.xplod.value * 1e4) / 1e4,
      dragEnabled: this.gateOpen && this.selectedId === null,
      tapticTick: {
        active: this.tapticActive,
        offset: Math.round(this.tapticOffset * 1e7) / 1e7,
      },
      nocturneLed: {
        gated: nocturneLedGate,
        green: this.ledGreen ? Math.round(this.ledGreen.emissiveIntensity * 1e4) / 1e4 : 0,
        red: this.ledRed ? this.ledRed.emissiveIntensity : 0,
      },
    };
  }
}

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

function api(): OneHertzDebugApi | null {
  return "__ONE_HERTZ__" in window ? window.__ONE_HERTZ__ : null;
}

/** The engine's Lenis instance is not plumbed to sections; the longpress
 * system already stops/starts it through the engine — the drag arbitration
 * reaches it through the same boot-owned seam exposed on the page. */
type LenisLike = { stop(): void; start(): void };
let lenisRef: LenisLike | null = null;

/** main.ts hands the Lenis instance over at boot (gesture arbitration). */
export function provideLenis(lenis: LenisLike): void {
  lenisRef = lenis;
}

function engineLenis(): LenisLike | null {
  return lenisRef;
}

function preventTouchMove(e: TouchEvent): void {
  // An uncancelable touchmove (scroll already in flight when the drag took
  // over) must be left alone — Chrome logs an intervention error otherwise.
  if (e.cancelable) e.preventDefault();
}

function isUiTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("[data-explode-overlay], button, a, input, select, textarea") !== null
  );
}

/**
 * Invisible bounding-box proxy in the NODE's local frame: tight local bbox
 * (meshes' geometry bounds pushed through node-relative transforms),
 * inflated ×PROXY_MARGIN with a floor per dimension — generous hit areas
 * without proxy-vs-proxy occlusion along the fan.
 */
function buildProxy(node: Object3D): Mesh {
  node.updateWorldMatrix(true, true);
  const nodeInv = new Matrix4().copy(node.matrixWorld).invert();
  const local = new Box3();
  const box = new Box3();
  const rel = new Matrix4();
  node.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    rel.multiplyMatrices(nodeInv, mesh.matrixWorld);
    box.copy(mesh.geometry.boundingBox).applyMatrix4(rel);
    local.union(box);
  });
  if (local.isEmpty()) {
    local.setFromCenterAndSize(new Vector3(), new Vector3(0.3, 0.3, 0.3));
  }
  const size = local.getSize(new Vector3()).multiplyScalar(PROXY_MARGIN);
  // Floor in the node's WORLD scale so tiny local units (0.01-scaled GLB
  // groups) do not get metre-sized floors: convert the floor to local.
  const worldScale = new Vector3().setFromMatrixScale(node.matrixWorld);
  const meanScale = (worldScale.x + worldScale.y + worldScale.z) / 3 || 1;
  const minLocal = PROXY_MIN_DIM / meanScale;
  size.x = Math.max(size.x, minLocal);
  size.y = Math.max(size.y, minLocal);
  size.z = Math.max(size.z, minLocal);
  const center = local.getCenter(new Vector3());
  const proxy = new Mesh(UNIT_BOX, proxyMaterial);
  proxy.name = ""; // anonymous — resolvePartName climbs past it by design
  proxy.visible = false; // never rendered; Raycaster still intersects it
  proxy.position.copy(center);
  proxy.scale.copy(size);
  return proxy;
}

/** Overlay DOM + section-scoped styles (self-rendered — no index.html edits). */
function buildOverlay(): {
  root: HTMLElement;
  name: HTMLElement;
  index: HTMLElement;
  desc: HTMLElement;
} {
  injectOverlayStyles();
  const root = document.createElement("div");
  root.className = "xpl";
  root.setAttribute("data-explode-overlay", "");
  root.innerHTML =
    `<div class="xpl__card">` +
    `<p class="xpl__index tnum" data-xpl-index></p>` +
    `<h3 class="xpl__name" data-xpl-name></h3>` +
    `<p class="xpl__desc" data-xpl-desc></p>` +
    `<div class="xpl__nav">` +
    `<button class="xpl__btn" type="button" data-explode-prev aria-label="Previous part">` +
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5.5M11 6l-6 6 6 6"/></svg>` +
    `</button>` +
    `<button class="xpl__btn" type="button" data-explode-next aria-label="Next part">` +
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13.5M13 6l6 6-6 6"/></svg>` +
    `</button>` +
    `<button class="xpl__btn xpl__btn--close" type="button" data-explode-close aria-label="Close">` +
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>` +
    `</button>` +
    `</div>` +
    `</div>`;
  return {
    root,
    name: root.querySelector("[data-xpl-name]") as HTMLElement,
    index: root.querySelector("[data-xpl-index]") as HTMLElement,
    desc: root.querySelector("[data-xpl-desc]") as HTMLElement,
  };
}

let overlayStylesInjected = false;

function injectOverlayStyles(): void {
  if (overlayStylesInjected) return;
  overlayStylesInjected = true;
  const style = document.createElement("style");
  style.dataset["disassemblyExplode"] = "";
  style.textContent = `
/* Part-detail overlay — anchored at the part's projected screen position
   (root = 0-size anchor point; the card hangs off it to the right). */
.xpl {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 6;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.645, 0.045, 0.355, 1);
  will-change: transform;
}
.xpl.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.xpl__card {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) translateX(var(--xpl-shift, 0px));
  margin-left: 3.2rem;
  width: min(21rem, 38vw);
  padding: 1.1rem 1.25rem 1rem;
  /* §7.1 scrim grammar: gradient from the ground token, never a hard panel. */
  background: radial-gradient(
    140% 130% at 18% 30%,
    color-mix(in srgb, var(--porcelain) 88%, transparent),
    color-mix(in srgb, var(--porcelain) 55%, transparent) 78%,
    transparent
  );
}
.xpl__card::before {
  /* hairline connector back to the anchored part */
  content: "";
  position: absolute;
  top: 50%;
  right: 100%;
  width: 3.2rem;
  height: 1px;
  background: color-mix(in srgb, var(--ink) 30%, transparent);
}
.xpl__index {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: var(--track-caps-wide);
  color: color-mix(in srgb, var(--ink) 40%, transparent);
}
.xpl__name {
  margin-top: 0.35rem;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(1.05rem, 1.7vw, 1.35rem);
  letter-spacing: var(--track-title);
  color: var(--ink);
}
.xpl__desc {
  margin-top: 0.5rem;
  font-family: var(--font-body, inherit);
  font-size: 0.82rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--ink) 68%, transparent);
}
.xpl__nav {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.85rem;
}
.xpl__btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  border-radius: 50%;
  background: transparent;
  color: color-mix(in srgb, var(--ink) 75%, transparent);
  transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
}
.xpl__btn:hover,
.xpl__btn:focus-visible {
  border-color: color-mix(in srgb, var(--ink) 60%, transparent);
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}
.xpl__btn--close {
  margin-left: 0.45rem;
}
@media (max-width: 720px) {
  .xpl__card {
    margin-left: 1.6rem;
    width: min(16rem, 62vw);
    padding: 0.85rem 1rem 0.8rem;
  }
  .xpl__card::before { width: 1.6rem; }
  .xpl__desc { font-size: 0.76rem; }
}
`;
  document.head.appendChild(style);
}
