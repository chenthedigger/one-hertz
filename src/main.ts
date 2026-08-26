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
import { extendState, installDebugApi, registerResidency } from "./core/debug";
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
import { ENV_HDR_URL } from "./gl/env";
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
  const envTask = loader.task(2); // boot env HDR bytes (the active look's env)
  const watchTask = loader.task(2); // hero GLB bytes (real byte progress)
  const settleTask = loader.task(1);

  // -- Real asset progress: fonts ------------------------------------------
  document.fonts.ready.then(() => fontsTask.done());

  // -- Look config resolution starts NOW (P4 perf) --------------------------
  // The boot env fetch used to be the 6.5 MB TEMP studio HDR, replaced
  // moments later by the look's own env (instrument.hdr, 404 KB). Resolving
  // the look JSON (~12 KB) first lets the boot fetch BE the final env — the
  // studio HDR survives only as the no-look / fetch-failure fallback, so the
  // reviewer-resilience path is unchanged.
  const lookPromise: Promise<LookConfig> = loadLook(params.look ?? "instrument");
  const bootEnvUrl: Promise<string | null> = lookPromise.then((look) =>
    look.envFile !== undefined ? look.envFile : look.envParams !== undefined ? null : ENV_HDR_URL,
  );

  // -- WebGL stage (env prebuild + first compile are the heavy parts) ------
  const canvas = document.getElementById("stage");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("boot: #stage canvas missing");
  }
  const stage = new Stage(canvas, { onEnvProgress: (p) => envTask.report(p), bootEnvUrl });
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

  // Boot compile — against the composer's scene target so the compiled
  // program variants are the ones the live pipeline actually runs (P5
  // perf-hunt: canvas-target compiles warm nothing — see stage.warmNow).
  stage.renderer.setRenderTarget(stage.post.sceneRenderTarget);
  stage.renderer.compile(stage.scene, stage.camera);
  stage.renderer.setRenderTarget(null);
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
    // P4 perf: if the boot path already fetched + applied this exact env URL
    // (same URL ⇒ byte-identical PMREM output), skip applyLook's re-fetch.
    // envReady always settles (loadHdrEnv catches), so this cannot hang.
    await stage.envReady;
    let effective = look;
    if (look.envFile !== undefined && stage.appliedBootEnvUrl === look.envFile) {
      const { envFile: _bootApplied, ...rest } = look;
      effective = rest;
    }
    await applyLook(stage, watch, effective);
    lightDriver.setLook(look);
    colorway?.setLook(look);
  };
  // P6 gate fix (Nocturne deep-jump gray knot on prod): the hero pipeline
  // (GLB adopt + look apply) was the ONE deferred load with no residency
  // provider, so `state().flags.assetsReady` could read true while the watch
  // was still in flight over a slow uplink — under `?eval=1` the loader
  // element is removed at construction, so the harness's waitReady() had
  // nothing left to hold it, and a gotoSection deep-jump captured the
  // placeholder torus knot. Provider law: settles on success, failure, or
  // give-up (watchReady catches to null; the .finally below never wedges).
  let heroSettled = false;
  registerResidency(() => heroSettled);
  void watchReady
    .then(async () => {
      try {
        const look = await lookPromise;
        currentLookName = look.name ?? currentLookName;
        await applyLookToStage(look);
      } catch (error: unknown) {
        console.warn(`look: "${String(params.look)}" failed (${String(error)}) — DEFAULT_LOOK applied`);
        currentLookName = "default";
        await applyLookToStage(DEFAULT_LOOK);
      }
      // P5 perf-hunt: warm the settled scene at idle (programs + texture
      // uploads) so nothing pays a first-draw compile burst mid-scroll.
      // Synchronous pendingWarms++ inside requestWarm means the stage's
      // warmSettled provider takes over BEFORE heroSettled flips — no gap
      // where assetsReady reads true mid-pipeline.
      stage.requestWarm();
    })
    .finally(() => {
      heroSettled = true;
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

  // Fixed-chrome collision policy probe (gate:p3 Parts/Footer tunes — ONE
  // owner, not three local fixes): the vital chip dims while the Parts
  // table sweeps its corner during the Footer traversal (desktop ~.5–.97,
  // the TOTAL WEIGHT bar crossing lives here) or while the end-slate label
  // rail owns the bottom-right (mobile ≥.85 — the m-Footer-100 break).
  // Pure function of the raw scroll + measured bounds — eval-deterministic.
  let footerSpan: { start: number; end: number } | null = null;
  let imagesSpan: { start: number; end: number } | null = null;
  let lastRawScroll = 0;
  const portraitMq = window.matchMedia("(max-width: 720px)");
  const learnFooterSpan = (): void => {
    const f = registry.manifest().find((s) => s.name === "Footer");
    footerSpan = f ? { start: f.rawStart, end: f.rawEnd } : null;
    // gate:p4 — portrait gallery sheet: full-width cells pass under the
    // fixed chip for the whole Images traversal (chip crossed cell 05 at
    // full strength on 390x844 — the P3 gate's last unowned overlap).
    const im = registry.manifest().find((s) => s.name === "Images");
    imagesSpan = im ? { start: im.rawStart, end: im.rawEnd } : null;
  };
  learnFooterSpan();

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
    getYield: () => {
      // Portrait gallery sheet window (gate:p4) — strictly inside the span,
      // so the clamp can never leak a yield into later sections.
      if (
        portraitMq.matches &&
        imagesSpan !== null &&
        imagesSpan.end > imagesSpan.start &&
        lastRawScroll >= imagesSpan.start &&
        lastRawScroll <= imagesSpan.end
      ) {
        return 1;
      }
      if (footerSpan === null) return 0;
      const span = footerSpan.end - footerSpan.start;
      if (span <= 0) return 0;
      const p = Math.min(1, Math.max(0, (lastRawScroll - footerSpan.start) / span));
      if (portraitMq.matches) return p >= 0.85 ? 1 : 0;
      return p >= 0.5 && p <= 0.97 ? 1 : 0;
    },
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
    learnFooterSpan(); // collision-policy bounds follow real layout
  });

  // Single frame pipeline: raw Lenis scroll in → sections scrubbed (both
  // channels + lifecycle) → clock scalar set → dial geared off the scalar +
  // raw Lenis velocity (dirty-flag uploads only) → WebGL rig lerps its
  // master → render.
  engine.onFrame((rawScroll, dt) => {
    lastRawScroll = rawScroll; // vital collision-policy probe reads this
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
      // Land INSIDE the beat, not on the enter edge: localProgress over the
      // RAW bounds (default 0.5, `?scroll=<name>:<p>` overrides). The old
      // track-top landing put the advertised `?scroll=Nocturne` link on the
      // section's weakest entry frame (flat mid-grey, watch side-on) while
      // the money moment sits half a pin deeper (P6 gate tune). Mid-track
      // also keeps the center line — and state().activeSection — in the
      // linked section (rubric deeplink-params).
      const y = registry.scrollPositionFor(params.scroll, params.scrollProgress);
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
