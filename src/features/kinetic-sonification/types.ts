/**
 * CHRONO-SPHEREx Kinetic Doppler Cursor & 3D Spatial Astro-Sonification Types
 * ===========================================================================
 * Grounded in:
 * - Sears & Zemansky (University Physics Vol. 1 Ch. 3 Kinematics & Ch. 16 Acoustic Doppler Effect;
 *   Vol. 2 Ch. 37 Relativistic Doppler Shift)
 * - James Stewart (Multivariable Calculus: Differential Velocity v(t), Acceleration a(t) & Directional Gradients)
 * - Yunus A. Çengel (Thermodynamics Ch. 12: Wien's Law Sub-Bass LFE Thermal Radiation)
 * - Raymond Chang (Chemistry Ch. 7: Quantum Photon Energy E = hc/λ & Molecular Vibrational Modes)
 */

export type KineticSoundscapeMode =
  | "DOPPLER_COSMIC_ORGAN"          // Slow = deep Wien sub-bass drone; Fast/Abrupt = high blueshifted harmonic chord
  | "BLIND_ASTRONOMER_TACTILE_SONAR" // Reads FITS flux I(x,y) under cursor + velocity Doppler + 1/r² target radar
  | "MOLECULAR_RESONANCE_HARP"      // Excites H₂O, CH₄, CO₂, CO quantum harmonic intervals proportional to speed
  | "RELATIVISTIC_MACH_HORIZON";    // High sensitivity to acceleration a = dv/dt ("brusquedad") and 3D HRTF azimuth

export type KineticVelocityRegime =
  | "DEEP_SUB_BASS_SLOW"      // v < 180 px/s -> Low frequency (65 - 190 Hz), warm infrared redshift
  | "HARMONIC_LAMINAR_SCAN"   // 180 <= v < 900 px/s -> Mid frequency (190 - 820 Hz), clear molecular formants
  | "BLUESHIFT_ABRUPT_BURST"; // v >= 900 px/s or high a(t) -> High frequency (820 - 3100 Hz), Doppler burst

export interface CursorKinematicsTelemetry {
  /** Normalized cursor coordinates [0..1] within the active sky viewport */
  xNorm: number;
  yNorm: number;
  /** Celestial coordinates ICRS (degrees) under cursor */
  raDeg: number;
  decDeg: number;
  /** Instantaneous cursor speed v = sqrt(vx² + vy²) [px/s] */
  velocityPxPerSec: number;
  /** Equivalent angular scan speed across SPHEREx sky (s = 6.2"/px) [arcsec/s] */
  angularSpeedArcsecPerSec: number;
  /** Instantaneous magnitude of acceleration a = dv/dt ("brusquedad") [px/s²] */
  accelerationPxPerSec2: number;
  /** Normalized abruptness / jerk impulse factor [0..1] */
  abruptnessIndex: number;
  /** Direction of cursor motion θ = atan2(vy, vx) [0°..360°] */
  directionAngleDeg: number;
  /** Physical Doppler shift multiplier (1 + α_v·v + α_a·a) */
  dopplerFactor: number;
  /** Instantaneous primary acoustic frequency f(v, a, I_FITS) [Hz] */
  instantFrequencyHz: number;
  /** Harmonic overtone frequency [Hz] */
  harmonicFrequencyHz: number;
  /** Wien's Law sub-bass LFE frequency [Hz] (38 - 95 Hz) */
  subBassLfeHz: number;
  /** Dynamic low-pass / formant filter cutoff frequency [Hz] */
  filterCutoffHz: number;
  /** 3D HRTF Azimuth angle [-90° to +90°] for Dolby Atmos / Windows Sonic */
  hrtfAzimuthDeg: number;
  /** 3D HRTF Elevation angle [-45° to +75°] for overhead dome */
  hrtfElevationDeg: number;
  /** Real FITS surface brightness under cursor [MJy/sr] (if cutout available) */
  sampledFitsFluxMjySr: number | null;
  /** Normalized proximity [0..1] to target center or dipole peak */
  targetProximityFactor: number;
  regime: KineticVelocityRegime;
}

export interface KineticTrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  freqHz: number;
  abruptness: number;
  regime: KineticVelocityRegime;
  alpha: number;
  radius: number;
}
