import { pixelToWorld, worldToPixel } from "./coordinates";
import { parseDetectorId } from "./detectors";
import { SPHEREX_HIPS_WAVELENGTHS_UM } from "./hips";
import type {
  CelestialBodyArchetypeId,
  CelestialBodyCandidate,
  CelestialBodyClassification,
  ChemicalDetectionStatus,
  ChemicalSpeciesResult,
  FitsWaveCalibration,
  HabitabilityAssessment,
  HabitabilityFactor,
  RenderedCutout,
  RoiChemicalAnalysisResult,
  RoiComparisonResult,
  RoiSpectrumPoint,
  SavedRoiReading,
  SkyRoiSelection,
  SpherexObservation,
} from "./types";

interface DiagnosticBandSpec {
  id: string;
  formula: string;
  nameEs: string;
  nameEn: string;
  kind: "absorption" | "emission";
  centerUm: number;
  bandWindow: [number, number];
  leftFlank: [number, number];
  rightFlank: [number, number];
  /** Fuerza de banda integrada A (cm / molécula) en literatura de laboratorio para hielos */
  bandStrengthCmPerMolec?: number;
}

const DIAGNOSTIC_BANDS: readonly DiagnosticBandSpec[] = [
  {
    id: "h2o_2um",
    formula: "H₂O (2.0 µm)",
    nameEs: "Hielo de agua (banda 2.02 µm)",
    nameEn: "Water ice (2.02 µm band)",
    kind: "absorption",
    centerUm: 2.02,
    bandWindow: [1.96, 2.08],
    leftFlank: [1.86, 1.95],
    rightFlank: [2.09, 2.16],
    bandStrengthCmPerMolec: 1.9e-18,
  },
  {
    id: "co_overtone",
    formula: "CO (2.3 µm)",
    nameEs: "Monóxido de carbono (sobretono 2.30 µm)",
    nameEn: "Carbon monoxide (2.30 µm overtone)",
    kind: "absorption",
    centerUm: 2.3,
    bandWindow: [2.26, 2.36],
    leftFlank: [2.18, 2.25],
    rightFlank: [2.37, 2.43],
  },
  {
    id: "nh3_ice",
    formula: "NH₃",
    nameEs: "Hielo de amoníaco",
    nameEn: "Ammonia ice",
    kind: "absorption",
    centerUm: 2.96,
    bandWindow: [2.9, 3.01],
    leftFlank: [2.45, 2.65],
    rightFlank: [3.65, 3.82],
    bandStrengthCmPerMolec: 2.2e-17,
  },
  {
    id: "h2o_3um",
    formula: "H₂O (3.05 µm)",
    nameEs: "Hielo de agua profundo",
    nameEn: "Deep water ice",
    kind: "absorption",
    centerUm: 3.05,
    bandWindow: [2.85, 3.22],
    leftFlank: [2.45, 2.65],
    rightFlank: [3.65, 3.82],
    bandStrengthCmPerMolec: 2.0e-16,
  },
  {
    id: "pah_33",
    formula: "PAH",
    nameEs: "Hidrocarburos aromáticos policíclicos",
    nameEn: "Polycyclic aromatic hydrocarbons",
    kind: "emission",
    centerUm: 3.29,
    bandWindow: [3.23, 3.36],
    leftFlank: [3.12, 3.22],
    rightFlank: [3.38, 3.5],
  },
  {
    id: "ch4_ice",
    formula: "CH₄",
    nameEs: "Hielo de metano",
    nameEn: "Methane ice",
    kind: "absorption",
    centerUm: 3.32,
    bandWindow: [3.28, 3.37],
    leftFlank: [3.18, 3.26],
    rightFlank: [3.39, 3.47],
    bandStrengthCmPerMolec: 1.0e-17,
  },
  {
    id: "ch3oh_ice",
    formula: "CH₃OH",
    nameEs: "Hielo de metanol",
    nameEn: "Methanol ice",
    kind: "absorption",
    centerUm: 3.53,
    bandWindow: [3.48, 3.59],
    leftFlank: [3.39, 3.47],
    rightFlank: [3.61, 3.74],
    bandStrengthCmPerMolec: 5.3e-18,
  },
  {
    id: "co2_ice",
    formula: "CO₂",
    nameEs: "Hielo de dióxido de carbono",
    nameEn: "Carbon dioxide ice",
    kind: "absorption",
    centerUm: 4.27,
    bandWindow: [4.21, 4.33],
    leftFlank: [4.08, 4.18],
    rightFlank: [4.4, 4.49],
    bandStrengthCmPerMolec: 7.6e-17,
  },
  {
    id: "13co2_ice",
    formula: "¹³CO₂",
    nameEs: "Isótopo de dióxido de carbono",
    nameEn: "Carbon-13 dioxide ice",
    kind: "absorption",
    centerUm: 4.38,
    bandWindow: [4.35, 4.41],
    leftFlank: [4.08, 4.18],
    rightFlank: [4.43, 4.52],
    bandStrengthCmPerMolec: 7.8e-17,
  },
  {
    id: "ocn_ice",
    formula: "OCN⁻",
    nameEs: "Ion cianato (hielo XCN)",
    nameEn: "Cyanate ion (XCN ice)",
    kind: "absorption",
    centerUm: 4.62,
    bandWindow: [4.58, 4.65],
    leftFlank: [4.47, 4.56],
    rightFlank: [4.73, 4.84],
    bandStrengthCmPerMolec: 1.3e-16,
  },
  {
    id: "co_ice",
    formula: "CO (4.67 µm)",
    nameEs: "Monóxido de carbono (hielo/gas)",
    nameEn: "Carbon monoxide (ice/gas)",
    kind: "absorption",
    centerUm: 4.67,
    bandWindow: [4.64, 4.71],
    leftFlank: [4.47, 4.56],
    rightFlank: [4.73, 4.84],
    bandStrengthCmPerMolec: 1.1e-17,
  },
  {
    id: "hi_paa",
    formula: "H I (Paα)",
    nameEs: "Hidrógeno ionizado (Paschen-α)",
    nameEn: "Ionized hydrogen (Paschen-α)",
    kind: "emission",
    centerUm: 1.875,
    bandWindow: [1.84, 1.91],
    leftFlank: [1.77, 1.83],
    rightFlank: [1.92, 1.98],
  },
  {
    id: "hi_brg",
    formula: "H I (Brγ)",
    nameEs: "Hidrógeno ionizado (Brackett-γ)",
    nameEn: "Ionized hydrogen (Brackett-γ)",
    kind: "emission",
    centerUm: 2.166,
    bandWindow: [2.13, 2.2],
    leftFlank: [2.06, 2.12],
    rightFlank: [2.21, 2.27],
  },
  {
    id: "hi_bra",
    formula: "H I (Brα)",
    nameEs: "Hidrógeno ionizado (Brackett-α)",
    nameEn: "Ionized hydrogen (Brackett-α)",
    kind: "emission",
    centerUm: 4.051,
    bandWindow: [4.01, 4.09],
    leftFlank: [3.93, 4.0],
    rightFlank: [4.1, 4.17],
  },
];

function findBracket(coords: number[], val: number): { i0: number; i1: number; t: number } {
  const n = coords.length;
  if (val <= coords[0]) return { i0: 0, i1: 0, t: 0 };
  if (val >= coords[n - 1]) return { i0: n - 1, i1: n - 1, t: 0 };

  for (let i = 0; i < n - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    if (val >= a && val <= b) {
      const span = b - a;
      return { i0: i, i1: i + 1, t: span > 0 ? (val - a) / span : 0 };
    }
  }
  return { i0: n - 1, i1: n - 1, t: 0 };
}

/**
 * Interpola la longitud de onda exacta (µm) y el ancho de banda (µm) en un píxel FITS (1-indexado)
 * usando la tabla oficial `WCS-WAVE` del archivo FITS de SPHEREx.
 */
export function getPixelWavelengthUm(
  px: number,
  py: number,
  waveGrid: FitsWaveCalibration | null | undefined
): { waveUm: number; bandwidthUm: number } | null {
  if (!waveGrid || waveGrid.xCoords.length < 2 || waveGrid.yCoords.length < 2) {
    return null;
  }

  // WCS-TAB: detector coordinate = CRVAL1W(1) + (px - CRPIX1W)
  const detX = 1 + (px - waveGrid.crpix1w);
  const detY = 1 + (py - waveGrid.crpix2w);

  const bx = findBracket(waveGrid.xCoords, detX);
  const by = findBracket(waveGrid.yCoords, detY);
  const nx = waveGrid.xCoords.length;

  const sample = (ix: number, iy: number, offset: 0 | 1) =>
    waveGrid.values[(iy * nx + ix) * 2 + offset];

  const bilerp = (offset: 0 | 1) => {
    const v00 = sample(bx.i0, by.i0, offset);
    const v10 = sample(bx.i1, by.i0, offset);
    const v01 = sample(bx.i0, by.i1, offset);
    const v11 = sample(bx.i1, by.i1, offset);
    const top = v00 + (v10 - v00) * bx.t;
    const bot = v01 + (v11 - v01) * bx.t;
    return top + (bot - top) * by.t;
  };

  const waveUm = bilerp(0);
  const bandwidthUm = bilerp(1);

  if (!Number.isFinite(waveUm) || waveUm <= 0) return null;
  return {
    waveUm: Number(waveUm.toFixed(4)),
    bandwidthUm: Number.isFinite(bandwidthUm) && bandwidthUm > 0 ? Number(bandwidthUm.toFixed(4)) : 0,
  };
}

function pointInPolygon(px: number, py: number, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extrae el espectro real promedio e incertidumbre propagada dentro del área seleccionada (ROI)
 * a partir de los recortes FITS reales descargados en caché.
 */
export function extractRoiSpectrumFromCutouts(
  roi: SkyRoiSelection,
  observations: SpherexObservation[],
  cachedCutoutsMap: Map<string, RenderedCutout>
): RoiSpectrumPoint[] {
  const points: RoiSpectrumPoint[] = [];

  for (const obs of observations) {
    const cutout = cachedCutoutsMap.get(obs.obs_id);
    if (!cutout || !cutout.fluxData || !cutout.wcs) continue;

    const polyPix: Array<{ x: number; y: number }> = [];
    for (const c of roi.corners) {
      const p = worldToPixel(c.ra, c.dec, cutout.wcs);
      if (p) polyPix.push({ x: p.px, y: p.py });
    }
    if (polyPix.length < 3) continue;

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of polyPix) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const colStart = Math.max(0, Math.floor(minX - 1));
    const colEnd = Math.min(cutout.width - 1, Math.ceil(maxX - 1));
    const rowStart = Math.max(0, Math.floor(minY - 1));
    const rowEnd = Math.min(cutout.height - 1, Math.ceil(maxY - 1));

    const vals: number[] = [];
    let varSum = 0;
    let varCount = 0;

    for (let row = rowStart; row <= rowEnd; row++) {
      const py = row + 1;
      for (let col = colStart; col <= colEnd; col++) {
        const px = col + 1;
        if (!pointInPolygon(px, py, polyPix)) continue;

        const idx = row * cutout.width + col;
        const val = cutout.fluxData[idx];
        if (!Number.isFinite(val)) continue;

        vals.push(val);
        const v = cutout.varianceData ? cutout.varianceData[idx] : Number.NaN;
        if (Number.isFinite(v) && v >= 0) {
          varSum += v;
          varCount++;
        }
      }
    }

    // Fallback al píxel más cercano al centro del ROI si el polígono es sub-píxel
    if (vals.length === 0) {
      const centerPix = worldToPixel(roi.centerRa, roi.centerDec, cutout.wcs);
      if (!centerPix) continue;
      const col = Math.round(centerPix.px - 1);
      const row = Math.round(centerPix.py - 1);
      if (col < 0 || col >= cutout.width || row < 0 || row >= cutout.height) continue;
      const idx = row * cutout.width + col;
      const val = cutout.fluxData[idx];
      if (!Number.isFinite(val)) continue;
      vals.push(val);
      const v = cutout.varianceData ? cutout.varianceData[idx] : Number.NaN;
      if (Number.isFinite(v) && v >= 0) {
        varSum += v;
        varCount++;
      }
    }

    const n = vals.length;
    const meanFlux = vals.reduce((acc, v) => acc + v, 0) / n;

    let sigma: number;
    if (varCount > 0) {
      const meanVar = varSum / varCount;
      sigma = Math.sqrt(meanVar / Math.max(1, n));
    } else if (n > 1) {
      const sq = vals.reduce((acc, v) => acc + (v - meanFlux) ** 2, 0);
      sigma = Math.sqrt(sq / (n * (n - 1)));
    } else {
      sigma = Math.max(1e-6, Math.abs(meanFlux) * 0.05);
    }

    const centerPix = worldToPixel(roi.centerRa, roi.centerDec, cutout.wcs);
    const waveFromGrid = centerPix
      ? getPixelWavelengthUm(centerPix.px, centerPix.py, cutout.waveGrid)
      : null;

    const fallbackWave =
      obs.em_min_um !== null && obs.em_max_um !== null
        ? Number(((obs.em_min_um + obs.em_max_um) / 2).toFixed(4))
        : null;

    const waveUm = waveFromGrid?.waveUm ?? fallbackWave;
    if (waveUm === null || !Number.isFinite(waveUm)) continue;

    const snr = sigma > 0 ? Math.abs(meanFlux) / sigma : null;

    points.push({
      obs_id: obs.obs_id,
      bandpass: obs.bandpass,
      detector: parseDetectorId(obs.bandpass) || cutout.stats.detector || "D1",
      waveUm,
      bandwidthUm: waveFromGrid?.bandwidthUm ?? null,
      flux: meanFlux,
      sigma,
      snr,
      pixelCount: n,
    });
  }

  points.sort((a, b) => a.waveUm - b.waveUm);
  return points;
}

function countCoveredHipsChannels(points: RoiSpectrumPoint[]): number {
  if (points.length === 0) return 0;
  let covered = 0;
  for (const chWave of SPHEREX_HIPS_WAVELENGTHS_UM) {
    const tol = chWave * 0.02;
    if (points.some((p) => Math.abs(p.waveUm - chWave) <= tol)) {
      covered++;
    }
  }
  return covered;
}

function weightedMean(pts: RoiSpectrumPoint[]): { wave: number; flux: number; sigma: number } | null {
  if (pts.length === 0) return null;
  let wSum = 0;
  let fSum = 0;
  let waveSum = 0;
  for (const p of pts) {
    const s = Math.max(1e-8, p.sigma);
    const w = 1 / (s * s);
    wSum += w;
    fSum += w * p.flux;
    waveSum += w * p.waveUm;
  }
  if (wSum <= 0) return null;
  return {
    wave: waveSum / wSum,
    flux: fSum / wSum,
    sigma: Math.sqrt(1 / wSum),
  };
}

interface ContinuumFeatures {
  nirEarlyMean: number | null;
  nirMidMean: number | null;
  mirMean: number | null;
  spectralSlope: number | null;
  peakWaveUm: number | null;
  estimatedTeffK: number | null;
  mirToNirRatio: number | null;
}

function meanFluxInWindow(points: RoiSpectrumPoint[], minUm: number, maxUm: number): number | null {
  const matched = points.filter(
    (p) => p.waveUm >= minUm && p.waveUm <= maxUm && Number.isFinite(p.flux)
  );
  if (matched.length === 0) return null;
  return matched.reduce((acc, p) => acc + p.flux, 0) / matched.length;
}

/**
 * Extrae rasgos físicos reales del continuo infrarrojo (flujos medios por ventana,
 * pendiente log-log α_IR, longitud de onda pico y temperatura efectiva de Wien).
 */
export function extractContinuumFeatures(points: RoiSpectrumPoint[]): ContinuumFeatures {
  const nirEarlyMean = meanFluxInWindow(points, 0.75, 1.64);
  const nirMidMean = meanFluxInWindow(points, 1.63, 3.85);
  const mirMean = meanFluxInWindow(points, 3.81, 5.05);

  const mirToNirRatio =
    mirMean !== null && nirEarlyMean !== null && Math.abs(nirEarlyMean) > 1e-6
      ? mirMean / Math.abs(nirEarlyMean)
      : null;

  const positivePts = points
    .filter((p) => Number.isFinite(p.flux) && p.flux > 0 && p.waveUm > 0)
    .sort((a, b) => a.waveUm - b.waveUm);

  let spectralSlope: number | null = null;
  if (positivePts.length >= 3) {
    const logW = positivePts.map((p) => Math.log10(p.waveUm));
    const logF = positivePts.map((p) => Math.log10(p.flux));
    const spanLogW = Math.max(...logW) - Math.min(...logW);
    if (spanLogW >= 0.05) {
      const meanX = logW.reduce((a, b) => a + b, 0) / logW.length;
      const meanY = logF.reduce((a, b) => a + b, 0) / logF.length;
      let num = 0;
      let den = 0;
      for (let i = 0; i < logW.length; i++) {
        const dx = logW[i] - meanX;
        num += dx * (logF[i] - meanY);
        den += dx * dx;
      }
      if (den > 1e-9) {
        spectralSlope = Number((num / den).toFixed(3));
      }
    }
  }

  let peakWaveUm: number | null = null;
  let estimatedTeffK: number | null = null;
  if (positivePts.length >= 2) {
    // Suavizado con mediana móvil de 3 puntos para evitar picos espurios de un único píxel
    let bestEnergy = Number.NEGATIVE_INFINITY;
    let bestWave = positivePts[0].waveUm;
    for (let i = 0; i < positivePts.length; i++) {
      const slice = positivePts.slice(Math.max(0, i - 1), Math.min(positivePts.length, i + 2));
      const sortedF = slice.map((p) => p.flux).sort((a, b) => a - b);
      const medF = sortedF[Math.floor(sortedF.length / 2)];
      // λ * F_λ ∝ ν * F_ν ∝ F_ν / λ; usamos F_ν / λ como proxy energético de Wien en λ
      const proxy = medF / Math.max(0.5, positivePts[i].waveUm);
      if (proxy > bestEnergy) {
        bestEnergy = proxy;
        bestWave = positivePts[i].waveUm;
      }
    }
    peakWaveUm = Number(bestWave.toFixed(3));
    estimatedTeffK = Math.round(2898 / Math.max(0.5, bestWave));
  }

  return {
    nirEarlyMean,
    nirMidMean,
    mirMean,
    spectralSlope,
    peakWaveUm,
    estimatedTeffK,
    mirToNirRatio,
  };
}

interface ArchetypeMeta {
  id: CelestialBodyArchetypeId;
  nameEs: string;
  nameEn: string;
}

const ARCHETYPE_CATALOG: readonly ArchetypeMeta[] = [
  {
    id: "icy_substellar_world",
    nameEs: "Mundo Helado / Cuerpo Planetario o Enana Ultrafría (Y/T)",
    nameEn: "Icy World / Planetary Body or Ultra-Cool Dwarf (Y/T)",
  },
  {
    id: "protoplanetary_disk_yso",
    nameEs: "Disco Protoplanetario / Estrella Joven (YSO / T Tauri)",
    nameEn: "Protoplanetary Disk / Young Star (YSO / T Tauri)",
  },
  {
    id: "molecular_cloud_core",
    nameEs: "Nube Molecular Densa / Núcleo Pre-estelar",
    nameEn: "Dense Molecular Cloud / Pre-stellar Core",
  },
  {
    id: "hii_nebula_ism",
    nameEs: "Nebulosa de Formación Estelar / Región H II",
    nameEn: "Star-Forming Nebula / H II Region",
  },
  {
    id: "cool_star_photosphere",
    nameEs: "Estrella Fría / Enana Roja o Gigante Roja (M/K)",
    nameEn: "Cool Star / Red Dwarf or Red Giant (M/K)",
  },
  {
    id: "galaxy_stellar_system",
    nameEs: "Sistema Galáctico / Población Estelar Integrada",
    nameEn: "Galactic System / Integrated Stellar Population",
  },
];

function speciesWeight(sp: ChemicalSpeciesResult | undefined): number {
  if (!sp) return 0;
  if (sp.status === "detected") return 1.0;
  if (sp.status === "marginal") return 0.5;
  return 0;
}

/**
 * Clasifica probabilísticamente el cuerpo celeste del área (ROI) combinando firmas químicas
 * infrarrojas detectadas/marginales y rasgos del continuo espectral (pendiente α_IR y T_eff Wien).
 */
export function classifyCelestialBodyFromRoi(
  points: RoiSpectrumPoint[],
  species: ChemicalSpeciesResult[],
  continuum: ContinuumFeatures,
  coveredChannelsCount: number
): CelestialBodyClassification {
  const evaluatedBandsCount = species.filter((s) => s.status !== "no_coverage").length;

  if (coveredChannelsCount < 4 || points.length < 3) {
    return {
      topCandidate: null,
      candidates: [],
      confidence: "insufficient",
      estimatedTeffK: continuum.estimatedTeffK,
      peakWaveUm: continuum.peakWaveUm,
      spectralSlope: continuum.spectralSlope,
      evaluatedBandsCount,
    };
  }

  const spMap = new Map(species.map((s) => [s.id, s]));
  const w = (id: string) => speciesWeight(spMap.get(id));

  const wH2O2 = w("h2o_2um");
  const wH2O3 = w("h2o_3um");
  const wH2O = Math.max(wH2O2, wH2O3);
  const wCOover = w("co_overtone");
  const wCOice = w("co_ice");
  const wCO2 = Math.max(w("co2_ice"), w("13co2_ice") * 0.8);
  const wCH4 = w("ch4_ice");
  const wNH3 = w("nh3_ice");
  const wCH3OH = w("ch3oh_ice");
  const wOCN = w("ocn_ice");
  const wPAH = w("pah_33");
  const wHI = Math.max(w("hi_paa"), w("hi_brg"), w("hi_bra"));

  const teff = continuum.estimatedTeffK;
  const slope = continuum.spectralSlope;

  const scores: Record<CelestialBodyArchetypeId, number> = {
    icy_substellar_world: 0.15,
    protoplanetary_disk_yso: 0.15,
    molecular_cloud_core: 0.15,
    hii_nebula_ism: 0.15,
    cool_star_photosphere: 0.15,
    galaxy_stellar_system: 0.15,
  };

  const featEs: Record<CelestialBodyArchetypeId, string[]> = {
    icy_substellar_world: [],
    protoplanetary_disk_yso: [],
    molecular_cloud_core: [],
    hii_nebula_ism: [],
    cool_star_photosphere: [],
    galaxy_stellar_system: [],
  };

  const featEn: Record<CelestialBodyArchetypeId, string[]> = {
    icy_substellar_world: [],
    protoplanetary_disk_yso: [],
    molecular_cloud_core: [],
    hii_nebula_ism: [],
    cool_star_photosphere: [],
    galaxy_stellar_system: [],
  };

  const addEvidence = (
    id: CelestialBodyArchetypeId,
    pts: number,
    esLabel?: string,
    enLabel?: string
  ) => {
    scores[id] += pts;
    if (esLabel && !featEs[id].includes(esLabel)) featEs[id].push(esLabel);
    if (enLabel && !featEn[id].includes(enLabel)) featEn[id].push(enLabel);
  };

  // 1. Mundo helado / Cuerpo planetario o enana ultrafría (Y/T)
  if (wH2O > 0) addEvidence("icy_substellar_world", 1.8 * wH2O, "Hielo/vapor H₂O", "H₂O ice/vapor");
  if (wCH4 > 0) addEvidence("icy_substellar_world", 2.4 * wCH4, "Metano CH₄", "Methane CH₄");
  if (wNH3 > 0) addEvidence("icy_substellar_world", 2.1 * wNH3, "Amoníaco NH₃", "Ammonia NH₃");
  if (wCO2 > 0) addEvidence("icy_substellar_world", 1.4 * wCO2, "Hielo CO₂", "CO₂ ice");
  if (wCOice > 0) addEvidence("icy_substellar_world", 1.1 * wCOice, "CO (4.67 µm)", "CO (4.67 µm)");
  if (teff !== null && teff <= 850) {
    addEvidence("icy_substellar_world", 1.8, `Régimen frío (~${teff} K)`, `Cold regime (~${teff} K)`);
  }
  if (slope !== null && slope > 0.05) {
    addEvidence("icy_substellar_world", 0.9, "Exceso térmico D4–D6", "D4–D6 thermal excess");
  }
  if (wHI > 0) {
    scores.icy_substellar_world = Math.max(0.05, scores.icy_substellar_world - 1.4 * wHI);
  }

  // 2. Disco protoplanetario / YSO / T Tauri
  const iceDiversity = [wH2O, wCO2, wCH3OH, wOCN, wCOice].filter((v) => v > 0).length;
  if (iceDiversity >= 2 && wHI > 0) {
    addEvidence(
      "protoplanetary_disk_yso",
      2.6,
      "Hielos circunestelares + emisión H I",
      "Circumstellar ices + H I emission"
    );
  }
  if (wH2O > 0) addEvidence("protoplanetary_disk_yso", 1.2 * wH2O, "Hielo H₂O", "H₂O ice");
  if (wCO2 > 0) addEvidence("protoplanetary_disk_yso", 1.3 * wCO2, "Hielo CO₂", "CO₂ ice");
  if (wCH3OH > 0) addEvidence("protoplanetary_disk_yso", 1.4 * wCH3OH, "Metanol CH₃OH", "Methanol CH₃OH");
  if (wOCN > 0) addEvidence("protoplanetary_disk_yso", 1.5 * wOCN, "Ion cianato OCN⁻", "Cyanate OCN⁻");
  if (wHI > 0) addEvidence("protoplanetary_disk_yso", 1.6 * wHI, "Acreción H I", "H I accretion");
  if (wPAH > 0) addEvidence("protoplanetary_disk_yso", 1.1 * wPAH, "Emisión PAH", "PAH emission");
  if (slope !== null && slope > 0.15) {
    addEvidence("protoplanetary_disk_yso", 1.1, "Exceso IR de disco", "IR disk excess");
  }

  // 3. Nube molecular densa / Núcleo pre-estelar
  if (wH2O3 > 0) addEvidence("molecular_cloud_core", 2.0 * wH2O3, "Hielo profundo H₂O (3.05 µm)", "Deep H₂O ice (3.05 µm)");
  if (wCOice > 0) addEvidence("molecular_cloud_core", 2.0 * wCOice, "Hielo criogénico CO", "Cryogenic CO ice");
  if (wCO2 > 0) addEvidence("molecular_cloud_core", 1.8 * wCO2, "Hielo CO₂", "CO₂ ice");
  if (wCH3OH > 0) addEvidence("molecular_cloud_core", 1.9 * wCH3OH, "Hielo CH₃OH", "CH₃OH ice");
  if (wOCN > 0) addEvidence("molecular_cloud_core", 1.7 * wOCN, "Hielo XCN (OCN⁻)", "XCN ice (OCN⁻)");
  if (w("13co2_ice") > 0) addEvidence("molecular_cloud_core", 1.4 * w("13co2_ice"), "Isótopo ¹³CO₂", "¹³CO₂ isotope");
  if (slope !== null && slope > 0.3) {
    addEvidence("molecular_cloud_core", 1.3, "Extinción/enrojecimiento denso", "Dense dust reddening");
  }

  // 4. Nebulosa / Región H II
  if (wPAH > 0) addEvidence("hii_nebula_ism", 2.8 * wPAH, "Emisión PAH (3.29 µm)", "PAH emission (3.29 µm)");
  if (wHI > 0) addEvidence("hii_nebula_ism", 2.6 * wHI, "Líneas H I ionizado", "Ionized H I lines");
  if (wPAH > 0 && wHI > 0) {
    addEvidence("hii_nebula_ism", 1.2, "Frente de fotodisociación UV", "UV photodissociation front");
  }

  // 5. Estrella fría / Enana roja o gigante roja (M/K)
  if (wCOover > 0) addEvidence("cool_star_photosphere", 2.4 * wCOover, "Sobretono CO (2.30 µm)", "CO overtone (2.30 µm)");
  if (wH2O2 > 0 && wCH4 === 0 && wCO2 === 0) {
    addEvidence("cool_star_photosphere", 1.3 * wH2O2, "Banda H₂O estelar", "Stellar H₂O band");
  }
  if (teff !== null && teff >= 1400) {
    addEvidence("cool_star_photosphere", 2.1, `Continuo estelar (~${teff} K)`, `Stellar continuum (~${teff} K)`);
  }
  if (slope !== null && slope < -0.35) {
    addEvidence("cool_star_photosphere", 1.8, "Pendiente fotosférica azul-NIR", "Photospheric NIR slope");
  }

  // 6. Sistema galáctico / Población estelar integrada
  if (teff !== null && teff >= 1500 && teff <= 3500) {
    addEvidence("galaxy_stellar_system", 1.5, "Pico estelar 1.1–1.6 µm (H⁻)", "1.1–1.6 µm stellar peak (H⁻)");
  }
  if (wPAH > 0 && wCO2 === 0 && wCH3OH === 0) {
    addEvidence("galaxy_stellar_system", 1.8 * wPAH, "Componente ISM de PAH", "Galactic ISM PAH");
  }
  if (slope !== null && slope >= -1.2 && slope <= 0.15 && iceDiversity === 0) {
    addEvidence("galaxy_stellar_system", 1.4, "Continuo estelar + polvo difuso", "Stellar continuum + diffuse dust");
  }

  const totalScore = Object.values(scores).reduce((acc, val) => acc + Math.max(0, val), 0);
  const rawCandidates = ARCHETYPE_CATALOG.map((meta) => {
    const rawPct = totalScore > 0 ? (Math.max(0, scores[meta.id]) / totalScore) * 100 : 100 / ARCHETYPE_CATALOG.length;
    return {
      id: meta.id,
      nameEs: meta.nameEs,
      nameEn: meta.nameEn,
      probabilityPct: Number(rawPct.toFixed(1)),
      matchingFeaturesEs: featEs[meta.id],
      matchingFeaturesEn: featEn[meta.id],
    };
  }).sort((a, b) => b.probabilityPct - a.probabilityPct);

  // Ajuste menor para que la suma redondeada sea exactamente 100.0%
  if (rawCandidates.length > 0) {
    const sumRounded = rawCandidates.reduce((acc, c) => acc + c.probabilityPct, 0);
    const diff = Number((100 - sumRounded).toFixed(1));
    rawCandidates[0].probabilityPct = Number(
      Math.max(0, Math.min(100, rawCandidates[0].probabilityPct + diff)).toFixed(1)
    );
  }

  const detectedCount = species.filter((s) => s.status === "detected").length;
  let confidence: CelestialBodyClassification["confidence"];
  if (coveredChannelsCount >= 50 && (detectedCount >= 2 || (detectedCount >= 1 && evaluatedBandsCount >= 8))) {
    confidence = "high";
  } else if (coveredChannelsCount >= 15) {
    confidence = "moderate";
  } else {
    confidence = "low";
  }

  return {
    topCandidate: rawCandidates[0] ?? null,
    candidates: rawCandidates,
    confidence,
    estimatedTeffK: continuum.estimatedTeffK,
    peakWaveUm: continuum.peakWaveUm,
    spectralSlope: continuum.spectralSlope,
    evaluatedBandsCount,
  };
}

const ARCHETYPE_LIFE_CONTEXT_FACTOR: Record<CelestialBodyArchetypeId, number> = {
  icy_substellar_world: 1.0,
  protoplanetary_disk_yso: 0.85,
  molecular_cloud_core: 0.62,
  galaxy_stellar_system: 0.42,
  hii_nebula_ism: 0.25,
  cool_star_photosphere: 0.18,
};

/**
 * Estima la probabilidad de que el área presente condiciones compatibles con la vida
 * tal como la conocemos (paradigma CHNOPS + H₂O solvente + régimen térmico y radiativo).
 */
export function assessHabitabilityFromRoi(
  points: RoiSpectrumPoint[],
  species: ChemicalSpeciesResult[],
  continuum: ContinuumFeatures,
  classification: CelestialBodyClassification,
  coveredChannelsCount: number
): HabitabilityAssessment {
  const spMap = new Map(species.map((s) => [s.id, s]));
  const evaluatedBands = species.filter((s) => s.status !== "no_coverage");

  if (coveredChannelsCount < 4 || points.length < 3 || evaluatedBands.length === 0) {
    return {
      probabilityPct: null,
      tier: "insufficient",
      chnopsElements: [],
      factors: [],
      summaryEs:
        "No hay suficientes canales y bandas diagnósticas cubiertas para estimar condiciones de habitabilidad.",
      summaryEn:
        "Not enough spectral channels and diagnostic bands covered yet to estimate habitability conditions.",
    };
  }

  // Extraer elementos CHNOPS confirmados (detecciones ≥3σ o marginales 2–3σ)
  const chnopsSet = new Set<"C" | "H" | "N" | "O">();
  const addElem = (id: string, elems: Array<"C" | "H" | "N" | "O">) => {
    if (speciesWeight(spMap.get(id)) > 0) {
      for (const el of elems) chnopsSet.add(el);
    }
  };
  addElem("h2o_2um", ["H", "O"]);
  addElem("h2o_3um", ["H", "O"]);
  addElem("co_overtone", ["C", "O"]);
  addElem("co_ice", ["C", "O"]);
  addElem("co2_ice", ["C", "O"]);
  addElem("13co2_ice", ["C", "O"]);
  addElem("ch4_ice", ["C", "H"]);
  addElem("ch3oh_ice", ["C", "H", "O"]);
  addElem("nh3_ice", ["N", "H"]);
  addElem("ocn_ice", ["O", "C", "N"]);
  addElem("pah_33", ["C", "H"]);
  addElem("hi_paa", ["H"]);
  addElem("hi_brg", ["H"]);
  addElem("hi_bra", ["H"]);

  const orderedChnops: Array<"C" | "H" | "N" | "O"> = (["C", "H", "N", "O"] as const).filter((e) =>
    chnopsSet.has(e)
  );

  // 1. Pilar Agua (H₂O - 30%)
  const h2o2 = spMap.get("h2o_2um");
  const h2o3 = spMap.get("h2o_3um");
  const h2oCovered =
    (h2o2 && h2o2.status !== "no_coverage") || (h2o3 && h2o3.status !== "no_coverage");
  const wH2O = Math.max(speciesWeight(h2o2), speciesWeight(h2o3));
  const bestH2OSnr = Math.max(h2o2?.snr ?? 0, h2o3?.snr ?? 0);
  const waterScore = !h2oCovered
    ? 0
    : wH2O > 0
      ? Math.min(100, 45 * wH2O + Math.min(55, bestH2OSnr * 10))
      : 5;
  const waterFactor: HabitabilityFactor = {
    id: "water",
    labelEs: "Agua (H₂O · Solvente Biológico)",
    labelEn: "Water (H₂O · Biological Solvent)",
    weightPct: 30,
    scorePct: Number(waterScore.toFixed(1)),
    status: !h2oCovered
      ? "no_coverage"
      : waterScore >= 60
        ? "favorable"
        : waterScore >= 25
          ? "partial"
          : "unfavorable",
    detailEs: !h2oCovered
      ? "Bandas de H₂O (2.02 / 3.05 µm) sin cobertura."
      : wH2O > 0
        ? `H₂O detectada (hasta ${bestH2OSnr.toFixed(1)}σ), clave como solvente para química celular.`
        : "Bandas de H₂O cubiertas sin detección significativa (>2σ).",
    detailEn: !h2oCovered
      ? "H₂O bands (2.02 / 3.05 µm) lack spectral coverage."
      : wH2O > 0
        ? `H₂O detected (up to ${bestH2OSnr.toFixed(1)}σ), essential solvent for cellular chemistry.`
        : "H₂O bands covered with no significant detection (>2σ).",
  };

  // 2. Pilar Precursores Orgánicos de Carbono (25%)
  const carbonIds = ["ch4_ice", "ch3oh_ice", "pah_33", "co2_ice", "13co2_ice"];
  const carbonSpecs = carbonIds
    .map((id) => spMap.get(id))
    .filter((s): s is ChemicalSpeciesResult => Boolean(s));
  const carbonCovered = carbonSpecs.some((s) => s.status !== "no_coverage");
  const activeCarbon = carbonSpecs.filter((s) => speciesWeight(s) > 0);
  const carbonWeightedHits = carbonSpecs.reduce((acc, s) => acc + speciesWeight(s), 0);
  const carbonScore = !carbonCovered
    ? 0
    : activeCarbon.length > 0
      ? Math.min(100, 30 + carbonWeightedHits * 22)
      : 5;
  const carbonFactor: HabitabilityFactor = {
    id: "carbon_organics",
    labelEs: "Química Orgánica del Carbono",
    labelEn: "Carbon & Prebiotic Organics",
    weightPct: 25,
    scorePct: Number(carbonScore.toFixed(1)),
    status: !carbonCovered
      ? "no_coverage"
      : carbonScore >= 60
        ? "favorable"
        : carbonScore >= 25
          ? "partial"
          : "unfavorable",
    detailEs: !carbonCovered
      ? "Sin cobertura en bandas orgánicas/carbonadas (CH₄, CH₃OH, CO₂, PAH)."
      : activeCarbon.length > 0
        ? `Portadores de carbono presentes: ${activeCarbon.map((s) => s.formula).join(", ")}.`
        : "Sin detección significativa de portadores orgánicos o CO₂.",
    detailEn: !carbonCovered
      ? "No coverage on carbon/organic bands (CH₄, CH₃OH, CO₂, PAH)."
      : activeCarbon.length > 0
        ? `Carbon carriers present: ${activeCarbon.map((s) => s.formula).join(", ")}.`
        : "No significant detection of organic carriers or CO₂.",
  };

  // 3. Pilar Nitrógeno Biogénico y Enlaces Pre-proteicos (20%)
  const nh3 = spMap.get("nh3_ice");
  const ocn = spMap.get("ocn_ice");
  const nCovered =
    (nh3 && nh3.status !== "no_coverage") || (ocn && ocn.status !== "no_coverage");
  const wNH3 = speciesWeight(nh3);
  const wOCN = speciesWeight(ocn);
  const nScore = !nCovered
    ? 0
    : wNH3 > 0 || wOCN > 0
      ? Math.min(100, 35 + wNH3 * 35 + wOCN * 45)
      : 5;
  const nitrogenFactor: HabitabilityFactor = {
    id: "chnops_nitrogen",
    labelEs: "Nitrógeno Biogénico (NH₃ / OCN⁻)",
    labelEn: "Biogenic Nitrogen (NH₃ / OCN⁻)",
    weightPct: 20,
    scorePct: Number(nScore.toFixed(1)),
    status: !nCovered
      ? "no_coverage"
      : nScore >= 60
        ? "favorable"
        : nScore >= 25
          ? "partial"
          : "unfavorable",
    detailEs: !nCovered
      ? "Bandas de NH₃ (2.96 µm) y OCN⁻ (4.62 µm) sin cobertura."
      : wNH3 > 0 || wOCN > 0
        ? `Reserva nitrogenada detectada (${[wNH3 > 0 ? "NH₃" : null, wOCN > 0 ? "OCN⁻" : null].filter(Boolean).join(", ")}), clave para aminoácidos y efecto anticongelante.`
        : "Sin detección significativa de amoníaco ni ion cianato.",
    detailEn: !nCovered
      ? "NH₃ (2.96 µm) and OCN⁻ (4.62 µm) bands lack coverage."
      : wNH3 > 0 || wOCN > 0
        ? `Nitrogen reservoir detected (${[wNH3 > 0 ? "NH₃" : null, wOCN > 0 ? "OCN⁻" : null].filter(Boolean).join(", ")}), vital for amino acids and cryoscopic antifreeze.`
        : "No significant detection of ammonia or cyanate ion.",
  };

  // 4. Pilar Régimen Térmico / Ventana de Agua Líquida (15%)
  const teff = continuum.estimatedTeffK;
  let thermalScore = 0;
  if (teff !== null) {
    if (teff >= 200 && teff <= 380) {
      thermalScore = 95;
    } else if ((teff >= 140 && teff < 200) || (teff > 380 && teff <= 750)) {
      thermalScore = 62;
    } else if (teff > 750 && teff <= 1400) {
      thermalScore = 35;
    } else {
      thermalScore = 15;
    }
  }
  const thermalFactor: HabitabilityFactor = {
    id: "thermal_regime",
    labelEs: "Régimen Térmico (T_eff Wien)",
    labelEn: "Thermal Regime (Wien T_eff)",
    weightPct: 15,
    scorePct: Number(thermalScore.toFixed(1)),
    status:
      teff === null
        ? "no_coverage"
        : thermalScore >= 70
          ? "favorable"
          : thermalScore >= 40
            ? "partial"
            : "unfavorable",
    detailEs:
      teff === null
        ? "No se pudo estimar la temperatura del continuo."
        : teff >= 200 && teff <= 380
          ? `T_eff ≈ ${teff} K: compatible con ventana térmica templada/acuosa.`
          : teff <= 750
            ? `T_eff ≈ ${teff} K: régimen frío/sub-estelar (posible océano subsuperficial o zona templada atmosférica).`
            : `T_eff ≈ ${teff} K: régimen caliente/fotosférico incompatible con agua líquida superficial directa.`,
    detailEn:
      teff === null
        ? "Continuum temperature could not be estimated."
        : teff >= 200 && teff <= 380
          ? `T_eff ≈ ${teff} K: compatible with temperate/aqueous thermal window.`
          : teff <= 750
            ? `T_eff ≈ ${teff} K: cool/substellar regime (possible subsurface ocean or temperate atmospheric layer).`
            : `T_eff ≈ ${teff} K: hot/photospheric regime incompatible with direct surface liquid water.`,
  };

  // 5. Pilar Clemencia Radiativa y Desequilibrio Químico (10%)
  const wHI = Math.max(
    speciesWeight(spMap.get("hi_paa")),
    speciesWeight(spMap.get("hi_brg")),
    speciesWeight(spMap.get("hi_bra"))
  );
  const wCO = Math.max(speciesWeight(spMap.get("co_ice")), speciesWeight(spMap.get("co_overtone")));
  const hasDisequilibrium = wH2O > 0 && (speciesWeight(spMap.get("ch4_ice")) > 0 || speciesWeight(spMap.get("co2_ice")) > 0);
  let radScore = 60;
  if (hasDisequilibrium) radScore += 30;
  if (wHI > 0) radScore -= 40 * wHI;
  if (wCO > 0 && wH2O === 0) radScore -= 25 * wCO;
  radScore = Math.max(5, Math.min(100, radScore));

  const radiationFactor: HabitabilityFactor = {
    id: "radiation_equilib",
    labelEs: "Estabilidad Radiativa y Desequilibrio",
    labelEn: "Radiation Environment & Disequilibrium",
    weightPct: 10,
    scorePct: Number(radScore.toFixed(1)),
    status: radScore >= 65 ? "favorable" : radScore >= 40 ? "partial" : "unfavorable",
    detailEs:
      wHI > 0
        ? "Presencia de líneas H I ionizadas indica radiación UV/energética hostil."
        : hasDisequilibrium
          ? "Coexistencia de H₂O con compuestos de carbono (desequilibrio químico favorable) sin ionización H I."
          : "Entorno sin emisión ionizante H I fuerte.",
    detailEn:
      wHI > 0
        ? "Ionized H I lines indicate harsh UV/energetic radiation field."
        : hasDisequilibrium
          ? "Coexistence of H₂O and carbon species (favorable chemical disequilibrium) without H I ionization."
          : "Environment without strong ionizing H I emission.",
  };

  const factors = [waterFactor, carbonFactor, nitrogenFactor, thermalFactor, radiationFactor];
  const rawScore = factors.reduce((acc, f) => acc + (f.weightPct / 100) * f.scorePct, 0);

  // Modular por el contexto astrofísico ponderado de los candidatos clasificados
  const contextFactor =
    classification.candidates.length > 0
      ? classification.candidates.reduce(
          (acc, c) => acc + (c.probabilityPct / 100) * ARCHETYPE_LIFE_CONTEXT_FACTOR[c.id],
          0
        )
      : 0.5;

  const finalProb = Number(Math.max(0, Math.min(100, rawScore * contextFactor)).toFixed(1));
  const tier: HabitabilityAssessment["tier"] =
    finalProb >= 55 ? "high" : finalProb >= 25 ? "moderate" : "low";

  const summaryEs =
    tier === "high"
      ? `Condiciones químicas y térmicas favorables (${finalProb.toFixed(1)}%): coincidencia destacada de agua (H₂O), precursores CHNOPS y contexto físico compatible con habitabilidad o química prebiótica avanzada.`
      : tier === "moderate"
        ? `Potencial prebiótico moderado (${finalProb.toFixed(1)}%): existen bloques volátiles o térmicos compatibles con la vida como la conocemos, aunque faltan ingredientes clave o el entorno presenta limitaciones.`
        : `Probabilidad baja para vida local (${finalProb.toFixed(1)}%): escasez de firmas volátiles biogénicas (H₂O/CHNOPS) o contexto astrofísico dominado por fotosfera estelar/radiación ionizante.`;

  const summaryEn =
    tier === "high"
      ? `Favorable chemical & thermal conditions (${finalProb.toFixed(1)}%): strong convergence of water (H₂O), CHNOPS precursors, and a physical environment compatible with habitability or advanced prebiotic chemistry.`
      : tier === "moderate"
        ? `Moderate prebiotic potential (${finalProb.toFixed(1)}%): key volatile or thermal building blocks for life as we know it are present, though missing ingredients or environmental constraints remain.`
        : `Low local habitability probability (${finalProb.toFixed(1)}%): limited biogenic volatiles (H₂O/CHNOPS) or astrophysical context dominated by a stellar photosphere or ionizing radiation.`;

  return {
    probabilityPct: finalProb,
    tier,
    chnopsElements: orderedChnops,
    factors,
    summaryEs,
    summaryEn,
  };
}

/**
 * Analiza las bandas diagnósticas moleculares y de hielos sobre los puntos espectrales reales
 * extraídos del ROI, propagando el error y sin inventar ni extrapolar bandas faltantes.
 */
export function analyzeRoiChemistry(
  points: RoiSpectrumPoint[],
  totalObservationsAnalyzed: number
): RoiChemicalAnalysisResult {
  const coveredChannelsCount = countCoveredHipsChannels(points);

  const species: ChemicalSpeciesResult[] = DIAGNOSTIC_BANDS.map((spec) => {
    const inBand = points.filter(
      (p) => p.waveUm >= spec.bandWindow[0] && p.waveUm <= spec.bandWindow[1]
    );
    const leftPts = points.filter(
      (p) => p.waveUm >= spec.leftFlank[0] && p.waveUm <= spec.leftFlank[1]
    );
    const rightPts = points.filter(
      (p) => p.waveUm >= spec.rightFlank[0] && p.waveUm <= spec.rightFlank[1]
    );

    const leftMean = weightedMean(leftPts);
    const rightMean = weightedMean(rightPts);

    if (inBand.length === 0 || !leftMean || !rightMean) {
      return {
        id: spec.id,
        formula: spec.formula,
        nameEs: spec.nameEs,
        nameEn: spec.nameEn,
        kind: spec.kind,
        centerUm: spec.centerUm,
        bandWindowUm: spec.bandWindow,
        status: "no_coverage",
        equivalentWidthUm: 0,
        equivalentWidthErrorUm: 0,
        snr: 0,
        integratedTauCm1: null,
        columnDensityCm2: null,
        columnDensityErrorCm2: null,
        spectralSharePct: null,
        spectralShareErrorPct: null,
        molarSharePct: null,
        molarShareErrorPct: null,
        pointsInBand: inBand.length,
        pointsLeftContinuum: leftPts.length,
        pointsRightContinuum: rightPts.length,
      };
    }

    const dWaveCont = rightMean.wave - leftMean.wave;
    const slope = dWaveCont > 1e-6 ? (rightMean.flux - leftMean.flux) / dWaveCont : 0;

    // Ancho de cada muestra dentro de la ventana de banda
    const sorted = [...inBand].sort((a, b) => a.waveUm - b.waveUm);
    const bandSpan = spec.bandWindow[1] - spec.bandWindow[0];
    const defaultStep = bandSpan / sorted.length;

    let ewUm = 0;
    let ewVarUm2 = 0;
    let tauIntCm1 = 0;
    let tauVarCm2 = 0;

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      let dLambda: number;
      if (sorted.length === 1) {
        dLambda = bandSpan;
      } else if (i === 0) {
        dLambda = (sorted[1].waveUm - sorted[0].waveUm) * 0.5 + (sorted[0].waveUm - spec.bandWindow[0]);
      } else if (i === sorted.length - 1) {
        dLambda =
          (spec.bandWindow[1] - sorted[i].waveUm) + (sorted[i].waveUm - sorted[i - 1].waveUm) * 0.5;
      } else {
        dLambda = (sorted[i + 1].waveUm - sorted[i - 1].waveUm) * 0.5;
      }
      dLambda = Math.max(1e-4, Math.min(bandSpan, dLambda || defaultStep));

      const fCont = leftMean.flux + slope * (p.waveUm - leftMean.wave);
      if (!Number.isFinite(fCont) || Math.abs(fCont) < 1e-9) continue;

      const t = dWaveCont > 1e-6 ? (p.waveUm - leftMean.wave) / dWaveCont : 0.5;
      const sigmaCont = Math.sqrt(((1 - t) * leftMean.sigma) ** 2 + (t * rightMean.sigma) ** 2);

      // Para absorción esperamos F < F_cont (positivo); para emisión F > F_cont (positivo)
      const ratio = p.flux / fCont;
      const signedFeature = spec.kind === "absorption" ? 1 - ratio : ratio - 1;
      const relVar = (p.sigma / fCont) ** 2 + ((p.flux * sigmaCont) / (fCont * fCont)) ** 2;

      ewUm += signedFeature * dLambda;
      ewVarUm2 += relVar * dLambda * dLambda;

      if (spec.kind === "absorption" && ratio > 0.02 && ratio < 5) {
        // d(nu_tilde) [cm^-1] = 10000 * dLambda / lambda^2
        const dNuCm1 = (10000 * dLambda) / (p.waveUm * p.waveUm);
        const tau = -Math.log(ratio);
        const sigmaTau = Math.sqrt(
          (p.sigma / Math.max(1e-8, Math.abs(p.flux))) ** 2 +
            (sigmaCont / Math.max(1e-8, Math.abs(fCont))) ** 2
        );
        tauIntCm1 += tau * dNuCm1;
        tauVarCm2 += (sigmaTau * dNuCm1) ** 2;
      }
    }

    const ewErrUm = Math.sqrt(Math.max(1e-16, ewVarUm2));
    const snr = ewErrUm > 0 ? ewUm / ewErrUm : 0;

    let status: ChemicalDetectionStatus;
    if (snr >= 3) {
      status = "detected";
    } else if (snr >= 2) {
      status = "marginal";
    } else {
      status = "not_detected";
    }

    let columnDensityCm2: number | null = null;
    let columnDensityErrorCm2: number | null = null;
    if (
      spec.kind === "absorption" &&
      spec.bandStrengthCmPerMolec &&
      tauIntCm1 > 0 &&
      status !== "not_detected"
    ) {
      columnDensityCm2 = tauIntCm1 / spec.bandStrengthCmPerMolec;
      columnDensityErrorCm2 = Math.sqrt(tauVarCm2) / spec.bandStrengthCmPerMolec;
    }

    return {
      id: spec.id,
      formula: spec.formula,
      nameEs: spec.nameEs,
      nameEn: spec.nameEn,
      kind: spec.kind,
      centerUm: spec.centerUm,
      bandWindowUm: spec.bandWindow,
      status,
      equivalentWidthUm: Number(ewUm.toFixed(5)),
      equivalentWidthErrorUm: Number(ewErrUm.toFixed(5)),
      snr: Number(snr.toFixed(2)),
      integratedTauCm1: spec.kind === "absorption" ? Number(tauIntCm1.toFixed(3)) : null,
      columnDensityCm2,
      columnDensityErrorCm2,
      spectralSharePct: null,
      spectralShareErrorPct: null,
      molarSharePct: null,
      molarShareErrorPct: null,
      pointsInBand: inBand.length,
      pointsLeftContinuum: leftPts.length,
      pointsRightContinuum: rightPts.length,
    };
  });

  // Calcular proporciones relativas SOLO entre especies detectadas (y si no hay >=3σ, entre marginales)
  const detected = species.filter((s) => s.status === "detected" && s.equivalentWidthUm > 0);
  const marginal = species.filter((s) => s.status === "marginal" && s.equivalentWidthUm > 0);
  const activePool = detected.length > 0 ? detected : marginal;

  if (activePool.length > 0) {
    const totalEw = activePool.reduce((acc, s) => acc + s.equivalentWidthUm, 0);
    if (totalEw > 0) {
      for (const s of activePool) {
        const share = (s.equivalentWidthUm / totalEw) * 100;
        const otherSum = totalEw - s.equivalentWidthUm;
        const otherVar = activePool
          .filter((o) => o.id !== s.id)
          .reduce((acc, o) => acc + o.equivalentWidthErrorUm ** 2, 0);
        const dShareDs = (otherSum / (totalEw * totalEw)) * 100;
        const dShareDother = (-s.equivalentWidthUm / (totalEw * totalEw)) * 100;
        const shareErr = Math.sqrt(
          (dShareDs * s.equivalentWidthErrorUm) ** 2 + dShareDother ** 2 * otherVar
        );
        s.spectralSharePct = Number(share.toFixed(1));
        s.spectralShareErrorPct = Number(shareErr.toFixed(1));
      }
    }
  }

  const molarPool = activePool.filter(
    (s) => s.columnDensityCm2 !== null && s.columnDensityCm2 > 0
  );
  let hasMolarProportions = false;
  if (molarPool.length > 0) {
    const totalN = molarPool.reduce((acc, s) => acc + (s.columnDensityCm2 ?? 0), 0);
    if (totalN > 0) {
      hasMolarProportions = true;
      for (const s of molarPool) {
        const nVal = s.columnDensityCm2 ?? 0;
        const nErr = s.columnDensityErrorCm2 ?? 0;
        const share = (nVal / totalN) * 100;
        const otherN = totalN - nVal;
        const otherVar = molarPool
          .filter((o) => o.id !== s.id)
          .reduce((acc, o) => acc + (o.columnDensityErrorCm2 ?? 0) ** 2, 0);
        const dShareDn = (otherN / (totalN * totalN)) * 100;
        const dShareDother = (-nVal / (totalN * totalN)) * 100;
        const shareErr = Math.sqrt((dShareDn * nErr) ** 2 + dShareDother ** 2 * otherVar);
        s.molarSharePct = Number(share.toFixed(1));
        s.molarShareErrorPct = Number(shareErr.toFixed(1));
      }
    }
  }

  const continuum = extractContinuumFeatures(points);
  const celestialClassification = classifyCelestialBodyFromRoi(
    points,
    species,
    continuum,
    coveredChannelsCount
  );
  const habitability = assessHabitabilityFromRoi(
    points,
    species,
    continuum,
    celestialClassification,
    coveredChannelsCount
  );

  return {
    spectrumPoints: points,
    coveredChannelsCount,
    totalObservationsAnalyzed,
    species,
    detectedCount: detected.length,
    marginalCount: marginal.length,
    hasMolarProportions,
    celestialClassification,
    habitability,
  };
}

function cosineSimilarityPct(vecA: number[], vecB: number[]): number | null {
  if (vecA.length === 0 || vecA.length !== vecB.length) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12) return null;
  const sim = Math.max(0, Math.min(1, dot / denom));
  return Number((sim * 100).toFixed(1));
}

function channelMeanFlux(points: RoiSpectrumPoint[], targetWaveUm: number, tolUm: number): number | null {
  const matched = points.filter((p) => Math.abs(p.waveUm - targetWaveUm) <= tolUm);
  if (matched.length === 0) return null;
  const sum = matched.reduce((acc, p) => acc + p.flux, 0);
  return sum / matched.length;
}

/**
 * Compara dos lecturas guardadas (ROI A y ROI B) usando exclusivamente los canales
 * infrarrojos reales solapados y las proporciones químicas medidas en ambas regiones.
 */
export function compareRoiReadings(
  readingA: SavedRoiReading,
  readingB: SavedRoiReading
): RoiComparisonResult {
  const vecA: number[] = [];
  const vecB: number[] = [];

  for (const chWave of SPHEREX_HIPS_WAVELENGTHS_UM) {
    const tol = chWave * 0.025;
    const fA = channelMeanFlux(readingA.analysis.spectrumPoints, chWave, tol);
    const fB = channelMeanFlux(readingB.analysis.spectrumPoints, chWave, tol);
    if (fA !== null && fB !== null && Number.isFinite(fA) && Number.isFinite(fB)) {
      vecA.push(Math.max(0, fA));
      vecB.push(Math.max(0, fB));
    }
  }

  const overlapChannels = vecA.length;
  const insufficientOverlap = overlapChannels < 4;
  const spectralSimilarityPct = insufficientOverlap ? null : cosineSimilarityPct(vecA, vecB);

  const chemA: number[] = [];
  const chemB: number[] = [];
  const sharedDetectedFormulas: string[] = [];

  const mapB = new Map(readingB.analysis.species.map((s) => [s.id, s]));
  for (const sA of readingA.analysis.species) {
    const sB = mapB.get(sA.id);
    if (!sB) continue;
    if (sA.status === "no_coverage" || sB.status === "no_coverage") continue;

    const valA =
      sA.status === "detected" || sA.status === "marginal"
        ? Math.max(0, sA.spectralSharePct ?? 0)
        : 0;
    const valB =
      sB.status === "detected" || sB.status === "marginal"
        ? Math.max(0, sB.spectralSharePct ?? 0)
        : 0;

    if (valA > 0 && valB > 0) {
      sharedDetectedFormulas.push(sA.formula);
    }
    chemA.push(valA);
    chemB.push(valB);
  }

  const hasAnyChemA = chemA.some((v) => v > 0);
  const hasAnyChemB = chemB.some((v) => v > 0);
  const chemicalSimilarityPct =
    hasAnyChemA && hasAnyChemB ? cosineSimilarityPct(chemA, chemB) : null;

  let overallSimilarityPct: number | null = null;
  if (spectralSimilarityPct !== null && chemicalSimilarityPct !== null) {
    overallSimilarityPct = Number(
      (spectralSimilarityPct * 0.6 + chemicalSimilarityPct * 0.4).toFixed(1)
    );
  } else if (spectralSimilarityPct !== null) {
    overallSimilarityPct = spectralSimilarityPct;
  } else if (chemicalSimilarityPct !== null) {
    overallSimilarityPct = chemicalSimilarityPct;
  }

  return {
    overlapChannels,
    spectralSimilarityPct,
    chemicalSimilarityPct,
    overallSimilarityPct,
    sharedDetectedFormulas,
    insufficientOverlap,
  };
}

/**
 * Calcula el fotocentro (centroide ponderado por flujo por encima de la mediana de fondo)
 * dentro de la región ROI en el recorte FITS dado y lo proyecta a coordenadas ICRS (RA, Dec).
 */
export function computeRoiPhotocenter(
  roi: SkyRoiSelection,
  cutout: RenderedCutout
): { ra: number; dec: number } | null {
  if (!cutout.fluxData || !cutout.wcs) return null;

  const polyPix: Array<{ x: number; y: number }> = [];
  for (const c of roi.corners) {
    const p = worldToPixel(c.ra, c.dec, cutout.wcs);
    if (p) polyPix.push({ x: p.px, y: p.py });
  }
  if (polyPix.length < 3) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of polyPix) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const colStart = Math.max(0, Math.floor(minX - 1));
  const colEnd = Math.min(cutout.width - 1, Math.ceil(maxX - 1));
  const rowStart = Math.max(0, Math.floor(minY - 1));
  const rowEnd = Math.min(cutout.height - 1, Math.ceil(maxY - 1));

  const samples: Array<{ px: number; py: number; flux: number }> = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const px = col + 1;
      const py = row + 1;
      if (!pointInPolygon(px, py, polyPix)) continue;
      const idx = row * cutout.width + col;
      const f = cutout.fluxData[idx];
      if (!Number.isFinite(f)) continue;
      samples.push({ px, py, flux: f });
    }
  }

  if (samples.length < 2) return null;

  const sortedFlux = samples.map((s) => s.flux).sort((a, b) => a - b);
  const mid = Math.floor(sortedFlux.length / 2);
  const bgMedian =
    sortedFlux.length % 2 === 1
      ? sortedFlux[mid]
      : (sortedFlux[mid - 1] + sortedFlux[mid]) / 2;

  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  for (const s of samples) {
    const w = Math.max(0, s.flux - bgMedian);
    if (w <= 0) continue;
    sumW += w;
    sumX += w * s.px;
    sumY += w * s.py;
  }

  if (sumW <= 0) return null;

  const meanPx = sumX / sumW;
  const meanPy = sumY / sumW;
  const sky = pixelToWorld(meanPx, meanPy, cutout.wcs);
  if (!Number.isFinite(sky.ra) || !Number.isFinite(sky.dec)) return null;
  return sky;
}
