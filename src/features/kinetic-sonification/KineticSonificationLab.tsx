import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Radio,
  Compass,
  Zap,
  Activity,
  Headphones,
  Sparkles,
  Copy,
  Check,
  Globe,
  Eye,
  Waves,
  Sliders,
} from "lucide-react";
import type { RenderedCutout } from "../../lib/types";
import type {
  CursorKinematicsTelemetry,
  KineticSoundscapeMode,
  KineticTrailParticle,
} from "./types";
import { computeCursorKinematics, kineticDopplerEngine } from "./engine";
import { PROJECT_IDENTITY } from "../../config/projectIdentity";

export interface KineticSonificationLabProps {
  targetName?: string;
  ra?: number;
  dec?: number;
  cutout?: RenderedCutout | null;
  defaultLang?: "en" | "es";
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const INITIAL_TELEMETRY: CursorKinematicsTelemetry = {
  xNorm: 0.5,
  yNorm: 0.5,
  raDeg: 133.795,
  decDeg: -7.245,
  velocityPxPerSec: 0,
  angularSpeedArcsecPerSec: 0,
  accelerationPxPerSec2: 0,
  abruptnessIndex: 0,
  directionAngleDeg: 0,
  dopplerFactor: 1.0,
  instantFrequencyHz: 85.0,
  harmonicFrequencyHz: 127.3,
  subBassLfeHz: 45.0,
  filterCutoffHz: 240,
  hrtfAzimuthDeg: 0,
  hrtfElevationDeg: 0,
  sampledFitsFluxMjySr: null,
  targetProximityFactor: 1.0,
  regime: "DEEP_SUB_BASS_SLOW",
};

export const KineticSonificationLab: React.FC<KineticSonificationLabProps> = ({
  targetName = "WISE J085510.83-071442.5 (Sub-Brown Dwarf / Planet X Proxy)",
  ra = 133.795,
  dec = -7.245,
  cutout = null,
  defaultLang = "en",
}) => {
  const [lang, setLang] = useState<"en" | "es">(defaultLang);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [globalScreenCursorMode, setGlobalScreenCursorMode] = useState<boolean>(false);
  const [soundscapeMode, setSoundscapeMode] = useState<KineticSoundscapeMode>(
    "DOPPLER_COSMIC_ORGAN"
  );
  const [sensitivity, setSensitivity] = useState<number>(1.15);
  const [minFreqHz] = useState<number>(68);
  const [maxFreqHz, setMaxFreqHz] = useState<number>(2750);
  const [volume, setVolume] = useState<number>(0.68);
  const [telemetry, setTelemetry] =
    useState<CursorKinematicsTelemetry>(INITIAL_TELEMETRY);
  const [copiedTomySnippet, setCopiedTomySnippet] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef<KineticTrailParticle[]>([]);
  const shockwavesRef = useRef<ShockwaveRing[]>([]);
  const lastCursorRef = useRef<{
    x: number;
    y: number;
    timeMs: number;
    velocityPxPerSec: number;
  } | null>(null);
  const phaseRef = useRef<number>(0);
  const telemetryRef = useRef<CursorKinematicsTelemetry>(INITIAL_TELEMETRY);

  const updateVolume = (val: number) => {
    setVolume(val);
    kineticDopplerEngine.setVolume(val);
  };

  const toggleAudio = () => {
    if (audioEnabled) {
      kineticDopplerEngine.stop();
      setAudioEnabled(false);
    } else {
      kineticDopplerEngine.start();
      kineticDopplerEngine.setVolume(volume);
      setAudioEnabled(true);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      kineticDopplerEngine.stop();
    };
  }, []);

  const processCursorPoint = useCallback(
    (clientX: number, clientY: number, boundsRect: DOMRect) => {
      const nowMs = performance.now();
      const xPx = clientX - boundsRect.left;
      const yPx = clientY - boundsRect.top;
      const xNorm = Math.max(0, Math.min(1, xPx / Math.max(1, boundsRect.width)));
      const yNorm = Math.max(0, Math.min(1, yPx / Math.max(1, boundsRect.height)));

      const prev = lastCursorRef.current;
      let vx = 0;
      let vy = 0;
      let dtSec = 0.016;
      let prevVel = 0;

      if (prev) {
        dtSec = Math.max(0.004, (nowMs - prev.timeMs) / 1000);
        vx = (xPx - prev.x) / dtSec;
        vy = (yPx - prev.y) / dtSec;
        prevVel = prev.velocityPxPerSec;
      }

      const nextTelemetry = computeCursorKinematics({
        xNorm,
        yNorm,
        vxPxPerSec: vx,
        vyPxPerSec: vy,
        prevVelocityPxPerSec: prevVel,
        dtSec,
        mode: soundscapeMode,
        baseMinFreqHz: minFreqHz,
        baseMaxFreqHz: maxFreqHz,
        sensitivity,
        cutout,
        targetCenterRa: ra,
        targetCenterDec: dec,
      });

      lastCursorRef.current = {
        x: xPx,
        y: yPx,
        timeMs: nowMs,
        velocityPxPerSec: nextTelemetry.velocityPxPerSec,
      };

      telemetryRef.current = nextTelemetry;
      setTelemetry(nextTelemetry);

      if (audioEnabled) {
        kineticDopplerEngine.updateFromKinematics(nextTelemetry, soundscapeMode);
      }

      // Push visual particle onto canvas ribbon
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = xNorm * canvas.width;
        const cy = yNorm * canvas.height;
        trailRef.current.push({
          x: cx,
          y: cy,
          vx: vx * 0.02,
          vy: vy * 0.02,
          freqHz: nextTelemetry.instantFrequencyHz,
          abruptness: nextTelemetry.abruptnessIndex,
          regime: nextTelemetry.regime,
          alpha: 1.0,
          radius: 4 + nextTelemetry.abruptnessIndex * 14,
        });
        if (trailRef.current.length > 75) {
          trailRef.current.shift();
        }

        // Trigger Mach shockwave ring on sudden abrupt movement ("movimiento brusco")
        if (
          nextTelemetry.abruptnessIndex > 0.68 &&
          shockwavesRef.current.length < 8
        ) {
          shockwavesRef.current.push({
            x: cx,
            y: cy,
            radius: 8,
            maxRadius: 65 + nextTelemetry.abruptnessIndex * 90,
            alpha: 0.85,
            color:
              nextTelemetry.abruptnessIndex > 0.82
                ? "rgba(56, 189, 248, "
                : "rgba(168, 85, 247, ",
          });
        }
      }
    },
    [
      soundscapeMode,
      minFreqHz,
      maxFreqHz,
      sensitivity,
      cutout,
      ra,
      dec,
      audioEnabled,
    ]
  );

  // Global Screen Cursor Listener (when Global Mode is enabled, works across the entire app!)
  useEffect(() => {
    if (!globalScreenCursorMode) return;
    const handleGlobalMove = (ev: MouseEvent) => {
      const fullRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      processCursorPoint(ev.clientX, ev.clientY, fullRect);
    };
    window.addEventListener("mousemove", handleGlobalMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
    };
  }, [globalScreenCursorMode, processCursorPoint]);

  // 60 FPS Interactive Doppler Ribbon & Live Frequency Oscilloscope Renderer
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cur = telemetryRef.current;

          // Fade background for cosmic trail persistence
          ctx.fillStyle = "rgba(5, 8, 20, 0.24)";
          ctx.fillRect(0, 0, w, h);

          // Draw subtle celestial coordinate grid + target core
          ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
          ctx.lineWidth = 1;
          for (let gx = 1; gx < 6; gx++) {
            ctx.beginPath();
            ctx.moveTo((w * gx) / 6, 0);
            ctx.lineTo((w * gx) / 6, h);
            ctx.stroke();
          }
          for (let gy = 1; gy < 4; gy++) {
            ctx.beginPath();
            ctx.moveTo(0, (h * gy) / 4);
            ctx.lineTo(w, (h * gy) / 4);
            ctx.stroke();
          }

          // Target dipole/source beacon at center
          const centerPulse = 18 + Math.sin(phaseRef.current * 0.06) * 5;
          const radGrad = ctx.createRadialGradient(
            w * 0.5,
            h * 0.5,
            2,
            w * 0.5,
            h * 0.5,
            centerPulse * 2.4
          );
          radGrad.addColorStop(0, "rgba(244, 63, 94, 0.45)");
          radGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.14)");
          radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, centerPulse * 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Update & draw Mach shockwaves on abrupt motion
          for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
            const sw = shockwavesRef.current[i];
            sw.radius += (sw.maxRadius - sw.radius) * 0.14;
            sw.alpha *= 0.91;
            ctx.strokeStyle = `${sw.color}${sw.alpha.toFixed(3)})`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            if (sw.alpha < 0.03) {
              shockwavesRef.current.splice(i, 1);
            }
          }

          // Update & draw Doppler Redshift-to-Blueshift particle ribbon
          const pts = trailRef.current;
          for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            p.alpha *= 0.94;
            p.radius *= 0.985;

            // Color shifts from Deep Infrared Red (Slow/Low Hz) -> Emerald/Amber (Mid Hz) -> Relativistic Cyan/Violet Blueshift (Fast/Abrupt High Hz)
            let hue = 12; // Redshift (slow)
            if (p.abruptness >= 0.66) {
              hue = 195 + (p.abruptness - 0.66) * 240; // Electric Cyan to Violet Blueshift
            } else if (p.abruptness >= 0.26) {
              hue = 35 + ((p.abruptness - 0.26) / 0.4) * 150; // Amber -> Emerald -> Cyan
            }

            ctx.fillStyle = `hsla(${hue.toFixed(0)}, 92%, 62%, ${p.alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1.5, p.radius), 0, Math.PI * 2);
            ctx.fill();

            if (i > 0) {
              const prevPt = pts[i - 1];
              ctx.strokeStyle = `hsla(${hue.toFixed(0)}, 95%, 68%, ${(p.alpha * 0.75).toFixed(3)})`;
              ctx.lineWidth = Math.max(1.2, p.radius * 0.65);
              ctx.beginPath();
              ctx.moveTo(prevPt.x, prevPt.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }

            if (p.alpha < 0.03) {
              pts.splice(i, 1);
            }
          }

          // Draw real-time acoustic sine/FM waveform across bottom of canvas
          phaseRef.current += 0.08 + cur.abruptnessIndex * 0.65;
          const waveYBase = h - 32;
          const waveAmp = 5 + cur.abruptnessIndex * 18;
          const waveCycles = 2 + (cur.instantFrequencyHz / 3200) * 26;

          ctx.strokeStyle =
            cur.regime === "BLUESHIFT_ABRUPT_BURST"
              ? "rgba(56, 189, 248, 0.9)"
              : cur.regime === "HARMONIC_LAMINAR_SCAN"
              ? "rgba(52, 211, 153, 0.85)"
              : "rgba(244, 63, 94, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const normX = x / w;
            const y =
              waveYBase +
              Math.sin(normX * Math.PI * 2 * waveCycles - phaseRef.current) *
                waveAmp *
                Math.sin(normX * Math.PI);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleCopyTomySnippet = () => {
    const snippet = `import { KineticSonificationLab } from "./features/kinetic-sonification";\n// Drop anywhere in App.tsx or ViewerPanel.tsx:\n<KineticSonificationLab targetName={selectedTarget.name} ra={selectedTarget.ra} dec={selectedTarget.dec} cutout={activeCutout} />`;
    navigator.clipboard.writeText(snippet);
    setCopiedTomySnippet(true);
    setTimeout(() => setCopiedTomySnippet(false), 2500);
  };

  const regimeBadge =
    telemetry.regime === "BLUESHIFT_ABRUPT_BURST"
      ? {
          label:
            lang === "en"
              ? "ABRUPT BLUESHIFT BURST (HIGH Hz)"
              : "RÁFAGA BRUSCA BLUESHIFT (ALTA FRECUENCIA Hz)",
          color: "#38bdf8",
          bg: "rgba(56, 189, 248, 0.14)",
          border: "rgba(56, 189, 248, 0.45)",
        }
      : telemetry.regime === "HARMONIC_LAMINAR_SCAN"
      ? {
          label:
            lang === "en"
              ? "LAMINAR HARMONIC SCAN (MID Hz)"
              : "ESCANEO LAMINAR ARMÓNICO (MEDIA FRECUENCIA Hz)",
          color: "#34d399",
          bg: "rgba(52, 211, 153, 0.14)",
          border: "rgba(52, 211, 153, 0.45)",
        }
      : {
          label:
            lang === "en"
              ? "DEEP SUB-BASS REDSHIFT (SLOW / LOW Hz)"
              : "SUB-BAJO PROFUNDO REDSHIFT (LENTO / BAJA FRECUENCIA Hz)",
          color: "#fb7185",
          bg: "rgba(244, 63, 94, 0.14)",
          border: "rgba(244, 63, 94, 0.45)",
        };

  return (
    <div
      style={{
        background:
          "linear-gradient(145deg, rgba(8, 12, 26, 0.96) 0%, rgba(15, 23, 42, 0.94) 100%)",
        border: "1px solid rgba(56, 189, 248, 0.28)",
        borderRadius: 16,
        padding: "18px 20px",
        color: "#f8fafc",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65)",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          paddingBottom: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.35)",
              }}
            >
              <Headphones size={12} />
              {PROJECT_IDENTITY.name} · 3D HRTF & DOPPLER SONIFICATION
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 999,
                background: regimeBadge.bg,
                color: regimeBadge.color,
                border: `1px solid ${regimeBadge.border}`,
              }}
            >
              {regimeBadge.label}
            </span>
          </div>

          <h3
            style={{
              margin: "6px 0 2px 0",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#f8fafc",
            }}
          >
            {lang === "en"
              ? "Kinetic Cursor Doppler Synthesizer & Tactile Sky Sonar"
              : "Sintetizador Doppler Cinético del Cursor y Sonar Táctil Celeste"}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {lang === "en"
              ? `Abrupt/Fast cursor motion increases sound frequency (up to ${maxFreqHz} Hz); slow motion deepens into Wien sub-bass (${minFreqHz} Hz). Target: ${targetName}`
              : `Movimientos bruscos/rápidos elevan la frecuencia de sonido (hasta ${maxFreqHz} Hz); movimientos lentos descienden al sub-bajo de Wien (${minFreqHz} Hz). Objetivo: ${targetName}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={toggleAudio}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: audioEnabled
                ? "1px solid rgba(52, 211, 153, 0.6)"
                : "1px solid rgba(56, 189, 248, 0.5)",
              background: audioEnabled
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(6, 95, 70, 0.4))"
                : "linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(30, 58, 138, 0.4))",
              color: audioEnabled ? "#6ee7b7" : "#bae6fd",
              boxShadow: audioEnabled
                ? "0 0 18px rgba(16, 185, 129, 0.35)"
                : "none",
            }}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {audioEnabled
              ? lang === "en"
                ? "LIVE SOUND ON (MOVE CURSOR)"
                : "SONIDO ACTIVO (MOVÉ EL CURSOR)"
              : lang === "en"
              ? "ACTIVATE KINETIC SOUND"
              : "ACTIVAR SONIDO CINÉTICO"}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !globalScreenCursorMode;
              setGlobalScreenCursorMode(next);
              if (next && !audioEnabled) {
                kineticDopplerEngine.start();
                kineticDopplerEngine.setVolume(volume);
                setAudioEnabled(true);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              border: globalScreenCursorMode
                ? "1px solid rgba(168, 85, 247, 0.65)"
                : "1px solid rgba(148, 163, 184, 0.25)",
              background: globalScreenCursorMode
                ? "rgba(168, 85, 247, 0.22)"
                : "rgba(30, 41, 59, 0.6)",
              color: globalScreenCursorMode ? "#e9d5ff" : "#cbd5e1",
            }}
            title={
              lang === "en"
                ? "Sonify cursor velocity anywhere across Map 1 and Map 2"
                : "Sonificar la velocidad del cursor en toda la pantalla (Mapa 1 y Mapa 2)"
            }
          >
            <Compass size={14} />
            {lang === "en"
              ? globalScreenCursorMode
                ? "Global Screen Cursor: ON"
                : "Global Screen Cursor: OFF"
              : globalScreenCursorMode
              ? "Cursor Global Pantalla: ON"
              : "Cursor Global Pantalla: OFF"}
          </button>

          <button
            type="button"
            onClick={handleCopyTomySnippet}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 11px",
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.75)",
              color: "#e2e8f0",
            }}
          >
            {copiedTomySnippet ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            {copiedTomySnippet
              ? lang === "en"
                ? "Copied!"
                : "¡Copiado!"
              : lang === "en"
              ? "1-Line Call (Tomy)"
              : "Llamada 1-Línea (Tomy)"}
          </button>

          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 10px",
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "rgba(15, 23, 42, 0.75)",
              color: "#38bdf8",
            }}
          >
            <Globe size={13} />
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* 4 Global-Nomination Soundscape Modes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            id: "DOPPLER_COSMIC_ORGAN" as KineticSoundscapeMode,
            icon: <Waves size={15} color="#38bdf8" />,
            titleEn: "1. Doppler Cosmic Organ",
            titleEs: "1. Órgano Cósmico Doppler",
            descEn:
              "Slow motion = warm 68 Hz infrared drone. Abrupt motion = high-frequency harmonic blueshift.",
            descEs:
              "Movimiento lento = dron cálido de 68 Hz. Movimiento brusco = agudos armónicos blueshift.",
          },
          {
            id: "BLIND_ASTRONOMER_TACTILE_SONAR" as KineticSoundscapeMode,
            icon: <Eye size={15} color="#34d399" />,
            titleEn: "2. Blind Astronomer Sonar",
            titleEs: "2. Sonar Táctil para Ciegos",
            descEn:
              "Couples cursor speed + real FITS brightness (MJy/sr) + 1/r² dipole proximity radar.",
            descEs:
              "Acopla velocidad del cursor + brillo real FITS (MJy/sr) + radar 1/r² al dipolo.",
          },
          {
            id: "MOLECULAR_RESONANCE_HARP" as KineticSoundscapeMode,
            icon: <Sparkles size={15} color="#c084fc" />,
            titleEn: "3. Molecular Resonance Harp",
            titleEs: "3. Arpa de Resonancia Molecular",
            descEn:
              "Excites H₂O (3.05 µm), CH₄ (3.32 µm), CO₂ (4.27 µm) & CO (4.67 µm) overtones with speed.",
            descEs:
              "Excita armónicos de H₂O, CH₄, CO₂ y CO proporcionales a la velocidad del cursor.",
          },
          {
            id: "RELATIVISTIC_MACH_HORIZON" as KineticSoundscapeMode,
            icon: <Zap size={15} color="#fb7185" />,
            titleEn: "4. Relativistic Mach Horizon",
            titleEs: "4. Horizonte Mach Relativista",
            descEn:
              "Hyper-sensitive to sudden acceleration a = |dv/dt| ('brusquedad') with FM shockwaves.",
            descEs:
              "Hipersensible a la aceleración brusca a = |dv/dt| con ondas de choque FM y 3D HRTF.",
          },
        ].map((item) => {
          const active = soundscapeMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSoundscapeMode(item.id)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.18s ease",
                background: active
                  ? "rgba(30, 58, 138, 0.38)"
                  : "rgba(15, 23, 42, 0.65)",
                border: active
                  ? "1px solid rgba(56, 189, 248, 0.65)"
                  : "1px solid rgba(148, 163, 184, 0.16)",
                color: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {item.icon}
                <span>{lang === "en" ? item.titleEn : item.titleEs}</span>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.35 }}>
                {lang === "en" ? item.descEn : item.descEs}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split Grid: Interactive 60 FPS Doppler Pad + Real-Time Frequency & Physics Telemetry */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1.35fr) minmax(260px, 1fr)",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* Left: Interactive 60 FPS Kinetic Sky Pad */}
        <div
          style={{
            position: "relative",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            background: "#050814",
            minHeight: 270,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <canvas
            ref={canvasRef}
            width={620}
            height={280}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (!audioEnabled) {
                kineticDopplerEngine.start();
                kineticDopplerEngine.setVolume(volume);
                setAudioEnabled(true);
              }
              processCursorPoint(e.clientX, e.clientY, rect);
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              cursor: "crosshair",
            }}
          />

          {/* Overlay HUD on top of Canvas */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 12,
              right: 12,
              display: "flex",
              justifyContent: "space-between",
              pointerEvents: "none",
              fontSize: 11,
              color: "#cbd5e1",
            }}
          >
            <span
              style={{
                background: "rgba(15, 23, 42, 0.78)",
                padding: "4px 9px",
                borderRadius: 8,
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              {lang === "en"
                ? "Move cursor here: Slow = Low Hz (Red) · Abrupt = High Hz (Cyan Blueshift)"
                : "Mové el cursor aquí: Lento = Baja Hz (Rojo) · Brusco = Alta Hz (Cian Blueshift)"}
            </span>
            <span
              style={{
                background: "rgba(15, 23, 42, 0.82)",
                padding: "4px 9px",
                borderRadius: 8,
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              {telemetry.instantFrequencyHz.toFixed(1)} Hz
            </span>
          </div>
        </div>

        {/* Right: Live Sound Frequency & Kinematics Telemetry Panel */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          {/* Primary Frequency Readout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <div
              style={{
                background: "rgba(2, 6, 23, 0.65)",
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid rgba(56, 189, 248, 0.28)",
              }}
            >
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>
                {lang === "en" ? "Primary Sound Freq (f)" : "Frecuencia Sonido (f)"}
              </div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#38bdf8",
                  fontFamily: "monospace",
                }}
              >
                {telemetry.instantFrequencyHz.toFixed(1)}{" "}
                <span style={{ fontSize: 12, fontWeight: 600 }}>Hz</span>
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>
                {lang === "en" ? "Harmonic:" : "Armónico:"}{" "}
                {telemetry.harmonicFrequencyHz.toFixed(0)} Hz · LFE:{" "}
                {telemetry.subBassLfeHz.toFixed(0)} Hz
              </div>
            </div>

            <div
              style={{
                background: "rgba(2, 6, 23, 0.65)",
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid rgba(168, 85, 247, 0.28)",
              }}
            >
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>
                {lang === "en"
                  ? "Abruptness & Speed (v, a)"
                  : "Brusquedad y Velocidad (v, a)"}
              </div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#c084fc",
                  fontFamily: "monospace",
                }}
              >
                {(telemetry.abruptnessIndex * 100).toFixed(0)}
                <span style={{ fontSize: 12, fontWeight: 600 }}>%</span>
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>
                v = {telemetry.velocityPxPerSec.toFixed(0)} px/s · a ={" "}
                {telemetry.accelerationPxPerSec2} px/s²
              </div>
            </div>
          </div>

          {/* Abruptness Progress Bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#cbd5e1",
                marginBottom: 4,
              }}
            >
              <span>
                {lang === "en"
                  ? "Doppler Frequency Shift Meter"
                  : "Medidor de Desplazamiento de Frecuencia Doppler"}
              </span>
              <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>
                ×{telemetry.dopplerFactor.toFixed(2)} Doppler · Cutoff{" "}
                {telemetry.filterCutoffHz} Hz
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(2, 6, 23, 0.8)",
                overflow: "hidden",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(4, telemetry.abruptnessIndex * 100))}%`,
                  height: "100%",
                  transition: "width 0.06s linear",
                  background:
                    "linear-gradient(90deg, #f43f5e 0%, #f59e0b 35%, #10b981 65%, #38bdf8 100%)",
                }}
              />
            </div>
          </div>

          {/* 3D Binaural HRTF & Astrophysical Telemetry Rows */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              fontSize: 11,
              background: "rgba(2, 6, 23, 0.45)",
              padding: "8px 10px",
              borderRadius: 9,
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>3D HRTF Azimuth/Elev: </span>
              <strong style={{ fontFamily: "monospace", color: "#e2e8f0" }}>
                {telemetry.hrtfAzimuthDeg > 0 ? "+" : ""}
                {telemetry.hrtfAzimuthDeg}° / {telemetry.hrtfElevationDeg}°
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>SPHEREx Scan Rate: </span>
              <strong style={{ fontFamily: "monospace", color: "#e2e8f0" }}>
                {telemetry.angularSpeedArcsecPerSec.toFixed(0)} &quot;/s
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>ICRS Cursor (RA, Dec): </span>
              <strong style={{ fontFamily: "monospace", color: "#e2e8f0" }}>
                {telemetry.raDeg.toFixed(3)}°, {telemetry.decDeg.toFixed(3)}°
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>FITS Pixel Brightness: </span>
              <strong style={{ fontFamily: "monospace", color: "#34d399" }}>
                {telemetry.sampledFitsFluxMjySr !== null
                  ? `${telemetry.sampledFitsFluxMjySr} MJy/sr`
                  : "Calibrated Field"}
              </strong>
            </div>
          </div>

          {/* Interactive Sliders: Sensitivity, Min/Max Hz, Volume */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              paddingTop: 4,
              borderTop: "1px solid rgba(148, 163, 184, 0.14)",
            }}
          >
            <label style={{ fontSize: 10, color: "#94a3b8" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <Sliders size={10} />{" "}
                  {lang === "en" ? "Sensitivity" : "Sensibilidad"}
                </span>
                <strong style={{ color: "#e2e8f0" }}>{sensitivity.toFixed(2)}×</strong>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.5}
                step={0.05}
                value={sensitivity}
                onChange={(e) => setSensitivity( parseFloat(e.target.value) )}
                style={{ width: "100%", accentColor: "#38bdf8" }}
              />
            </label>

            <label style={{ fontSize: 10, color: "#94a3b8" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <Activity size={10} />{" "}
                  {lang === "en" ? "Max Peak Hz" : "Tope Agudo Hz"}
                </span>
                <strong style={{ color: "#e2e8f0" }}>{maxFreqHz} Hz</strong>
              </div>
              <input
                type="range"
                min={900}
                max={3500}
                step={50}
                value={maxFreqHz}
                onChange={(e) => setMaxFreqHz(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#c084fc" }}
              />
            </label>

            <label style={{ fontSize: 10, color: "#94a3b8" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <Radio size={10} /> {lang === "en" ? "Master Vol" : "Volumen"}
                </span>
                <strong style={{ color: "#e2e8f0" }}>
                  {Math.round(volume * 100)}%
                </strong>
              </div>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={volume}
                onChange={(e) => updateVolume(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#34d399" }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KineticSonificationLab;
