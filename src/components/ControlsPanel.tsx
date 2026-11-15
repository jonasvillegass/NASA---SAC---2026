import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";
import type {
  CollectionQueryMode,
  ColormapName,
  ResolvedCelestialObject,
  StretchMode,
  TargetPreset,
} from "../lib/types";
import {
  DEFAULT_CUTOUT_FOV_DEG,
  MAX_CUTOUT_FOV_DEG,
  MIN_CUTOUT_FOV_DEG,
} from "../lib/coordinates";
import { useLanguage } from "../i18n/LanguageContext";

interface ControlsPanelProps {
  raInput: string;
  setRaInput: (val: string) => void;
  decInput: string;
  setDecInput: (val: string) => void;
  collectionMode: CollectionQueryMode;
  setCollectionMode: (val: CollectionQueryMode) => void;
  band: string;
  setBand: (val: string) => void;
  radius: string;
  setRadius: (val: string) => void;
  size: string;
  setSize: (val: string) => void;
  stretch: StretchMode;
  setStretch: (val: StretchMode) => void;
  colormap: ColormapName;
  setColormap: (val: ColormapName) => void;
  subtractZodi: boolean;
  setSubtractZodi: (val: boolean) => void;
  showCrosshair: boolean;
  setShowCrosshair: (val: boolean) => void;
  loading: boolean;
  resolvingName: boolean;
  resolvedObject: ResolvedCelestialObject | null;
  activePresetId: string | null;
  totalFound?: number;
  onClose?: () => void;
  onChangeFov?: (newSize: number) => void;
  onSubmitCoords?: (raStr: string, decStr: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectPreset: (preset: TargetPreset) => void;
  onSearchCelestialName: (name: string) => void;
  onOpenExposuresDrawer?: () => void;
  hasVersions?: boolean;
  onOpenGalleryModal?: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  band,
  setBand,
  size,
  setSize,
  stretch,
  setStretch,
  colormap,
  setColormap,
  subtractZodi,
  setSubtractZodi,
  showCrosshair,
  setShowCrosshair,
  loading,
  resolvedObject,
  totalFound = 0,
  onClose,
  onChangeFov,
  onOpenExposuresDrawer,
  hasVersions = false,
  onOpenGalleryModal,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const [showAdvanced, setShowAdvanced] = useState(false);

  const numericSize = Math.min(
    MAX_CUTOUT_FOV_DEG,
    Math.max(MIN_CUTOUT_FOV_DEG, Number(size) || DEFAULT_CUTOUT_FOV_DEG)
  );

  return (
    <aside className="glass-panel rounded-[22px] w-full lg:w-[310px] h-full shrink-0 p-5 flex flex-col justify-between gap-4 overflow-y-auto max-h-full">
      <div className="space-y-4">
        {/* Close Panel */}
        {onClose && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t.chrono.togglePanelClose}
              title={t.chrono.togglePanelClose}
              className="btn-press w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {resolvedObject && (
          <div className="rounded-xl bg-[#00D2FF]/[0.07] border border-[#00D2FF]/30 px-3 py-2 text-[11px] flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="font-mono font-semibold text-white">
                {resolvedObject.canonicalName}
              </span>
              <span className="text-slate-400 ml-1.5">({resolvedObject.otype})</span>
            </div>
            <span className="font-mono text-[10px] text-[#00D2FF] shrink-0">
              {resolvedObject.resolverSource}
            </span>
          </div>
        )}

        {/* Zoom / Field of View Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">{t.chrono.zoomFov}</span>
            <span className="font-mono text-[#00D2FF]">{numericSize.toFixed(2)}°</span>
          </div>
          <input
            id="zoom-slider"
            type="range"
            min={MIN_CUTOUT_FOV_DEG}
            max={MAX_CUTOUT_FOV_DEG}
            step="0.01"
            value={numericSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSize(val.toFixed(2));
              onChangeFov?.(val);
            }}
            className="apple-slider w-full"
          />
        </div>

        {/* D1–D6 Spectral Bands & Versions Gallery */}
        {hasVersions && onOpenGalleryModal && (
          <button
            type="button"
            onClick={onOpenGalleryModal}
            title={t.viewer.galleryTitle}
            className="btn-press w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-[#00D2FF]/15 border border-white/10 hover:border-[#00D2FF]/45 text-xs font-medium text-slate-200 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span>{isEn ? "Bands D1–D6" : "Bandas D1–D6"}</span>
            </span>
            <span className="text-[#00D2FF] font-mono">→</span>
          </button>
        )}

        {/* Collapsible Scientific & Band Controls */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="btn-press w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span>{t.chrono.advancedControls}</span>
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="stretch-select"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    {t.controls.stretchLabel}
                  </label>
                  <select
                    id="stretch-select"
                    value={stretch}
                    onChange={(e) => setStretch(e.target.value as StretchMode)}
                    className="w-full px-2.5 py-1.5 text-xs bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00D2FF]/70"
                  >
                    <option value="asinh">{t.controls.stretchOptions.asinh}</option>
                    <option value="log">{t.controls.stretchOptions.log}</option>
                    <option value="sqrt">{t.controls.stretchOptions.sqrt}</option>
                    <option value="linear">{t.controls.stretchOptions.linear}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="colormap-select"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    {t.controls.colormapLabel}
                  </label>
                  <select
                    id="colormap-select"
                    value={colormap}
                    onChange={(e) => setColormap(e.target.value as ColormapName)}
                    className="w-full px-2.5 py-1.5 text-xs bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00D2FF]/70"
                  >
                    <option value="inferno">{t.controls.colormapOptions.inferno}</option>
                    <option value="viridis">{t.controls.colormapOptions.viridis}</option>
                    <option value="plasma">{t.controls.colormapOptions.plasma}</option>
                    <option value="magma">{t.controls.colormapOptions.magma}</option>
                    <option value="gray">{t.controls.colormapOptions.gray}</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="band-select" className="block text-[11px] text-slate-400 mb-1">
                  {t.controls.bandLabel}
                </label>
                <select
                  id="band-select"
                  value={band}
                  onChange={(e) => setBand(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00D2FF]/70"
                >
                  <option value="all">{t.controls.allBands}</option>
                  <option value="D1">D1 (0.75 – 1.12 µm)</option>
                  <option value="D2">D2 (1.11 – 1.64 µm)</option>
                  <option value="D3">D3 (1.63 – 2.42 µm)</option>
                  <option value="D4">D4 (2.40 – 3.85 µm)</option>
                  <option value="D5">D5 (3.81 – 4.43 µm)</option>
                  <option value="D6">D6 (4.42 – 5.00 µm)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subtractZodi}
                    onChange={(e) => setSubtractZodi(e.target.checked)}
                    className="rounded bg-black/60 border-white/20 text-[#00D2FF] focus:ring-[#00D2FF]/30"
                  />
                  <span>{t.controls.subtractZodi}</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCrosshair}
                    onChange={(e) => setShowCrosshair(e.target.checked)}
                    className="rounded bg-black/60 border-white/20 text-[#00D2FF] focus:ring-[#00D2FF]/30"
                  />
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#00D2FF]" />
                    <span>{t.controls.showCrosshair}</span>
                  </span>
                </label>
              </div>

              {onOpenExposuresDrawer && (
                <button
                  type="button"
                  onClick={onOpenExposuresDrawer}
                  className="btn-press w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#00D2FF]" />
                    <span>{t.chrono.exposuresDrawerButton(totalFound)}</span>
                  </span>
                  <span className="text-[#00D2FF] font-mono">→</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtle API Status Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          {loading
            ? t.chrono.apiStatusQuerying
            : totalFound > 0
            ? t.chrono.apiStatusConnected(totalFound)
            : t.chrono.apiStatusReady}
        </span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            loading
              ? "bg-amber-400 animate-pulse"
              : totalFound > 0
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : "bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]"
          }`}
        />
      </div>
    </aside>
  );
};
