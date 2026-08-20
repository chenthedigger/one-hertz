/**
 * ONE HERTZ — engine bootstrap (Spike B vertical slice).
 *
 * Order matters: loader tasks register before heavy work starts so the
 * arc reflects real progress from frame one.
 */

import "./style.css";
import { Loader } from "./core/loader";
import { ScrollEngine } from "./core/scroll";
import { SectionRegistry } from "./core/registry";
import { setClock } from "./core/clock";
import { installDebugApi } from "./core/debug";
import { Stage } from "./webgl/stage";
import { CameraRig } from "./webgl/cameraRig";
import { createHeroSection } from "./sections/hero";
import { createOneSection } from "./sections/one";
import type { SectionName } from "./core/constants";
import { SECTION_VH } from "./core/constants";

function boot(): void {
  const loader = new Loader();
  const fontsTask = loader.task(1);
  const stageTask = loader.task(2);
  const settleTask = loader.task(1);

  // -- Real asset progress: fonts ------------------------------------------
  document.fonts.ready.then(() => fontsTask.done());

  // -- WebGL stage (env prebuild + first compile are the heavy parts) ------
  const canvas = document.getElementById("stage");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("boot: #stage canvas missing");
  }
  const stage = new Stage(canvas);
  stageTask.report(0.6); // context + env + geometry built
  const rig = new CameraRig(stage.camera);
  stage.renderer.compile(stage.scene, stage.camera);
  stageTask.done();

  // -- Scroll engine + sections ---------------------------------------------
  const engine = new ScrollEngine();
  const registry = new SectionRegistry();
  registry.register(createHeroSection());
  registry.register(createOneSection(rig));
  registry.measure();

  engine.onResizeSettled(() => {
    stage.resize();
    registry.measure();
  });

  // Single frame pipeline: raw Lenis scroll in → sections scrubbed →
  // clock scalar set → WebGL rig lerps its master → render.
  engine.onFrame((rawScroll, dt) => {
    registry.update(rawScroll);
    setClock(rawScroll / registry.totalRange());
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

  // -- Debug API + deep link -------------------------------------------------
  installDebugApi(registry, engine, stage);

  loader.ready.then(() => {
    const wanted = new URLSearchParams(location.search).get("scroll");
    if (wanted && wanted in SECTION_VH) {
      window.__ONE_HERTZ__.gotoSection(wanted as SectionName, 0);
    }
  });
}

boot();
