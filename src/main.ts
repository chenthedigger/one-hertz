/**
 * ONE HERTZ — engine bootstrap (P1 core).
 *
 * Order matters: loader tasks register before heavy work starts so the
 * arc reflects real progress from frame one. Query params (params.ts)
 * route the boot: `?solo=` mounts one sandboxed section, `?eval=1` runs
 * the determinism kit, `?scroll=` / `?autoscroll` / `?materials` act after
 * the loader resolves.
 */

import "./style.css";
import { SECTION_ORDER, type SectionName } from "./core/constants";
import { getClock, setClock } from "./core/clock";
import { extendState, installDebugApi } from "./core/debug";
import { isEvalMode } from "./core/determinism";
import { bus, EngineEvent } from "./core/events";
import { installMaterialsInspector } from "./core/inspector";
import { Loader } from "./core/loader";
import { params } from "./core/params";
import { SectionRegistry } from "./core/registry";
import { ScrollEngine } from "./core/scroll";
import type { SectionBase } from "./core/section";
import { StateStore } from "./core/state";
import { createSection } from "./sections/index";
import { provideLenis, setNocturneLedGate } from "./sections/disassemblyExplode";
import { provideStage } from "./sections/stageRef";
import { DialRenderer } from "./dial/renderer";
import { installCursor } from "./ui/cursor/cursor";
import { LongpressSystem } from "./ui/cursor/longpress";
import { ColorwaySystem, provideColorway } from "./ui/colorway";
import { runLoaderMatchCut } from "./ui/loaderMatchCut";
import { LivingVital } from "./ui/vital/vital";
import { LightKeyframeDriver } from "./gl/lightKeyframes";
import { applyLook, DEFAULT_LOOK, loadLook, type LookConfig } from "./gl/look";
import { CameraRig } from "./webgl/cameraRig";
import { Stage } from "./webgl/stage";
import { loadWatch, retargetScreenTexture } from "./webgl/watch";

/** Registry lifecycle type → its bus event name (main.ts bridge below). */
const LIFECYCLE_BUS_EVENT = {
  enter: EngineEvent.SectionEnter,
  leave: EngineEvent.SectionLeave,
  enterCenter: EngineEvent.SectionEnterCenter,
  leaveCenter: EngineEvent.SectionLeaveCenter,
} as const;

function boot(): void {
  // Deep links + scrollytelling own the scroll position — the browser's
  // automatic restoration would fight Lenis (and `?scroll=`) after reload.
  history.scrollRestoration = "manual";

  const store = new StateStore({
    evalMode: params.eval,
    autoscroll: params.autoscroll,
    materialsInspector: params.materials,
    soloSection: params.solo,
  });

  const loader = new Loader(params.eval); // ?eval=1 skips choreography
  const fontsTask = loader.task(1);
  const stageTask = loader.task(2);
  const envTask = loader.task(2); // studio HDR bytes — the heavy real asset
  const watchTask = loader.task(2); // hero GLB bytes (real byte progress)
  const settleTask = loader.task(1);

  // -- Real asset progress: fonts ------------------------------------------
  document.fonts.ready.then(() => fontsTask.done());

  // -- WebGL stage (env prebuild + first compile are the heavy parts) ------
  const canvas = document.getElementById("stage");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("boot: #stage canvas missing");
  }
  const stage = new Stage(canvas, { onEnvProgress: (p) => envTask.report(p) });
  provideStage(stage); // section-module stage seam (sections/stageRef.ts)
  stageTask.report(0.6); // context + env + geometry built
  // envReady settles on HDR swap OR confirmed fallback — real readiness
  // either way (loader honesty), so eval capture waits for the final light.
  stage.envReady.then(() => envTask.done());
  const rig = new CameraRig(stage.camera);

  // -- Dial subsystem → screen seam (hero integration) ----------------------
  // The live watchface rides the stage's ONE screen material via
  // `setScreenTexture` (emissive slot, emissiveIntensity 2.8,
  // toneMapped=false — PLAN §3). flipY default (true) is correct for the
  // placeholder PlaneGeometry panel; at GLB adoption `retargetScreenTexture`
  // flips it to glTF orientation AND copies the baked emissive map's
  // KHR_texture_transform (gltfpack quantized the screen UVs to ~1/16 —
  // without the transform the dial tiles 16× too small).
  const dial = new DialRenderer();
  stage.setScreenTexture(dial.texture);
  // StateStore `dialMode` axis → renderer bridge (P3 mechanics write the
  // store; the frame loop forwards token changes — one owner, no misses).
  let dialToken = store.get().dialMode;
  dial.applyDialToken(dialToken);
  extendState("dial", () => dial.stats());

  stage.renderer.compile(stage.scene, stage.camera);
  stageTask.done();

  // -- Hero watch GLB (the REAL Ultra 3 replaces the torus knot) ------------
  // Loaded in parallel with the HDR; the loader waits for both (honesty).
  // Failure keeps the placeholder + warns — never a black canvas
  // (reviewer-resilience rule); the loader task settles either way.
  let currentLookName = params.look ?? "instrument";
  const watchReady = loadWatch(stage.renderer, (p) => watchTask.report(p))
    .then((watch) => {
      retargetScreenTexture(dial.texture, watch.bakedScreenTexture);
      stage.adoptWatch(watch); // adopts part_screen → placeholder panel dies
      rig.setCaseSpace(watch.caseSpace);
      return watch;
    })
    .catch((error: unknown) => {
      console.warn(`watch: hero GLB failed (${String(error)}) — placeholder stays`);
      return null;
    });
  void watchReady.then(() => watchTask.done());
  extendState("watch", () => ({
    loaded: stage.watch !== null,
    parts: stage.watch?.parts.size ?? 0,
    screenAdopted: stage.watch?.screenMesh != null,
    caseTiltDeg: stage.watch
      ? Math.round(((stage.watch.caseSpace.tiltRad * 180) / Math.PI) * 10) / 10
      : 0,
    look: currentLookName,
  }));

  // -- Look config (?look=<name>; default = "instrument", the P1.5 council
  // winner — docs/LOOKBIBLE.md). DEFAULT_LOOK stays the in-code fallback
  // (fetch failure never leaves the stage unstyled).
  // Applied AFTER the watch settles so materialOverrides find their
  // mat_* targets (applyLook itself tolerates watch=null).
  // Per-section lighting keyframe driver (LOOKBIBLE §1.4 fix 1 / §1.5):
  // reads the active look's x_sectionLightKeyframes and drives env rotation
  // + intensity + exposure + bloom + bgStage off the raw scroll, per frame.
  // Inert until a look with keyframes lands (DEFAULT_LOOK has none).
  const lightDriver = new LightKeyframeDriver(stage);
  // Loader match-cut (P3 vital lane): at dismiss start the activity rings
  // are lifted and flown onto the hero dial, tracking the live projected
  // screen mesh (reviewer-resilience fallbacks inside the module).
  loader.onDismissStart = (rings) => runLoaderMatchCut(rings, stage);
  // Colorway swap system (P3 — constructed after the vital below; the look
  // pipeline hands it the x_colorway variant tables whenever a look lands).
  let colorway: ColorwaySystem | null = null;
  const applyLookToStage = async (look: LookConfig): Promise<void> => {
    const watch = await watchReady;
    await applyLook(stage, watch, look);
    lightDriver.setLook(look);
    colorway?.setLook(look);
  };
  void watchReady.then(async () => {
    try {
      const look = await loadLook(params.look ?? "instrument");
      currentLookName = look.name ?? currentLookName;
      await applyLookToStage(look);
    } catch (error: unknown) {
      console.warn(`look: "${String(params.look)}" failed (${String(error)}) — DEFAULT_LOOK applied`);
      currentLookName = "default";
      await applyLookToStage(DEFAULT_LOOK);
    }
  });

  // -- Scroll engine + sections ---------------------------------------------
  const engine = new ScrollEngine();
  engine.registerSnappable(rig); // eval settle snaps the camera lerp

  const registry = new SectionRegistry({ solo: params.solo !== null });
  const sectionsByName = new Map<SectionName, SectionBase>();
  const mount = (section: SectionBase): void => {
    sectionsByName.set(section.name, section);
    registry.register(section);
  };
  if (params.solo !== null) {
    // Section sandbox: mount ONLY the requested section; hide the rest;
    // stub its requiredEnterState into the live store (PLAN §3 sandbox).
    for (const el of document.querySelectorAll<HTMLElement>("[data-section]")) {
      if (el.dataset["section"] !== params.solo) el.remove();
    }
    const section = createSection(params.solo, rig);
    store.apply(section.requiredEnterState);
    mount(section);
  } else {
    for (const name of SECTION_ORDER) mount(createSection(name, rig));
  }
  registry.measure();
  engine.refresh(); // tracks were just sized — Lenis must re-learn its limit
  lightDriver.setGeometry(registry.manifest()); // keyframe anchors = section centers

  // -- Interaction mechanics (P1 cursor+events lane) --------------------------
  // Longpress hold-zoom (mechanic 2): arms on ANY pointer type; consumers
  // wired through the typed bus so P3 mechanics join without touching boot.
  new LongpressSystem(engine);
  installCursor(); // mechanic 1 — returns null (no-op) on touch/coarse
  bus.on(EngineEvent.LongpressToggle, ({ intensity }) => rig.setLongpress(intensity));
  bus.on(EngineEvent.UpdateRotations, ({ speed }) => stage.setRotationSpeed(speed));
  // Per-section zoomMultiplier follows the viewport center line (PLAN §1).
  // The Nocturne LED gate (P3 explode lane: sensor led_green pulses at real
  // 1 Hz while Nocturne holds the center) rides the same lifecycle channel.
  registry.onLifecycle((e) => {
    // Bridge every crossing onto the typed bus (rubric lifecycle-events:
    // the harness subscribes via api.bus.on("enter"/"leave"/…)). The
    // registry stays the one lifecycle OWNER; the bus is a read fan-out.
    bus.emit(LIFECYCLE_BUS_EVENT[e.type], { section: e.section, direction: e.direction });
    if (e.section === "Nocturne" && (e.type === "enterCenter" || e.type === "leaveCenter")) {
      setNocturneLedGate(e.type === "enterCenter");
    }
    if (e.type !== "enterCenter") return;
    const section = sectionsByName.get(e.section);
    if (section) rig.setZoomMultiplier(section.zoomMultiplier);
  });
  // Explode drag-to-pan gesture arbitration needs lenis.stop()/start().
  provideLenis(engine.lenis);
  // Mouse parallax feed (fine pointers only — touch has no resting pointer).
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        rig.setPointer(
          (e.clientX / window.innerWidth) * 2 - 1,
          (e.clientY / window.innerHeight) * 2 - 1,
        );
      },
      { passive: true },
    );
  }
  extendState("camera", () => rig.aux());

  // -- Living BPM vital (P3 vital lane) --------------------------------------
  // Persistent top-right chrome: simulated HR off the raw Lenis velocity,
  // ECG trace drawn by the clock scalar, one-frame 1.006 beat tick on the
  // stage canvas, bgStage-aware signal color off the keyframe driver,
  // opt-in sound (default OFF — zero AudioContext until first click).
  const vital = new LivingVital({
    store,
    stageCanvas: canvas,
    getVelocity: () => engine.lenis.velocity,
    getStageHex: () => lightDriver.stageHex(),
  });
  extendState("vital", () => vital.stats());

  // -- Colorway swap (P3 swap lane) ------------------------------------------
  // CONFIG_CHANGE owner: 1 s 5-param material tween + accent fan-out (dial,
  // vital, --accent/--biosignal tokens) + StateStore colorway axis + the
  // outro SWAP restart (scrollTo 0 immediate; eval settles synchronously so
  // the harness reads scrollY 0 + the new finish in the same tick).
  colorway = new ColorwaySystem({
    stage,
    store,
    dial,
    vital,
    restart: () => {
      engine.scrollTo(0, true);
      if (isEvalMode) engine.settleSync(0);
    },
  });
  provideColorway(colorway);

  engine.onResizeSettled(() => {
    stage.resize();
    registry.measure();
    engine.refresh();
    lightDriver.setGeometry(registry.manifest());
  });

  // Single frame pipeline: raw Lenis scroll in → sections scrubbed (both
  // channels + lifecycle) → clock scalar set → dial geared off the scalar +
  // raw Lenis velocity (dirty-flag uploads only) → WebGL rig lerps its
  // master → render.
  engine.onFrame((rawScroll, dt) => {
    registry.update(rawScroll);
    setClock(rawScroll / registry.totalRange());
    const dialMode = store.get().dialMode;
    if (dialMode !== dialToken) {
      dialToken = dialMode;
      dial.applyDialToken(dialToken);
    }
    dial.update({ clockScalar: getClock(), scrollVelocity: engine.lenis.velocity }, dt);
    lightDriver.update(rawScroll); // pure function of scroll — eval-settles
    vital.update(dt); // after the driver — reads its applied bgStage
    rig.update(dt);
    stage.render(dt);
  });

  // -- Settle: a few real rendered frames before the loader may resolve ----
  let settleFrames = 0;
  const settle = (): void => {
    settleTask.report(++settleFrames / 3);
    if (settleFrames < 3) requestAnimationFrame(settle);
  };
  requestAnimationFrame(settle);

  // -- Debug API + param-routed behaviors ------------------------------------
  const api = installDebugApi(registry, engine, stage, store);
  api.look = {
    apply: async (name: string): Promise<void> => {
      const look = await loadLook(name);
      currentLookName = look.name ?? name;
      await applyLookToStage(look);
    },
    current: () => currentLookName,
  };
  // Colorway entry point for evals/capture kit — emits on the bus (the one
  // mutation path; every consumer hears it exactly like a picker click).
  api.setConfig = (id: string, durationS?: number): void => {
    bus.emit(EngineEvent.ConfigChange, {
      config: id,
      ...(durationS !== undefined ? { duration: durationS } : {}),
    });
  };

  loader.ready.then(() => {
    store.uiFlags.loaderDone = true;
    vital.reveal();
    if (params.scroll !== null && params.solo === null) {
      // Land the section's TRACK TOP, not rawStart: for unpinned sections
      // rawStart is one viewport early (the enter edge), which leaves the
      // center line — and state().activeSection — in the previous section
      // (rubric deeplink-params wants the linked section active).
      const target = registry.manifest().find((s) => s.name === params.scroll);
      const y = target ? target.top : 0;
      engine.scrollTo(y, true);
      if (isEvalMode) engine.settleSync(y);
    }
    if (params.autoscroll) engine.startAutoscroll(params.autoscrollSpeed);
    if (params.materials) installMaterialsInspector(stage);
  });
}

if (params.dial) {
  // Dial look-dev (`?dial=1`): mount the watchface preview INSTEAD of the
  // engine. Dynamic import keeps the dial chunk out of the main bundle.
  void import("./dial/preview").then((m) => m.mountDialPreview());
} else {
  boot();
}
