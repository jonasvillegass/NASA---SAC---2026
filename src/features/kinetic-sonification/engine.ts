/**
 * CHRONO-SPHEREx Kinetic Doppler Sound Synthesizer & 3D HRTF Spatial Audio Engine
 * ===============================================================================
 * Real-time Web Audio API synthesizer that maps cursor kinematics (velocity v,
 * abrupt acceleration a = dv/dt, direction θ, and FITS pixel brightness I(x,y))
 * directly into:
 *   1. Tonal Sound Frequency (Pitch in Hz):
 *      - Slow movement -> Deep sub-bass & warm low-frequency cosmic drone (65 – 180 Hz)
 *      - Fast / Abrupt movement ("brusco") -> High-frequency Doppler shift (800 – 3200 Hz)
 *   2. Acoustic Pulse / Grain Frequency (Rhythmic Modulation in Hz):
 *      - Slow movement -> Slow breathing pulse (1.2 Hz)
 *      - Abrupt movement -> Rapid pulsar / Geiger shimmer (8 – 22 Hz)
 *   3. Spectral Timbre & Formant Filter Cutoff (Hz):
 *      - Opens from 220 Hz (muffled deep space) up to 7500 Hz (crystalline brilliance)
 *   4. 3D Binaural HRTF Spatialization (Dolby Atmos / Windows Sonic):
 *      - Maps cursor X/Y and velocity onto a 3D sphere around the listener's head.
 */

import type { RenderedCutout } from "../../lib/types";
import type {
  CursorKinematicsTelemetry,
  KineticSoundscapeMode,
  KineticVelocityRegime,
} from "./types";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Pure mathematical calculation of cursor kinematics and sound frequencies
 */
export function computeCursorKinematics(params: {
  xNorm: number;
  yNorm: number;
  vxPxPerSec: number;
  vyPxPerSec: number;
  prevVelocityPxPerSec: number;
  dtSec: number;
  mode: KineticSoundscapeMode;
  baseMinFreqHz?: number;
  baseMaxFreqHz?: number;
  sensitivity?: number;
  cutout?: RenderedCutout | null;
  targetCenterRa?: number;
  targetCenterDec?: number;
}): CursorKinematicsTelemetry {
  const {
    xNorm,
    yNorm,
    vxPxPerSec,
    vyPxPerSec,
    prevVelocityPxPerSec,
    dtSec,
    mode,
    baseMinFreqHz = 72,
    baseMaxFreqHz = 2650,
    sensitivity = 1.0,
    cutout = null,
    targetCenterRa = 133.795,
    targetCenterDec = -7.245,
  } = params;

  const rawSpeed = Math.hypot(vxPxPerSec, vyPxPerSec) * sensitivity;
  const velocityPxPerSec = Number(clamp(rawSpeed, 0, 4500).toFixed(1));

  // SPHEREx scale: 6.2 arcsec/pixel
  const angularSpeedArcsecPerSec = Number((velocityPxPerSec * 6.2).toFixed(1));

  // Instantaneous acceleration a = |dv/dt| ("brusquedad del movimiento")
  const safeDt = Math.max(0.004, Math.min(0.2, dtSec));
  const rawAccel = Math.abs(velocityPxPerSec - prevVelocityPxPerSec) / safeDt;
  const accelerationPxPerSec2 = Number(clamp(rawAccel, 0, 35000).toFixed(0));

  // Normalized abruptness index [0..1] combining velocity and sudden acceleration
  const normVel = clamp(velocityPxPerSec / 1600, 0, 1);
  const normAccel = clamp(accelerationPxPerSec2 / 14000, 0, 1);
  const abruptnessIndex = Number(
    clamp(0.58 * Math.pow(normVel, 0.82) + 0.42 * Math.pow(normAccel, 0.75), 0, 1).toFixed(3)
  );

  const directionAngleDeg = Number(
    (((Math.atan2(-vyPxPerSec, vxPxPerSec) * 180) / Math.PI + 360) % 360).toFixed(1)
  );

  // Sample real FITS flux under cursor if a cutout is available
  let sampledFitsFluxMjySr: number | null = null;
  let fluxBoost = 0;
  if (cutout && cutout.fluxData && cutout.width > 0 && cutout.height > 0) {
    const col = clamp(Math.floor(xNorm * cutout.width), 0, cutout.width - 1);
    const row = clamp(Math.floor(yNorm * cutout.height), 0, cutout.height - 1);
    const val = cutout.fluxData[row * cutout.width + col];
    if (Number.isFinite(val)) {
      sampledFitsFluxMjySr = Number(val.toFixed(3));
      const span = Math.max(1e-3, cutout.stats.max - cutout.stats.median);
      fluxBoost = clamp((val - cutout.stats.median) / span, 0, 1);
    }
  }

  // Proximity to center (0.5, 0.5) where target / dipole is located
  const distFromCenter = Math.hypot(xNorm - 0.5, yNorm - 0.5);
  const targetProximityFactor = Number(
    clamp(1 - distFromCenter / 0.707, 0, 1).toFixed(3)
  );

  // Celestial coordinates under cursor (approx 10 arcmin FoV around target)
  const fovDeg = 0.16;
  const raDeg = Number((targetCenterRa + (0.5 - xNorm) * fovDeg).toFixed(5));
  const decDeg = Number((targetCenterDec + (0.5 - yNorm) * fovDeg).toFixed(5));

  // Physical Doppler Factor: 1 + α_v * (v/v_ref) + α_a * (a/a_ref)
  const dopplerFactor = Number((1 + 1.85 * normVel + 1.35 * normAccel).toFixed(3));

  // Mode-specific acoustic frequency curve (Hz)
  let instantFrequencyHz: number;
  if (mode === "BLIND_ASTRONOMER_TACTILE_SONAR") {
    // Combines cursor speed + real FITS brightness + proximity radar
    const combined = clamp(
      0.55 * abruptnessIndex + 0.30 * fluxBoost + 0.15 * Math.pow(targetProximityFactor, 2),
      0,
      1
    );
    instantFrequencyHz =
      baseMinFreqHz * Math.pow(baseMaxFreqHz / baseMinFreqHz, combined);
  } else if (mode === "MOLECULAR_RESONANCE_HARP") {
    // Quantizes smooth sweep toward harmonic molecular intervals (H2O, CH4, CO2, CO)
    const expSweep =
      baseMinFreqHz * Math.pow(baseMaxFreqHz / baseMinFreqHz, abruptnessIndex);
    instantFrequencyHz = expSweep * (1 + 0.15 * fluxBoost);
  } else if (mode === "RELATIVISTIC_MACH_HORIZON") {
    // Extra dramatic response to sudden acceleration ("brusquedad")
    const machFactor = clamp(0.42 * normVel + 0.58 * normAccel, 0, 1);
    instantFrequencyHz =
      baseMinFreqHz + Math.pow(machFactor, 1.15) * (baseMaxFreqHz * 1.2 - baseMinFreqHz);
  } else {
    // Default: DOPPLER_COSMIC_ORGAN (logarithmic human pitch perception + linear Doppler boost)
    const logFreq =
      baseMinFreqHz * Math.pow(baseMaxFreqHz / baseMinFreqHz, abruptnessIndex);
    instantFrequencyHz = logFreq * (1 + 0.1 * fluxBoost);
  }

  instantFrequencyHz = Number(clamp(instantFrequencyHz, 45, 3600).toFixed(1));

  // Harmonic overtone (perfect fifth 1.5x when slow/medium, octave+fifth 2.5x when abrupt)
  const harmonicMultiplier = abruptnessIndex > 0.65 ? 2.0 : 1.498;
  const harmonicFrequencyHz = Number((instantFrequencyHz * harmonicMultiplier).toFixed(1));

  // Wien's Law Sub-Bass LFE (strong and deep 42-95 Hz)
  const subBassLfeHz = Number((42 + 53 * clamp(normVel + 0.3 * fluxBoost, 0, 1)).toFixed(1));

  // Dynamic Biquad Lowpass/Formant Cutoff Frequency (Hz)
  const filterCutoffHz = Number(
    clamp(210 * Math.pow(36, abruptnessIndex) + fluxBoost * 900, 190, 8500).toFixed(0)
  );

  // 3D HRTF Spatial Coordinates
  const hrtfAzimuthDeg = Number(((xNorm - 0.5) * 170).toFixed(1)); // -85° (left) to +85° (right)
  const hrtfElevationDeg = Number(
    clamp((0.5 - yNorm) * 90 + abruptnessIndex * 35, -45, 75).toFixed(1)
  );

  let regime: KineticVelocityRegime;
  if (abruptnessIndex < 0.26) {
    regime = "DEEP_SUB_BASS_SLOW";
  } else if (abruptnessIndex < 0.66) {
    regime = "HARMONIC_LAMINAR_SCAN";
  } else {
    regime = "BLUESHIFT_ABRUPT_BURST";
  }

  return {
    xNorm,
    yNorm,
    raDeg,
    decDeg,
    velocityPxPerSec,
    angularSpeedArcsecPerSec,
    accelerationPxPerSec2,
    abruptnessIndex,
    directionAngleDeg,
    dopplerFactor,
    instantFrequencyHz,
    harmonicFrequencyHz,
    subBassLfeHz,
    filterCutoffHz,
    hrtfAzimuthDeg,
    hrtfElevationDeg,
    sampledFitsFluxMjySr,
    targetProximityFactor,
    regime,
  };
}

/**
 * Web Audio API Real-Time 3D HRTF Kinetic Doppler Synthesizer Singleton
 */
export class KineticDopplerAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private masterGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private carrierOsc: OscillatorNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private harmonicGain: GainNode | null = null;
  private fmModOsc: OscillatorNode | null = null;
  private fmModGain: GainNode | null = null;
  private pulseLfoOsc: OscillatorNode | null = null;
  private pulseLfoGain: GainNode | null = null;
  private mainFilter: BiquadFilterNode | null = null;
  private panner3D: PannerNode | null = null;
  private idleTimer: number | null = null;
  private volume = 0.65;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public start(): void {
    const ctx = this.ensureContext();
    if (this.isRunning) return;

    const now = ctx.currentTime;

    // Master Compressor + Gain for safe, lush Dolby Atmos / HRTF output
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.005, now);
    compressor.release.setValueAtTime(0.18, now);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, now);

    // 3D Binaural HRTF Panner Node
    this.panner3D = ctx.createPanner();
    this.panner3D.panningModel = "HRTF";
    this.panner3D.distanceModel = "inverse";
    this.panner3D.refDistance = 1;
    this.panner3D.maxDistance = 10;
    this.panner3D.rolloffFactor = 0.8;
    this.panner3D.positionX.setValueAtTime(0, now);
    this.panner3D.positionY.setValueAtTime(0, now);
    this.panner3D.positionZ.setValueAtTime(-1, now);

    // Cosmic Stereo Delay / Reverb Tail
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.21, now);
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.28, now);
    const delayWet = ctx.createGain();
    delayWet.gain.setValueAtTime(0.24, now);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);

    // Dynamic Low-Pass Formant Filter controlled by cursor velocity
    this.mainFilter = ctx.createBiquadFilter();
    this.mainFilter.type = "lowpass";
    this.mainFilter.frequency.setValueAtTime(280, now);
    this.mainFilter.Q.setValueAtTime(3.2, now);

    // Voice envelope gain (fades in when cursor moves, fades to gentle whisper when idle)
    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(0.001, now);

    // 1. Primary Doppler Carrier Oscillator
    this.carrierOsc = ctx.createOscillator();
    this.carrierOsc.type = "sawtooth";
    this.carrierOsc.frequency.setValueAtTime(110, now);

    // 2. Harmonic Overtone Oscillator (shimmers on fast/abrupt movements)
    this.harmonicOsc = ctx.createOscillator();
    this.harmonicOsc.type = "triangle";
    this.harmonicOsc.frequency.setValueAtTime(165, now);
    this.harmonicGain = ctx.createGain();
    this.harmonicGain.gain.setValueAtTime(0.05, now);

    // 3. FM Abruptness ("Brusquedad") Modulator
    this.fmModOsc = ctx.createOscillator();
    this.fmModOsc.type = "sine";
    this.fmModOsc.frequency.setValueAtTime(6, now);
    this.fmModGain = ctx.createGain();
    this.fmModGain.gain.setValueAtTime(0, now);
    this.fmModOsc.connect(this.fmModGain);
    this.fmModGain.connect(this.carrierOsc.frequency);

    // 4. Rhythmic Pulse / Tremolo LFO (rate increases with cursor velocity!)
    this.pulseLfoOsc = ctx.createOscillator();
    this.pulseLfoOsc.type = "sine";
    this.pulseLfoOsc.frequency.setValueAtTime(1.5, now);
    this.pulseLfoGain = ctx.createGain();
    this.pulseLfoGain.gain.setValueAtTime(0.08, now);
    this.pulseLfoOsc.connect(this.pulseLfoGain);
    this.pulseLfoGain.connect(this.voiceGain.gain);

    // 5. Wien's Law Sub-Bass LFE Oscillator
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.setValueAtTime(52, now);
    this.subGain = ctx.createGain();
    this.subGain.gain.setValueAtTime(0.001, now);

    // Wire audio graph
    this.carrierOsc.connect(this.mainFilter);
    this.harmonicOsc.connect(this.harmonicGain);
    this.harmonicGain.connect(this.mainFilter);

    this.mainFilter.connect(this.voiceGain);
    this.voiceGain.connect(this.panner3D);

    this.subOsc.connect(this.subGain);
    this.subGain.connect(compressor);

    this.panner3D.connect(compressor);
    this.panner3D.connect(delayNode);
    delayWet.connect(compressor);

    compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.carrierOsc.start(now);
    this.harmonicOsc.start(now);
    this.fmModOsc.start(now);
    this.pulseLfoOsc.start(now);
    this.subOsc.start(now);

    this.isRunning = true;
  }

  public updateFromKinematics(
    telemetry: CursorKinematicsTelemetry,
    mode: KineticSoundscapeMode
  ): void {
    if (!this.isRunning) {
      this.start();
    }
    if (!this.ctx || !this.carrierOsc || !this.harmonicOsc || !this.mainFilter || !this.voiceGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const tau = 0.022; // 22 ms smooth exponential glide (zero clicks, immediate feel)

    // Configure oscillator waveforms per mode
    if (mode === "DOPPLER_COSMIC_ORGAN") {
      this.carrierOsc.type = "sawtooth";
      this.harmonicOsc.type = "triangle";
    } else if (mode === "BLIND_ASTRONOMER_TACTILE_SONAR") {
      this.carrierOsc.type = "triangle";
      this.harmonicOsc.type = "sine";
    } else if (mode === "MOLECULAR_RESONANCE_HARP") {
      this.carrierOsc.type = "sine";
      this.harmonicOsc.type = "triangle";
    } else {
      this.carrierOsc.type = "sawtooth";
      this.harmonicOsc.type = "sawtooth";
    }

    // 1. Update Sound Frequencies (Hz) based on velocity & abruptness
    this.carrierOsc.frequency.setTargetAtTime(telemetry.instantFrequencyHz, now, tau);
    this.harmonicOsc.frequency.setTargetAtTime(telemetry.harmonicFrequencyHz, now, tau);

    if (this.subOsc && this.subGain) {
      this.subOsc.frequency.setTargetAtTime(telemetry.subBassLfeHz, now, tau);
      // Sub-bass is warm and present during slow/medium motion, giving physical weight
      const subLevel = clamp(0.32 * (1 - telemetry.abruptnessIndex * 0.5), 0.06, 0.35);
      this.subGain.gain.setTargetAtTime(subLevel, now, 0.04);
    }

    // 2. Update Harmonic Shimmer & FM Modulation based on "Brusquedad" (abruptnessIndex)
    if (this.harmonicGain) {
      const harmLevel = clamp(0.06 + telemetry.abruptnessIndex * 0.42, 0.05, 0.48);
      this.harmonicGain.gain.setTargetAtTime(harmLevel, now, tau);
    }

    if (this.fmModOsc && this.fmModGain) {
      // Faster/more abrupt motion -> higher FM vibrato/shimmer rate and depth
      const fmFreq = 3.5 + telemetry.abruptnessIndex * 28;
      const fmDepth = telemetry.abruptnessIndex * telemetry.instantFrequencyHz * 0.14;
      this.fmModOsc.frequency.setTargetAtTime(fmFreq, now, tau);
      this.fmModGain.gain.setTargetAtTime(fmDepth, now, tau);
    }

    // 3. Update Rhythmic Pulse / Geiger Rate (Hz)
    if (this.pulseLfoOsc && this.pulseLfoGain) {
      const pulseRateHz = 1.2 + telemetry.abruptnessIndex * 16.5 + telemetry.targetProximityFactor * 4.0;
      this.pulseLfoOsc.frequency.setTargetAtTime(pulseRateHz, now, tau);
      this.pulseLfoGain.gain.setTargetAtTime(0.06 + telemetry.abruptnessIndex * 0.14, now, tau);
    }

    // 4. Update Biquad Filter Cutoff (Hz) & Resonance Q
    this.mainFilter.frequency.setTargetAtTime(telemetry.filterCutoffHz, now, tau);
    this.mainFilter.Q.setTargetAtTime(2.5 + telemetry.abruptnessIndex * 5.5, now, tau);

    // 5. Update 3D Binaural HRTF Sphere Position (Dolby Atmos / Windows Sonic)
    if (this.panner3D) {
      const azRad = (telemetry.hrtfAzimuthDeg * Math.PI) / 180;
      const elRad = (telemetry.hrtfElevationDeg * Math.PI) / 180;
      const r = 1.3;
      const x = r * Math.sin(azRad) * Math.cos(elRad);
      const y = r * Math.sin(elRad);
      const z = -r * Math.cos(azRad) * Math.cos(elRad);
      this.panner3D.positionX.setTargetAtTime(x, now, tau);
      this.panner3D.positionY.setTargetAtTime(y, now, tau);
      this.panner3D.positionZ.setTargetAtTime(z, now, tau);
    }

    // 6. Active Voice Gain (louder with motion, gently decays to silence after cursor stops)
    const activeLevel = clamp(0.16 + telemetry.abruptnessIndex * 0.34, 0.16, 0.52);
    this.voiceGain.gain.setTargetAtTime(activeLevel, now, 0.025);

    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
    }
    this.idleTimer = window.setTimeout(() => {
      if (!this.ctx || !this.voiceGain || !this.subGain) return;
      const tIdle = this.ctx.currentTime;
      this.voiceGain.gain.setTargetAtTime(0.0005, tIdle, 0.18);
      this.subGain.gain.setTargetAtTime(0.0005, tIdle, 0.22);
    }, 160);
  }

  public setVolume(vol: number): void {
    this.volume = clamp(vol, 0, 1);
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public stop(): void {
    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    try {
      this.carrierOsc?.stop();
      this.harmonicOsc?.stop();
      this.fmModOsc?.stop();
      this.pulseLfoOsc?.stop();
      this.subOsc?.stop();
    } catch {
      // Ignore already stopped oscillators
    }
    this.carrierOsc = null;
    this.harmonicOsc = null;
    this.fmModOsc = null;
    this.pulseLfoOsc = null;
    this.subOsc = null;
    this.isRunning = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const kineticDopplerEngine = new KineticDopplerAudioEngine();
