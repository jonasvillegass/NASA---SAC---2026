import React, { useMemo, useState } from "react";
import { Latex } from "../../components/Latex";
import {
  AlertTriangle,
  Atom,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Droplets,
  FileText,
  Flame,
  FlaskConical,
  Scale,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
} from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import type {
  RenderedCutout,
  RoiChemicalAnalysisResult,
  SkyRoiSelection,
  SpherexObservation,
} from "../../lib/types";
import { ASTROBIOLOGY_BENCHMARK_PROFILES } from "./constants";
import { evaluateProbabilisticAstrobiology } from "./engine";

export interface AstrobiologyLabProps {
  observations?: SpherexObservation[];
  cachedCutouts?: Map<string, RenderedCutout>;
  roi?: SkyRoiSelection | null;
  roiAnalysis?: RoiChemicalAnalysisResult | null;
  epochACutout?: RenderedCutout | null;
  epochBCutout?: RenderedCutout | null;
  targetName?: string;
  coordinates?: { ra: number; dec: number };
}

export const AstrobiologyLab: React.FC<AstrobiologyLabProps> = ({
  observations = [],
  cachedCutouts = new Map(),
  roi = null,
  roiAnalysis = null,
  epochACutout = null,
  epochBCutout = null,
  targetName = "WISE J085510.83-071442.5",
  coordinates = { ra: 133.795, dec: -7.245 },
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [selectedBenchmarkKey, setSelectedBenchmarkKey] = useState<string>("auto");
  const [showThesisModal, setShowThesisModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const report = useMemo(() => {
    return evaluateProbabilisticAstrobiology({
      observations,
      cachedCutouts,
      roi,
      roiAnalysis,
      epochACutout,
      epochBCutout,
      targetName,
      coordinates,
      benchmarkKeyOverride:
        selectedBenchmarkKey === "auto" ? undefined : selectedBenchmarkKey,
    });
  }, [
    observations,
    cachedCutouts,
    roi,
    roiAnalysis,
    epochACutout,
    epochBCutout,
    targetName,
    coordinates,
    selectedBenchmarkKey,
  ]);

  const handleCopyTomySnippet = () => {
    const snippet = `import { evaluateProbabilisticAstrobiology, AstrobiologyLab } from "../features/astrobiology";

const astroBio = evaluateProbabilisticAstrobiology({
  observations,
  cachedCutouts: cachedCutoutsMap,
  roi: selectedRoi,
  roiAnalysis,
  targetName: resolvedObject?.canonicalName ?? targetName ?? "Target",
  coordinates: { ra: targetRa ?? 0, dec: targetDec ?? 0 },
});`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyMarkdownReport = () => {
    const md = isEn ? report.academicThesisMarkdownEn : report.academicThesisMarkdownEs;
    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const md = isEn ? report.academicThesisMarkdownEn : report.academicThesisMarkdownEs;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHRONO_SPHEREx_Astrobiology_${report.targetName.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { bayesian, indices, pillars, cryoscopicModel, molecules, humanTranslation } = report;

  return (
    <div className="w-full h-full text-slate-100 space-y-4 pb-8">
      {/* Header & Scientific Rigor Disclaimer */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 via-emerald-950/25 to-slate-900/95 p-4 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Atom className="w-3.5 h-3.5" />
                {isEn
                  ? "NASA SPHEREx Theme 3 · Bayesian Astrobiology Engine"
                  : "Tema 3 NASA SPHEREx · Motor Probabilístico de Astrobiología"}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  report.isLiveNasaData
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                    : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                }`}
              >
                {report.isLiveNasaData
                  ? isEn
                    ? "LIVE NASA IRSA FITS / ROI DATA"
                    : "DATOS EN VIVO NASA IRSA FITS / ROI"
                  : "[OFFLINE/CACHED] Verified IRSA Archive Mirror"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isEn
                ? "Probabilistic Habitability, Prebiotic Chemistry (CHNOPS) & Biosignature Assessment"
                : "Evaluación Probabilística de Habitabilidad, Química Prebiótica (CHNOPS) y Biofirmas"}
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isEn
                ? "Grounded in Bayes' Theorem (Jay Devore Ch. 2.4), Beer-Lambert & Colligative Eutectic Chemistry (Raymond Chang Ch. 11, 12, 15), Radiative Thermodynamics (Yunus Çengel Ch. 12), and NASA Astrobiology frameworks (Catling et al., 2018). Always expressed as conditional probabilities (±95% CI) — never deterministic claims."
                : "Fundamentado en el Teorema de Bayes (Jay Devore Cap. 2.4), Ley de Beer-Lambert y Química Coligativa Eutéctica (Raymond Chang Caps. 11, 12, 15), Termodinámica Radiativa (Yunus Çengel Cap. 12) y el marco de Astrobiología de la NASA (Catling et al., 2018). Siempre expresado como probabilidades condicionales (±IC 95%) — nunca afirmaciones deterministas."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTomySnippet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition"
              title={
                isEn
                  ? "Copy 1-line invocation snippet for Tomy"
                  : "Copiar función de 1 línea para integrar con Tomy"
              }
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5" />}
              {copiedCode
                ? isEn
                  ? "Copied Function!"
                  : "¡Función Copiada!"
                : isEn
                  ? "Copy 1-Line Call (Tomy)"
                  : "Copiar Función (Tomy)"}
            </button>

            <button
              type="button"
              onClick={() => setShowThesisModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow transition"
            >
              <FileText className="w-3.5 h-3.5" />
              {isEn ? "Scientific Report (APA 7)" : "Informe Científico (APA 7)"}
            </button>
          </div>
        </div>

        {/* Target / Benchmark Selector Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">
              {isEn ? "Analyzed Target:" : "Objetivo Analizado:"}
            </span>
            <span className="text-white font-semibold">{report.targetName}</span>
            <span className="text-slate-400 hidden sm:inline">
              ({isEn ? report.archetypeLabelEn : report.archetypeLabelEs})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-400">
              {isEn ? "Profile / Calibration:" : "Perfil / Calibración:"}
            </label>
            <select
              value={selectedBenchmarkKey}
              onChange={(e) => setSelectedBenchmarkKey(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="auto">
                {isEn
                  ? `⚡ Auto Sync (${targetName})`
                  : `⚡ Sincronización Automática (${targetName})`}
              </option>
              {ASTROBIOLOGY_BENCHMARK_PROFILES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.canonicalName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tripartite Bayesian Posterior Probability Dashboard */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              {isEn
                ? "1. Tripartite Bayesian Posterior Distribution P(Hᵢ | E) — Jay Devore Ch. 2.4"
                : "1. Distribución Posterior Bayesiana Tripartita P(Hᵢ | E) — Jay Devore Cap. 2.4"}
            </h3>
            <p className="text-xs text-slate-400">
              {isEn ? humanTranslation.headlineVerdictEn : humanTranslation.headlineVerdictEs}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              P(Hᵢ|E) = [P(E|Hᵢ)·P(Hᵢ)] / Σ P(E|Hₖ)·P(Hₖ)
            </span>
          </div>
        </div>

        {/* 3 Hypothesis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* H2: Prebiotic CHNOPS Reservoir */}
          <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/20 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
              <span>
                {isEn
                  ? "P(H₂ | E) · Prebiotic CHNOPS Reservoir"
                  : "P(H₂ | E) · Reservorio Prebiótico CHNOPS"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[10px]">
                K₂₁ = {bayesian.bayesFactorPrebioticK21}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {bayesian.h2PrebioticReservoirPct}%{" "}
              <span className="text-xs font-normal text-cyan-300/90">
                ± {bayesian.confidenceInterval95HalfWidthPct}% (95% CI)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isEn
                ? "Probability that the target harbors active biogenic ices & organic building blocks (H₂O, CH₃OH, OCN⁻, NH₃, PAHs — SPHEREx Theme 3)."
                : "Probabilidad de que el cuerpo albergue hielos biogénicos y ladrillos orgánicos prebióticos activos (H₂O, CH₃OH, OCN⁻, NH₃, PAHs — Tema 3 SPHEREx)."}
            </p>
          </div>

          {/* H3: Habitable Niche / Redox Disequilibrium Candidate */}
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span>
                {isEn
                  ? "P(H₃ | E) · Habitable Niche / Disequilibrium"
                  : "P(H₃ | E) · Nicho Habitable / Desequilibrio"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px]">
                K₃₁ = {bayesian.bayesFactorHabitableK31}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {bayesian.h3HabitableOrBiosignatureCandidatePct}%{" "}
              <span className="text-xs font-normal text-emerald-300/90">
                ± {bayesian.confidenceInterval95HalfWidthPct}% (95% CI)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isEn
                ? "Probability of a liquid/eutectic water environment coupled with redox chemical disequilibrium (CH₄/NH₃ + CO₂/H₂O)."
                : "Probabilidad de un entorno con solvente líquido/eutéctico acoplado a desequilibrio químico redox (CH₄/NH₃ + CO₂/H₂O)."}
            </p>
          </div>

          {/* H1: Null Abiotic Hypothesis */}
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
              <span>
                {isEn
                  ? "P(H₁ | E) · Null Abiotic Equilibrium"
                  : "P(H₁ | E) · Hipótesis Nula Abiótica"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px]">
                α = {bayesian.abioticFalsePositiveRiskAlphaPct}%
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {bayesian.h1AbioticEquilibriumPct}%{" "}
              <span className="text-xs font-normal text-amber-300/90">
                ± {bayesian.confidenceInterval95HalfWidthPct}% (95% CI)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isEn
                ? "Probability that the entire infrared spectrum is explained strictly by inert abiotic thermodynamics without prebiotic anomalies."
                : "Probabilidad de que todo el espectro infrarrojo se explique estrictamente por termodinámica inerte abiótica."}
            </p>
          </div>
        </div>

        {/* Stacked Probability Bar */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden flex border border-slate-700">
            <div
              style={{ width: `${bayesian.h2PrebioticReservoirPct}%` }}
              className="bg-cyan-500 h-full transition-all duration-500"
              title={`H2 Prebiotic: ${bayesian.h2PrebioticReservoirPct}%`}
            />
            <div
              style={{ width: `${bayesian.h3HabitableOrBiosignatureCandidatePct}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`H3 Habitable/Disequilibrium: ${bayesian.h3HabitableOrBiosignatureCandidatePct}%`}
            />
            <div
              style={{ width: `${bayesian.h1AbioticEquilibriumPct}%` }}
              className="bg-amber-500/80 h-full transition-all duration-500"
              title={`H1 Abiotic Null: ${bayesian.h1AbioticEquilibriumPct}%`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                {isEn ? "H₂ Prebiotic CHNOPS" : "H₂ Prebiótico CHNOPS"} ({bayesian.h2PrebioticReservoirPct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {isEn ? "H₃ Habitable / Redox" : "H₃ Habitable / Redox"} ({bayesian.h3HabitableOrBiosignatureCandidatePct}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {isEn ? "H₁ Abiotic Null" : "H₁ Nula Abiótica"} ({bayesian.h1AbioticEquilibriumPct}%)
              </span>
            </div>
            <span>
              {isEn ? "Composite PHI Index:" : "Índice Compuesto PHI:"}{" "}
              <strong className="text-white">{indices.phiCompositePct}%</strong> | ESI-IR:{" "}
              <strong className="text-emerald-300">{indices.esiInfraredScore}</strong> | CHNOPS:{" "}
              <strong className="text-cyan-300">{indices.chnopsCompletenessPct}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* The 5 Probabilistic Pillars (Books + NASA Sources) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          {isEn
            ? "2. The 5 Validated Probabilistic Pillars (University Textbooks & NASA SPHEREx)"
            : "2. Los 5 Pilares Probabilísticos Validados (Libros de Cátedra y Fuentes NASA SPHEREx)"}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pillars.map((pillar) => {
            const barColor =
              pillar.statusColor === "emerald"
                ? "bg-emerald-500"
                : pillar.statusColor === "cyan"
                  ? "bg-cyan-500"
                  : pillar.statusColor === "amber"
                    ? "bg-amber-500"
                    : "bg-rose-500";
            return (
              <div
                key={pillar.id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-white">
                    {isEn ? pillar.titleEn : pillar.titleEs}
                  </div>
                  <div className="text-sm font-extrabold text-emerald-300 shrink-0">
                    {pillar.probabilityPct}%{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      ±{pillar.uncertainty95Pct}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${pillar.probabilityPct}%` }}
                    className={`h-full ${barColor} transition-all duration-500`}
                  />
                </div>

                <div className="text-[11px] text-cyan-200/90 bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800 overflow-x-auto">
                  <Latex math={pillar.formulaLatex} />
                </div>

                <p className="text-[11px] text-slate-300">
                  <strong className="text-slate-200">
                    {isEn ? "Measured:" : "Medición:"}
                  </strong>{" "}
                  {isEn ? pillar.measuredEvidenceEn : pillar.measuredEvidenceEs}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/70">
                  <span>📚 {pillar.textbookCitation}</span>
                  <span>🛰️ {pillar.nasaReference}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eutectic Subsurface Ocean & Cryoscopic Model (Raymond Chang Ch. 12 + Yunus Çengel Ch. 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
            {isEn
              ? "3. Eutectic Subsurface Ocean & Cryoscopic Model (Chang Ch. 12 & Çengel Ch. 12)"
              : "3. Modelo de Océano Subsuperficial Eutéctico y Descenso Crioscópico (Chang Cap. 12 & Çengel Cap. 12)"}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
              <div className="text-[10px] text-slate-400">
                {isEn ? "Wien T_eff" : "T_eff Wien"}
              </div>
              <div className="text-sm font-bold text-white">
                {report.thermodynamicsSummary.effectiveTempKelvin} K
              </div>
              <div className="text-[10px] text-slate-400">
                ({report.thermodynamicsSummary.effectiveTempCelsius} °C)
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
              <div className="text-[10px] text-slate-400">
                {isEn ? "Cryoscopic ΔT_f" : "Descenso ΔT_f"}
              </div>
              <div className="text-sm font-bold text-cyan-300">
                -{cryoscopicModel.cryoscopicDepressionKelvin} K
              </div>
              <div className="text-[10px] text-slate-400">
                m ≈ {cryoscopicModel.estimatedAntifreezeMolalityMolKg} mol/kg
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
              <div className="text-[10px] text-slate-400">
                {isEn ? "Eutectic Threshold" : "Umbral Eutéctico"}
              </div>
              <div className="text-sm font-bold text-emerald-300">
                {cryoscopicModel.effectiveLiquidThresholdKelvin} K
              </div>
              <div className="text-[10px] text-slate-400">
                ({cryoscopicModel.effectiveLiquidThresholdCelsius} °C)
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
              <div className="text-[10px] text-slate-400">
                {isEn ? "Liquid / Ocean Prob." : "Prob. Océano Líquido"}
              </div>
              <div className="text-sm font-bold text-amber-300">
                {cryoscopicModel.subsurfaceOceanProbabilityPct}%
              </div>
              <div className="text-[10px] text-slate-400">
                {cryoscopicModel.subsurfaceOceanViable
                  ? isEn
                    ? "Viable Phase"
                    : "Fase Viable"
                  : isEn
                    ? "Non-Liquid Surface"
                    : "Sin Líquido Superficial"}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {isEn ? cryoscopicModel.explanationEn : cryoscopicModel.explanationEs}
          </p>
        </div>

        {/* Human Grounded Analogies ("Bajar los Datos a Tierra") */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isEn
              ? "4. Grounding the Science for Everyone (Human Analogies)"
              : "4. Bajando los Datos a Tierra (Explicación para todo Público)"}
          </h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <strong className="text-emerald-300 block mb-0.5">
                {isEn ? "Why Probabilities?" : "¿Por qué hablamos siempre de Probabilidades?"}
              </strong>
              {isEn
                ? humanTranslation.plainProbabilityExplanationEn
                : humanTranslation.plainProbabilityExplanationEs}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <strong className="text-cyan-300 block mb-0.5">
                {isEn ? "The Pantry of Life (CHNOPS):" : "La Alacena de la Vida (CHNOPS):"}
              </strong>
              {isEn
                ? humanTranslation.recipeOfLifeAnalogyEn
                : humanTranslation.recipeOfLifeAnalogyEs}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <strong className="text-amber-300 block mb-0.5">
                {isEn
                  ? "Antifreeze Ocean & Abiotic Caution:"
                  : "Océano con Anticongelante y Cautela Abiótica:"}
              </strong>
              {isEn
                ? `${humanTranslation.antifreezeOceanAnalogyEn} ${humanTranslation.abioticVsBiogenicHonestNoteEn}`
                : `${humanTranslation.antifreezeOceanAnalogyEs} ${humanTranslation.abioticVsBiogenicHonestNoteEs}`}
            </div>
          </div>
        </div>
      </div>

      {/* Biogenic Molecular Inventory Table (9 Diagnostic Bands) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Droplets className="w-4 h-4 text-emerald-400" />
            {isEn
              ? "5. Biogenic & Prebiotic Infrared Molecular Matrix (SPHEREx D3–D6)"
              : "5. Matriz de Moléculas Biogénicas y Prebióticas en el Infrarrojo (SPHEREx D3–D6)"}
          </h3>
          <span className="text-[11px] text-slate-400">
            {isEn
              ? "Synced with Tomy's ROI Spectral Analyzer & Beer-Lambert Optical Depth"
              : "Sincronizado con el Analizador Espectral por Área (ROI) de Tomy y Ley de Beer-Lambert"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-2.5">{isEn ? "Molecule" : "Molécula"}</th>
                <th className="py-2 px-2.5">{isEn ? "Band / Det." : "Banda / Det."}</th>
                <th className="py-2 px-2.5">CHNOPS</th>
                <th className="py-2 px-2.5">τ (Beer-Lambert)</th>
                <th className="py-2 px-2.5">SNR</th>
                <th className="py-2 px-2.5">{isEn ? "Det. Prob." : "Prob. Det."}</th>
                <th className="py-2 px-2.5">{isEn ? "Astrobiological Role" : "Rol Astrobiológico"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {molecules.map((mol) => (
                <tr key={mol.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-2.5 font-semibold text-white">
                    {mol.formula}
                    <div className="text-[10px] font-normal text-slate-400">
                      {isEn ? mol.nameEn : mol.nameEs}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 font-mono text-cyan-300">
                    {mol.centerWaveUm.toFixed(2)} µm ({mol.detectorId})
                  </td>
                  <td className="py-2 px-2.5">
                    <div className="flex items-center gap-1">
                      {mol.chnopsElements.map((el) => (
                        <span
                          key={el}
                          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-emerald-300"
                        >
                          {el}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 font-mono text-slate-200">
                    {mol.opticalDepthTau.toFixed(3)}
                  </td>
                  <td className="py-2 px-2.5 font-mono">
                    <span
                      className={
                        mol.snr >= 3
                          ? "text-emerald-300 font-bold"
                          : mol.snr >= 2
                            ? "text-amber-300"
                            : "text-slate-400"
                      }
                    >
                      {mol.snr.toFixed(1)}σ
                    </span>
                  </td>
                  <td className="py-2 px-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        mol.isDetected
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {mol.isDetected ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {mol.detectionProbabilityPct}%
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-[11px] text-slate-300 max-w-md">
                    {isEn ? mol.biogenicRoleEn : mol.biogenicRoleEs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Formal Academic APA 7th Ed. Thesis Report */}
      {showThesisModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  {isEn
                    ? "Academic Probabilistic Astrobiology Report (APA 7th Ed.)"
                    : "Informe Académico de Astrobiología Probabilística (Normas APA 7.ª Ed.)"}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdownReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedReport
                    ? isEn
                      ? "Copied!"
                      : "¡Copiado!"
                    : isEn
                      ? "Copy Markdown"
                      : "Copiar Markdown"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isEn ? "Download .md" : "Descargar .md"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowThesisModal(false)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                {isEn ? report.academicThesisMarkdownEn : report.academicThesisMarkdownEs}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
