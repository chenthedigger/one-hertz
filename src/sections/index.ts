/**
 * Section factory — ONE place that maps a canonical name to its
 * implementation. P2 agents: replace the PlaceholderSection line for your
 * section with your class; touch nothing else here.
 */

import type { SectionName } from "../core/constants";
import type { SectionBase } from "../core/section";
import type { CameraRig } from "../webgl/cameraRig";
import { DisassemblySection } from "./disassembly";
import { IntroSection } from "./intro";
import { PlaceholderSection } from "./placeholder";

export function createSection(name: SectionName, rig: CameraRig): SectionBase {
  switch (name) {
    case "Intro":
      return new IntroSection();
    case "Disassembly":
      return new DisassemblySection(rig);
    default:
      return new PlaceholderSection(name);
  }
}
