import React, { useMemo, useState } from "react";
import type { SpherexObservation } from "../lib/types";
import { DETECTORS_METADATA, parseDetectorId } from "../lib/detectors";
import { useLanguage } from "../i18n/LanguageContext";

export interface SpectralPoint {
  obs_id: string;
  bandpass: string;
  wave_um: number;
  flux: number | null;
  unit: string;
  snr: number | null;
  detectorId: string;
  mjd?: number | null;
}

interface SpectralProfileProps {
  observations: SpherexObservation[];
  cachedFluxes: Map<string, { flux: number; unit: string; snr: number | null; mjd: number | null }>;
  selectedObsId: string;
  onSelectObsId: (obsId: string) => void;
  onScanAllBands: () => Promise<void>;
  isScanning: boolean;
  scanProgress: { current: number; total: number } | null;
  simpleMode?: boolean;
}

const NOTABLE_LINES = [
  { name: "H₂O (2.0 µm)", wave: 2.02, color: "#818cf8" },
  { name: "H₂O (3.0 µm)", wave: 3.05, color: "#a78bfa" },
  { name: "PAH (3.3 µm)", wave: 3.3, color: "#c084fc" },
  { name: "CO₂ (4.27 µm)", wave: 4.27, color: "#f472b6" },
  { name: "CO (4.67 µm)", wave: 4.67, color: "#fb923c" },
];

export const SpectralProfile: React.FC<SpectralProfileProps> = ({
  observations,
  cachedFluxes,
  selectedObsId,
  onSelectObsId,
  onScanAllBands,
  isScanning,
  scanProgress,
  simpleMode = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [hoveredPoint, setHoveredPoint] = useState<SpectralPoint | null>(null);

  // Build sorted data points for SED
  const points: SpectralPoint[] = useMemo(() => {
    const list: SpectralPoint[] = [];
    for (const obs of observations) {
      const wave =
        obs.em_min_um !== null && obs.em_max_um !== null
          ? (obs.em_min_um + obs.em_max_um) / 2
          : null;
      if (wave === null) continue;

      const compositeKey = `${obs.obs_id}|${obs.bandpass}`;
      const cached = cachedFluxes.get(compositeKey) ?? cachedFluxes.get(obs.obs_id);
      const detId = parseDetectorId(obs.bandpass) || "D1";

      list.push({
        obs_id: obs.obs_id,
        bandpass: obs.bandpass,
        wave_um: Number(wave.toFixed(3)),
        flux: cached ? cached.flux : null,
        unit: cached ? cached.unit : "MJy/sr",
        snr: cached ? cached.snr : null,
        detectorId: detId,
        mjd: cached?.mjd ?? obs.t_min ?? null,
      });
    }

    list.sort((a, b) => a.wave_um - b.wave_um);
    return list;
  }, [observations, cachedFluxes]);

  // Determine plot bounds
  const validFluxPoints = points.filter((p) => p.flux !== null);
  const minWave = 0.7;
  const maxWave = 5.1;
  const fluxes = validFluxPoints.map((p) => p.flux as number);
  const minFlux = fluxes.length > 0 ? Math.min(0, Math.min(...fluxes) * 0.9) : 0;
  const maxFlux = fluxes.length > 0 ? Math.max(1, Math.max(...fluxes) * 1.15) : 10;
  const fluxSpan = maxFlux - minFlux || 1;

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 240;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const toX = (wave: number) => padLeft + ((wave - minWave) / (maxWave - minWave)) * plotW;
  const toY = (flux: number) => padTop + plotH - ((flux - minFlux) / fluxSpan) * plotH;

  // Build polyline path for loaded fluxes
  const pathD = useMemo(() => {
    if (validFluxPoints.length < 2) return "";
    return validFluxPoints
      .map((p, i) => {
        const x = toX(p.wave_um);
        const y = toY(p.flux as number);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [validFluxPoints, toX, toY]);

  // Peak emission wavelength and Wien Temperature
  const peakPoint = useMemo(() => {
    if (validFluxPoints.length === 0) return null;
    return validFluxPoints.reduce((best, cur) =>
      cur.flux !== null && (best.flux === null || cur.flux > best.flux) ? cur : best
    );
  }, [validFluxPoints]);

  const wienTempKelvin = peakPoint ? Math.round(2898 / peakPoint.wave_um) : null;

  return (
    <div className="spectral-profile-card">
      <div className="spectral-header">
        <div>
          <h4>
            {isEn
              ? simpleMode
                ? "Instant Thermal Spectrum (SED)"
                : "Instant Spectral Energy Distribution (SED)"
              : simpleMode
                ? "Espectro Térmico Instantáneo (SED)"
                : "Distribución Espectral de Energía (SED) Instantánea"}
          </h4>
          <p className="spectral-sub">
            {isEn
              ? simpleMode
                ? "The target's light barcode. Shows infrared brightness across wavelengths:"
                : "Central flux density F_ν (MJy/sr) vs. λ (µm) sampled across SPHEREx detectors."
              : simpleMode
                ? "El 'código de barras' de la luz del objeto. Muestra su brillo según cada color infrarrojo:"
                : "Flujo central F_ν (MJy/sr) vs. λ (µm) muestreado por los detectores SPHEREx."}
          </p>
        </div>

        <div className="spectral-actions">
          {wienTempKelvin && (
            <div
              className="wien-pill"
              title={
                isEn
                  ? "Blackbody effective temperature calculated via Wien's Displacement Law"
                  : "Temperatura de cuerpo negro calculada por Ley de Wien"
              }
            >
              <span>T_eff (Wien):</span>
              <strong>{wienTempKelvin} K</strong>
              <small>({(wienTempKelvin - 273.15).toFixed(0)} °C)</small>
            </div>
          )}

          <button
            type="button"
            className="btn-scan"
            onClick={onScanAllBands}
            disabled={isScanning || observations.length === 0}
          >
            {isScanning
              ? isEn
                ? `Scanning (${scanProgress?.current ?? 0}/${scanProgress?.total ?? observations.length})...`
                : `Escaneando (${scanProgress?.current ?? 0}/${scanProgress?.total ?? observations.length})...`
              : isEn
                ? "Scan Full Spectrum"
                : "Escanear Todo el Espectro"}
          </button>
        </div>
      </div>

      <div className="spectral-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="spectral-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background grid */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="#020617"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Detector zones at top of plot */}
          {(["D1", "D2", "D3", "D4", "D5", "D6"] as const).map((detId) => {
            const meta = DETECTORS_METADATA[detId];
            const x1 = Math.max(padLeft, toX(meta.waveMin));
            const x2 = Math.min(padLeft + plotW, toX(meta.waveMax));
            return (
              <g key={detId}>
                <rect
                  x={x1}
                  y={padTop}
                  width={x2 - x1}
                  height={plotH}
                  fill={meta.colorHex}
                  opacity="0.04"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={padTop + 14}
                  fill={meta.colorHex}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.8"
                >
                  {detId}
                </text>
              </g>
            );
          })}

          {/* Notable absorption lines */}
          {NOTABLE_LINES.map((line) => {
            const lx = toX(line.wave);
            if (lx < padLeft || lx > padLeft + plotW) return null;
            return (
              <g key={line.name}>
                <line
                  x1={lx}
                  y1={padTop}
                  x2={lx}
                  y2={padTop + plotH}
                  stroke={line.color}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.5"
                />
                <text
                  x={lx + 3}
                  y={padTop + plotH - 6}
                  fill={line.color}
                  fontSize="8"
                  opacity="0.75"
                >
                  {line.name}
                </text>
              </g>
            );
          })}

          {/* Horizontal flux grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
            const gy = padTop + plotH * (1 - frac);
            const val = minFlux + fluxSpan * frac;
            return (
              <g key={frac}>
                <line
                  x1={padLeft}
                  y1={gy}
                  x2={padLeft + plotW}
                  y2={gy}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padLeft - 6}
                  y={gy + 3}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="end"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Wavelength tick marks (X axis) */}
          {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((w) => {
            const gx = toX(w);
            return (
              <g key={w}>
                <line
                  x1={gx}
                  y1={padTop + plotH}
                  x2={gx}
                  y2={padTop + plotH + 5}
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x={gx}
                  y={padTop + plotH + 16}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {w.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={padLeft + plotW / 2}
            y={svgHeight - 8}
            fill="#94a3b8"
            fontSize="11"
            textAnchor="middle"
          >
            {isEn ? "Wavelength λ (µm)" : "Longitud de onda λ (µm)"}
          </text>
          <text
            x={15}
            y={padTop + plotH / 2}
            fill="#94a3b8"
            fontSize="11"
            textAnchor="middle"
            transform={`rotate(-90 15 ${padTop + plotH / 2})`}
          >
            {isEn ? "Central Flux (MJy/sr)" : "Flujo Central (MJy/sr)"}
          </text>

          {/* Polyline connect */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p) => {
            const x = toX(p.wave_um);
            const isLoaded = p.flux !== null;
            const y = isLoaded ? toY(p.flux as number) : padTop + plotH - 2;
            const isSelected = p.obs_id === selectedObsId;
            const det = DETECTORS_METADATA[p.detectorId as keyof typeof DETECTORS_METADATA];
            const ptColor = det ? det.colorHex : "#38bdf8";

            return (
              <g
                key={`${p.obs_id}|${p.bandpass}`}
                className="spectral-dot-group"
                style={{ cursor: "pointer" }}
                onClick={() => onSelectObsId(p.obs_id)}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Outer halo if selected */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                    opacity="0.9"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 5 : isLoaded ? 4 : 2.5}
                  fill={isLoaded ? ptColor : "#475569"}
                  stroke={isSelected ? "#ffffff" : isLoaded ? "#020617" : "#334155"}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {hoveredPoint && (
          <div
            className="spectral-tooltip"
            style={{
              left: `${Math.min(75, Math.max(10, ((hoveredPoint.wave_um - minWave) / (maxWave - minWave)) * 100))}%`,
            }}
          >
            <div className="tooltip-band">
              <strong>{hoveredPoint.bandpass}</strong> ({hoveredPoint.detectorId}) · {hoveredPoint.wave_um} µm
            </div>
            {hoveredPoint.flux !== null ? (
              <div className="tooltip-flux">
                {isEn ? "Flux:" : "Flujo:"} <strong>{hoveredPoint.flux} {hoveredPoint.unit}</strong>
                {hoveredPoint.snr !== null && <span> (SNR: {hoveredPoint.snr}σ)</span>}
              </div>
            ) : (
              <div className="tooltip-unloaded">
                {isEn ? "Click to load FITS image" : "Clic para cargar imagen FITS"}
              </div>
            )}
            <div className="tooltip-teff">
              {isEn ? "Equivalent T_eff:" : "T_eff equivalente:"} ~{Math.round(2898 / hoveredPoint.wave_um)} K
            </div>
          </div>
        )}
      </div>

      <div className="spectral-footer">
        <span className="spectral-count">
          {isEn
            ? `${validFluxPoints.length} of ${points.length} bands measured at this coordinate.`
            : `${validFluxPoints.length} de ${points.length} bandas medidas en esta coordenada.`}
        </span>
        <span className="spectral-hint">
          {isEn
            ? simpleMode
              ? "💡 Dips reveal absorption by water ice or gases; peaks indicate hot thermal emission."
              : "💡 Flux dips relative to continuum identify molecular absorption bands (H₂O, CO₂, CO, PAH)."
            : simpleMode
              ? "💡 Los valles indican gases o hielo que absorbieron luz; los picos indican objetos calientes."
              : "💡 Las caídas de flujo respecto al continuo identifican bandas de absorción (H₂O, CO₂, CO, PAH)."}
        </span>
      </div>
    </div>
  );
};
