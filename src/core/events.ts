/**
 * Typed event fabric — enum adopted verbatim from the source-site recon
 * (PLAN §1). Spike B ships the enum plus a minimal typed emitter; payload
 * types will tighten as each mechanic lands in P3.
 */

export enum EngineEvent {
  ConfigChange = "CONFIG_CHANGE",
  SetCursorIcon = "SET_CURSOR_ICON",
  SetClickedMesh = "SET_CLICKED_MESH",
  LeaveClickedMesh = "LEAVE_CLICKED_MESH",
  NextPreviousClickedMesh = "NEXT_PREVIOUS_CLICKED_MESH",
  XplodAll = "XPLOD_ALL",
  LongpressToggle = "LONGPRESS_TOGGLE",
  HoverPosition = "HOVER_POSITION",
  UpdateRotations = "UPDATE_ROTATIONS",
}

/** Payload map — stubs for now; each mechanic firms these up when built. */
export interface EnginePayloads {
  [EngineEvent.ConfigChange]: { config: string };
  [EngineEvent.SetCursorIcon]: { icon: string | null; label?: string };
  [EngineEvent.SetClickedMesh]: { meshName: string };
  [EngineEvent.LeaveClickedMesh]: undefined;
  [EngineEvent.NextPreviousClickedMesh]: { direction: 1 | -1 };
  [EngineEvent.XplodAll]: { exploded: boolean };
  [EngineEvent.LongpressToggle]: { active: boolean };
  [EngineEvent.HoverPosition]: { x: number; y: number; id: string };
  [EngineEvent.UpdateRotations]: { delta: number };
}

type Handler<E extends EngineEvent> = (payload: EnginePayloads[E]) => void;

export class EventBus {
  private handlers = new Map<EngineEvent, Set<Handler<EngineEvent>>>();

  on<E extends EngineEvent>(event: E, handler: Handler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<EngineEvent>);
    return () => set.delete(handler as Handler<EngineEvent>);
  }

  emit<E extends EngineEvent>(event: E, payload: EnginePayloads[E]): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

/** Single shared bus — the engine's nervous system. */
export const bus = new EventBus();
