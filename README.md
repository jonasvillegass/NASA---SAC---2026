# 🌌 CHRONO-SPHEREx · Infrared Time-Domain Sky Explorer & Planet X Hunter

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org/2026/find-a-team/ley-de-conservacion-del-mate/?tab=project)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.3-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Scientific Integrity](https://img.shields.io/badge/Data-Real%20NASA%20IRSA-success.svg)](https://irsa.ipac.caltech.edu/SIA)

> **Team:** Ley de Conservación del Mate  
> **Challenge:** Planet X and SPHEREx (Advanced)  
> **Live Submission Staging:** [`NASA_OFFICIAL_SUBMISSION_STAGING.md`](./NASA_OFFICIAL_SUBMISSION_STAGING.md)

---

## 🚀 Overview

**CHRONO-SPHEREx** is a high-performance, open-source web platform that unlocks NASA's SPHEREx mission (102 near-infrared spectral channels across 6 Linear Variable Filter detector arrays, 0.75–5.00 µm) for students, educators, and citizen scientists.

By transforming raw multi-extension FITS archives from NASA/IPAC IRSA into an intuitive, zero-install interactive sky workspace, anyone can hunt for moving sub-stellar bodies (brown dwarfs, Planet Nine candidates, asteroids) and analyze astronomical variability directly in their browser.

---

## 🛠️ The 4 Interactive Astronomical Modules

### 1. ⏱️ Multi-Epoch Blink Comparator & Difference Math
- **Historical Heritage:** Digitally resurrects the blink comparator technique pioneered by Clyde Tombaugh in the discovery of Pluto (1930).
- **Time-Lapse Blinking:** Alternates between SPHEREx 6-month survey epochs with customizable blink frequencies (200 ms to 1500 ms).
- **Pixel-Level Difference Imaging ($B - A$):** Cancels stationary background stars into neutral gray. Moving objects (e.g., *Barnard's Star*, *WISE 0855*) and flux-varying stars (*RW Aurigae*, *R Draconis*) stand out as distinctive glowing dipoles and monopoles.

### 2. 🌈 Instant 102-Band Spectrogram ($0.75 - 5.00\,\mu\text{m}$)
- **Fulfills the NASA Challenge Highlight:** *"A bonus point if your tool can generate spectra on the fly"*.
- **Live SED Profiling:** Samples calibrated central surface brightness ($MJy/sr$) across all 6 detector arrays (D1 to D6).
- **Chemical Fingerprinting:** Overlays molecular vibrational absorption bands ($\text{H}_2\text{O}$ at 2.0 & 3.0 µm, $\text{CO}_2$ at 4.27 µm, $\text{CO}$ at 4.67 µm, $\text{CH}_4$ at 3.3 µm, and PAHs) and estimates radiative Wien temperatures.

### 3. 🔬 6-Detector Array Architecture & SNR Co-Addition Guide
- **Detector Array Stacking:** Visualizes the 6 H2RG detector arrays and calculates the quadratic Signal-to-Noise Ratio improvement:
  $$\text{SNR}_{\text{coadd}} = \text{SNR}_{\text{single}} \times \sqrt{17} \approx 4.123\times \quad (+312\% \text{ gain})$$
  Grounded in Devore's Central Limit Theorem (Devore, 2016).
- **Dual Mode UI:** Seamlessly toggles between *Explorer Mode* (accessible child/student analogies: "space compass", "heat goggles", "cosmic thermometer") and *Scientific Mode* (variance maps, mathematical equations, calibrated flux).

### 4. 🔗 Astronomical Deep-Linking & Universal Resolver
- **CDS Sesame Integration:** Resolves any celestial object name (SIMBAD, NED, VizieR) into exact ICRS coordinates.
- **URL Parameter State:** Share searches, coordinates, zoom levels, stretch settings, and colormaps instantly with one click (`?ra=...&dec=...&fov=...`).

---

## 🛰️ NASA Data & Scientific Integrity ("The Unplug Test")

We enforce a strict scientific integrity rule:  
> *"If we disconnect the NASA APIs and the web app still displays synthetic numbers, it is wrong."*

Every pixel and spectrum in CHRONO-SPHEREx is fetched directly from real NASA archives:
- **NASA/IPAC IRSA Simple Image Access (SIA v2):** `https://irsa.ipac.caltech.edu/SIA` (`spherex_dr1`, `spherex_dr1_deep`, `spherex_qr3`).
- **NASA/IPAC IRSA IBE Cutout REST API:** Real-time multi-extension FITS cutouts.
- **7 FITS HDU Decoding:** Native TypeScript decoding of `IMAGE`, `VARIANCE`, `FLAGS`, `ZODI` (foreground zodiacal dust removal), `EPSF`, and `WCS-WAVE`.
- **Ancillary Archives:** ESA Gaia DR3 astrometry, NASA WISE/NEOWISE, and 2MASS.

---

## 📚 Academic & University Backing (Normas APA 7.ª Edición)

All mathematical, thermodynamic, and physical models are grounded in core university textbooks:
- **Çengel, Y. A., & Boles, M. A. (2011).** *Thermodynamics: An Engineering Approach* (7th ed.). McGraw-Hill. (Stefan-Boltzmann radiation law and Wien's displacement).
- **Chang, R., & Goldsby, K. A. (2016).** *Chemistry* (12th ed.). McGraw-Hill Education. (Molecular infrared vibrational transitions).
- **Devore, J. L. (2016).** *Probability and Statistics for Engineering and the Sciences* (9th ed.). Cengage Learning. (Central Limit Theorem for detector array stacking).
- **Kreyszig, E. (2011).** *Advanced Engineering Mathematics* (10th ed.). John Wiley & Sons. (2D spatial image filtering and difference thresholding).
- **Young, H. D., & Freedman, R. A. (2018).** *Sears and Zemansky's University Physics* (14th ed.). Pearson. (Keplerian orbits, trigonometric parallax, and proper motion).

---

## 🤖 Super Intelligence (SI) & AI Disclosure

In strict accordance with the NASA Space Apps 2026 Project Submission Guide (`REGLAS.pdf`):
- **Tools Used:** Google Gemini (Antigravity) and Anthropic Claude as dual AI pair-programming and documentation assistants.
- **Application:** Used exclusively to accelerate TypeScript/Python implementation, validate mathematical formulations, and build responsive SVG/Canvas components.
- **Integrity Guarantee:** AI was **not** used to conceive the core challenge solution nor to fabricate synthetic astronomical data. All observations derive directly from NASA/IPAC IRSA. NASA branding and logos have not been altered.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or yarn

### Installation
```powershell
# Clone the repository
git clone https://github.com/jonasvillegass/NASA---SAC---2026.git
cd "NASA---SAC---2026"

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```powershell
# Build for production
npm run build
```

---

## 👥 Team: Ley de Conservación del Mate
- **Jonás Villegas** (Lead Developer & Pipeline)
- **Tomás Achával** (Research & Analysis)
- **Joaquín Barrionuevo** (Astrophysics & Data)
- **Facundo Bazán** (UI/UX & Frontend)
- **Muriel / Uriel Domínguez** (Scientific Visualization)
- **Jeremías Nolte** (Documentation & Review)
