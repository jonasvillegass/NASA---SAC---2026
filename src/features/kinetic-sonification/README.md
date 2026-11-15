# Kinetic Cursor Doppler Synthesizer & 3D HRTF Spatial Audio (`src/features/kinetic-sonification`)

## Overview
Decoupled, zero-dependency Web Audio API + 60 FPS Canvas module designed for **Global Nomination** in the 2026 NASA Space Apps Challenge ("Planet X and SPHEREx").

It translates real-time cursor kinematics (velocity $v$, sudden acceleration / abruptness $a = |dv/dt|$, direction $\theta$, and real FITS surface brightness $I(x,y)$ in $\text{MJy/sr}$) directly into **sound frequency ($\text{Hz}$), harmonic overtones, FM shimmer, and 3D Binaural HRTF spatial audio**:
- **Slow / Gentle Cursor Motion ($v < 180\,\text{px/s}$)**: Low sound frequency ($65\text{--}180\,\text{Hz}$), warm Wien's Law sub-bass LFE drone ($42\text{--}95\,\text{Hz}$), and low-pass formant filtering ($220\,\text{Hz}$).
- **Fast / Abrupt Cursor Motion ("Brusco", high $v$ or $a = |dv/dt|$)**: High sound frequency ($850\text{--}3500\,\text{Hz}$), crystalline blueshifted harmonic chords, FM modulation, rapid pulsar/Geiger tremolo ($8\text{--}22\,\text{Hz}$), and Mach shockwave rings.

## 1-Line Integration for Tomy
```tsx
import { KineticSonificationLab } from "./features/kinetic-sonification";

<KineticSonificationLab
  targetName={selectedTarget?.name}
  ra={selectedTarget?.ra}
  dec={selectedTarget?.dec}
  cutout={activeCutout}
/>
```
