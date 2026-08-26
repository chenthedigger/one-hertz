/**
 * Opt-in heart audio (PLAN §2 "Opt-in sound", vital lane) — a fully
 * synthesized WebAudio voice: a sub-audible 1 Hz metronome tick (the thesis,
 * literally audible) + a soft two-stroke heartbeat ("lub-dub") low end,
 * tempo-synced to the simulated BPM the vital drives.
 *
 * Contract (rubric `sound off-by-default` + PLAN §2):
 *   - NO AudioContext exists until the first opt-in click — this module
 *     constructs one lazily inside `enable()`, never at import/boot.
 *   - Default OFF; `prefers-reduced-motion` keeps it off permanently (the
 *     toggle renders disabled — the vital owns that guard).
 *   - No audio files: every voice is oscillator + gain envelope.
 *   - Heartbeat scheduling rides the vital's beat events (visual beat ==
 *     audible beat, one owner); the 1 Hz tick self-schedules on the audio
 *     clock with a small lookahead (audio-thread precision — wall time is
 *     legal here: sound is not screen motion, and the 1 Hz tick is the
 *     site's one sanctioned real-time pulse family, motion-bible §7.1).
 */

const MASTER_GAIN = 0.6;
const TICK_GAIN = 0.02; // sub-audible: felt more than heard
const LUB_GAIN = 0.16;
const DUB_GAIN = 0.11;
const LOOKAHEAD_S = 0.3; // tick scheduler horizon (per-frame pump)

export class HeartAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private nextTickAt = 0;

  get on(): boolean {
    return this.enabled;
  }

  /** True once a context has ever been created (smoke: exactly 0 pre-opt-in). */
  get contextCreated(): boolean {
    return this.ctx !== null;
  }

  /** First call constructs the AudioContext (must run in a user gesture). */
  enable(): void {
    if (this.ctx === null) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.ctx.destination);
      this.nextTickAt = Math.ceil(this.ctx.currentTime + 0.05);
    }
    void this.ctx.resume();
    this.enabled = true;
  }

  /** Suspend (context kept — toggling back on never builds a second one). */
  disable(): void {
    this.enabled = false;
    if (this.ctx) void this.ctx.suspend();
  }

  /**
   * Per-frame pump while enabled: keeps the 1 Hz tick scheduled ahead on
   * integer audio-clock seconds. Cheap no-op when off.
   */
  update(): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    while (this.nextTickAt < now + LOOKAHEAD_S) {
      if (this.nextTickAt >= now) this.tick(this.nextTickAt);
      this.nextTickAt += 1; // 1 Hz — the whole thesis
    }
  }

  /**
   * One heartbeat, fired by the vital's beat event. S1 ("lub") now, S2
   * ("dub") after a rate-scaled systole gap (~0.32 s at rest, shorter as
   * the simulated HR climbs — real cardiology, cheap math).
   */
  beat(bpmNow: number): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const gap = Math.min(0.32, 19 / Math.max(40, bpmNow));
    this.thump(t, 52, 34, LUB_GAIN, 0.16);
    this.thump(t + gap, 44, 30, DUB_GAIN, 0.12);
  }

  /** Low sine thump with pitch drop + exponential decay (a drum, not a hum). */
  private thump(at: number, f0: number, f1: number, gain: number, decayS: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + decayS);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decayS);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + decayS + 0.05);
  }

  /** Sub-audible 1 Hz metronome: a filtered micro-click on the second. */
  private tick(at: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1600, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(TICK_GAIN, at + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + 0.05);
  }
}
