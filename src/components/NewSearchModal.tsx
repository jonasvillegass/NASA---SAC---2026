import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDectoDMS, formatRAtoHMS } from "../lib/coordinates";
import type { TargetPreset } from "../lib/types";
import {
  GATE_KNOWN_TARGETS,
  parseDecFlexible,
  parseRAFlexible,
  type GateKnownTarget,
} from "./SpaceGate";

export interface NewSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialRa: string;
  initialDec: string;
  loading?: boolean;
  onSubmitSearch: (params: {
    ra: string;
    dec: string;
    preset?: TargetPreset | null;
  }) => void;
}

function isDecimalFormat(raw: string): boolean {
  const s = raw.trim().replace(/°|deg$/i, "").trim();
  return /^[+-]?\d+(\.\d+)?$/.test(s);
}

export const NewSearchModal: React.FC<NewSearchModalProps> = ({
  open,
  onClose,
  initialRa,
  initialDec,
  loading = false,
  onSubmitSearch,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const [raInput, setRaInput] = useState(initialRa);
  const [decInput, setDecInput] = useState(initialDec);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setRaInput(initialRa);
    setDecInput(initialDec);
    setCoordError(null);
    setDropdownOpen(false);
    setSelectedTargetId(null);
  }, [open, initialRa, initialDec]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [dropdownOpen]);

  const raDeg = useMemo(() => parseRAFlexible(raInput), [raInput]);
  const decDeg = useMemo(() => parseDecFlexible(decInput), [decInput]);
  const coordsValid = raDeg !== null && decDeg !== null;
  const isCurrentlyDecimal = isDecimalFormat(raInput) && isDecimalFormat(decInput);

  if (!open) return null;

  const activeKnownTarget =
    (selectedTargetId
      ? GATE_KNOWN_TARGETS.find((k) => k.id === selectedTargetId)
      : null) ?? GATE_KNOWN_TARGETS[0];

  const handleSetCoordinateFormat = (mode: "hms" | "deg") => {
    if (raDeg === null || decDeg === null) return;
    if (mode === "hms") {
      setRaInput(formatRAtoHMS(raDeg));
      setDecInput(formatDectoDMS(decDeg));
    } else {
      const sign = decDeg >= 0 ? "+" : "";
      setRaInput(`${raDeg.toFixed(4)}°`);
      setDecInput(`${sign}${decDeg.toFixed(4)}°`);
    }
  };

  const handlePickKnownTarget = (target: GateKnownTarget) => {
    setSelectedTargetId(target.id);
    setRaInput(target.raHms);
    setDecInput(target.decDms);
    setCoordError(null);
    setDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (raDeg === null) {
      setCoordError(
        isEn
          ? "Please enter a valid Right Ascension (00h 00m 00.0s or 0°–360°)."
          : "Ingresá una Ascensión Recta válida (00h 00m 00.0s o 0°–360°)."
      );
      return;
    }
    if (decDeg === null) {
      setCoordError(
        isEn
          ? "Please enter a valid Declination (+00° 00' 00\" or -90° to +90°)."
          : "Ingresá una Declinación válida (+00° 00' 00\" o -90° a +90°)."
      );
      return;
    }
    setCoordError(null);

    const matchingPreset = selectedTargetId
      ? t.presets.find((p) => p.id === selectedTargetId) ?? null
      : null;

    onSubmitSearch({
      ra: raInput.trim(),
      dec: decInput.trim(),
      preset: matchingPreset,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-search-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel rounded-[22px] w-full max-w-[520px] p-5 sm:p-6 border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.85)] space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00D2FF]" />
            <h2
              id="new-search-modal-title"
              className="text-sm sm:text-base font-semibold text-white tracking-tight"
            >
              {t.chrono.newSearchButton}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close" : "Cerrar"}
            title={isEn ? "Close" : "Cerrar"}
            className="btn-press w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Separate Coordinates Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
              <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                {isEn
                  ? "Search by Coordinates (HMS / DMS or Degrees)"
                  : "Buscar por Coordenadas (HMS / DMS o Grados)"}
              </h3>
            </div>

            <div
              role="group"
              aria-label={isEn ? "Coordinate format" : "Formato de coordenadas"}
              title={
                isEn
                  ? "Switch between sexagesimal (HMS/DMS) and decimal degrees (DEG)"
                  : "Cambiar entre sexagesimal (HMS/DMS) y grados decimales (DEG)"
              }
              className="inline-flex items-center p-0.5 rounded-xl bg-black/55 border border-white/12 shrink-0"
            >
              <button
                type="button"
                onClick={() => handleSetCoordinateFormat("hms")}
                disabled={!coordsValid}
                aria-pressed={!isCurrentlyDecimal}
                className={`px-2 py-0.5 rounded-[9px] text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 ${
                  !isCurrentlyDecimal
                    ? "bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/55 font-semibold shadow-[0_0_10px_rgba(0,210,255,0.22)]"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                HMS/DMS
              </button>
              <button
                type="button"
                onClick={() => handleSetCoordinateFormat("deg")}
                disabled={!coordsValid}
                aria-pressed={isCurrentlyDecimal}
                className={`px-2 py-0.5 rounded-[9px] text-[10px] font-mono transition-all cursor-pointer disabled:opacity-40 ${
                  isCurrentlyDecimal
                    ? "bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/55 font-semibold shadow-[0_0_10px_rgba(0,210,255,0.22)]"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                DEG
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="modal-ra-input" className="font-mono text-slate-300 font-medium">
                  RA
                </label>
                {raDeg !== null ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <input
                id="modal-ra-input"
                type="text"
                required
                value={raInput}
                onChange={(e) => {
                  setRaInput(e.target.value);
                  setSelectedTargetId(null);
                  setCoordError(null);
                }}
                placeholder="00h 00m 00.0s / 0.0000°"
                className={`w-full rounded-xl bg-black/50 border px-3 py-1.5 text-xs sm:text-[13px] text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                  raDeg !== null
                    ? "border-white/15 focus:border-[#00D2FF]"
                    : "border-amber-400/60 focus:border-amber-400"
                }`}
              />
              {raDeg === null && (
                <div className="text-[10px] font-mono text-amber-300/90 px-0.5">
                  {isEn ? "Invalid RA format" : "Formato RA inválido"}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="modal-dec-input" className="font-mono text-slate-300 font-medium">
                  Dec
                </label>
                {decDeg !== null ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <input
                id="modal-dec-input"
                type="text"
                required
                value={decInput}
                onChange={(e) => {
                  setDecInput(e.target.value);
                  setSelectedTargetId(null);
                  setCoordError(null);
                }}
                placeholder="+00° 00' 00&quot; / +0.0000°"
                className={`w-full rounded-xl bg-black/50 border px-3 py-1.5 text-xs sm:text-[13px] text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                  decDeg !== null
                    ? "border-white/15 focus:border-[#00D2FF]"
                    : "border-amber-400/60 focus:border-amber-400"
                }`}
              />
              {decDeg === null && (
                <div className="text-[10px] font-mono text-amber-300/90 px-0.5">
                  {isEn ? "Invalid Dec format" : "Formato Dec inválido"}
                </div>
              )}
            </div>
          </div>

          {/* Predefined Celestial Bodies Selector */}
          <div ref={dropdownRef} className="pt-2 border-t border-white/10 space-y-2 relative">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span className="text-xs font-medium text-slate-200">
                {isEn
                  ? "Or select a predefined celestial body"
                  : "O selecciona un cuerpo celeste predefinido"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              className="btn-press w-full rounded-xl bg-black/55 hover:bg-black/70 border border-white/15 hover:border-[#00D2FF]/60 px-3.5 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full min-w-0 pr-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#00D2FF] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                    {selectedTargetId
                      ? activeKnownTarget.label
                      : isEn
                        ? "Choose a celestial body..."
                        : "Elegir cuerpo celeste..."}
                  </span>
                </div>
                {selectedTargetId && (
                  <span className="font-mono text-[11px] text-[#00D2FF] shrink-0 ml-2">
                    ({activeKnownTarget.shortCoords})
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-[#00D2FF]" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="max-h-[172px] overflow-y-auto rounded-2xl bg-[#0B101B]/95 backdrop-blur-2xl border border-[#00D2FF]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] divide-y divide-white/10">
                {GATE_KNOWN_TARGETS.map((item) => {
                  const active = selectedTargetId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePickKnownTarget(item)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-[#00D2FF]/15 text-white"
                          : "hover:bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-[13px] font-semibold text-white">
                            {item.label}
                          </span>
                          <span className="font-mono text-[11px] text-[#00D2FF]">
                            ({item.shortCoords})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {isEn ? item.subtitleEn : item.subtitleEs}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {active ? "✓" : "→"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {coordError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{coordError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full py-2.5 px-4 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,210,255,0.22)] cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#00D2FF]" />
            ) : (
              <Search className="w-4 h-4 text-[#00D2FF]" />
            )}
            <span>{isEn ? "Search" : "Buscar"}</span>
            {coordsValid && (
              <span className="font-mono text-[11px] text-[#00D2FF] ml-1">
                ({raDeg.toFixed(2)}°, {decDeg >= 0 ? "+" : ""}
                {decDeg.toFixed(2)}°)
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
