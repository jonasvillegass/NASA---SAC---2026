/**
 * Simple, non-invasive Web Audio synthesizer driven by cursor velocity on the home screen.
 * - Higher cursor speed produces a higher pitch; slowing down lowers the pitch.
 * - Volume scales logarithmically in decibels (dB -> linear gain).
 * - When the cursor is still, output gain smoothly ramps to 0 (silence).
 */
export class CursorAudioEngine {
  private ctx: AudioContext | null = null;
  private mainOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private disposed = false;

  private ensureGraph(): AudioContext | null {
    if (this.disposed || typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;

      // Gentle low-pass filter (no resonance peak) for a clean, deep tone
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 150;
      filter.Q.value = 0.5;

      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.85;

      const subGain = ctx.createGain();
      subGain.gain.value = 0.15;

      // Simple, warm sine pair
      const mainOsc = ctx.createOscillator();
      mainOsc.type = "sine";
      mainOsc.frequency.value = 40;

      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.value = 20;

      mainOsc.connect(mainGain);
      subOsc.connect(subGain);
      mainGain.connect(filter);
      subGain.connect(filter);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      mainOsc.start();
      subOsc.start();

      this.ctx = ctx;
      this.mainOsc = mainOsc;
      this.subOsc = subOsc;
      this.filter = filter;
      this.masterGain = masterGain;
      return ctx;
    } catch {
      return null;
    }
  }

  /**
   * Attempts to create/resume the AudioContext (safe to call on user gestures).
   */
  unlock(): boolean {
    const ctx = this.ensureGraph();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    return ctx.state === "running";
  }

  /**
   * Updates frequency, filter cutoff, and logarithmic (dB) gain from cursor speed in px/ms.
   * When `active` is false or speed is below the stillness threshold, fades to silence.
   */
  update(speedPxPerMs: number, active: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.mainOsc || !this.subOsc || !this.filter || !this.masterGain) {
      return;
    }
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;
    const MIN_SPEED = 0.025; // px/ms (~25 px/s) deadzone for stillness

    if (!active || speedPxPerMs < MIN_SPEED) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const norm = Math.min(1, (speedPxPerMs - MIN_SPEED) / 2.6);
    const curved = Math.pow(norm, 0.72);

    // Exponential pitch mapping: ~40 Hz (slow) -> ~120 Hz (fast)
    const minFreq = 40;
    const maxFreq = 120;
    const freq = minFreq * Math.pow(maxFreq / minFreq, curved);

    // Logarithmic volume scale in decibels: -28 dB (slow) -> -10 dB (fast, ~0.316 linear)
    const minDb = -28;
    const maxDb = -10;
    const db = minDb + norm * (maxDb - minDb);
    const targetGain = Math.pow(10, db / 20);

    const filterFreq = 130 + curved * 250;

    this.mainOsc.frequency.setTargetAtTime(freq, now, 0.035);
    this.subOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.035);
    this.filter.frequency.setTargetAtTime(filterFreq, now, 0.045);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.045);
  }

  /**
   * Smoothly mutes the synthesizer.
   */
  silence(): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state !== "running") return;
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
  }

  /**
   * Releases Web Audio resources.
   */
  dispose(): void {
    this.disposed = true;
    if (this.ctx) {
      try {
        this.mainOsc?.stop();
        this.subOsc?.stop();
      } catch {
        // Ignore if already stopped
      }
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.mainOsc = null;
      this.subOsc = null;
      this.filter = null;
      this.masterGain = null;
    }
  }
}
