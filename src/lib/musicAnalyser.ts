/**
 * Real-time Web Audio beat & frequency analyser for the background music element.
 * Routes audio through: MediaElementSource -> AnalyserNode -> GainNode -> destination
 * so the analyser always receives full-scale audio regardless of the output volume slider.
 */
export interface MusicMetrics {
  bass: number;
  mid: number;
  energy: number;
  beat: number;
}

interface AudioGraph {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  gainNode: GainNode;
  freqData: Uint8Array<ArrayBuffer>;
}

const elementGraphs = new WeakMap<HTMLMediaElement, AudioGraph>();

export class MusicBeatAnalyser {
  private audioEl: HTMLMediaElement | null = null;
  private graph: AudioGraph | null = null;
  private connecting = false;
  private targetVolume = 0.15;
  private targetEnabled = true;

  private avgBass = 0;
  private bass = 0;
  private mid = 0;
  private energy = 0;
  private beat = 0;

  attach(audioEl: HTMLMediaElement | null) {
    this.audioEl = audioEl;
    if (!audioEl) {
      this.graph = null;
      return;
    }
    const existing = elementGraphs.get(audioEl);
    if (existing) {
      this.graph = existing;
      this.applyGain();
    }
  }

  /**
   * Must be called from a user gesture (pointerdown / keydown) so AudioContext can resume.
   */
  unlock() {
    const audioEl = this.audioEl;
    if (!audioEl) return;

    const existing = elementGraphs.get(audioEl);
    if (existing) {
      this.graph = existing;
      if (existing.ctx.state === "suspended") {
        void existing.ctx.resume().then(() => this.applyGain()).catch(() => {});
      } else {
        this.applyGain();
      }
      return;
    }

    if (this.connecting) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.connecting = true;
    try {
      const ctx = new AudioCtx();
      const ensureConnected = () => {
        if (elementGraphs.has(audioEl)) {
          this.graph = elementGraphs.get(audioEl)!;
          this.connecting = false;
          this.applyGain();
          return;
        }
        try {
          const source = ctx.createMediaElementSource(audioEl);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.72;

          const gainNode = ctx.createGain();
          gainNode.gain.value = this.targetEnabled ? this.targetVolume : 0;

          source.connect(analyser);
          analyser.connect(gainNode);
          gainNode.connect(ctx.destination);

          const freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
          const graph: AudioGraph = { ctx, source, analyser, gainNode, freqData };
          elementGraphs.set(audioEl, graph);
          this.graph = graph;
          // Keep element volume at 1 so analyser sees full-scale signal; gainNode controls output level.
          audioEl.volume = 1;
          this.applyGain();
        } catch {
          // Ignore if element cannot be connected
        } finally {
          this.connecting = false;
        }
      };

      if (ctx.state === "running") {
        ensureConnected();
      } else {
        void ctx
          .resume()
          .then(() => {
            ensureConnected();
          })
          .catch(() => {
            this.connecting = false;
            void ctx.close().catch(() => {});
          });
      }
    } catch {
      this.connecting = false;
    }
  }

  setOutput(volume: number, enabled: boolean) {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    this.targetEnabled = enabled;
    this.applyGain();
  }

  private applyGain() {
    const audioEl = this.audioEl;
    if (!audioEl) return;
    const desired = this.targetEnabled ? this.targetVolume : 0;
    audioEl.muted = !this.targetEnabled;

    if (this.graph && this.graph.ctx.state === "running") {
      audioEl.volume = 1;
      const now = this.graph.ctx.currentTime;
      this.graph.gainNode.gain.cancelScheduledValues(now);
      this.graph.gainNode.gain.setTargetAtTime(desired, now, 0.02);
    } else {
      audioEl.volume = desired;
    }
  }

  sample(dt: number): MusicMetrics {
    const audioEl = this.audioEl;
    const graph = this.graph;

    if (
      !audioEl ||
      !graph ||
      graph.ctx.state !== "running" ||
      audioEl.paused ||
      audioEl.muted ||
      !this.targetEnabled ||
      this.targetVolume <= 0
    ) {
      const decay = Math.exp(-dt * 8);
      this.bass *= decay;
      this.mid *= decay;
      this.energy *= decay;
      this.beat *= decay;
      return {
        bass: this.bass,
        mid: this.mid,
        energy: this.energy,
        beat: this.beat,
      };
    }

    graph.analyser.getByteFrequencyData(graph.freqData);
    const data = graph.freqData;

    // Bins 0..4 (~0-400 Hz): kick & bass
    let bassSum = 0;
    for (let i = 0; i <= 4 && i < data.length; i++) {
      bassSum += data[i];
    }
    const rawBass = bassSum / (5 * 255);

    // Bins 5..24 (~400-2200 Hz): synth / melody / snare
    let midSum = 0;
    for (let i = 5; i <= 24 && i < data.length; i++) {
      midSum += data[i];
    }
    const rawMid = midSum / (20 * 255);

    const rawEnergy = rawBass * 0.65 + rawMid * 0.35;

    // Smooth levels
    const smooth = Math.min(1, dt * 16);
    this.bass += (rawBass - this.bass) * smooth;
    this.mid += (rawMid - this.mid) * smooth;
    this.energy += (rawEnergy - this.energy) * smooth;

    // Beat / transient detection against moving bass average
    this.avgBass += (rawBass - this.avgBass) * Math.min(1, dt * 3.5);
    if (rawBass > this.avgBass * 1.16 + 0.025) {
      const punch = Math.min(1, (rawBass - this.avgBass) * 3.2);
      if (punch > this.beat) {
        this.beat = punch;
      }
    }
    this.beat *= Math.exp(-dt * 6.5);

    return {
      bass: this.bass,
      mid: this.mid,
      energy: this.energy,
      beat: this.beat,
    };
  }
}
