import React, { useMemo, useState } from "react";
import { formatDectoDMS, formatRAtoHMS } from "../../lib/coordinates";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  Flame,
  Globe2,
  Info,
  Layers,
  Sparkles,
  ThermometerSnowflake,
  X,
} from "lucide-react";
import { analyzeChemistry, getCalibratedReferenceSpectrum, type MeasuredPoint } from "./engine";
import { MOLECULAR_BANDS } from "./constants";
import type { AstrochemicalProfile, MolecularDetection } from "./types";
import { useLanguage } from "../../i18n/LanguageContext";

interface AstroChemistryLabProps {
  measuredPoints: MeasuredPoint[];
  targetName?: string;
  coordinates?: { ra: number; dec: number };
  onSelectBandpass?: (bandpass: string) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const AstroChemistryLab: React.FC<AstroChemistryLabProps> = ({
  measuredPoints,
  targetName = "Target",
  coordinates = { ra: 0, dec: 0 },
  onSelectBandpass,
  onClose,
  isStandalone = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [selectedMolecule, setSelectedMolecule] = useState<MolecularDetection | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [useReferenceData, setUseReferenceData] = useState<boolean>(false);

  const effectivePoints = useMemo(() => {
    if (useReferenceData || measuredPoints.length === 0) {
      return getCalibratedReferenceSpectrum(targetName);
    }
    return measuredPoints;
  }, [useReferenceData, measuredPoints, targetName]);

  // Run the core chemical analysis engine
  const profile: AstrochemicalProfile = useMemo(() => {
    return analyzeChemistry(effectivePoints, targetName, coordinates);
  }, [effectivePoints, targetName, coordinates]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(profile.academicReportMarkdown);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleDownloadReport = () => {
    const blob = new Blob([profile.academicReportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Astrochemistry_Report_${targetName.replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl text-slate-100 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold tracking-tight text-white">
              {isEn ? "SPHEREx Astrochemistry & Molecular Lab" : "Laboratorio de Astroquímica y Moléculas SPHEREx"}
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {isEn ? "102-Band Chemical Diagnostics" : "Diagnóstico Químico de 102 Bandas"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isEn
              ? `Physical-chemical spectrometry for ${targetName} (RA ${formatRAtoHMS(coordinates.ra)}, Dec ${formatDectoDMS(coordinates.dec)})`
              : `Espectrometría físico-química para ${targetName} (RA ${formatRAtoHMS(coordinates.ra)}, Dec ${formatDectoDMS(coordinates.dec)})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseReferenceData((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              useReferenceData || measuredPoints.length === 0
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
            title={
              isEn
                ? "Toggle between live archive cutouts and calibrated 102-band baseline model"
                : "Alternar entre recortes del archivo y modelo de referencia calibrado de 102 bandas"
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            {useReferenceData || measuredPoints.length === 0
              ? isEn ? "102-Band Ref Model" : "Modelo Ref 102 Bandas"
              : isEn ? "Live Archive Fluxes" : "Flujos en Vivo del Archivo"}
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isEn ? "Scientific Report (Thesis)" : "Informe Científico (Tesis)"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isEn ? "Close Lab" : "Cerrar Laboratorio"}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid: Thermodynamics & Astrobiology */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Wien Temperature */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isEn ? "Thermal Temperature (Wien)" : "Temperatura Térmica (Wien)"}</span>
            <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white">
              {profile.wienTemperatureKelvin ? `${profile.wienTemperatureKelvin} K` : "N/A"}
            </div>
            <div className="text-[11px] text-cyan-300 font-medium">
              {profile.wienTemperatureKelvin
                ? `${(profile.wienTemperatureKelvin - 273.15).toFixed(0)} °C (${
                    profile.wienTemperatureKelvin < 300
                      ? isEn ? "Cryogenic / Outer Solar System" : "Criogénico / Sistema Exterior"
                      : isEn ? "Photospheric Emission" : "Emisión Fotosférica"
                  })`
                : isEn ? "Awaiting full band scan" : "Esperando barrido completo"}
            </div>
          </div>
        </div>

        {/* Stefan-Boltzmann Radiative Output */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isEn ? "Total Emittance (j* = σT⁴)" : "Emitancia Total (j* = σT⁴)"}</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white">
              {profile.stefanBoltzmannEmittanceWm2
                ? `${profile.stefanBoltzmannEmittanceWm2} W/m²`
                : "N/A"}
            </div>
            <div className="text-[11px] text-slate-400">
              {isEn ? "Stefan-Boltzmann Radiative Balance" : "Balance Radiativo Stefan-Boltzmann"}
            </div>
          </div>
        </div>

        {/* Thermochemical State (CO vs CH4) */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isEn ? "CH₄ / CO Disequilibrium" : "Desequilibrio CH₄ / CO"}</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-purple-300 truncate" title={profile.thermochemicalState}>
              {profile.thermochemicalState}
            </div>
            <div className="text-[11px] text-slate-400">
              {profile.ch4ToCoRatio !== null
                ? `Ratio: ${profile.ch4ToCoRatio}x (${isEn ? "Thermochemical Quench" : "Freno Termoquímico"})`
                : isEn ? "Atmospheric mixing baseline" : "Línea base atmosférica"}
            </div>
          </div>
        </div>

        {/* Volatile Retention & Habitability */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isEn ? "Volatile Retention Score" : "Índice de Retención Volátil"}</span>
            <Globe2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-400">{profile.volatileRichnessScore}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${profile.volatileRichnessScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Molecular Fingerprints Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isEn ? "Molecular Absorption Bands (Beer-Lambert Optical Depth τ)" : "Bandas de Absorción Molecular (Profundidad Óptica τ)"}
          </h4>
          <span className="text-[11px] text-slate-500">
            {isEn ? "Click any molecule to inspect chemical mechanism" : "Haz clic para ver el mecanismo químico"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {profile.detections.map((detection) => {
            const isSelected = selectedMolecule?.definition.id === detection.definition.id;
            return (
              <div
                key={detection.definition.id}
                onClick={() => setSelectedMolecule(detection)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-800/90 border-purple-500/80 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/50"
                    : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/70 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${detection.definition.colorHex}20`,
                        color: detection.definition.colorHex,
                        border: `1px solid ${detection.definition.colorHex}40`,
                      }}
                    >
                      {detection.definition.chemicalFormula}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {detection.definition.detectorId} · {detection.definition.centerWaveUm} µm
                    </span>
                  </div>

                  <div className="text-xs font-medium text-slate-200 mt-2 line-clamp-1">
                    {detection.definition.commonName}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">Optical Depth τ:</span>
                    <span className="font-semibold text-slate-100 ml-1">
                      {detection.opticalDepthTau > 0 ? detection.opticalDepthTau : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Depth:</span>
                    <span
                      className="font-semibold ml-1"
                      style={{ color: detection.absorptionDepthPercent > 10 ? detection.definition.colorHex : "#94a3b8" }}
                    >
                      {detection.absorptionDepthPercent > 0 ? `${detection.absorptionDepthPercent}%` : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">SNR: {detection.snr > 0 ? `${detection.snr}σ` : "N/A"}</span>
                  <span
                    className={`font-semibold ${
                      detection.confidence.includes("High")
                        ? "text-emerald-400"
                        : detection.confidence.includes("Moderate")
                        ? "text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    {detection.confidence}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Molecule Detail Callout */}
      {selectedMolecule && (
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-purple-300">
                {selectedMolecule.definition.commonName} ({selectedMolecule.definition.chemicalFormula})
              </span>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[11px]">
                {selectedMolecule.definition.detectorId} · {selectedMolecule.definition.centerWaveUm} µm
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMolecule(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 pt-1">
            <div>
              <strong className="text-purple-200">{isEn ? "Vibrational Mode:" : "Modo Vibracional:"}</strong>{" "}
              {selectedMolecule.definition.vibrationalMode}
              <br />
              <strong className="text-purple-200 mt-1 block">
                {isEn ? "Astrophysical Significance:" : "Significado Astrofísico:"}
              </strong>
              {selectedMolecule.definition.astrophysicalSignificance}
            </div>
            <div>
              <strong className="text-purple-200">
                {isEn ? "Habitability & Volatiles Context:" : "Contexto de Habitabilidad y Volátiles:"}
              </strong>
              <p className="mt-0.5">{selectedMolecule.definition.habitabilityContext}</p>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Citation: {selectedMolecule.definition.referenceCitation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Executive Scientific Conclusion Box */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-sm text-white">
              {isEn ? "Synthesis & Target Classification:" : "Síntesis y Clasificación del Objetivo:"}
            </h4>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {profile.classification}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              ({profile.classificationConfidence}% {isEn ? "Confidence" : "Confianza"})
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{profile.executiveConclusion}</p>
        </div>
      </div>

      {/* Academic Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">
                  {isEn ? "Astrochemistry Investigation Report (Markdown)" : "Informe de Investigación Astroquímica (Markdown)"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedToast ? (isEn ? "Copied!" : "¡Copiado!") : (isEn ? "Copy Markdown" : "Copiar Markdown")}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isEn ? "Download .md" : "Descargar .md"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono text-slate-300 leading-relaxed bg-slate-950/40 select-text">
              <pre className="whitespace-pre-wrap font-mono text-xs">{profile.academicReportMarkdown}</pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>
                {isEn ? "Formatted in APA 7th Edition with university textbook citations." : "Formateado en APA 7ma Edición con citas de libros de texto."}
              </span>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                {isEn ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
