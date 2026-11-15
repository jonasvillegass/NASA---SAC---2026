import { pixelToWorld, worldToPixel } from "./coordinates";
import { parseDetectorId } from "./detectors";
import { SPHEREX_HIPS_WAVELENGTHS_UM } from "./hips";
import type {
  ChemicalDetectionStatus,
  ChemicalSpeciesResult,
  FitsWaveCalibration,
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
    const cutout =
      cachedCutoutsMap.get(`${obs.obs_id}|${obs.bandpass}`) ??
      cachedCutoutsMap.get(obs.obs_id);
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

  return {
    spectrumPoints: points,
    coveredChannelsCount,
    totalObservationsAnalyzed,
    species,
    detectedCount: detected.length,
    marginalCount: marginal.length,
    hasMolarProportions,
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
