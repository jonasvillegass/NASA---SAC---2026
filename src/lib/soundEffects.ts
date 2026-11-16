export type SoundEffectId = "button" | "startTransition" | "coordChange";

interface SoundConfig {
  url: string;
  gain: number;
}

const SOUND_CONFIGS: Record<SoundEffectId, SoundConfig> = {
  button: { url: "/sounds/button.wav", gain: 0.4 },
  startTransition: { url: "/sounds/start-transition.mp3", gain: 0.55 },
  coordChange: { url: "/sounds/coord-change.mp3", gain: 0.5 },
};

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<SoundEffectId, AudioBuffer>();
  private loadingPromises = new Map<SoundEffectId, Promise<AudioBuffer | null>>();
  private enabled = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = this.enabled ? 1 : 0;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.masterGain = master;
      return ctx;
    } catch {
      return null;
    }
  }

  private async loadBuffer(id: SoundEffectId): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id);
    if (cached) return cached;

    const existing = this.loadingPromises.get(id);
    if (existing) return existing;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const promise = (async () => {
      try {
        const res = await fetch(SOUND_CONFIGS[id].url);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        this.buffers.set(id, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.loadingPromises.delete(id);
      }
    })();

    this.loadingPromises.set(id, promise);
    return promise;
  }

  preloadAll() {
    if (!this.ensureContext()) return;
    (Object.keys(SOUND_CONFIGS) as SoundEffectId[]).forEach((id) => {
      void this.loadBuffer(id);
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.015);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(id: SoundEffectId) {
    if (!this.enabled) return;

    const ctx = this.ensureContext();
    const { url, gain } = SOUND_CONFIGS[id];

    if (ctx && this.masterGain) {
      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => {});
      }

      const buffer = this.buffers.get(id);
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = gain;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(0);
        return;
      }

      // Kick off buffer decode for future plays
      void this.loadBuffer(id);
    }

    // Immediate fallback if AudioBuffer is not decoded yet
    try {
      const audio = new Audio(url);
      audio.volume = gain;
      void audio.play().catch(() => {});
    } catch {
      // Ignore audio playback errors
    }
  }
}

const sfxEngine = new SoundEffectsEngine();

export function preloadSoundEffects() {
  sfxEngine.preloadAll();
}

export function setSfxEnabled(enabled: boolean) {
  sfxEngine.setEnabled(enabled);
}

export function playButtonSound() {
  sfxEngine.play("button");
}

export function playStartTransitionSound() {
  sfxEngine.play("startTransition");
}

export function playCoordChangeSound() {
  sfxEngine.play("coordChange");
}
