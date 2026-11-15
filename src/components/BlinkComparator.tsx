import React, { useEffect, useRef, useState } from "react";
import type { SpherexObservation } from "../lib/types";
import { useLanguage } from "../i18n/LanguageContext";

interface BlinkComparatorProps {
  observations: SpherexObservation[];
  selectedIdx: number;
  onSelectIndex: (idx: number) => void;
  cachedImages: Map<string, string>; // obs_id -> dataUrl or base64 PNG
  simpleMode?: boolean;
}

export const BlinkComparator: React.FC<BlinkComparatorProps> = ({
  observations,
  selectedIdx,
  onSelectIndex,
  cachedImages,
  simpleMode = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(400);
  const [diffMode, setDiffMode] = useState(false);
  const [epochAIdx, setEpochAIdx] = useState(0);
  const [epochBIdx, setEpochBIdx] = useState(observations.length > 1 ? 1 : 0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying || observations.length < 2) return;

    const timer = setInterval(() => {
      onSelectIndex(selectedIdx === epochAIdx ? epochBIdx : epochAIdx);
    }, speedMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMs, selectedIdx, epochAIdx, epochBIdx, observations.length, onSelectIndex]);

  // Difference Image Renderer
  useEffect(() => {
    if (!diffMode || !canvasRef.current || observations.length < 2) return;

    const obsA = observations[epochAIdx];
    const obsB = observations[epochBIdx];
    if (!obsA || !obsB) return;

    const b64A =
      cachedImages.get(`${obsA.obs_id}|${obsA.bandpass}`) ?? cachedImages.get(obsA.obs_id);
    const b64B =
      cachedImages.get(`${obsB.obs_id}|${obsB.bandpass}`) ?? cachedImages.get(obsB.obs_id);
    if (!b64A || !b64B) return;

    const imgA = new Image();
    const imgB = new Image();
    let loadedCount = 0;

    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = Math.min(imgA.width, imgB.width);
      const h = Math.min(imgA.height, imgB.height);
      canvas.width = w;
      canvas.height = h;

      const cA = document.createElement("canvas");
      cA.width = w;
      cA.height = h;
      const ctxA = cA.getContext("2d");
      ctxA?.drawImage(imgA, 0, 0, w, h);
      const dataA = ctxA?.getImageData(0, 0, w, h).data;

      const cB = document.createElement("canvas");
      cB.width = w;
      cB.height = h;
      const ctxB = cB.getContext("2d");
      ctxB?.drawImage(imgB, 0, 0, w, h);
      const dataB = ctxB?.getImageData(0, 0, w, h).data;

      if (!dataA || !dataB) return;

      const out = ctx.createImageData(w, h);
      const dOut = out.data;

      for (let i = 0; i < dataA.length; i += 4) {
        const lumA = 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
        const lumB = 0.299 * dataB[i] + 0.587 * dataB[i + 1] + 0.114 * dataB[i + 2];

        // Difference: 128 is neutral grey, positive is brighter, negative is darker
        const diff = 128 + (lumB - lumA) * 1.5;
        const clamped = Math.max(0, Math.min(255, diff));

        dOut[i] = clamped;
        dOut[i + 1] = clamped;
        dOut[i + 2] = clamped;
        dOut[i + 3] = 255;
      }

      ctx.putImageData(out, 0, 0);
    };

    imgA.crossOrigin = "anonymous";
    imgB.crossOrigin = "anonymous";
    imgA.onload = onImageLoad;
    imgB.onload = onImageLoad;
    imgA.src = b64A;
    imgB.src = b64B;
  }, [diffMode, epochAIdx, epochBIdx, cachedImages, observations]);

  if (observations.length < 2) {
    return (
      <div className="blink-placeholder">
        <p className="text-slate-400 text-sm">
          {isEn
            ? "At least 2 multi-epoch exposures are required to activate the blink comparator."
            : "Se requieren al menos 2 exposiciones en distintas fechas para activar el comparador de parpadeo."}
        </p>
      </div>
    );
  }

  const currentObs = observations[selectedIdx];
  const obsA = observations[epochAIdx];
  const obsB = observations[epochBIdx];
  const hasLoadedPair =
    Boolean(
      obsA &&
        (cachedImages.has(`${obsA.obs_id}|${obsA.bandpass}`) || cachedImages.has(obsA.obs_id))
    ) &&
    Boolean(
      obsB &&
        (cachedImages.has(`${obsB.obs_id}|${obsB.bandpass}`) || cachedImages.has(obsB.obs_id))
    );

  return (
    <div className="blink-comparator-card">
      <div className="blink-header">
        <div>
          <h4>
            {isEn
              ? simpleMode
                ? "Blink Comparator (Motion Hunter)"
                : "Multitemporal Blink Comparator (Tombaugh Technique)"
              : simpleMode
                ? "Comparador de Parpadeo (Búsqueda de Movimiento)"
                : "Comparador de Parpadeo Multitemporal (Técnica Tombaugh)"}
          </h4>
          <p className="blink-desc">
            {isEn
              ? simpleMode
                ? "Rapidly alternate between two exposures from different dates: fixed stars cancel out while planets and high-motion objects jump."
                : "Alternating epoch inspection for astrometric detection of high proper motion targets (nearby stars, brown dwarfs, KBOs/Planet 9)."
              : simpleMode
                ? "Alterná rápidamente entre dos fotos de fechas distintas: las estrellas se quedan quietas, pero los planetas y asteroides saltan de lugar."
                : "Alternancia de época temporal para detección astrométrica de movimiento propio alto (estrellas cercanas, enanas marrones y KBOs/Planeta 9)."}
          </p>
        </div>

        <div className="blink-controls">
          <button
            type="button"
            className={`btn-blink-toggle ${isPlaying ? "active" : ""}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying
              ? isEn
                ? "⏸ Stop Blinking"
                : "⏸ Detener Parpadeo"
              : isEn
                ? "▶ Start Blinking"
                : "▶ Iniciar Parpadeo"}
          </button>
        </div>
      </div>

      <div className="blink-toolbar">
        <div className="blink-speed-group">
          <span className="speed-label">{isEn ? "Speed:" : "Velocidad:"}</span>
          {[200, 400, 800, 1500].map((ms) => (
            <button
              key={ms}
              type="button"
              className={`chip text-xs px-2.5 py-1 rounded-full border border-slate-700 ${
                speedMs === ms ? "bg-cyan-500 text-black font-bold" : "bg-slate-800 text-slate-300"
              }`}
              onClick={() => setSpeedMs(ms)}
            >
              {ms}ms
            </button>
          ))}
        </div>

        <div className="epoch-pickers">
          <label>
            <span>{isEn ? "Epoch A:" : "Época A:"}</span>
            <select
              value={epochAIdx}
              onChange={(e) => setEpochAIdx(Number(e.target.value))}
            >
              {observations.map((obs, i) => (
                <option key={`a-${obs.obs_id}-${i}`} value={i}>
                  #{i + 1} {obs.bandpass} ({obs.obs_id.slice(-8)})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{isEn ? "Epoch B:" : "Época B:"}</span>
            <select
              value={epochBIdx}
              onChange={(e) => setEpochBIdx(Number(e.target.value))}
            >
              {observations.map((obs, i) => (
                <option key={`b-${obs.obs_id}-${i}`} value={i}>
                  #{i + 1} {obs.bandpass} ({obs.obs_id.slice(-8)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="diff-mode-toggle">
          <input
            type="checkbox"
            checked={diffMode}
            onChange={(e) => {
              setDiffMode(e.target.checked);
              if (e.target.checked) setIsPlaying(false);
            }}
          />
          <span>
            {isEn ? "Difference Image Mode (B − A)" : "Modo Imagen Diferencial (B − A)"}
          </span>
        </label>
      </div>

      {diffMode ? (
        <div className="diff-view-wrapper">
          {hasLoadedPair ? (
            <div className="diff-canvas-box">
              <canvas ref={canvasRef} className="diff-canvas" />
              <div className="diff-legend">
                <span>{isEn ? "Residual Difference (B − A):" : "Diferencia Residual (B − A):"}</span>{" "}
                {isEn
                  ? "Neutral gray = canceled static stars. White/black dipole = flux variability or orbital motion."
                  : "Fondo neutro = estrellas fijas canceladas. Puntos blancos/negros = variación de flujo o desplazamiento orbital."}
              </div>
            </div>
          ) : (
            <div className="diff-loading">
              {isEn
                ? "Loading FITS cutouts for both epochs to calculate residual subtraction..."
                : "Cargando recortes FITS de ambas épocas para calcular la resta diferencial..."}
            </div>
          )}
        </div>
      ) : (
        <div className="blink-status-row">
          <div className="active-epoch-tag">
            {isEn ? "Active Epoch:" : "Época activa:"} <strong>{currentObs?.bandpass}</strong> ({currentObs?.obs_id})
            {currentObs?.t_min !== null && (
              <span className="mjd-tag">MJD: {currentObs?.t_min?.toFixed(2)}</span>
            )}
          </div>
          <div className="blink-step-buttons">
            <button
              type="button"
              className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-400 cursor-pointer"
              onClick={() => onSelectIndex(epochAIdx)}
            >
              {isEn ? "View Epoch A" : "Ver Época A"}
            </button>
            <button
              type="button"
              className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-400 cursor-pointer"
              onClick={() => onSelectIndex(epochBIdx)}
            >
              {isEn ? "View Epoch B" : "Ver Época B"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
