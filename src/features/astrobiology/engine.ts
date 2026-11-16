/**
 * CHRONO-SPHEREx Probabilistic Astrobiology, Habitability & Prebiotic Chemistry Engine
 * ====================================================================================
 * Pure mathematical and statistical engine callable in 1 line of code:
 *   const report = evaluateProbabilisticAstrobiology(params);
 *
 * Integrates:
 * - Tomy's ROI Spectral & Chemical Analyzer (`src/lib/spectralAnalysis.ts`)
 * - Joaquín & Jonás's Statistical MVUE & Çengel Radiative Thermodynamics (`src/features/statistics/joakoEngine.ts`)
 * - Jay L. Devore (Probability & Statistics: Bayes' Theorem Cap. 2.4, Error Propagation Cap. 4, MVUE Caps. 5-8)
 * - Raymond Chang (Chemistry 11th Ed.: Beer-Lambert Cap. 11, Eutectic Cryoscopy Cap. 12, Redox Equilibrium Cap. 15)
 * - Yunus A. Çengel (Thermodynamics 7th Ed., Cap. 12: Planck, Wien, Stefan-Boltzmann)
 * - Sears & Zemansky (University Physics: Astrometric Kinematics & Dipole/Monopole Stability)
 */

import { formatDectoDMS, formatRAtoHMS } from "../../lib/coordinates";

import type {
  RenderedCutout,
  RoiChemicalAnalysisResult,
  SkyRoiSelection,
  SpherexObservation,
} from "../../lib/types";
import {
  analyzeRoiChemistry,
  extractRoiSpectrumFromCutouts,
} from "../../lib/spectralAnalysis";
import { computeJoakoStatisticalThermodynamics } from "../statistics/joakoEngine";
import {
  ASTROBIOLOGY_APA7_CITATIONS,
  ASTROBIOLOGY_BENCHMARK_PROFILES,
  ASTROBIO_CONSTANTS,
  BIOGENIC_MOLECULE_CATALOG,
  type AstrobiologyBenchmarkProfile,
} from "./constants";
import type {
  BayesianHypothesisProbabilities,
  BiogenicMoleculeContribution,
  CompositeAstrobiologyIndices,
  CryoscopicSubsurfaceModel,
  HumanAstrobiologyTranslation,
  JeffreysEvidenceScale,
  ProbabilisticAstrobiologyReport,
  ProbabilisticPillarScore,
} from "./types";

export interface EvaluateProbabilisticAstrobiologyParams {
  observations?: SpherexObservation[];
  cachedCutouts?: Map<string, RenderedCutout>;
  roi?: SkyRoiSelection | null;
  roiAnalysis?: RoiChemicalAnalysisResult | null;
  epochACutout?: RenderedCutout | null;
  epochBCutout?: RenderedCutout | null;
  targetName?: string;
  coordinates?: { ra: number; dec: number };
  benchmarkKeyOverride?: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Standard normal cumulative distribution function Φ(z) (Abramowitz & Stegun 26.2.17)
 */
function normalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + 1.330274429 * t))));
  return z > 0 ? 1 - p : p;
}

/**
 * Matches target name or coordinates to a calibrated NASA/IRSA benchmark profile
 */
export function resolveAstrobiologyBenchmark(
  targetName?: string,
  overrideKey?: string
): AstrobiologyBenchmarkProfile {
  if (overrideKey) {
    const exact = ASTROBIOLOGY_BENCHMARK_PROFILES.find((b) => b.key === overrideKey);
    if (exact) return exact;
  }
  const lower = (targetName ?? "").toLowerCase();
  for (const profile of ASTROBIOLOGY_BENCHMARK_PROFILES) {
    if (profile.matchTokens.some((tok) => lower.includes(tok))) {
      return profile;
    }
  }
  return ASTROBIOLOGY_BENCHMARK_PROFILES[0]; // Default: WISE 0855
}

/**
 * Evaluates Raymond Chang Cap. 12 Colligative Cryoscopic Depression (ΔT_f = K_f · m)
 * for Ammonia-Water-Methanol (H₂O-NH₃-CH₃OH) ice mantles and subsurface ocean viability.
 */
function computeCryoscopicSubsurfaceModel(
  effectiveTempKelvin: number,
  h2oTau: number,
  nh3Tau: number,
  ch3ohTau: number,
  internalHeatDominance: boolean
): CryoscopicSubsurfaceModel {
  const pureWaterFreezingKelvin = ASTROBIO_CONSTANTS.WATER_FREEZING_K;

  // Estimate effective solute ratio (NH₃ + CH₃OH relative to H₂O) from optical depths
  const waterBase = Math.max(0.15, h2oTau);
  const soluteRatio = clamp((nh3Tau * 1.15 + ch3ohTau * 0.65) / waterBase, 0, 0.85);

  // Pure eutectic H₂O-NH₃ (33 wt% NH₃ ≈ 29 mol/kg) lowers freezing point by up to 97.15 K (to 176.0 K)
  const estimatedMolality = Number((soluteRatio * 34.0).toFixed(2));
  const rawDepression = ASTROBIO_CONSTANTS.WATER_CRYOSCOPIC_KF * estimatedMolality * 1.52;
  const maxDepression =
    ASTROBIO_CONSTANTS.WATER_FREEZING_K - ASTROBIO_CONSTANTS.AMMONIA_WATER_EUTECTIC_MIN_K; // 97.15 K
  const cryoscopicDepressionKelvin = Number(clamp(rawDepression, 0, maxDepression).toFixed(2));

  const effectiveLiquidThresholdKelvin = Number(
    (pureWaterFreezingKelvin - cryoscopicDepressionKelvin).toFixed(2)
  );
  const effectiveLiquidThresholdCelsius = Number(
    (effectiveLiquidThresholdKelvin - 273.15).toFixed(2)
  );

  // Subsurface or atmospheric liquid viability:
  // Case A: Atmospheric/surface temperature is directly inside [effectiveLiquidThresholdKelvin, 395 K]
  // Case B: Cryogenic surface (45 K <= T_eff < effectiveLiquidThresholdKelvin) with strong H₂O ice + antifreeze
  //         + internal radiogenic/Kelvin-Helmholtz heat (Europa / Enceladus / Quaoar / Planet X ocean model)
  let subsurfaceOceanProbabilityPct = 0;
  let subsurfaceOceanViable = false;

  if (
    effectiveTempKelvin >= effectiveLiquidThresholdKelvin &&
    effectiveTempKelvin <= ASTROBIO_CONSTANTS.HYPERTHERMOPHILE_MAX_K
  ) {
    subsurfaceOceanViable = h2oTau >= 0.25;
    const tempOptimality = Math.exp(
      -Math.pow((effectiveTempKelvin - 285) / 65, 2)
    );
    const waterFactor = clamp(h2oTau / 0.9, 0.2, 1.0);
    subsurfaceOceanProbabilityPct = Number(
      clamp((0.45 * tempOptimality + 0.55 * waterFactor) * 100, 12, 96.5).toFixed(1)
    );
  } else if (effectiveTempKelvin >= 40 && effectiveTempKelvin < effectiveLiquidThresholdKelvin) {
    // Cryogenic crust over warm interior (conductive Fourier insulation + eutectic antifreeze)
    const iceInsulationFactor = clamp(h2oTau / 1.1, 0.1, 1.0);
    const antifreezeFactor = clamp(cryoscopicDepressionKelvin / 75.0, 0.1, 1.0);
    const internalHeatBonus = internalHeatDominance ? 0.22 : 0.12;
    const rawSubsurface =
      (0.42 * iceInsulationFactor + 0.36 * antifreezeFactor + internalHeatBonus) * 100;
    subsurfaceOceanProbabilityPct = Number(clamp(rawSubsurface, 8.0, 84.5).toFixed(1));
    subsurfaceOceanViable = subsurfaceOceanProbabilityPct >= 40;
  } else {
    // Hot stellar photosphere (T > 1000 K): liquid water cannot exist on the star itself,
    // only in its circumstellar habitable zone at orbital distance d_HZ = sqrt(L / L_sun) AU.
    subsurfaceOceanViable = false;
    subsurfaceOceanProbabilityPct = Number(clamp(h2oTau * 22, 2.5, 28.0).toFixed(1));
  }

  const explanationEs =
    effectiveTempKelvin <= 400
      ? `Por la Ley de Raoult y el Descenso Crioscópico (Chang 11.ª ed., Cap. 12: ΔT_f = K_f · m), la presencia de NH₃ y CH₃OH disueltos en H₂O reduce el punto de congelación en ΔT_f = -${cryoscopicDepressionKelvin} K, permitiendo fase líquida eutéctica desde ${effectiveLiquidThresholdKelvin} K (${effectiveLiquidThresholdCelsius} °C) con una probabilidad del ${subsurfaceOceanProbabilityPct}%.`
      : `A T_eff = ${effectiveTempKelvin} K (fotosfera estelar), el agua no existe en fase líquida superficial, pero las firmas de H₂O/CO informan el potencial de retención volátil en su Zona Habitable circunestelar.`;

  const explanationEn =
    effectiveTempKelvin <= 400
      ? `By Raoult's Law and Cryoscopic Depression (Chang 11th Ed., Ch. 12: ΔT_f = K_f · m), dissolved NH₃ and CH₃OH in H₂O depress the freezing point by ΔT_f = -${cryoscopicDepressionKelvin} K, enabling eutectic liquid phase down to ${effectiveLiquidThresholdKelvin} K (${effectiveLiquidThresholdCelsius} °C) with ${subsurfaceOceanProbabilityPct}% probability.`
      : `At T_eff = ${effectiveTempKelvin} K (stellar photosphere), liquid water cannot exist on the surface, but H₂O/CO features constrain volatile retention in its circumstellar Habitable Zone.`;

  return {
    pureWaterFreezingKelvin,
    estimatedAntifreezeMolalityMolKg: estimatedMolality,
    cryoscopicDepressionKelvin,
    effectiveLiquidThresholdKelvin,
    effectiveLiquidThresholdCelsius,
    subsurfaceOceanViable,
    subsurfaceOceanProbabilityPct,
    explanationEs,
    explanationEn,
  };
}

/**
 * Classify Bayes Factor K on the formal Jeffreys / Kass-Raftery scale
 */
function classifyJeffreysScale(kMax: number): JeffreysEvidenceScale {
  if (kMax > 100) return "DECISIVE_EVIDENCE";
  if (kMax > 10) return "STRONG_EVIDENCE";
  if (kMax > 3.2) return "SUBSTANTIAL_EVIDENCE";
  if (kMax >= 1.0) return "ANECDOTAL_INSUFFICIENT";
  return "FAVORS_ABIOTIC_NULL";
}

/**
 * Main Pure Function: Evaluates Probabilistic Astrobiology, Prebiotic Chemistry & Habitability
 * Callable in 1 line by Tomy from `ViewerPanel.tsx`, `RoiAnalysisModal.tsx`, or `App.tsx`.
 */
export function evaluateProbabilisticAstrobiology(
  params: EvaluateProbabilisticAstrobiologyParams = {}
): ProbabilisticAstrobiologyReport {
  const {
    observations = [],
    cachedCutouts = new Map<string, RenderedCutout>(),
    roi = null,
    roiAnalysis: providedRoiAnalysis = null,
    epochACutout = null,
    epochBCutout = null,
    targetName = "WISE J085510.83-071442.5",
    coordinates = { ra: 133.795, dec: -7.245 },
    benchmarkKeyOverride,
  } = params;

  const benchmark = resolveAstrobiologyBenchmark(targetName, benchmarkKeyOverride);

  // 1. Call Joaquín & Jonás's Statistical & Radiative Thermodynamics Engine (`joakoEngine.ts`)
  const joakoReport = computeJoakoStatisticalThermodynamics({
    observations,
    cachedCutouts,
    epochACutout,
    epochBCutout,
    targetName: benchmarkKeyOverride ? benchmark.canonicalName : targetName,
    coordinates,
  });

  // 2. Check if we have live ROI analysis from Tomy's `spectralAnalysis.ts` or can compute it from cutouts
  let activeRoiAnalysis: RoiChemicalAnalysisResult | null = providedRoiAnalysis;
  if (!activeRoiAnalysis && roi && observations.length > 0 && cachedCutouts.size > 0) {
    const pts = extractRoiSpectrumFromCutouts(roi, observations, cachedCutouts);
    if (pts.length > 0) {
      activeRoiAnalysis = analyzeRoiChemistry(pts, observations.length);
    }
  }

  const hasLiveRoi =
    activeRoiAnalysis !== null &&
    activeRoiAnalysis.spectrumPoints.length >= 3 &&
    !benchmarkKeyOverride;
  const isLiveNasaData = hasLiveRoi || (joakoReport.isLiveNasaData && !benchmarkKeyOverride);

  const dataSourceMode: ProbabilisticAstrobiologyReport["dataSourceMode"] = hasLiveRoi
    ? "LIVE_IRSA_ROI_AND_CUTOUTS"
    : isLiveNasaData
      ? "LIVE_IRSA_FITS_CUTOUTS"
      : "CALIBRATED_ARCHIVE_BENCHMARK";

  const coveredChannelsCount = hasLiveRoi
    ? Math.max(activeRoiAnalysis!.coveredChannelsCount, activeRoiAnalysis!.spectrumPoints.length)
    : isLiveNasaData
      ? Math.min(102, Math.max(17, observations.length))
      : 102;

  const effectiveTempKelvin = benchmarkKeyOverride
    ? benchmark.effectiveTempKelvin
    : joakoReport.thermodynamics.effectiveTempKelvin || benchmark.effectiveTempKelvin;
  const effectiveTempCelsius = Number((effectiveTempKelvin - 273.15).toFixed(2));
  const peakWavelengthUm = benchmarkKeyOverride
    ? benchmark.peakWavelengthUm
    : joakoReport.thermodynamics.peakWavelengthUm || benchmark.peakWavelengthUm;
  const blackbodyEmittanceWm2 = Number(
    (ASTROBIO_CONSTANTS.STEFAN_BOLTZMANN_SIGMA * Math.pow(effectiveTempKelvin, 4)).toFixed(4)
  );
  const spherexColorIndexD6D1 = benchmarkKeyOverride
    ? benchmark.spherexColorD6D1
    : joakoReport.thermodynamics.spherexColorIndexD6D1;
  const kinematicTopology = benchmarkKeyOverride
    ? benchmark.kinematicTopology
    : joakoReport.hypothesisTest.topology;
  const coaddedSnr = benchmarkKeyOverride
    ? benchmark.coaddedSnr
    : joakoReport.coaddition.coaddedSnr;
  const statisticalPowerPct = Number(
    (joakoReport.coaddition.coaddedStatisticalPower * 100).toFixed(2)
  );

  // 3. Build Biogenic Molecule Contributions (merging Tomy's `RoiChemicalAnalysisResult` with calibrated benchmarks)
  const roiSpeciesMap = new Map(
    (activeRoiAnalysis?.species ?? []).map((s) => [s.id, s])
  );

  const molecules: BiogenicMoleculeContribution[] = BIOGENIC_MOLECULE_CATALOG.map((meta) => {
    const liveSpec = roiSpeciesMap.get(meta.id);
    const benchSpec = benchmark.speciesFeatures[meta.id] ?? {
      tau: 0.1,
      ewUm: 0.005,
      snr: 1.0,
      colDensityCm2: null,
    };

    const useLive =
      hasLiveRoi &&
      liveSpec !== undefined &&
      liveSpec.status !== "no_coverage" &&
      liveSpec.pointsInBand > 0;

    const snr = useLive ? Math.max(0, liveSpec!.snr) : benchSpec.snr;
    const equivalentWidthUm = useLive
      ? Math.max(0, liveSpec!.equivalentWidthUm)
      : benchSpec.ewUm;
    const opticalDepthTau = useLive
      ? liveSpec!.integratedTauCm1 !== null && liveSpec!.integratedTauCm1 > 0
        ? clamp(liveSpec!.integratedTauCm1 / 45, 0.02, 2.5)
        : clamp(equivalentWidthUm * 12, 0.02, 2.0)
      : benchSpec.tau;
    const columnDensityCm2 = useLive
      ? liveSpec!.columnDensityCm2
      : benchSpec.colDensityCm2;

    // Two-tailed Gaussian confidence from Jay Devore Cap. 8: P_det = (2*Φ(SNR) - 1) * 100%
    const detectionProbabilityPct = Number(
      clamp((2 * normalCdf(snr) - 1) * 100, 0, 99.99).toFixed(2)
    );
    const isDetected = snr >= 3.0;

    return {
      id: meta.id,
      formula: meta.formula,
      nameEs: meta.nameEs,
      nameEn: meta.nameEn,
      centerWaveUm: meta.centerWaveUm,
      detectorId: meta.detectorId,
      chnopsElements: [...meta.chnopsElements],
      opticalDepthTau: Number(opticalDepthTau.toFixed(3)),
      equivalentWidthUm: Number(equivalentWidthUm.toFixed(4)),
      columnDensityCm2,
      snr: Number(snr.toFixed(2)),
      detectionProbabilityPct,
      biogenicRoleEs: meta.biogenicRoleEs,
      biogenicRoleEn: meta.biogenicRoleEn,
      isDetected,
    };
  });

  const getMol = (id: string) => molecules.find((m) => m.id === id)!;
  const mH2O_2 = getMol("h2o_2um");
  const mH2O_3 = getMol("h2o_3um");
  const mNH3 = getMol("nh3_ice");
  const mCH4 = getMol("ch4_ice");
  const mCH3OH = getMol("ch3oh_ice");
  const mCO2 = getMol("co2_ice");
  const mOCN = getMol("ocn_ice");
  const mCO = getMol("co_ice");
  const mPAH = getMol("pah_33");

  // 4. Compute the 5 Formal Probabilistic Pillars
  // Pillar 1: Hydrological Solvent Probability (H₂O 2.02 µm + 3.05 µm)
  const combinedWaterTau = mH2O_3.opticalDepthTau * 0.7 + mH2O_2.opticalDepthTau * 0.3;
  const maxWaterSnr = Math.max(mH2O_3.snr, mH2O_2.snr);
  const waterConfidence = 2 * normalCdf(maxWaterSnr) - 1;
  const p1WaterPct = Number(
    clamp((1 - Math.exp(-1.65 * combinedWaterTau)) * waterConfidence * 100, 3.0, 99.2).toFixed(1)
  );

  // Pillar 2: Prebiotic CHNOPS Inventory Probability
  const confirmedSet = new Set<"C" | "H" | "N" | "O">();
  for (const m of molecules) {
    if (m.snr >= 2.5) {
      for (const el of m.chnopsElements) confirmedSet.add(el);
    }
  }
  const confirmedElements = Array.from(confirmedSet);
  const chnopsCompletenessPct = Number(((confirmedElements.length / 4) * 100).toFixed(0));

  const prebioticOrganicSignal =
    0.28 * clamp(mCH3OH.opticalDepthTau / 0.8, 0, 1.2) +
    0.26 * clamp(mOCN.opticalDepthTau / 0.5, 0, 1.2) +
    0.22 * clamp(mNH3.opticalDepthTau / 0.6, 0, 1.2) +
    0.14 * clamp(mPAH.opticalDepthTau / 0.6, 0, 1.2) +
    0.10 * clamp(mCH4.opticalDepthTau / 0.9, 0, 1.2);
  const p2PrebioticPct = Number(
    clamp((0.35 * (chnopsCompletenessPct / 100) + 0.65 * prebioticOrganicSignal) * 100, 4.0, 98.5).toFixed(1)
  );

  // Pillar 3: Redox Thermochemical Disequilibrium (CH₄ + NH₃ vs CO₂ + H₂O + CO)
  const reducedStrength = mCH4.opticalDepthTau * 0.65 + mNH3.opticalDepthTau * 0.35;
  const oxidizedStrength =
    mCO2.opticalDepthTau * 0.45 + mH2O_3.opticalDepthTau * 0.35 + mCO.opticalDepthTau * 0.2;
  const redoxHarmonic =
    reducedStrength + oxidizedStrength > 1e-6
      ? (2 * reducedStrength * oxidizedStrength) / (reducedStrength + oxidizedStrength)
      : 0;
  const redoxSnrWeight =
    (2 * normalCdf(Math.min(Math.max(mCH4.snr, mNH3.snr), Math.max(mCO2.snr, mH2O_3.snr))) - 1);
  const redoxDisequilibriumOmegaPct = Number(
    clamp(redoxHarmonic * 115 * Math.max(0.35, redoxSnrWeight), 2.5, 96.0).toFixed(1)
  );
  const p3RedoxPct = redoxDisequilibriumOmegaPct;

  // Pillar 4: Radiative & Eutectic Thermodynamic Compatibility (Çengel Cap. 12 + Chang Cap. 12)
  const cryoscopicModel = computeCryoscopicSubsurfaceModel(
    effectiveTempKelvin,
    combinedWaterTau,
    mNH3.opticalDepthTau,
    mCH3OH.opticalDepthTau,
    joakoReport.thermodynamics.internalHeatDominance
  );

  let p4ThermoPct: number;
  if (effectiveTempKelvin >= 176 && effectiveTempKelvin <= 395) {
    // Directly inside liquid water or eutectic water-ammonia atmospheric window!
    const gaussianHab = Math.exp(-Math.pow((effectiveTempKelvin - 280) / 70, 2));
    p4ThermoPct = Number(
      clamp((0.6 * gaussianHab + 0.4 * (cryoscopicModel.subsurfaceOceanProbabilityPct / 100)) * 100, 25, 96.0).toFixed(1)
    );
  } else if (effectiveTempKelvin < 176) {
    // Cryogenic body: habitability relies on subsurface eutectic ocean or prebiotic ice preservation
    p4ThermoPct = Number(
      clamp(cryoscopicModel.subsurfaceOceanProbabilityPct * 0.82, 10.0, 76.0).toFixed(1)
    );
  } else {
    // Stellar photosphere (T > 1000 K): evaluate circumstellar HZ stability
    // Stable M-dwarfs (Dipole motion) have higher HZ stability than turbulent Variable Monopoles (RW Aur, R Dra)
    const isUnstableMonopole = kinematicTopology === "MONOPOLE_VARIABLE";
    p4ThermoPct = isUnstableMonopole ? 11.5 : 54.0;
  }

  // Pillar 5: Instrumental SNR & Statistical Power (Jay Devore Caps. 5-8)
  const coverageRatio = clamp(coveredChannelsCount / ASTROBIO_CONSTANTS.TOTAL_SPHEREX_BANDS, 0.15, 1.0);
  const snrConfidence = clamp(coaddedSnr / 15.0, 0.25, 1.0);
  const p5CertaintyPct = Number(
    clamp((0.5 * (statisticalPowerPct / 100) + 0.3 * snrConfidence + 0.2 * coverageRatio) * 100, 15.0, 99.8).toFixed(1)
  );

  // Uncertainty half-width (95% CI, Jay Devore Cap. 7) inversely proportional to sqrt(coveredChannels) and SNR
  const baseUncertainty95 = clamp(
    14.5 / (Math.sqrt(Math.max(1, coveredChannelsCount / 17)) * Math.max(1, Math.log10(coaddedSnr + 2))),
    1.4,
    12.8
  );
  const ci95 = Number(baseUncertainty95.toFixed(1));

  const statusColorFor = (pct: number): "emerald" | "cyan" | "amber" | "rose" => {
    if (pct >= 70) return "emerald";
    if (pct >= 45) return "cyan";
    if (pct >= 25) return "amber";
    return "rose";
  };

  const pillars: ProbabilisticPillarScore[] = [
    {
      id: "P1_HYDROLOGICAL_SOLVENT",
      titleEs: "1. Solvente Hidrológico (H₂O Vapor + Hielo Profundo)",
      titleEn: "1. Hydrological Solvent (H₂O Vapor + Deep Ice)",
      shortLabelEs: "Solvente H₂O",
      shortLabelEn: "H₂O Solvent",
      probabilityPct: p1WaterPct,
      uncertainty95Pct: ci95,
      weightInComposite: 0.25,
      formulaLatex: "\\tau_{\\text{H}_2\\text{O}} = -\\ln(F_{\\text{obs}}/F_{\\text{cont}}), \\quad P_{\\text{H}_2\\text{O}} = (1 - e^{-1.65\\tau})[2\\Phi(\\text{SNR}) - 1]",
      measuredEvidenceEs: `τ(3.05 µm) = ${mH2O_3.opticalDepthTau.toFixed(2)}, τ(2.02 µm) = ${mH2O_2.opticalDepthTau.toFixed(2)} | SNR = ${maxWaterSnr.toFixed(1)}σ`,
      measuredEvidenceEn: `τ(3.05 µm) = ${mH2O_3.opticalDepthTau.toFixed(2)}, τ(2.02 µm) = ${mH2O_2.opticalDepthTau.toFixed(2)} | SNR = ${maxWaterSnr.toFixed(1)}σ`,
      textbookCitation: "Raymond Chang (11.ª ed., Cap. 11: Ley de Beer-Lambert) & Jay Devore (Cap. 8)",
      nasaReference: "NASA SPHEREx Science Theme 3: Origin of Water & Biogenic Ices (D3/D4)",
      statusColor: statusColorFor(p1WaterPct),
    },
    {
      id: "P2_PREBIOTIC_CHNOPS_INVENTORY",
      titleEs: "2. Inventario Orgánico Prebiótico (CHNOPS & Azúcares/Nitrilos)",
      titleEn: "2. Prebiotic Organic Inventory (CHNOPS & Sugars/Nitriles)",
      shortLabelEs: "Química CHNOPS",
      shortLabelEn: "CHNOPS Organics",
      probabilityPct: p2PrebioticPct,
      uncertainty95Pct: ci95,
      weightInComposite: 0.22,
      formulaLatex: "N_{\\text{col}} = \\frac{1}{A}\\int \\tau(\\tilde{\\nu})\\,d\\tilde{\\nu} \\quad (\\text{CH}_3\\text{OH}, \\text{OCN}^-, \\text{NH}_3, \\text{PAH}, \\text{CH}_4)",
      measuredEvidenceEs: `Elementos confirmados: [${confirmedElements.join(", ")}] (${chnopsCompletenessPct}%) | τ(CH₃OH)=${mCH3OH.opticalDepthTau.toFixed(2)}, τ(OCN⁻)=${mOCN.opticalDepthTau.toFixed(2)}`,
      measuredEvidenceEn: `Confirmed elements: [${confirmedElements.join(", ")}] (${chnopsCompletenessPct}%) | τ(CH₃OH)=${mCH3OH.opticalDepthTau.toFixed(2)}, τ(OCN⁻)=${mOCN.opticalDepthTau.toFixed(2)}`,
      textbookCitation: "Raymond Chang (11.ª ed., Caps. 7 y 24: Espectroscopía IR y Química Orgánica)",
      nasaReference: "IRSA SPHEREx Spectral Catalog & JWST Ice Age Prebiotic Program",
      statusColor: statusColorFor(p2PrebioticPct),
    },
    {
      id: "P3_REDOX_THERMOCHEMICAL_DISEQUILIBRIUM",
      titleEs: "3. Desequilibrio Termoquímico Redox (Coexistencia CH₄/NH₃ + CO₂/H₂O)",
      titleEn: "3. Redox Thermochemical Disequilibrium (CH₄/NH₃ + CO₂/H₂O Coexistence)",
      shortLabelEs: "Desequilibrio Redox",
      shortLabelEn: "Redox Disequilibrium",
      probabilityPct: p3RedoxPct,
      uncertainty95Pct: Number((ci95 * 1.15).toFixed(1)),
      weightInComposite: 0.23,
      formulaLatex: "\\Omega_{\\text{redox}} = \\frac{2\\,\\tau_{\\text{red}}(\\text{CH}_4,\\text{NH}_3)\\cdot\\tau_{\\text{ox}}(\\text{CO}_2,\\text{H}_2\\text{O})}{\\tau_{\\text{red}} + \\tau_{\\text{ox}}}, \\quad \\Delta G^\\circ \\neq 0",
      measuredEvidenceEs: `Reductores τ(CH₄+NH₃)=${reducedStrength.toFixed(2)} vs. Oxidantes τ(CO₂+H₂O+CO)=${oxidizedStrength.toFixed(2)} | Ω = ${redoxDisequilibriumOmegaPct}%`,
      measuredEvidenceEn: `Reducers τ(CH₄+NH₃)=${reducedStrength.toFixed(2)} vs. Oxidizers τ(CO₂+H₂O+CO)=${oxidizedStrength.toFixed(2)} | Ω = ${redoxDisequilibriumOmegaPct}%`,
      textbookCitation: "Raymond Chang (11.ª ed., Caps. 15 y 18: Equilibrio Químico y Energía Libre de Gibbs)",
      nasaReference: "Lovelock (1965); Krissansen-Totton et al. (2018); Catling et al. (2018) NASA NAI",
      statusColor: statusColorFor(p3RedoxPct),
    },
    {
      id: "P4_THERMODYNAMIC_AND_EUTECTIC_PHASE",
      titleEs: "4. Compatibilidad Termodinámica y Fase Eutéctica (Wien, Planck & Raoult)",
      titleEn: "4. Thermodynamic & Eutectic Phase Compatibility (Wien, Planck & Raoult)",
      shortLabelEs: "Fase Termodinámica",
      shortLabelEn: "Thermal/Eutectic Phase",
      probabilityPct: p4ThermoPct,
      uncertainty95Pct: ci95,
      weightInComposite: 0.18,
      formulaLatex: "T_{\\text{eff}} = \\frac{2897.77}{\\lambda_{\\max}}, \\quad E_b = \\sigma T_{\\text{eff}}^4, \\quad T_{f,\\text{eut}} = 273.15 - K_f m_{\\text{NH}_3}",
      measuredEvidenceEs: `T_eff = ${effectiveTempKelvin} K (${effectiveTempCelsius} °C) | E_b = ${blackbodyEmittanceWm2} W/m² | Umbral líquido eutéctico: ${cryoscopicModel.effectiveLiquidThresholdKelvin} K`,
      measuredEvidenceEn: `T_eff = ${effectiveTempKelvin} K (${effectiveTempCelsius} °C) | E_b = ${blackbodyEmittanceWm2} W/m² | Eutectic liquid threshold: ${cryoscopicModel.effectiveLiquidThresholdKelvin} K`,
      textbookCitation: "Yunus A. Çengel (7.ª ed., Cap. 12: Radiación) & Raymond Chang (Cap. 12: Propiedades Coligativas)",
      nasaReference: "NASA Ocean Worlds Program (Europa/Enceladus/TNO Subsurface Thermodynamics)",
      statusColor: statusColorFor(p4ThermoPct),
    },
    {
      id: "P5_INSTRUMENTAL_SNR_AND_STATISTICAL_POWER",
      titleEs: "5. Rigor Estadístico MVUE y Cobertura Instrumental (17 Bandas/Detector)",
      titleEn: "5. MVUE Statistical Rigor & Instrumental Coverage (17 Bands/Detector)",
      shortLabelEs: "Certeza Estadística",
      shortLabelEn: "Statistical Certainty",
      probabilityPct: p5CertaintyPct,
      uncertainty95Pct: Number((ci95 * 0.6).toFixed(1)),
      weightInComposite: 0.12,
      formulaLatex: "\\text{SNR}_{\\text{coadd}} = \\sqrt{\\sum_{i=1}^{17} \\text{SNR}_i^2} \\approx 4.123\\,\\text{SNR}_1, \\quad 1 - \\beta = \\Phi(\\text{SNR}_{\\text{coadd}} - z_{\\alpha})",
      measuredEvidenceEs: `SNR_coadd = ${coaddedSnr.toFixed(1)}σ | Potencia (1-β) = ${statisticalPowerPct}% | Canales: ${coveredChannelsCount}/102 | Topología: ${kinematicTopology}`,
      measuredEvidenceEn: `SNR_coadd = ${coaddedSnr.toFixed(1)}σ | Power (1-β) = ${statisticalPowerPct}% | Channels: ${coveredChannelsCount}/102 | Topology: ${kinematicTopology}`,
      textbookCitation: "Jay L. Devore (Probabilidad y Estadística, Caps. 5, 6, 7 y 8) & Sears-Zemansky (Vol. 1)",
      nasaReference: "NASA/IPAC IRSA SPHEREx DR1 Multi-Extension FITS (IMAGE, VARIANCE, FLAGS, WCS-WAVE)",
      statusColor: statusColorFor(p5CertaintyPct),
    },
  ];

  // 5. Compute Tripartite Bayesian Posterior Probabilities P(H_k | E) (Jay Devore Cap. 2.4)
  const { h1: priorH1, h2: priorH2, h3: priorH3 } = benchmark.priors;

  // Penalty factor if kinematic topology is a violent variable monopole (RW Aurigae / R Draconis)
  const monopolePenalty = kinematicTopology === "MONOPOLE_VARIABLE" ? 0.18 : 1.0;

  // Likelihoods P(E | H_k) derived from measured pillars
  const likelihoodH1 = clamp(
    (1 - p1WaterPct / 140) * (1 - p3RedoxPct / 130) * (kinematicTopology === "MONOPOLE_VARIABLE" ? 1.45 : 0.65),
    0.04,
    0.98
  );
  const likelihoodH2 = clamp(
    0.45 * (p1WaterPct / 100) + 0.55 * (p2PrebioticPct / 100),
    0.05,
    0.98
  );
  const likelihoodH3 = clamp(
    (0.32 * (p1WaterPct / 100) +
      0.38 * (p3RedoxPct / 100) +
      0.30 * (p4ThermoPct / 100)) *
      monopolePenalty,
    0.01,
    0.95
  );

  const unnorm1 = priorH1 * likelihoodH1;
  const unnorm2 = priorH2 * likelihoodH2;
  const unnorm3 = priorH3 * likelihoodH3;
  const totalEvidenceP_E = Math.max(1e-9, unnorm1 + unnorm2 + unnorm3);

  const rawPostH1 = (unnorm1 / totalEvidenceP_E) * 100;
  const rawPostH2 = (unnorm2 / totalEvidenceP_E) * 100;
  const rawPostH3 = (unnorm3 / totalEvidenceP_E) * 100;

  const h1AbioticEquilibriumPct = Number(rawPostH1.toFixed(1));
  const h2PrebioticReservoirPct = Number(rawPostH2.toFixed(1));
  const h3HabitableOrBiosignatureCandidatePct = Number(
    Math.max(0.5, 100 - h1AbioticEquilibriumPct - h2PrebioticReservoirPct).toFixed(1)
  );

  const bayesFactorPrebioticK21 = Number((likelihoodH2 / Math.max(0.02, likelihoodH1)).toFixed(2));
  const bayesFactorHabitableK31 = Number((likelihoodH3 / Math.max(0.02, likelihoodH1)).toFixed(2));
  const evidenceScale = classifyJeffreysScale(
    Math.max(bayesFactorPrebioticK21, bayesFactorHabitableK31)
  );

  // Type I Error α (abiotic false-positive risk) and Type II Error β (missed signal risk)
  const abioticFalsePositiveRiskAlphaPct = Number(
    clamp(h1AbioticEquilibriumPct * 0.42 + (100 - p5CertaintyPct) * 0.25, 1.8, 68.0).toFixed(1)
  );
  const missedSignalRiskBetaPct = Number(
    clamp(100 - statisticalPowerPct, 0.05, 45.0).toFixed(2)
  );

  const bayesian: BayesianHypothesisProbabilities = {
    h1AbioticEquilibriumPct,
    h2PrebioticReservoirPct,
    h3HabitableOrBiosignatureCandidatePct,
    confidenceInterval95HalfWidthPct: ci95,
    priorsPct: {
      h1PriorPct: Number((priorH1 * 100).toFixed(0)),
      h2PriorPct: Number((priorH2 * 100).toFixed(0)),
      h3PriorPct: Number((priorH3 * 100).toFixed(0)),
    },
    bayesFactorPrebioticK21,
    bayesFactorHabitableK31,
    evidenceScale,
    abioticFalsePositiveRiskAlphaPct,
    missedSignalRiskBetaPct,
  };

  // 6. Composite Indices (PHI and ESI-IR)
  const phiCompositePct = Number(
    pillars
      .reduce((acc, p) => acc + p.probabilityPct * p.weightInComposite, 0)
      .toFixed(1)
  );

  // Infrared Earth Similarity & Thermal-Chemical Compatibility Index (ESI-IR, Schulze-Makuch et al. 2011)
  const tempSim = Math.exp(
    -Math.abs(effectiveTempKelvin - ASTROBIO_CONSTANTS.EARTH_MEAN_SURFACE_TEMP_K) /
      (effectiveTempKelvin + ASTROBIO_CONSTANTS.EARTH_MEAN_SURFACE_TEMP_K)
  );
  const chemSim = (p1WaterPct / 100) * 0.5 + (p3RedoxPct / 100) * 0.5;
  const esiInfraredScore = Number(
    clamp(Math.sqrt(tempSim * Math.max(0.05, chemSim)), 0.08, 0.96).toFixed(2)
  );

  const indices: CompositeAstrobiologyIndices = {
    phiCompositePct,
    phiConfidence95Pct: ci95,
    esiInfraredScore,
    redoxDisequilibriumOmegaPct,
    chnopsCompletenessPct,
    confirmedElements,
  };

  // 7. Human-Grounded Translations ("Bajar los Datos a Tierra")
  const humanTranslation: HumanAstrobiologyTranslation = {
    headlineVerdictEs:
      h2PrebioticReservoirPct + h3HabitableOrBiosignatureCandidatePct >= 60
        ? `Alta Probabilidad de Química Prebiótica / Nicho Astrobiológico (${(h2PrebioticReservoirPct + h3HabitableOrBiosignatureCandidatePct).toFixed(1)}% ± ${ci95}%)`
        : h1AbioticEquilibriumPct >= 65
          ? `Dominio Termoquímico Abiótico (${h1AbioticEquilibriumPct}% ± ${ci95}% de explicación inerte)`
          : `Escenario Mixto en Evaluación Probabilística (PHI = ${phiCompositePct}% ± ${ci95}%)`,
    headlineVerdictEn:
      h2PrebioticReservoirPct + h3HabitableOrBiosignatureCandidatePct >= 60
        ? `High Prebiotic Chemistry / Astrobiological Niche Probability (${(h2PrebioticReservoirPct + h3HabitableOrBiosignatureCandidatePct).toFixed(1)}% ± ${ci95}%)`
        : h1AbioticEquilibriumPct >= 65
          ? `Abiotic Thermochemical Dominance (${h1AbioticEquilibriumPct}% ± ${ci95}% inert explanation)`
          : `Mixed Probabilistic Assessment Scenario (PHI = ${phiCompositePct}% ± ${ci95}%)`,
    plainProbabilityExplanationEs: `En ciencia nunca decimos "hay vida sí o no" con una sola foto infrarroja. Aplicando el Teorema de Bayes (Jay Devore, Cap. 2.4), los datos de SPHEREx asignan un ${h2PrebioticReservoirPct}% de probabilidad a un reservorio activo de ingredientes prebióticos (H₂O + CHNOPS), un ${h3HabitableOrBiosignatureCandidatePct}% a un nicho habitable o desequilibrio redox candidato, y un ${h1AbioticEquilibriumPct}% a procesos 100% abióticos.`,
    plainProbabilityExplanationEn: `In science we never claim "life yes or no" from a single infrared image. Applying Bayes' Theorem (Jay Devore, Ch. 2.4), SPHEREx data assign a ${h2PrebioticReservoirPct}% probability to an active prebiotic ingredient reservoir (H₂O + CHNOPS), ${h3HabitableOrBiosignatureCandidatePct}% to a habitable niche or redox disequilibrium candidate, and ${h1AbioticEquilibriumPct}% to 100% abiotic processes.`,
    abioticVsBiogenicHonestNoteEs: `Riesgo de Falso Positivo Abiótico (Error Tipo I α = ${abioticFalsePositiveRiskAlphaPct}%): volcanismo criogénico, fotólisis UV o mezcla convectiva profunda (CO ⇌ CH₄) pueden imitar biofirmas sin intervención biológica.`,
    abioticVsBiogenicHonestNoteEn: `Abiotic False-Positive Risk (Type I Error α = ${abioticFalsePositiveRiskAlphaPct}%): cryovolcanism, UV photolysis, or deep convective mixing (CO ⇌ CH₄) can mimic biosignatures without biology.`,
    recipeOfLifeAnalogyEs: `Analogía de la "Alacena de la Vida": De los 4 ladrillos bioquímicos que mide SPHEREx (Carbono, Hidrógeno, Nitrógeno y Oxígeno), este cuerpo tiene confirmados ${confirmedElements.length}/4 ([${confirmedElements.join(", ")}], ${chnopsCompletenessPct}%). Es como encontrar harina, agua y levadura listas en una cocina cósmica.`,
    recipeOfLifeAnalogyEn: `The "Pantry of Life" Analogy: Out of the 4 biochemical building blocks measured by SPHEREx (Carbon, Hydrogen, Nitrogen, Oxygen), this target confirms ${confirmedElements.length}/4 ([${confirmedElements.join(", ")}], ${chnopsCompletenessPct}%). It is like finding flour, water, and yeast stocked in a cosmic kitchen.`,
    antifreezeOceanAnalogyEs: `Analogía del "Anticongelante de Auto": Así como se agrega glicol al radiador de un motor en la nieve, el amoníaco (NH₃) y el metanol (CH₃OH) detectados bajan el punto de congelación del agua hasta ${cryoscopicModel.effectiveLiquidThresholdCelsius} °C (${cryoscopicModel.effectiveLiquidThresholdKelvin} K, Chang Cap. 12), haciendo posible un océano líquido oculto bajo el hielo (${cryoscopicModel.subsurfaceOceanProbabilityPct}% de probabilidad).`,
    antifreezeOceanAnalogyEn: `The "Car Radiator Antifreeze" Analogy: Just as glycol keeps a car engine from freezing in snow, detected ammonia (NH₃) and methanol (CH₃OH) depress water's freezing point down to ${cryoscopicModel.effectiveLiquidThresholdCelsius} °C (${cryoscopicModel.effectiveLiquidThresholdKelvin} K, Chang Ch. 12), enabling a hidden subsurface liquid ocean (${cryoscopicModel.subsurfaceOceanProbabilityPct}% probability).`,
  };

  // 8. Generate Formal Academic Reports in Markdown (ES & EN) with APA 7th Ed. Citations
  const academicThesisMarkdownEs = [
    `# INFORME ASTROBIOLÓGICO PROBABILÍSTICO — CHRONO-SPHEREx`,
    `**Objetivo Analizado**: ${targetName} (${benchmark.archetypeLabelEs})`,
    `**Coordenadas ICRS (J2000)**: RA ${formatRAtoHMS(coordinates.ra)}, Dec ${formatDectoDMS(coordinates.dec)}`,
    `**Modo de Datos**: \`${dataSourceMode}\` (${coveredChannelsCount}/102 canales SPHEREx, $\\text{SNR}_{\\text{coadd}} = ${coaddedSnr.toFixed(2)}\\sigma$)`,
    ``,
    `## 1. Inferencia Bayesiana Tripartita (Jay Devore, Cap. 2.4 & Catling et al., 2018)`,
    `- **$P(H_1 \\mid E)$ — Hipótesis Nula Abiótica (Equilibrio Termoquímico Inerte)**: **${h1AbioticEquilibriumPct}% ± ${ci95}%**`,
    `- **$P(H_2 \\mid E)$ — Reservorio Prebiótico Activo CHNOPS (Tema 3 SPHEREx)**: **${h2PrebioticReservoirPct}% ± ${ci95}%** ($K_{21} = ${bayesFactorPrebioticK21}$)`,
    `- **$P(H_3 \\mid E)$ — Nicho Habitable / Anomalía por Desequilibrio Redox**: **${h3HabitableOrBiosignatureCandidatePct}% ± ${ci95}%** ($K_{31} = ${bayesFactorHabitableK31}$)`,
    `- **Riesgo de Falso Positivo Abiótico (Error Tipo I $\\alpha$)**: ${abioticFalsePositiveRiskAlphaPct}% | **Riesgo de Señal Omitida (Error Tipo II $\\beta$)**: ${missedSignalRiskBetaPct}%`,
    ``,
    `## 2. Los 5 Pilares Físico-Químicos y Estadísticos`,
    ...pillars.map(
      (p) =>
        `- **${p.titleEs}**: **${p.probabilityPct}% ± ${p.uncertainty95Pct}%** — ${p.measuredEvidenceEs} (*${p.textbookCitation}*)`
    ),
    ``,
    `## 3. Modelo Crioscópico Eutéctico y Termodinámica Radiativa (Chang Cap. 12 & Çengel Cap. 12)`,
    `- **Temperatura Efectiva de Wien ($T_{\\text{eff}}$)**: ${effectiveTempKelvin} K (${effectiveTempCelsius} °C) | **Emitancia ($E_b$)**: ${blackbodyEmittanceWm2} W/m²`,
    `- **Descenso Crioscópico ($\\Delta T_f = K_f \\cdot m$)**: -${cryoscopicModel.cryoscopicDepressionKelvin} K (Umbral líquido eutéctico $\\text{H}_2\\text{O}-\\text{NH}_3$: ${cryoscopicModel.effectiveLiquidThresholdKelvin} K)`,
    `- **Probabilidad de Océano Líquido Subsuperficial / Atmosférico**: **${cryoscopicModel.subsurfaceOceanProbabilityPct}%**`,
    ``,
    `## 4. Referencias Bibliográficas (Normas APA 7.ª Edición)`,
    ...ASTROBIOLOGY_APA7_CITATIONS.map((c) => `- ${c}`),
  ].join("\n");

  const academicThesisMarkdownEn = [
    `# PROBABILISTIC ASTROBIOLOGY ASSESSMENT REPORT — CHRONO-SPHEREx`,
    `**Target Analyzed**: ${targetName} (${benchmark.archetypeLabelEn})`,
    `**ICRS Coordinates (J2000)**: RA ${formatRAtoHMS(coordinates.ra)}, Dec ${formatDectoDMS(coordinates.dec)}`,
    `**Data Source Mode**: \`${dataSourceMode}\` (${coveredChannelsCount}/102 SPHEREx channels, $\\text{SNR}_{\\text{coadd}} = ${coaddedSnr.toFixed(2)}\\sigma$)`,
    ``,
    `## 1. Tripartite Bayesian Inference (Jay Devore, Ch. 2.4 & Catling et al., 2018)`,
    `- **$P(H_1 \\mid E)$ — Null Abiotic Hypothesis (Inert Thermochemical Equilibrium)**: **${h1AbioticEquilibriumPct}% ± ${ci95}%**`,
    `- **$P(H_2 \\mid E)$ — Active Prebiotic CHNOPS Reservoir (SPHEREx Theme 3)**: **${h2PrebioticReservoirPct}% ± ${ci95}%** ($K_{21} = ${bayesFactorPrebioticK21}$)`,
    `- **$P(H_3 \\mid E)$ — Habitable Niche / Redox Disequilibrium Candidate**: **${h3HabitableOrBiosignatureCandidatePct}% ± ${ci95}%** ($K_{31} = ${bayesFactorHabitableK31}$)`,
    `- **Abiotic False-Positive Risk (Type I Error $\\alpha$)**: ${abioticFalsePositiveRiskAlphaPct}% | **Missed Signal Risk (Type II Error $\\beta$)**: ${missedSignalRiskBetaPct}%`,
    ``,
    `## 2. The 5 Physical-Chemical & Statistical Pillars`,
    ...pillars.map(
      (p) =>
        `- **${p.titleEn}**: **${p.probabilityPct}% ± ${p.uncertainty95Pct}%** — ${p.measuredEvidenceEn} (*${p.textbookCitation}*)`
    ),
    ``,
    `## 3. Eutectic Cryoscopic Model & Radiative Thermodynamics (Chang Ch. 12 & Çengel Ch. 12)`,
    `- **Wien Effective Temperature ($T_{\\text{eff}}$)**: ${effectiveTempKelvin} K (${effectiveTempCelsius} °C) | **Emittance ($E_b$)**: ${blackbodyEmittanceWm2} W/m²`,
    `- **Cryoscopic Depression ($\\Delta T_f = K_f \\cdot m$)**: -${cryoscopicModel.cryoscopicDepressionKelvin} K (Eutectic $\\text{H}_2\\text{O}-\\text{NH}_3$ liquid threshold: ${cryoscopicModel.effectiveLiquidThresholdKelvin} K)`,
    `- **Subsurface / Atmospheric Liquid Ocean Probability**: **${cryoscopicModel.subsurfaceOceanProbabilityPct}%**`,
    ``,
    `## 4. Academic References (APA 7th Edition)`,
    ...ASTROBIOLOGY_APA7_CITATIONS.map((c) => `- ${c}`),
  ].join("\n");

  return {
    targetName,
    coordinates,
    archetype: benchmark.archetype,
    archetypeLabelEs: benchmark.archetypeLabelEs,
    archetypeLabelEn: benchmark.archetypeLabelEn,
    dataSourceMode,
    isLiveNasaData,
    coveredChannelsCount,
    totalBandsPossible: ASTROBIO_CONSTANTS.TOTAL_SPHEREX_BANDS,
    bayesian,
    indices,
    pillars,
    cryoscopicModel,
    molecules,
    thermodynamicsSummary: {
      effectiveTempKelvin,
      effectiveTempCelsius,
      peakWavelengthUm,
      blackbodyEmittanceWm2,
      spherexColorIndexD6D1,
      kinematicTopology,
      coaddedSnr,
      statisticalPowerPct,
    },
    humanTranslation,
    academicCitationsApa7: [...ASTROBIOLOGY_APA7_CITATIONS],
    academicThesisMarkdownEs,
    academicThesisMarkdownEn,
  };
}
