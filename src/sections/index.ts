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
import { MechanismSection } from "./mechanism";
import { MovementSection } from "./movement";
import { NocturneSection } from "./nocturne";
import { PlaceholderSection } from "./placeholder";
import { TimelessSection } from "./timeless";
import { VerticalTextSection } from "./verticaltext";

export function createSection(name: SectionName, rig: CameraRig): SectionBase {
  switch (name) {
    case "Intro":
      return new IntroSection(rig);
    case "Timeless":
      return new TimelessSection(rig);
    case "VerticalText":
      return new VerticalTextSection(rig);
    case "Disassembly":
      return new DisassemblySection(rig);
    case "Mechanism":
      return new MechanismSection(rig);
    case "Movement":
      return new MovementSection(rig);
    case "Nocturne":
      return new NocturneSection(rig);
    default:
      return new PlaceholderSection(name);
  }
}
