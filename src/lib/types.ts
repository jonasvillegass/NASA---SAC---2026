export type SpherexCollectionId = "spherex_dr1";
export type CollectionQueryMode = SpherexCollectionId;

export interface SpherexObservation {
  obs_id: string;
  bandpass: string;
  em_min_um: number | null;
  em_max_um: number | null;
  s_ra: number | null;
  s_dec: number | null;
  t_exptime: number | null;
  t_min: number | null;
  t_max: number | null;
  epoch_date: string | null;
  epoch_datetime: string | null;
  obs_release_date: string;
  obs_collection: string;
  s_pixel_scale: number | null;
  access_url: string;
  s_region?: string;
}

export interface SearchResponse {
  query: {
    ra: number;
    dec: number;
    radius: number;
    collection: string;
    band: string;
  };
  sia_url: string;
  total_found: number;
  observations: SpherexObservation[];
}

export interface CollectionVersionData {
  collection: SpherexCollectionId;
  sia_url: string;
  total_found: number;
  observations: SpherexObservation[];
  bandsAvailable: string[];
}

export interface MultiVersionSearchResponse {
  query: {
    ra: number;
    dec: number;
    radius: number;
    collectionMode: CollectionQueryMode;
    band: string;
  };
  versions: Record<SpherexCollectionId, CollectionVersionData>;
  totalAcrossVersions: number;
  availableCollections: SpherexCollectionId[];
  recommendedCollection: SpherexCollectionId;
}

export interface CutoutStats {
  min: number;
  max: number;
  median: number;
  mean: number;
  unit: string;
  detector: string;
  shape: [number, number];
  has_zodi: boolean;
}

export interface FitsWcs {
  crval1: number;
  crval2: number;
  crpix1: number;
  crpix2: number;
  cd1_1: number;
  cd1_2: number;
  cd2_1: number;
  cd2_2: number;
}

export interface FitsWaveCalibration {
  crpix1w: number;
  crpix2w: number;
  xCoords: number[];
  yCoords: number[];
  /** Grid de valores [waveUm, bandwidthUm] de tamaño (yCoords.length * xCoords.length * 2) */
  values: number[];
}

export interface RenderedCutout {
  imageData: ImageData;
  dataUrl: string;
  width: number;
  height: number;
  stats: CutoutStats;
  wcs: FitsWcs | null;
  fits_cutout_url: string;
  fluxData?: Float32Array;
  varianceData?: Float32Array | null;
  waveGrid?: FitsWaveCalibration | null;
}

export type StretchMode = "asinh" | "log" | "sqrt" | "linear";
export type ColormapName = "inferno" | "viridis" | "plasma" | "magma" | "gray";

export interface TargetPreset {
  id: string;
  label: string;
  queryName: string;
  category: string;
  ra: string;
  dec: string;
  collection: CollectionQueryMode;
  description: string;
}

export interface ResolvedCelestialObject {
  query: string;
  canonicalName: string;
  otype: string;
  raDeg: number;
  decDeg: number;
  raHms: string;
  decDms: string;
  pmRa: number | null;
  pmDec: number | null;
  aliases: string[];
  resolverSource: string;
}

export type DetectorId = "D1" | "D2" | "D3" | "D4" | "D5" | "D6";

export interface DetectorMetadata {
  id: DetectorId;
  name: string;
  nameEn?: string;
  waveMin: number;
  waveMax: number;
  bandsCount: number;
  resolvingPower: string;
  simpleDescription: string;
  simpleDescriptionEn?: string;
  scientificDescription: string;
  scientificDescriptionEn?: string;
  targetMolecules: string[];
  targetMoleculesEn?: string[];
  teffKelvin: string;
  colorHex: string;
}

export interface SpectrumDataPoint {
  obs_id: string;
  bandpass: string;
  detector: string;
  wave_um: number;
  flux: number;
  unit: string;
  snr: number | null;
  mjd: number | null;
}

export interface SkyRoiSelection {
  /** 4 esquinas en orden horario o antihorario en ICRS (grados) */
  corners: Array<{ ra: number; dec: number }>;
  centerRa: number;
  centerDec: number;
  widthArcsec: number;
  heightArcsec: number;
  epochDate?: string | null;
  epochMjd?: number | null;
  obsId?: string | null;
  centroidRa?: number;
  centroidDec?: number;
}

export interface RoiSpectrumPoint {
  obs_id: string;
  bandpass: string;
  detector: string;
  waveUm: number;
  bandwidthUm: number | null;
  flux: number;
  sigma: number;
  snr: number | null;
  pixelCount: number;
}

export type ChemicalDetectionStatus =
  | "detected"
  | "marginal"
  | "not_detected"
  | "no_coverage";

export interface ChemicalSpeciesResult {
  id: string;
  formula: string;
  nameEs: string;
  nameEn: string;
  kind: "absorption" | "emission";
  centerUm: number;
  bandWindowUm: [number, number];
  status: ChemicalDetectionStatus;
  equivalentWidthUm: number;
  equivalentWidthErrorUm: number;
  snr: number;
  integratedTauCm1: number | null;
  columnDensityCm2: number | null;
  columnDensityErrorCm2: number | null;
  spectralSharePct: number | null;
  spectralShareErrorPct: number | null;
  molarSharePct: number | null;
  molarShareErrorPct: number | null;
  pointsInBand: number;
  pointsLeftContinuum: number;
  pointsRightContinuum: number;
}

export type CelestialBodyArchetypeId =
  | "icy_substellar_world"
  | "protoplanetary_disk_yso"
  | "molecular_cloud_core"
  | "hii_nebula_ism"
  | "cool_star_photosphere"
  | "galaxy_stellar_system";

export interface CelestialBodyCandidate {
  id: CelestialBodyArchetypeId;
  nameEs: string;
  nameEn: string;
  probabilityPct: number;
  matchingFeaturesEs: string[];
  matchingFeaturesEn: string[];
}

export interface CelestialBodyClassification {
  topCandidate: CelestialBodyCandidate | null;
  candidates: CelestialBodyCandidate[];
  confidence: "high" | "moderate" | "low" | "insufficient";
  estimatedTeffK: number | null;
  peakWaveUm: number | null;
  spectralSlope: number | null;
  evaluatedBandsCount: number;
}

export type HabitabilityFactorId =
  | "water"
  | "carbon_organics"
  | "chnops_nitrogen"
  | "thermal_regime"
  | "radiation_equilib";

export interface HabitabilityFactor {
  id: HabitabilityFactorId;
  labelEs: string;
  labelEn: string;
  weightPct: number;
  scorePct: number;
  status: "favorable" | "partial" | "unfavorable" | "no_coverage";
  detailEs: string;
  detailEn: string;
}

export interface HabitabilityAssessment {
  probabilityPct: number | null;
  tier: "high" | "moderate" | "low" | "insufficient";
  chnopsElements: Array<"C" | "H" | "N" | "O">;
  factors: HabitabilityFactor[];
  summaryEs: string;
  summaryEn: string;
}

export interface RoiChemicalAnalysisResult {
  spectrumPoints: RoiSpectrumPoint[];
  coveredChannelsCount: number;
  totalObservationsAnalyzed: number;
  species: ChemicalSpeciesResult[];
  detectedCount: number;
  marginalCount: number;
  hasMolarProportions: boolean;
  celestialClassification: CelestialBodyClassification;
  habitability: HabitabilityAssessment;
}

export interface SavedRoiReading {
  id: string;
  name: string;
  savedAt: string;
  targetName: string;
  roi: SkyRoiSelection;
  analysis: RoiChemicalAnalysisResult;
}

export interface RoiComparisonResult {
  overlapChannels: number;
  spectralSimilarityPct: number | null;
  chemicalSimilarityPct: number | null;
  overallSimilarityPct: number | null;
  sharedDetectedFormulas: string[];
  insufficientOverlap: boolean;
}

export type TrajectoryModelType = "linear" | "quadratic";

export interface ChemicalIdentityCheck {
  compatible: boolean;
  confidence: "high" | "moderate" | "low" | "insufficient";
  avgSimilarityPct: number | null;
  minSimilarityPct: number | null;
  sharedDetectedFormulas: string[];
  pairCount: number;
  insufficientOverlapPairs: number;
}

export interface TrajectoryPoint {
  readingId: string;
  label: string;
  ra: number;
  dec: number;
  epochDate: string;
  epochMjd: number;
  xiArcsec: number;
  etaArcsec: number;
  usedPhotocenter: boolean;
}

export interface TrajectorySegment {
  fromLabel: string;
  toLabel: string;
  deltaDays: number;
  distanceArcsec: number;
  speedArcsecPerDay: number;
  speedArcsecPerYear: number;
  positionAngleDeg: number;
}

export interface CelestialTrajectoryResult {
  model: TrajectoryModelType;
  points: TrajectoryPoint[];
  segments: TrajectorySegment[];
  refRa: number;
  refDec: number;
  meanMjd: number;
  totalSpanDays: number;
  totalPathArcsec: number;
  netDisplacementArcsec: number;
  pmRaArcsecPerYear: number;
  pmDecArcsecPerYear: number;
  totalSpeedArcsecPerYear: number;
  positionAngleDeg: number;
  rmsResidualArcsec: number;
  /** Coeficientes polinómicos en plano tangente (arcsec vs tau = mjd - meanMjd) */
  coeffsXi: number[];
  coeffsEta: number[];
}

export interface ExtrapolatedPosition {
  targetDate: string;
  targetMjd: number;
  ra: number;
  dec: number;
  xiArcsec: number;
  etaArcsec: number;
  uncertaintyArcsec: number;
  displacementFromLastArcsec: number;
  displacementFromFirstArcsec: number;
  deltaDaysFromLast: number;
  isExtrapolation: boolean;
}

export interface Map2TabSession {
  id: string;
  label: string;
  raInput: string;
  decInput: string;
  targetName: string;
  resolvedObject: ResolvedCelestialObject | null;
  lastCoords: { ra: number; dec: number; size: number } | null;
  versions: Record<SpherexCollectionId, CollectionVersionData> | null;
  activeCollection: SpherexCollectionId;
  selectedIdx: number;
  cutout: RenderedCutout | null;
  loading: boolean;
  cutoutLoading: boolean;
  status: { text: string; isError: boolean } | null;
}
