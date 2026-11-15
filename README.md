# CHRONO-SPHEREx — Multi-Epoch Blink Comparator & 102-Band Spectral Explorer

- **Team**: Ley de Conservación del Mate
- **Challenge**: Planet X and SPHEREx (NASA Space Apps Challenge 2026)
- **Data Source**: NASA / IPAC Infrared Science Archive (`spherex_dr1`)
- **Submission Draft**: [`NASA_OFFICIAL_SUBMISSION_STAGING.md`](./NASA_OFFICIAL_SUBMISSION_STAGING.md)

---

## Project overview

**CHRONO-SPHEREx** is a browser-based web application developed to inspect calibrated observations from NASA's SPHEREx mission (102 near-infrared spectral channels distributed across 6 Linear Variable Filter detector arrays, covering $0.75$ to $5.00\,\mu\text{m}$).

The application queries multi-extension FITS cutouts directly from NASA/IPAC IRSA and renders them on the client side using TypeScript, React, and HTML5 Canvas. It allows students, educators, and citizen scientists to compare exposures across epochs, measure proper motion, evaluate flux variability, and extract 102-band spectral energy distributions without installing specialized desktop software.

---

## Core modules

### 1. Multi-epoch blink comparator and difference imaging
- Alternates between SPHEREx survey epochs separated by approximately six months with configurable frame intervals ($200\,\text{ms}$ to $1500\,\text{ms}$).
- Computes pixel-by-pixel difference maps ($D = I_2 - I_1$) normalized by combined variance ($\sigma_D = \sqrt{\sigma_1^2 + \sigma_2^2}$). Stationary background stars cancel out, while moving sources (*Barnard's Star*, *WISE 0855*) appear as positive/negative dipoles and stationary variable stars (*RW Aurigae*, *R Draconis*) appear as isolated monopoles.

### 2. On-the-fly 102-band spectral profile ($0.75\text{--}5.00\,\mu\text{m}$)
- Samples calibrated central surface brightness ($\text{MJy/sr}$) across all 6 detector arrays (`D1` through `D6`).
- Plots the spectral energy distribution (SED) in SVG with reference markers for molecular absorption bands ($\text{H}_2\text{O}$ at $2.02$ and $3.05\,\mu\text{m}$, $\text{CH}_4$/PAH at $3.30\,\mu\text{m}$, $\text{CO}_2$ at $4.27\,\mu\text{m}$, and $\text{CO}$ at $4.67\,\mu\text{m}$) and estimates the effective temperature ($T_{\text{eff}}$) via Wien's displacement law.

### 3. Detector array co-addition and signal-to-noise gain
- Combines the $N = 17$ spectral channels within each of the 6 H2RG detector arrays using inverse-variance weighting ($w_i = 1/\sigma_i^2$).
- Improves the signal-to-noise ratio by a factor of:
  $$\text{SNR}_{\text{coadd}} = \sqrt{\sum_{i=1}^{17} \text{SNR}_i^2} \approx \sqrt{17} \cdot \text{SNR}_{\text{single}} \approx 4.123\times$$
- Includes two display modes: **Explorer Mode** (plain-language descriptions for students and general users) and **Scientific Mode** (variance maps, quality bitmasks, and formal equations).

### 4. Coordinate resolution and URL state sharing
- Resolves object names to ICRS coordinates ($\text{RA}, \text{Dec}$) using a local validated catalog and CDS Sesame (SIMBAD, NED, VizieR).
- Synchronizes decimal degrees and sexagesimal (`HMS` / `DMS`) inputs in real time and persists search parameters in the URL query string (`?ra=...&dec=...&fov=...`).

---

## Data pipeline and scientific integrity

All measurements displayed in the interface are calculated from real NASA archival files:
- **NASA/IPAC IRSA Simple Image Access (SIA v2)**: `https://irsa.ipac.caltech.edu/SIA` (`spherex_dr1`, `spherex_dr1_deep`, `spherex_qr3`).
- **NASA/IPAC IRSA IBE Cutout Service**: Real-time angular FITS cutouts.
- **Multi-extension FITS parser**: Client-side decoding of `PRIMARY`, `IMAGE`, `FLAGS`, `VARIANCE`, `ZODI` (zodiacal dust foreground subtraction), `EPSF`, and `WCS-WAVE`.
- **Cross-matching catalogs**: ESA Gaia DR3 astrometry, NASA WISE/NEOWISE, and 2MASS.

If the NASA/IPAC IRSA endpoints are unreachable and no verified local FITS cutout is cached, calculations stop rather than returning synthetic numbers.

---

## Academic references (APA 7th edition)

- Çengel, Y. A., & Boles, M. A. (2011). *Thermodynamics: An Engineering Approach* (7th ed.). McGraw-Hill. (Blackbody radiation, Stefan-Boltzmann law, and Wien's displacement law).
- Chang, R., & Goldsby, K. A. (2016). *Chemistry* (12th ed.). McGraw-Hill Education. (Beer-Lambert absorption law and infrared vibrational modes).
- Devore, J. L. (2016). *Probability and Statistics for Engineering and the Sciences* (9th ed.). Cengage Learning. (Minimum-variance unbiased estimation, SNR co-addition, and $Z$-score testing).
- Kreyszig, E. (2011). *Advanced Engineering Mathematics* (10th ed.). John Wiley & Sons. (2D matrix operations and error propagation in image subtraction).
- Young, H. D., & Freedman, R. A. (2018). *Sears and Zemansky's University Physics* (14th ed.). Pearson. (Celestial kinematics, proper motion, and trigonometric parallax).

---

## AI usage disclosure

In accordance with the NASA Space Apps 2026 submission rules (`REGLAS.pdf`):
- **Tool used**: Google Gemini (Antigravity) as a coding and documentation assistant.
- **Scope**: Used to assist with TypeScript/React implementation, check mathematical formulas, and format English technical documentation.
- **Data integrity**: No synthetic astronomical data was generated by AI. All observations come from NASA/IPAC IRSA. Official NASA logos and branding elements are not used in the interface.

---

## Local development

### Requirements
- Node.js 18+ (Node 20+ recommended)
- npm

### Commands
```powershell
# Install dependencies
npm install

# Start the development server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build
```

---

## Team — Ley de Conservación del Mate
- **Jonás Villegas** — Software architecture, FITS pipeline, and difference imaging
- **Tomás Achával** — Core application logic, UI integration, and spectral analysis
- **Joaquín Renzo Barrionuevo** — Statistical co-addition (MVUE) and radiative thermodynamics
- **Facundo Bazán** — User interface design and frontend components
- **Uriel Domínguez** — Visual design and scientific data presentation
- **Jeremías Ismael Nolte Barrios** — Celestial kinematics, documentation, and quality review
