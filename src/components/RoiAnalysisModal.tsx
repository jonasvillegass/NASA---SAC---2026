import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Dna,
  FlaskConical,
  GitCompareArrows,
  HelpCircle,
  Loader2,
  MapPin,
  Orbit,
  ScanSearch,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { localizeReadingName, localizeTargetName } from "../i18n/translations";
import { ChemicalFormula, Latex } from "./Latex";
import { RoiTutorial } from "./RoiTutorial";
import { formatDectoDMS, formatRAtoHMS } from "../lib/coordinates";
import { compareRoiReadings } from "../lib/spectralAnalysis";
import {
  addDaysToDateString,
  computeCelestialTrajectory,
  extrapolatePositionAtDate,
  mjdToDateString,
  validateSameCelestialBody,
} from "../lib/trajectory";
import type {
  CelestialTrajectoryResult,
  ChemicalDetectionStatus,
  ExtrapolatedPosition,
  RoiChemicalAnalysisResult,
  SavedRoiReading,
  SkyRoiSelection,
  TrajectoryModelType,
} from "../lib/types";

interface RoiAnalysisModalProps {
  isOpen: boolean;
  initialTab?: "current" | "compare" | "trajectory";
  roi: SkyRoiSelection | null;
  analysis: RoiChemicalAnalysisResult | null;
  targetName: string;
  totalAvailableObservations: number;
  isScanning: boolean;
  scanProgress: { current: number; total: number } | null;
  savedReadings: SavedRoiReading[];
  isCurrentSaved: boolean;
  onSaveReading: (name: string) => void;
  onDeleteSavedReading: (id: string) => void;
  onScanAllBands: () => void;
  onCancelScan: () => void;
  onClearRoi: () => void;
  onShowTrajectoryOnMap?: (
    trajectory: CelestialTrajectoryResult,
    extrapolated: ExtrapolatedPosition | null
  ) => void;
  onClose: () => void;
}

export const RoiAnalysisModal: React.FC<RoiAnalysisModalProps> = ({
  isOpen,
  initialTab = "current",
  roi,
  analysis,
  targetName,
  totalAvailableObservations,
  isScanning,
  scanProgress,
  savedReadings,
  isCurrentSaved,
  onSaveReading,
  onDeleteSavedReading,
  onScanAllBands,
  onCancelScan,
  onClearRoi,
  onShowTrajectoryOnMap,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "compare" | "trajectory">(initialTab);
  const [proportionMode, setProportionMode] = useState<"spectral" | "molar">("spectral");
  const [saveName, setSaveName] = useState<string>("");
  const [compareIdA, setCompareIdA] = useState<string>("");
  const [compareIdB, setCompareIdB] = useState<string>("");
  const [selectedTrajectoryIds, setSelectedTrajectoryIds] = useState<Set<string>>(() => new Set());
  const [trajectoryModel, setTrajectoryModel] = useState<TrajectoryModelType>("linear");
  const [targetDateInput, setTargetDateInput] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const localizedTargetName = useMemo(
    () => localizeTargetName(targetName, isEn),
    [targetName, isEn]
  );

  const localizedSavedReadings: SavedRoiReading[] = useMemo(
    () =>
      savedReadings.map((r) => ({
        ...r,
        name: localizeReadingName(r.name, isEn),
        targetName: localizeTargetName(r.targetName, isEn),
      })),
    [savedReadings, isEn]
  );

  // Build pool of comparable readings (current unsaved ROI + saved readings)
  const comparablePool: SavedRoiReading[] = useMemo(() => {
    const list: SavedRoiReading[] = [];
    if (roi && analysis && !isCurrentSaved) {
      list.push({
        id: "__current__",
        name: isEn
          ? `Current area (${localizedTargetName})`
          : `Área actual (${localizedTargetName})`,
        savedAt: new Date().toISOString(),
        targetName: localizedTargetName,
        roi,
        analysis,
      });
    }
    return [...list, ...localizedSavedReadings];
  }, [roi, analysis, isCurrentSaved, localizedTargetName, localizedSavedReadings, isEn]);

  useEffect(() => {
    if (comparablePool.length === 0) return;
    const nextA = comparablePool.some((r) => r.id === compareIdA)
      ? compareIdA
      : comparablePool[0].id;
    if (nextA !== compareIdA) {
      setCompareIdA(nextA);
    }
    if (comparablePool.length >= 2) {
      const validB =
        Boolean(compareIdB) &&
        compareIdB !== nextA &&
        comparablePool.some((r) => r.id === compareIdB);
      if (!validB) {
        const other = comparablePool.find((r) => r.id !== nextA);
        if (other) setCompareIdB(other.id);
      }
    }
  }, [comparablePool, compareIdA, compareIdB]);

  const readingA = comparablePool.find((r) => r.id === compareIdA) ?? null;
  const readingB = comparablePool.find((r) => r.id === compareIdB) ?? null;

  const comparison = useMemo(() => {
    if (!readingA || !readingB || readingA.id === readingB.id) return null;
    return compareRoiReadings(readingA, readingB);
  }, [readingA, readingB]);

  const epochComparableReadings = useMemo(
    () =>
      comparablePool.filter(
        (r) =>
          r.roi.epochMjd !== null &&
          r.roi.epochMjd !== undefined &&
          Number.isFinite(r.roi.epochMjd)
      ),
    [comparablePool]
  );

  const knownTrajectoryIdsRef = useRef<Set<string>>(new Set());

  // Auto-select newly added readings with epochs (supports 2, 3, 4+ areas)
  useEffect(() => {
    if (epochComparableReadings.length === 0) return;
    setSelectedTrajectoryIds((prev) => {
      const next = new Set(
        [...prev].filter((id) => epochComparableReadings.some((r) => r.id === id))
      );
      for (const r of epochComparableReadings) {
        if (!knownTrajectoryIdsRef.current.has(r.id)) {
          next.add(r.id);
        }
      }
      knownTrajectoryIdsRef.current = new Set(epochComparableReadings.map((r) => r.id));
      return next;
    });
  }, [epochComparableReadings]);

  const selectedTrajectoryReadings = useMemo(
    () => epochComparableReadings.filter((r) => selectedTrajectoryIds.has(r.id)),
    [epochComparableReadings, selectedTrajectoryIds]
  );

  const distinctTrajectoryEpochs = useMemo(
    () =>
      new Set(selectedTrajectoryReadings.map((r) => (r.roi.epochMjd ?? 0).toFixed(4))).size,
    [selectedTrajectoryReadings]
  );

  const identityCheck = useMemo(
    () => validateSameCelestialBody(selectedTrajectoryReadings),
    [selectedTrajectoryReadings]
  );

  const trajectoryResult = useMemo(() => {
    if (!identityCheck.compatible || selectedTrajectoryReadings.length < 2) return null;
    return computeCelestialTrajectory(selectedTrajectoryReadings, trajectoryModel);
  }, [identityCheck.compatible, selectedTrajectoryReadings, trajectoryModel]);

  useEffect(() => {
    if (!trajectoryResult || targetDateInput) return;
    const lastMjd = trajectoryResult.points[trajectoryResult.points.length - 1].epochMjd;
    setTargetDateInput(mjdToDateString(lastMjd + 90));
  }, [trajectoryResult, targetDateInput]);

  const extrapolatedPosition = useMemo(() => {
    if (!trajectoryResult || !targetDateInput) return null;
    return extrapolatePositionAtDate(trajectoryResult, targetDateInput);
  }, [trajectoryResult, targetDateInput]);

  const activeProportionMode =
    proportionMode === "molar" && analysis?.hasMolarProportions ? "molar" : "spectral";

  const rankedSpecies = useMemo(() => {
    if (!analysis) return [];
    return analysis.species
      .filter((s) =>
        activeProportionMode === "molar"
          ? s.molarSharePct !== null && s.molarSharePct > 0
          : s.spectralSharePct !== null && s.spectralSharePct > 0
      )
      .sort((a, b) => {
        const va =
          activeProportionMode === "molar" ? (a.molarSharePct ?? 0) : (a.spectralSharePct ?? 0);
        const vb =
          activeProportionMode === "molar" ? (b.molarSharePct ?? 0) : (b.spectralSharePct ?? 0);
        return vb - va;
      });
  }, [analysis, activeProportionMode]);

  const noCoverageCount = useMemo(
    () => (analysis ? analysis.species.filter((s) => s.status === "no_coverage").length : 0),
    [analysis]
  );

  const plotData = useMemo(() => {
    const pts = analysis?.spectrumPoints ?? [];
    if (pts.length === 0) return null;
    const minWave = 0.7;
    const maxWave = 5.05;
    const vals = pts.map((p) => p.flux);
    const minF = Math.min(...vals);
    const maxF = Math.max(...vals);
    const pad = Math.max(1e-4, (maxF - minF) * 0.15);
    const yMin = minF - pad;
    const yMax = maxF + pad;
    const spanY = yMax - yMin || 1;
    const w = 640;
    const h = 150;
    const pl = 48;
    const pr = 16;
    const pt = 14;
    const pb = 26;
    const pw = w - pl - pr;
    const ph = h - pt - pb;
    const toX = (wave: number) => pl + ((wave - minWave) / (maxWave - minWave)) * pw;
    const toY = (flux: number) => pt + ph - ((flux - yMin) / spanY) * ph;
    const pathD =
      pts.length >= 2
        ? pts
          .map(
            (p, idx) =>
              `${idx === 0 ? "M" : "L"} ${toX(p.waveUm).toFixed(1)} ${toY(p.flux).toFixed(1)}`
          )
          .join(" ")
        : "";
    return { pts, w, h, pl, pr, pt, pb, pw, ph, yMin, yMax, toX, toY, pathD };
  }, [analysis?.spectrumPoints]);

  if (!isOpen) return null;

  const statusLabel = (status: ChemicalDetectionStatus) => {
    switch (status) {
      case "detected":
        return isEn ? "Detected (≥3σ)" : "Detectado (≥3σ)";
      case "marginal":
        return isEn ? "Marginal (2–3σ)" : "Marginal (2–3σ)";
      case "not_detected":
        return isEn ? "Not detected (<2σ)" : "No detectado (<2σ)";
      case "no_coverage":
      default:
        return isEn ? "No coverage" : "Sin cobertura";
    }
  };

  const statusBadgeClass = (status: ChemicalDetectionStatus) => {
    switch (status) {
      case "detected":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
      case "marginal":
        return "bg-amber-500/20 text-amber-300 border-amber-400/40";
      case "not_detected":
        return "bg-slate-700/40 text-slate-400 border-white/10";
      case "no_coverage":
      default:
        return "bg-white/[0.03] text-slate-500 border-white/10";
    }
  };

  const loadedObsCount = analysis?.totalObservationsAnalyzed ?? 0;
  const coveredChannels = analysis?.coveredChannelsCount ?? 0;

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveName.trim();
    if (!trimmed) return;
    onSaveReading(trimmed);
    setSaveName("");
  };

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5"
        onClick={() => {
          if (!tutorialOpen) onClose();
        }}
      >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/15 bg-[#070B19]/95 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                {isEn
                  ? "Infrared Composition & Area Comparison"
                  : "Composición Infrarroja y Comparación de Áreas"}
              </h3>
              {roi && (
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  RA {formatRAtoHMS(roi.centerRa)} · Dec {formatDectoDMS(roi.centerDec)} ·{" "}
                  {roi.widthArcsec.toFixed(1)}″ × {roi.heightArcsec.toFixed(1)}″
                </p>
              )}
            </div>
          </div>

          <div id="roi-tut-header-tabs" className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              title={t.roiTutorial.buttonTitle}
              className="btn-press px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[#00D2FF]/15 border border-white/10 hover:border-[#00D2FF]/45 text-[11px] font-medium text-slate-200 hover:text-[#00D2FF] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span className="hidden sm:inline">{t.roiTutorial.buttonLabel}</span>
            </button>
            {/* Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-[11px]">
              {roi && (
                <button
                  type="button"
                  onClick={() => setActiveTab("current")}
                  className={`px-2.5 py-1 rounded-[9px] cursor-pointer transition-colors ${activeTab === "current"
                      ? "bg-[#00D2FF]/20 text-[#00D2FF] font-semibold"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  {isEn ? "Current Area" : "Área Actual"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("compare")}
                className={`px-2.5 py-1 rounded-[9px] cursor-pointer flex items-center gap-1 transition-colors ${activeTab === "compare"
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <GitCompareArrows className="w-3 h-3" />
                <span>
                  {isEn
                    ? `Compare (${savedReadings.length})`
                    : `Comparar (${savedReadings.length})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trajectory")}
                className={`px-2.5 py-1 rounded-[9px] cursor-pointer flex items-center gap-1 transition-colors ${activeTab === "trajectory"
                    ? "bg-amber-500/20 text-amber-300 font-semibold"
                    : "text-slate-400 hover:text-white"
                  }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>{isEn ? "Trajectory" : "Trayectoria"}</span>
              </button>
            </div>

            {roi && (
              <button
                type="button"
                onClick={onClearRoi}
                disabled={isScanning}
                className="btn-press px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-[11px] text-slate-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title={isEn ? "Clear selected area" : "Borrar área seleccionada"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-press p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
              aria-label={isEn ? "Close" : "Cerrar"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "current" && roi ? (
            <>
              {/* Real Coverage + Scan Trigger */}
              <div
                id="roi-tut-coverage"
                className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <span>{isEn ? "Real FITS Coverage:" : "Cobertura FITS Real:"}</span>
                    <span className="font-mono text-[#00D2FF]">
                      {loadedObsCount} / {totalAvailableObservations}{" "}
                      {isEn ? "observations" : "observaciones"}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-emerald-300">
                      {coveredChannels} / 102 {isEn ? "IR channels" : "canales IR"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEn
                      ? "Computed strictly from real calibrated FITS pixels (IMAGE/VARIANCE/WCS-WAVE). Uncovered bands are never estimated."
                      : "Calculado estrictamente con píxeles FITS reales calibrados (IMAGE/VARIANCE/WCS-WAVE). Las bandas sin datos nunca se inventan."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isScanning ? (
                    <button
                      type="button"
                      onClick={onCancelScan}
                      className="btn-press px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-xs font-medium text-rose-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {isEn
                          ? `Cancel (${scanProgress?.current ?? 0}/${scanProgress?.total ?? 0})`
                          : `Cancelar (${scanProgress?.current ?? 0}/${scanProgress?.total ?? 0})`}
                      </span>
                    </button>
                  ) : (
                    loadedObsCount < totalAvailableObservations && (
                      <button
                        type="button"
                        onClick={onScanAllBands}
                        className="btn-press px-3.5 py-1.5 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/60 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <ScanSearch className="w-3.5 h-3.5 text-[#00D2FF]" />
                        <span>
                          {isEn
                            ? `Scan all ${totalAvailableObservations} IRSA bands`
                            : `Escanear las ${totalAvailableObservations} bandas en IRSA`}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Save Reading Temporarily */}
              {!isScanning && analysis && (
                <form
                  id="roi-tut-save"
                  onSubmit={handleSaveSubmit}
                  className="rounded-2xl bg-emerald-500/5 border border-emerald-400/25 p-3 flex flex-wrap items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 text-xs text-emerald-200">
                    <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isCurrentSaved
                        ? isEn
                          ? "Reading saved in browser for comparison."
                          : "Lectura guardada en el navegador para comparar."
                        : isEn
                          ? "Save this reading temporarily to compare with other regions:"
                          : "Guardá esta lectura temporalmente para compararla con otras regiones:"}
                    </span>
                  </div>
                  {isCurrentSaved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" />
                      {isEn ? "Saved" : "Guardada"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder={isEn ? "Reading name..." : "Nombre de la lectura..."}
                        maxLength={48}
                        required
                        className="rounded-xl bg-black/50 border border-white/15 focus:border-emerald-400 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-48"
                      />
                      <button
                        type="submit"
                        disabled={!saveName.trim()}
                        className="btn-press px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer disabled:opacity-40"
                      >
                        {isEn ? "Save" : "Guardar"}
                      </button>
                    </div>
                  )}
                </form>
              )}

              {/* Mini Spectrum Plot */}
              {plotData && (
                <div
                  id="roi-tut-spectrum"
                  className="rounded-2xl bg-black/50 border border-white/10 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {isEn
                        ? "Extracted ROI Spectrum F_ν (MJy/sr) vs λ (µm)"
                        : "Espectro Real Extraído del Área F_ν (MJy/sr) vs λ (µm)"}
                    </span>
                    <span>
                      {plotData.pts.length} {isEn ? "samples" : "muestras"}
                    </span>
                  </div>
                  <svg
                    viewBox={`0 0 ${plotData.w} ${plotData.h}`}
                    className="w-full h-36 select-none"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect
                      x={plotData.pl}
                      y={plotData.pt}
                      width={plotData.pw}
                      height={plotData.ph}
                      fill="#030712"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    {analysis?.species
                      .filter((s) => s.status === "detected" || s.status === "marginal")
                      .map((s) => {
                        const x = plotData.toX(s.centerUm);
                        return (
                          <g key={s.id}>
                            <line
                              x1={x}
                              y1={plotData.pt}
                              x2={x}
                              y2={plotData.pt + plotData.ph}
                              stroke={s.status === "detected" ? "#34d399" : "#fbbf24"}
                              strokeWidth="1"
                              strokeDasharray="3,3"
                              opacity="0.7"
                            />
                            <text
                              x={x + 2}
                              y={plotData.pt + 11}
                              fill={s.status === "detected" ? "#6ee7b7" : "#fcd34d"}
                              fontSize="8.5"
                              fontFamily="monospace"
                            >
                              {s.formula}
                            </text>
                          </g>
                        );
                      })}
                    {plotData.pathD && (
                      <path d={plotData.pathD} fill="none" stroke="#00D2FF" strokeWidth="1.5" />
                    )}
                    {plotData.pts.map((p) => {
                      const cx = plotData.toX(p.waveUm);
                      const cy = plotData.toY(p.flux);
                      const yTop = plotData.toY(p.flux + p.sigma);
                      const yBot = plotData.toY(p.flux - p.sigma);
                      return (
                        <g key={p.obs_id}>
                          <line
                            x1={cx}
                            y1={yTop}
                            x2={cx}
                            y2={yBot}
                            stroke="#38bdf8"
                            strokeWidth="1"
                            opacity="0.45"
                          />
                          <circle cx={cx} cy={cy} r="2.3" fill="#38bdf8" />
                        </g>
                      );
                    })}
                    {[1.0, 2.0, 3.0, 4.0, 5.0].map((wTick) => {
                      const tx = plotData.toX(wTick);
                      return (
                        <text
                          key={wTick}
                          x={tx}
                          y={plotData.h - 6}
                          fill="#94a3b8"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {wTick.toFixed(1)} µm
                        </text>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Probabilistic Celestial Body Classification & Habitability Assessment */}
              {analysis && (
                <div id="roi-tut-classification" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card 1: Celestial Body Classification */}
                  <div className="rounded-2xl bg-white/[0.03] border border-[#00D2FF]/25 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Orbit className="w-4 h-4 text-[#00D2FF] shrink-0" />
                        <h4 className="text-xs sm:text-sm font-semibold text-white">
                          {isEn
                            ? "Probable Celestial Body Type"
                            : "Tipo Probable de Cuerpo Celeste"}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          analysis.celestialClassification.confidence === "high"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                            : analysis.celestialClassification.confidence === "moderate"
                              ? "bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40"
                              : analysis.celestialClassification.confidence === "low"
                                ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                                : "bg-slate-700/40 text-slate-400 border-white/10"
                        }`}
                      >
                        {analysis.celestialClassification.confidence === "high"
                          ? isEn
                            ? "High confidence"
                            : "Confianza alta"
                          : analysis.celestialClassification.confidence === "moderate"
                            ? isEn
                              ? "Moderate confidence"
                              : "Confianza moderada"
                            : analysis.celestialClassification.confidence === "low"
                              ? isEn
                                ? "Low confidence"
                                : "Confianza baja"
                              : isEn
                                ? "Insufficient data"
                                : "Datos insuficientes"}
                      </span>
                    </div>

                    {analysis.celestialClassification.topCandidate ? (
                      <>
                        <div className="rounded-xl bg-black/45 border border-white/10 p-3 space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                              {isEn
                                ? analysis.celestialClassification.topCandidate.nameEn
                                : analysis.celestialClassification.topCandidate.nameEs}
                            </span>
                            <span className="text-base font-bold font-mono text-[#00D2FF] shrink-0">
                              {analysis.celestialClassification.topCandidate.probabilityPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                            {analysis.celestialClassification.estimatedTeffK !== null && (
                              <span>
                                {isEn ? "Wien " : ""}
                                <Latex math="T_{\mathrm{eff}}" />
                                {isEn ? ":" : " Wien:"}{" "}
                                <strong className="text-amber-300">
                                  ~{analysis.celestialClassification.estimatedTeffK} K
                                </strong>
                              </span>
                            )}
                            {analysis.celestialClassification.spectralSlope !== null && (
                              <span>
                                · <Latex math="\alpha_{\mathrm{IR}}" />:{" "}
                                <strong className="text-slate-200">
                                  {analysis.celestialClassification.spectralSlope > 0 ? "+" : ""}
                                  {analysis.celestialClassification.spectralSlope}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {analysis.celestialClassification.candidates.slice(0, 4).map((cand, idx) => {
                            const feats = isEn
                              ? cand.matchingFeaturesEn
                              : cand.matchingFeaturesEs;
                            return (
                              <div key={cand.id} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span
                                    className={`truncate ${
                                      idx === 0 ? "text-white font-medium" : "text-slate-300"
                                    }`}
                                  >
                                    {isEn ? cand.nameEn : cand.nameEs}
                                  </span>
                                  <span className="font-mono text-[#00D2FF] shrink-0">
                                    {cand.probabilityPct.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      idx === 0 ? "bg-[#00D2FF]" : "bg-sky-400/50"
                                    }`}
                                    style={{
                                      width: `${Math.min(100, Math.max(2, cand.probabilityPct))}%`,
                                    }}
                                  />
                                </div>
                                {feats.length > 0 && (
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {feats.join(" · ")}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-slate-400">
                        {isEn
                          ? "Scan at least 4 infrared channels in this area to classify the probable celestial body."
                          : "Escaneá al menos 4 canales infrarrojos en esta área para clasificar el cuerpo celeste probable."}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Life / Habitability Probability */}
                  <div className="rounded-2xl bg-white/[0.03] border border-emerald-400/25 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Dna className="w-4 h-4 text-emerald-300 shrink-0" />
                        <h4 className="text-xs sm:text-sm font-semibold text-white">
                          {isEn
                            ? "Conditions for Life (as we know it)"
                            : "Condiciones para la Vida (como la conocemos)"}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          analysis.habitability.tier === "high"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                            : analysis.habitability.tier === "moderate"
                              ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                              : analysis.habitability.tier === "low"
                                ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                                : "bg-slate-700/40 text-slate-400 border-white/10"
                        }`}
                      >
                        {analysis.habitability.tier === "high"
                          ? isEn
                            ? "High potential"
                            : "Potencial alto"
                          : analysis.habitability.tier === "moderate"
                            ? isEn
                              ? "Moderate prebiotic"
                              : "Prebiótico moderado"
                            : analysis.habitability.tier === "low"
                              ? isEn
                                ? "Low potential"
                                : "Potencial bajo"
                              : isEn
                                ? "Insufficient data"
                                : "Datos insuficientes"}
                      </span>
                    </div>

                    {analysis.habitability.probabilityPct !== null ? (
                      <>
                        <div className="rounded-xl bg-black/45 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                              {isEn
                                ? "Life-Supporting Conditions Probability"
                                : "Probabilidad de Condiciones Aptas"}
                            </div>
                            <div className="text-2xl font-bold font-mono text-emerald-300">
                              {analysis.habitability.probabilityPct.toFixed(1)}%
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {(["C", "H", "N", "O"] as const).map((el) => {
                              const present = analysis.habitability.chnopsElements.includes(el);
                              return (
                                <span
                                  key={el}
                                  title={
                                    present
                                      ? isEn
                                        ? `Bio-element ${el} detected in IR bands`
                                        : `Bioelemento ${el} detectado en bandas IR`
                                      : isEn
                                        ? `Bio-element ${el} not detected yet`
                                        : `Bioelemento ${el} aún no detectado`
                                  }
                                  className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center border ${
                                    present
                                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/50"
                                      : "bg-white/[0.03] text-slate-500 border-white/10"
                                  }`}
                                >
                                  {el}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {analysis.habitability.factors.map((f) => (
                            <div key={f.id} className="space-y-0.5">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-200 truncate">
                                  {isEn ? f.labelEn : f.labelEs}{" "}
                                  <span className="text-[10px] font-mono text-slate-500">
                                    ({f.weightPct}%)
                                  </span>
                                </span>
                                <span className="font-mono text-slate-300 shrink-0">
                                  {f.status === "no_coverage"
                                    ? isEn
                                      ? "N/A"
                                      : "S/C"
                                    : `${f.scorePct.toFixed(0)}%`}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    f.status === "favorable"
                                      ? "bg-emerald-400"
                                      : f.status === "partial"
                                        ? "bg-amber-400"
                                        : f.status === "unfavorable"
                                          ? "bg-rose-400"
                                          : "bg-slate-600"
                                  }`}
                                  style={{
                                    width: `${
                                      f.status === "no_coverage"
                                        ? 0
                                        : Math.min(100, Math.max(3, f.scorePct))
                                    }%`,
                                  }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 leading-snug">
                                {isEn ? f.detailEn : f.detailEs}
                              </p>
                            </div>
                          ))}
                        </div>

                        <p className="text-[11px] text-slate-300 bg-black/35 border border-white/10 rounded-xl p-2.5 leading-relaxed">
                          {isEn
                            ? analysis.habitability.summaryEn
                            : analysis.habitability.summaryEs}
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-slate-400">
                        {isEn
                          ? analysis.habitability.summaryEn
                          : analysis.habitability.summaryEs}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Relative Proportions Section */}
              <div
                id="roi-tut-composition"
                className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#00D2FF]" />
                    <h4 className="text-xs sm:text-sm font-semibold text-white">
                      {isEn
                        ? "Relative Proportions of Detected Species"
                        : "Proporción Relativa de Compuestos Detectados"}
                    </h4>
                  </div>

                  {analysis?.hasMolarProportions && (
                    <div className="inline-flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setProportionMode("spectral")}
                        className={`px-2.5 py-1 rounded-[9px] cursor-pointer transition-colors ${activeProportionMode === "spectral"
                            ? "bg-[#00D2FF]/20 text-[#00D2FF] font-semibold"
                            : "text-slate-400 hover:text-white"
                          }`}
                      >
                        {isEn ? "Spectral Weight (W_λ)" : "Peso Espectral (W_λ)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProportionMode("molar")}
                        className={`px-2.5 py-1 rounded-[9px] cursor-pointer transition-colors ${activeProportionMode === "molar"
                            ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                            : "text-slate-400 hover:text-white"
                          }`}
                      >
                        {isEn ? "Ice Molar Ratio (N_i)" : "Proporción Molar Hielos (N_i)"}
                      </button>
                    </div>
                  )}
                </div>

                {rankedSpecies.length > 0 ? (
                  <div className="space-y-2.5">
                    {rankedSpecies.map((s) => {
                      const pct =
                        activeProportionMode === "molar"
                          ? (s.molarSharePct ?? 0)
                          : (s.spectralSharePct ?? 0);
                      const err =
                        activeProportionMode === "molar"
                          ? (s.molarShareErrorPct ?? 0)
                          : (s.spectralShareErrorPct ?? 0);
                      return (
                        <div key={s.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-white">
                                <ChemicalFormula formula={s.formula} />
                              </span>
                              <span className="text-slate-400 truncate">
                                {isEn ? s.nameEn : s.nameEs}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusBadgeClass(
                                  s.status
                                )}`}
                              >
                                <Latex math={`${s.snr.toFixed(1)}\\sigma`} />
                              </span>
                            </div>
                            <span className="font-mono font-semibold text-emerald-300 shrink-0">
                              {pct.toFixed(1)}%{" "}
                              <span className="text-[10px] text-slate-400">
                                ± {err.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${s.status === "detected" ? "bg-emerald-400" : "bg-amber-400"
                                }`}
                              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 flex items-start gap-2.5 text-xs text-slate-300">
                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      {noCoverageCount === (analysis?.species.length ?? 0) ? (
                        <p>
                          {isEn
                            ? "There are not enough spectral bands loaded yet for this area to evaluate chemical signatures."
                            : "Todavía no hay suficientes bandas espectrales cargadas en esta área para evaluar firmas químicas."}
                        </p>
                      ) : (
                        <p>
                          {isEn
                            ? "No molecular or ice absorption/emission signatures exceeded the 2σ noise threshold in the currently covered bands (likely dominated by stellar or thermal continuum)."
                            : "Ninguna firma molecular o de hielo superó el umbral de ruido de 2σ en las bandas cubiertas actualmente (espectro dominado por continuo estelar o térmico)."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Species Table */}
              {analysis && (
                <div id="roi-tut-table" className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00D2FF]" />
                      {isEn ? "Evaluated Diagnostic Bands" : "Bandas Diagnósticas Evaluadas"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {analysis.detectedCount} {isEn ? "detected" : "detectadas"} ·{" "}
                      {analysis.marginalCount} {isEn ? "marginal" : "marginales"}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-black/40 text-slate-400 font-mono border-b border-white/10">
                        <tr>
                          <th className="px-3 py-2">{isEn ? "Species" : "Especie"}</th>
                          <th className="px-3 py-2">
                            <Latex math="\lambda\;(\mu\mathrm{m})" />
                          </th>
                          <th className="px-3 py-2">{isEn ? "Type" : "Tipo"}</th>
                          <th className="px-3 py-2">SNR</th>
                          <th className="px-3 py-2">{isEn ? "Samples" : "Muestras"}</th>
                          <th className="px-3 py-2">{isEn ? "Status" : "Estado"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {analysis.species.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02]">
                            <td className="px-3 py-2">
                              <span className="font-semibold text-white mr-1.5">
                                <ChemicalFormula formula={s.formula} />
                              </span>
                              <span className="text-slate-400">{isEn ? s.nameEn : s.nameEs}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-300">
                              {s.centerUm.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {s.kind === "absorption"
                                ? isEn
                                  ? "Absorption"
                                  : "Absorción"
                                : isEn
                                  ? "Emission"
                                  : "Emisión"}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-200">
                              {s.status === "no_coverage" ? (
                                "—"
                              ) : (
                                <Latex math={`${s.snr.toFixed(2)}\\sigma`} />
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-400">
                              {s.pointsInBand} ({s.pointsLeftContinuum}/{s.pointsRightContinuum})
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full border text-[10px] ${statusBadgeClass(
                                  s.status
                                )}`}
                              >
                                {statusLabel(s.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {analysis && (
                <div className="rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                  <span className="text-slate-400">
                    {isEn ? "Spectral & thermal estimators:" : "Estimadores espectral y térmico:"}
                  </span>
                  <Latex
                    math="T_{\mathrm{eff}}\approx\frac{2897.77}{\lambda_{\max}},\quad \mathrm{SNR}=\frac{|F_{\mathrm{band}}-F_{\mathrm{cont}}|}{\sigma_{\mathrm{cont}}}"
                    className="text-cyan-200"
                  />
                </div>
              )}
            </>
          ) : activeTab === "compare" ? (
            /* COMPARE READINGS TAB */
            <div className="space-y-4">
              {comparablePool.length < 2 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-2">
                  <GitCompareArrows className="w-7 h-7 text-[#00D2FF] mx-auto opacity-80" />
                  <p className="text-sm font-medium text-white">
                    {isEn
                      ? "Save at least 2 area readings to compare"
                      : "Guardá al menos 2 lecturas de áreas para comparar"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isEn
                      ? "Select an area on Map 2, wait for processing to finish, save it with a name, then select another region on the same or another image."
                      : "Seleccioná un área en el Mapa 2, esperá a que termine el procesamiento, guardala con un nombre y luego analizá otra región de la misma o de otra imagen."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Selectors for Region A and Region B */}
                  <div id="roi-tut-compare-selectors" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 space-y-1.5">
                      <label className="text-[11px] font-mono text-[#00D2FF] uppercase tracking-wider">
                        {isEn ? "Region A" : "Región A"}
                      </label>
                      <select
                        value={compareIdA}
                        onChange={(e) => setCompareIdA(e.target.value)}
                        className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00D2FF]"
                      >
                        {comparablePool.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.roi.epochDate ? ` · ${r.roi.epochDate}` : ""} (
                            {r.analysis.coveredChannelsCount}/102 ch)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 space-y-1.5">
                      <label className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider">
                        {isEn ? "Region B" : "Región B"}
                      </label>
                      <select
                        value={compareIdB}
                        onChange={(e) => setCompareIdB(e.target.value)}
                        className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      >
                        {comparablePool.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.roi.epochDate ? ` · ${r.roi.epochDate}` : ""} (
                            {r.analysis.coveredChannelsCount}/102 ch)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Similarity Result Card */}
                  {readingA?.id === readingB?.id ? (
                    <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 text-xs text-amber-200">
                      {isEn
                        ? "Select two different readings to compare."
                        : "Seleccioná dos lecturas distintas para comparar."}
                    </div>
                  ) : comparison ? (
                    <div
                      id="roi-tut-compare-similarity"
                      className="rounded-2xl bg-white/[0.04] border border-white/12 p-4 space-y-3"
                    >
                      {comparison.insufficientOverlap || comparison.overallSimilarityPct === null ? (
                        <div className="flex items-start gap-2.5 text-xs text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <p>
                            {isEn
                              ? `Insufficient overlapping real wavelength channels (${comparison.overlapChannels} found, minimum 4 required) to compute a reliable similarity percentage.`
                              : `Canales infrarrojos reales solapados insuficientes (${comparison.overlapChannels} en común, mínimo 4 requeridos) para calcular un porcentaje de similitud confiable.`}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                                {isEn ? "Overall Similarity" : "Similitud Global"}
                              </span>
                              <div className="text-3xl font-bold font-mono text-white">
                                {comparison.overallSimilarityPct.toFixed(1)}%
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs font-mono">
                              <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10">
                                <span className="text-slate-400 mr-1.5">
                                  {isEn ? "Spectral:" : "Espectral:"}
                                </span>
                                <span className="text-[#00D2FF] font-semibold">
                                  {comparison.spectralSimilarityPct !== null
                                    ? `${comparison.spectralSimilarityPct.toFixed(1)}%`
                                    : "—"}
                                </span>
                              </div>
                              <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10">
                                <span className="text-slate-400 mr-1.5">
                                  {isEn ? "Chemical:" : "Química:"}
                                </span>
                                <span className="text-emerald-300 font-semibold">
                                  {comparison.chemicalSimilarityPct !== null
                                    ? `${comparison.chemicalSimilarityPct.toFixed(1)}%`
                                    : "—"}
                                </span>
                              </div>
                              <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10">
                                <span className="text-slate-400 mr-1.5">
                                  {isEn ? "Overlap:" : "Solapamiento:"}
                                </span>
                                <span className="text-slate-200 font-semibold">
                                  {comparison.overlapChannels} ch
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`rounded-xl p-3 text-xs border ${comparison.overallSimilarityPct >= 85
                                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                                : comparison.overallSimilarityPct >= 60
                                  ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                                  : "bg-rose-500/15 border-rose-400/40 text-rose-200"
                              }`}
                          >
                            {comparison.overallSimilarityPct >= 85
                              ? isEn
                                ? "High spectral & chemical similarity: compatible with the same celestial body or an analogous physical composition."
                                : "Alta similitud espectral y química: compatible con el mismo cuerpo celeste o una composición física análoga."
                              : comparison.overallSimilarityPct >= 60
                                ? isEn
                                  ? "Moderate similarity: shares partial infrared spectral features, but shows measurable differences."
                                  : "Similitud moderada: comparte rasgos infrarrojos parciales, pero presenta diferencias medibles."
                                : isEn
                                  ? "Low similarity: distinct infrared spectrum and/or chemical composition (unlikely to be the same body)."
                                  : "Baja similitud: espectro infrarrojo y/o composición química distinta (poco probable que sea el mismo cuerpo)."}
                          </div>

                          {comparison.sharedDetectedFormulas.length > 0 && (
                            <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-1.5">
                              <span className="text-slate-400">
                                {isEn ? "Shared detected species:" : "Especies detectadas en común:"}
                              </span>
                              {comparison.sharedDetectedFormulas.map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-200"
                                >
                                  <ChemicalFormula formula={f} />
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                            <span className="text-slate-400">
                              {isEn ? "Similarity metric:" : "Métrica de similitud:"}
                            </span>
                            <Latex
                              math="S_{\cos}(\mathbf{A},\mathbf{B}) = \frac{\mathbf{A}\cdot\mathbf{B}}{\|\mathbf{A}\|\,\|\mathbf{B}\|}\times 100\%"
                              className="text-emerald-200"
                            />
                          </div>
                        </>
                      )}

                      {/* Side-by-side Body Type & Habitability Comparison */}
                      {readingA && readingB && (
                        <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                          {[
                            { label: isEn ? "Region A" : "Región A", reading: readingA, accent: "text-[#00D2FF]" },
                            { label: isEn ? "Region B" : "Región B", reading: readingB, accent: "text-emerald-300" },
                          ].map(({ label, reading, accent }) => {
                            const cls = reading.analysis.celestialClassification?.topCandidate;
                            const hab = reading.analysis.habitability;
                            return (
                              <div
                                key={label}
                                className="rounded-xl bg-black/40 border border-white/10 p-2.5 space-y-1"
                              >
                                <div className={`font-mono font-semibold ${accent}`}>
                                  {label} · {reading.name}
                                </div>
                                <div className="flex items-center justify-between gap-2 text-slate-300">
                                  <span className="truncate">
                                    {cls
                                      ? isEn
                                        ? cls.nameEn
                                        : cls.nameEs
                                      : isEn
                                        ? "Unclassified"
                                        : "Sin clasificar"}
                                  </span>
                                  {cls && (
                                    <span className="font-mono text-[#00D2FF] shrink-0">
                                      {cls.probabilityPct.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 text-slate-400">
                                  <span>
                                    {isEn ? "Life conditions:" : "Condiciones de vida:"}
                                  </span>
                                  <span className="font-mono text-emerald-300 font-semibold">
                                    {hab?.probabilityPct !== null && hab?.probabilityPct !== undefined
                                      ? `${hab.probabilityPct.toFixed(1)}%`
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              )}

              {/* Saved Readings List */}
              {localizedSavedReadings.length > 0 && (
                <div
                  id="roi-tut-compare-saved"
                  className="rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 text-xs font-semibold text-slate-200">
                    {isEn
                      ? `Saved Readings in Browser (${localizedSavedReadings.length})`
                      : `Lecturas Guardadas en el Navegador (${localizedSavedReadings.length})`}
                  </div>
                  <div className="divide-y divide-white/5">
                    {localizedSavedReadings.map((r) => (
                      <div
                        key={r.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.02]"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{r.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {r.targetName}
                            {r.roi.epochDate ? ` · ${r.roi.epochDate}` : ""} · RA{" "}
                            {formatRAtoHMS(r.roi.centerRa)} · Dec{" "}
                            {formatDectoDMS(r.roi.centerDec)} ·{" "}
                            {r.analysis.coveredChannelsCount}/102 ch
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedReading(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 cursor-pointer shrink-0"
                          title={isEn ? "Delete saved reading" : "Eliminar lectura"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TRAJECTORY & EXTRAPOLATION TAB */
            <div className="space-y-4">
              {epochComparableReadings.length < 2 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-2">
                  <TrendingUp className="w-7 h-7 text-amber-300 mx-auto opacity-85" />
                  <p className="text-sm font-medium text-white">
                    {isEn
                      ? "Save at least 2 areas from different image dates"
                      : "Guardá al menos 2 áreas de distintas fechas de imagen"}
                  </p>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    {isEn
                      ? "Select an area on one epoch image and save it, then switch to another date, select the body's area there and save it. If their chemical composition matches, we will trace its motion and extrapolate its position to any target date."
                      : "Seleccioná un área en una imagen/época y guardala; luego cambiá a otra fecha, seleccioná el área del cuerpo celeste ahí y guardala. Si coinciden en composición química, trazaremos su movimiento y extrapolaremos su posición a otra fecha."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: Multi-select readings (1 per image/epoch) */}
                  <div
                    id="roi-tut-traj-select"
                    className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-white">
                        {isEn
                          ? "1. Select 2 or more areas across epochs (1 per image)"
                          : "1. Seleccioná 2 o más áreas por época (1 por imagen)"}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">
                          {selectedTrajectoryReadings.length}/{epochComparableReadings.length}{" "}
                          {isEn ? "selected" : "seleccionadas"} · {distinctTrajectoryEpochs}{" "}
                          {isEn ? "distinct epochs" : "épocas distintas"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTrajectoryIds(
                              new Set(epochComparableReadings.map((r) => r.id))
                            )
                          }
                          className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/15 text-[10px] text-slate-200 cursor-pointer"
                        >
                          {isEn ? "All" : "Todas"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTrajectoryIds(new Set())}
                          className="px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/15 text-[10px] text-slate-300 cursor-pointer"
                        >
                          {isEn ? "None" : "Ninguna"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {epochComparableReadings.map((r) => {
                        const checked = selectedTrajectoryIds.has(r.id);
                        const ra = r.roi.centroidRa ?? r.roi.centerRa;
                        const dec = r.roi.centroidDec ?? r.roi.centerDec;
                        return (
                          <label
                            key={r.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${checked
                                ? "bg-amber-500/10 border-amber-400/45 text-white"
                                : "bg-black/40 border-white/10 text-slate-300 hover:bg-white/[0.04]"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedTrajectoryIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(r.id)) next.delete(r.id);
                                  else next.add(r.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 accent-amber-400 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">{r.name}</div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                {r.roi.epochDate ?? mjdToDateString(r.roi.epochMjd!)} ·{" "}
                                {r.analysis.coveredChannelsCount}/102 ch
                              </div>
                              <div className="text-[10px] font-mono text-[#00D2FF]/90 truncate">
                                RA {formatRAtoHMS(ra)} · Dec {formatDectoDMS(dec)}
                                {r.roi.centroidRa !== undefined
                                  ? isEn
                                    ? " (photocenter)"
                                    : " (fotocentro)"
                                  : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Chemical Identity Verification */}
                  {selectedTrajectoryReadings.length >= 2 && (
                    <div
                      id="roi-tut-traj-identity"
                      className={`rounded-2xl border p-4 space-y-2 ${identityCheck.confidence === "high"
                          ? "bg-emerald-500/10 border-emerald-400/40"
                          : identityCheck.confidence === "moderate"
                            ? "bg-amber-500/10 border-amber-400/40"
                            : "bg-rose-500/10 border-rose-400/40"
                        }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          {identityCheck.compatible ? (
                            <CheckCircle2
                              className={`w-4 h-4 ${identityCheck.confidence === "high"
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                                }`}
                            />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-300" />
                          )}
                          <span>
                            {isEn
                              ? "2. Chemical Identity Verification"
                              : "2. Verificación de Identidad Química"}
                          </span>
                        </div>
                        {identityCheck.avgSimilarityPct !== null && (
                          <span className="font-mono text-xs text-white">
                            {isEn ? "Avg:" : "Prom:"} {identityCheck.avgSimilarityPct.toFixed(1)}% ·{" "}
                            {isEn ? "Min:" : "Mín:"} {identityCheck.minSimilarityPct?.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200">
                        {identityCheck.confidence === "high"
                          ? isEn
                            ? "Confirmed: all selected areas share a compatible infrared chemical & spectral signature (same celestial body)."
                            : "Confirmado: todas las áreas seleccionadas comparten una firma espectral y química compatible (mismo cuerpo celeste)."
                          : identityCheck.confidence === "moderate"
                            ? isEn
                              ? "Moderately compatible: partial spectral/chemical match. Trajectory can be traced, though verify that all boxes center on the same object."
                              : "Compatibilidad moderada: coincidencia espectral/química parcial. Se habilita el trazado, pero verificá que todas las cajas apunten al mismo objeto."
                            : identityCheck.confidence === "insufficient"
                              ? isEn
                                ? "Insufficient overlapping spectral channels across the selected areas to verify chemical identity."
                                : "Canales espectrales solapados insuficientes entre las áreas seleccionadas para verificar identidad química."
                              : isEn
                                ? "Chemical mismatch: the selected areas do not appear to belong to the same celestial body (< 60% similarity). Trajectory tracing is disabled."
                                : "Diferencia química detectada: las áreas seleccionadas no parecen corresponder al mismo cuerpo celeste (< 60% de similitud). Trazado deshabilitado."}
                      </p>

                      {identityCheck.sharedDetectedFormulas.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-slate-300">
                            {isEn ? "Shared species:" : "Especies en común:"}
                          </span>
                          {identityCheck.sharedDetectedFormulas.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded-full bg-black/40 border border-white/15 text-emerald-200"
                            >
                              <ChemicalFormula formula={f} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Trajectory & Extrapolation */}
                  {identityCheck.compatible && trajectoryResult && (
                    <div
                      id="roi-tut-traj-kinematics"
                      className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-xs font-semibold text-white">
                          {isEn
                            ? "3. Observed Motion & Date Extrapolation"
                            : "3. Movimiento Realizado y Extrapolación a Fecha"}
                        </h4>
                        <div className="inline-flex items-center p-0.5 rounded-xl bg-black/50 border border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setTrajectoryModel("linear")}
                            className={`px-2.5 py-1 rounded-[9px] cursor-pointer transition-colors ${trajectoryModel === "linear"
                                ? "bg-[#00D2FF]/20 text-[#00D2FF] font-semibold"
                                : "text-slate-400 hover:text-white"
                              }`}
                          >
                            {isEn ? "Linear (Proper Motion)" : "Lineal (Mov. Propio)"}
                          </button>
                          <button
                            type="button"
                            disabled={distinctTrajectoryEpochs < 3}
                            onClick={() => setTrajectoryModel("quadratic")}
                            className={`px-2.5 py-1 rounded-[9px] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${trajectoryModel === "quadratic"
                                ? "bg-amber-500/20 text-amber-300 font-semibold"
                                : "text-slate-400 hover:text-white"
                              }`}
                            title={
                              distinctTrajectoryEpochs < 3
                                ? isEn
                                  ? "Requires at least 3 distinct epochs"
                                  : "Requiere al menos 3 épocas distintas"
                                : undefined
                            }
                          >
                            {isEn ? "Quadratic (≥3 epochs)" : "Cuadrático (≥3 épocas)"}
                          </button>
                        </div>
                      </div>

                      {/* Observed kinematics metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="rounded-xl bg-black/45 border border-white/10 p-2.5">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? "Total Span" : "Lapso Total"}
                          </div>
                          <div className="text-white font-semibold mt-0.5">
                            {trajectoryResult.totalSpanDays.toFixed(1)} d
                          </div>
                        </div>
                        <div className="rounded-xl bg-black/45 border border-white/10 p-2.5">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? "Net Displacement" : "Desplaz. Neto"}
                          </div>
                          <div className="text-[#00D2FF] font-semibold mt-0.5">
                            {trajectoryResult.netDisplacementArcsec.toFixed(2)}″
                          </div>
                        </div>
                        <div className="rounded-xl bg-black/45 border border-white/10 p-2.5">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? "Apparent Speed" : "Velocidad Aparente"}
                          </div>
                          <div className="text-emerald-300 font-semibold mt-0.5">
                            {trajectoryResult.totalSpeedArcsecPerYear.toFixed(2)}″/yr
                          </div>
                        </div>
                        <div className="rounded-xl bg-black/45 border border-white/10 p-2.5">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? "Direction (PA)" : "Dirección (PA)"}
                          </div>
                          <div className="text-amber-300 font-semibold mt-0.5">
                            {trajectoryResult.positionAngleDeg.toFixed(1)}°
                          </div>
                        </div>
                      </div>

                      {/* Kinematic model formula in LaTeX */}
                      <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                        <span className="text-slate-400">
                          {trajectoryModel === "quadratic"
                            ? isEn
                              ? "Quadratic astrometric model:"
                              : "Modelo astrométrico cuadrático:"
                            : isEn
                              ? "Linear proper-motion model:"
                              : "Modelo lineal de movimiento propio:"}
                        </span>
                        <Latex
                          math={
                            trajectoryModel === "quadratic"
                              ? "\\xi(t)=\\xi_0+\\mu_{\\alpha*}\\Delta t+\\tfrac{1}{2}a_\\xi\\Delta t^2,\\;\\eta(t)=\\eta_0+\\mu_\\delta\\Delta t+\\tfrac{1}{2}a_\\eta\\Delta t^2"
                              : "\\xi(t)=\\xi_0+\\mu_{\\alpha*}\\Delta t,\\;\\eta(t)=\\eta_0+\\mu_\\delta\\Delta t"
                          }
                          className="text-amber-200"
                        />
                      </div>

                      {/* Observed segments breakdown when 3+ areas are selected */}
                      {trajectoryResult.segments.length >= 2 && (
                        <div className="rounded-xl bg-black/35 border border-white/10 p-2.5 space-y-1.5">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            {isEn
                              ? `Observed Trajectory Segments (${trajectoryResult.segments.length})`
                              : `Tramos Observados (${trajectoryResult.segments.length})`}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono">
                            {trajectoryResult.segments.map((seg, i) => (
                              <div
                                key={`${seg.fromLabel}-${seg.toLabel}-${i}`}
                                className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/[0.03] text-slate-300"
                              >
                                <span className="truncate">
                                  {i + 1}→{i + 2}: {seg.fromLabel} → {seg.toLabel}
                                </span>
                                <span className="text-[#00D2FF] shrink-0">
                                  {seg.distanceArcsec.toFixed(2)}″ ({seg.deltaDays.toFixed(1)}d)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Target Date Picker + Quick Offsets */}
                      <div id="roi-tut-traj-extrapolate" className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isEn ? "Target date:" : "Fecha a estimar:"}</span>
                        </label>
                        <input
                          type="date"
                          value={targetDateInput}
                          onChange={(e) => setTargetDateInput(e.target.value)}
                          className="rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                        {[
                          { days: 30, label: "+30 d" },
                          { days: 180, label: isEn ? "+6 mo" : "+6 m" },
                          { days: 365, label: isEn ? "+1 yr" : "+1 año" },
                        ].map((preset) => {
                          const lastDate =
                            trajectoryResult.points[trajectoryResult.points.length - 1].epochDate;
                          return (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() =>
                                setTargetDateInput(addDaysToDateString(lastDate, preset.days))
                              }
                              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-amber-500/20 border border-white/10 text-[11px] font-mono text-slate-200 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Extrapolated Coordinates Card */}
                      {extrapolatedPosition && (
                        <div className="rounded-xl bg-amber-500/10 border border-amber-400/35 p-3.5 flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                              {extrapolatedPosition.isExtrapolation
                                ? isEn
                                  ? `Extrapolated Position · ${extrapolatedPosition.targetDate}`
                                  : `Posición Extrapolada · ${extrapolatedPosition.targetDate}`
                                : isEn
                                  ? `Interpolated Position · ${extrapolatedPosition.targetDate}`
                                  : `Posición Interpolada · ${extrapolatedPosition.targetDate}`}
                            </div>
                            <div className="text-sm font-mono font-semibold text-white">
                              RA {formatRAtoHMS(extrapolatedPosition.ra)} · Dec{" "}
                              {formatDectoDMS(extrapolatedPosition.dec)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-300">
                              <Latex
                                math={`\\pm\\,${extrapolatedPosition.uncertaintyArcsec.toFixed(2)}''\\;(1\\sigma)`}
                              />{" "}
                              ·{" "}
                              {isEn ? (
                                <>
                                  <Latex math="\Delta" /> from last:
                                </>
                              ) : (
                                <>
                                  <Latex math="\Delta" /> desde última:
                                </>
                              )}{" "}
                              {extrapolatedPosition.displacementFromLastArcsec.toFixed(2)}″ (
                              {extrapolatedPosition.deltaDaysFromLast >= 0 ? "+" : ""}
                              {extrapolatedPosition.deltaDaysFromLast.toFixed(0)} d)
                            </div>
                          </div>

                          {onShowTrajectoryOnMap && (
                            <button
                              type="button"
                              onClick={() => {
                                onShowTrajectoryOnMap(trajectoryResult, extrapolatedPosition);
                                onClose();
                              }}
                              className="btn-press px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-300"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>
                                {isEn ? "Trace on Map 2" : "Trazar en Mapa 2"}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      <RoiTutorial
        open={tutorialOpen}
        activeTab={activeTab}
        onClose={() => setTutorialOpen(false)}
      />
    </>,
    document.body
  );
};
