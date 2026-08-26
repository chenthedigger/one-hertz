/**
 * Section factory — ONE place that maps a canonical name to its
 * implementation. P2 agents: replace the PlaceholderSection line for your
 * section with your class; touch nothing else here.
 */

import type { SectionName } from "../core/constants";
import type { SectionBase } from "../core/section";
import type { CameraRig } from "../webgl/cameraRig";
import { ColorsSection } from "./colors";
import { CurvesSection } from "./curves";
import { DisassemblySection } from "./disassembly";
import { FooterSection } from "./footer";
import { HandsSection } from "./hands";
import { ImagesSection } from "./images";
import { IntroSection } from "./intro";
import { MechanismSection } from "./mechanism";
import { MovementSection } from "./movement";
import { MovementWatchRightSection } from "./movementwatchright";
import { NocturneSection } from "./nocturne";
import { PartsSection } from "./parts";
import { PlaceholderSection } from "./placeholder";
import { StrapsSection } from "./straps";
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
    case "MovementWatchRight":
      return new MovementWatchRightSection(rig);
    case "Curves":
      return new CurvesSection(rig);
    case "Hands":
      return new HandsSection(rig);
    case "Nocturne":
      return new NocturneSection(rig);
    case "Straps":
      return new StrapsSection(rig);
    case "Colors":
      return new ColorsSection(rig);
    case "Images":
      return new ImagesSection(rig);
    case "Parts":
      return new PartsSection(rig);
    case "Footer":
      return new FooterSection(rig);
    default:
      return new PlaceholderSection(name);
  }
}
