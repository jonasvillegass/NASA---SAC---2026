import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import {
  formatDectoDMS,
  formatRAtoHMS,
  parseDec as baseParseDec,
  parseRA as baseParseRA,
} from "../lib/coordinates";
import { useLanguage } from "../i18n/LanguageContext";
import { CursorAudioEngine } from "../lib/cursorAudio";
import type { MusicMetrics } from "../lib/musicAnalyser";
import { playCoordChangeSound } from "../lib/soundEffects";
import { CoordinateFormatToggle } from "./CoordinateFormatToggle";
import type {
  CollectionQueryMode,
  ResolvedCelestialObject,
  TargetPreset,
} from "../lib/types";

/**
 * ============================================================================
 * SpaceGate.tsx — Archivo Único de la Nueva Pantalla de Inicio (3D + HUD + 3 Bloques)
 * ============================================================================
 * Ubicación en el proyecto: `src/components/SpaceGate.tsx`
 *
 * Incluye todo el inicio en un solo archivo listo para enchufar:
 * 1. `CosmicBackground`: Galaxia espiral + vórtice 3D en Canvas con efecto presencia
 *    del mouse, grilla astronómica RA/Dec y salto warp de 1.2s (`warpTo`).
 * 2. `SpaceGate`: Tarjeta Hero (Free Navigation con botón magnético) + Buscador por
 *    Coordenadas (HMS/DMS ⇄ Grados con validación en vivo) + Selector de los 5 cuerpos
 *    celestes de ejemplo con tipeo telemetría.
 */

export function parseRAFlexible(raw: string): number | null {
  const s = raw.trim().replace(/°|deg$/i, "").trim();
  if (!s) return null;
  const direct = baseParseRA(s);
  if (direct !== null) return direct;
  const match = s.match(
    /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})(?:\s*[m:\s]\s*(\d{1,2}(?:\.\d+)?))?\s*[ms]?$/i
  );
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const sec = match[3] !== undefined ? Number(match[3]) : 0;
  if (h > 24 || m >= 60 || sec >= 60) return null;
  const deg = (h + m / 60 + sec / 3600) * 15;
  return deg >= 0 && deg <= 360 ? deg : null;
}

export function parseDecFlexible(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const decCandidate = s.replace(/°|deg$/i, "").trim();
  const direct = baseParseDec(decCandidate);
  if (direct !== null) return direct;
  const match = s.match(
    /^([+-]?)\s*(\d{1,2})\s*[d°:\s]\s*(\d{1,2})(?:\s*[m'’:\s]\s*(\d{1,2}(?:\.\d+)?))?\s*[s"”']?$/i
  );
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const d = Number(match[2]);
  const m = Number(match[3]);
  const sec = match[4] !== undefined ? Number(match[4]) : 0;
  if (d > 90 || m >= 60 || sec >= 60) return null;
  const deg = sign * (d + m / 60 + sec / 3600);
  return deg >= -90 && deg <= 90 ? deg : null;
}

export interface CosmicBackgroundHandle {
  warpTo: (target?: { ra: number; dec: number } | null, durationMs?: number) => Promise<void>;
}

export interface CosmicBackgroundProps {
  mode?: "gate" | "explorer";
  cursorAudio?: boolean;
  onCursorSky?: (sky: { ra: number; dec: number } | null) => void;
  sampleMusic?: (dt: number) => MusicMetrics;
}

const DEG = Math.PI / 180;
const CYAN: [number, number, number] = [0, 210, 255];
const AMBER: [number, number, number] = [255, 183, 3];
const WHITE: [number, number, number] = [226, 240, 255];

interface GalaxyParticle {
  r: number;
  theta: number;
  y: number;
  omega: number;
  size: number;
  rgb: string;
  alpha: number;
}

interface WarpStar {
  x: number;
  y: number;
  z: number;
  pz: number;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  const k = Math.max(0, Math.min(1, t));
  return `${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(
    a[1] + (b[1] - a[1]) * k
  )},${Math.round(a[2] + (b[2] - a[2]) * k)}`;
}

function gaussianRand(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildGalaxyParticles(count: number): GalaxyParticle[] {
  const arms = 3;
  const twist = 3.2;
  const out: GalaxyParticle[] = [];
  for (let i = 0; i < count; i++) {
    const isCore = Math.random() < 0.18;
    const r = isCore
      ? Math.abs(gaussianRand()) * 0.12
      : Math.pow(Math.random(), 0.75) * 0.95 + 0.04;
    const arm = i % arms;
    const spread = (isCore ? 1.4 : 0.32) * (1 - r * 0.35);
    const theta = (arm / arms) * Math.PI * 2 + r * twist + gaussianRand() * spread;
    const y = gaussianRand() * 0.025 * (1.2 - r);
    const omega = 0.05 + 0.16 / Math.sqrt(r + 0.05);
    const t = Math.min(1, r / 0.55);
    const rgb =
      Math.random() < 0.08
        ? mixRgb(WHITE, WHITE, 0)
        : mixRgb(AMBER, CYAN, t + gaussianRand() * 0.12);
    out.push({
      r,
      theta,
      y,
      omega: omega * 0.12,
      size: Math.random() < 0.04 ? 1.9 : Math.random() < 0.3 ? 1.25 : 0.85,
      rgb,
      alpha: isCore ? 0.55 + Math.random() * 0.4 : 0.25 + Math.random() * 0.55,
    });
  }
  return out;
}

function buildWarpStarfield(count: number): WarpStar[] {
  const out: WarpStar[] = [];
  for (let i = 0; i < count; i++) {
    const z = Math.random();
    out.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z, pz: z });
  }
  return out;
}

function skyToView(ra: number, dec: number, ra0: number, dec0: number) {
  const a = ra * DEG;
  const d = dec * DEG;
  const a0 = ra0 * DEG;
  const d0 = dec0 * DEG;
  const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const x = -Math.cos(d) * Math.sin(a - a0);
  const y = Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0);
  return { x, y, visible: cosC > 0 };
}

function viewToSky(
  x: number,
  y: number,
  ra0: number,
  dec0: number
): { ra: number; dec: number } | null {
  const rho2 = x * x + y * y;
  if (rho2 > 1) return null;
  const rho = Math.sqrt(rho2);
  const d0 = dec0 * DEG;
  if (rho < 1e-9) return { ra: ra0, dec: dec0 };
  const c = Math.asin(rho);
  const dec = Math.asin(Math.cos(c) * Math.sin(d0) + (y * Math.sin(c) * Math.cos(d0)) / rho);
  const ra =
    ra0 * DEG +
    Math.atan2(-x * Math.sin(c), rho * Math.cos(d0) * Math.cos(c) - y * Math.sin(d0) * Math.sin(c));
  return { ra: (((ra / DEG) % 360) + 360) % 360, dec: dec / DEG };
}

export const CosmicBackground = forwardRef<CosmicBackgroundHandle, CosmicBackgroundProps>(
  function CosmicBackground({ mode = "gate", cursorAudio = true, onCursorSky, sampleMusic }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const modeRef = useRef(mode);
    const cursorAudioRef = useRef(cursorAudio);
    const audioEngineRef = useRef<CursorAudioEngine | null>(null);
    const onCursorSkyRef = useRef(onCursorSky);
    const sampleMusicRef = useRef(sampleMusic);
    const warpRef = useRef<{
      start: number;
      duration: number;
      focusX: number;
      focusY: number;
      resolve: (() => void) | null;
    } | null>(null);
    const viewRef = useRef({ ra0: 133.8, dec0: 12, sphereR: 1, cx: 0, cy: 0 });

    modeRef.current = mode;
    cursorAudioRef.current = cursorAudio;
    onCursorSkyRef.current = onCursorSky;
    sampleMusicRef.current = sampleMusic;

    useEffect(() => {
      if (mode !== "gate" || !cursorAudio) {
        audioEngineRef.current?.silence();
      }
    }, [mode, cursorAudio]);

    useImperativeHandle(ref, () => ({
      warpTo: (target, durationMs = 1200) =>
        new Promise<void>((resolve) => {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          let focusX = 0;
          let focusY = 0;
          if (target) {
            const v = viewRef.current;
            const p = skyToView(target.ra, target.dec, v.ra0, v.dec0);
            if (p.visible) {
              focusX = Math.max(-0.35, Math.min(0.35, p.x * 0.6));
              focusY = Math.max(-0.35, Math.min(0.35, -p.y * 0.6));
            }
          }
          warpRef.current?.resolve?.();
          warpRef.current = {
            start: performance.now(),
            duration: reduced ? 280 : durationMs,
            focusX,
            focusY,
            resolve,
          };
        }),
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduced = reducedMq.matches;
      const onReducedChange = () => {
        reduced = reducedMq.matches;
      };
      reducedMq.addEventListener("change", onReducedChange);

      let w = 0;
      let h = 0;
      let dpr = 1;
      let galaxy: GalaxyParticle[] = [];
      let stars: WarpStar[] = [];

      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const area = w * h;
        const galaxyCount = Math.round(Math.min(5200, Math.max(1800, area / 260)));
        galaxy = buildGalaxyParticles(galaxyCount);
        stars = buildWarpStarfield(Math.round(Math.min(900, Math.max(350, area / 1800))));
        viewRef.current.cx = w / 2;
        viewRef.current.cy = h / 2;
        viewRef.current.sphereR = Math.max(w, h) * 0.78;
      };
      resize();
      window.addEventListener("resize", resize);

      const audioEngine = new CursorAudioEngine();
      audioEngineRef.current = audioEngine;

      const mouse = { x: w / 2, y: h / 2, sx: w / 2, sy: h / 2, inside: false, moved: true };
      let lastMoveX = w / 2;
      let lastMoveY = h / 2;
      let lastMoveTime = performance.now();
      let instantSpeed = 0;
      let smoothedSpeed = 0;

      const tryUnlockAudio = () => {
        if (modeRef.current === "gate" && cursorAudioRef.current) {
          audioEngine.unlock();
        }
      };

      const onMove = (e: PointerEvent) => {
        const now = performance.now();
        if (!mouse.inside) {
          lastMoveX = e.clientX;
          lastMoveY = e.clientY;
          lastMoveTime = now;
          instantSpeed = 0;
        } else {
          const dtMs = Math.max(4, now - lastMoveTime);
          const dist = Math.hypot(e.clientX - lastMoveX, e.clientY - lastMoveY);
          instantSpeed = Math.min(8, dist / dtMs);
          lastMoveX = e.clientX;
          lastMoveY = e.clientY;
          lastMoveTime = now;
        }
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.inside = true;
        mouse.moved = true;
        tryUnlockAudio();
      };
      const onLeave = () => {
        mouse.inside = false;
        mouse.moved = true;
        instantSpeed = 0;
        smoothedSpeed = 0;
        audioEngine.silence();
        onCursorSkyRef.current?.(null);
      };
      const onVisibilityOrBlur = () => {
        instantSpeed = 0;
        smoothedSpeed = 0;
        audioEngine.silence();
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", tryUnlockAudio, { passive: true });
      window.addEventListener("keydown", tryUnlockAudio, { passive: true });
      window.addEventListener("blur", onVisibilityOrBlur);
      document.addEventListener("visibilitychange", onVisibilityOrBlur);
      document.addEventListener("pointerleave", onLeave);

      let dim = modeRef.current === "explorer" ? 1 : 0;
      let last = performance.now();
      let raf = 0;
      let frame = 0;

      const drawGraticule = (alpha: number) => {
        const v = viewRef.current;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(0,210,255,${alpha})`;
        const toScreen = (ra: number, dec: number) => {
          const p = skyToView(ra, dec, v.ra0, v.dec0);
          return { sx: v.cx + p.x * v.sphereR, sy: v.cy - p.y * v.sphereR, visible: p.visible };
        };
        for (let ra = 0; ra < 360; ra += 30) {
          ctx.beginPath();
          let pen = false;
          for (let dec = -88; dec <= 88; dec += 4) {
            const s = toScreen(ra, dec);
            if (!s.visible) {
              pen = false;
              continue;
            }
            if (pen) ctx.lineTo(s.sx, s.sy);
            else ctx.moveTo(s.sx, s.sy);
            pen = true;
          }
          ctx.stroke();
        }
        for (let dec = -75; dec <= 75; dec += 15) {
          ctx.beginPath();
          let pen = false;
          for (let ra = 0; ra <= 360; ra += 4) {
            const s = toScreen(ra, dec);
            if (!s.visible) {
              pen = false;
              continue;
            }
            if (pen) ctx.lineTo(s.sx, s.sy);
            else ctx.moveTo(s.sx, s.sy);
            pen = true;
          }
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,183,3,${alpha * 1.4})`;
        ctx.beginPath();
        let pen = false;
        for (let ra = 0; ra <= 360; ra += 3) {
          const s = toScreen(ra, 0);
          if (!s.visible) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(s.sx, s.sy);
          else ctx.moveTo(s.sx, s.sy);
          pen = true;
        }
        ctx.stroke();
        ctx.restore();
      };

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        frame++;

        const targetDim = modeRef.current === "explorer" ? 1 : 0;
        dim += (targetDim - dim) * Math.min(1, dt * 3);

        const audioActive = modeRef.current === "gate" && cursorAudioRef.current && mouse.inside;
        if (!audioActive) {
          instantSpeed = 0;
          smoothedSpeed = 0;
          audioEngine.silence();
        } else {
          if (now - lastMoveTime > 70) {
            instantSpeed *= Math.exp(-dt * 14);
            if (instantSpeed < 0.005) instantSpeed = 0;
          }
          const smoothRate = instantSpeed > smoothedSpeed ? 18 : 10;
          smoothedSpeed += (instantSpeed - smoothedSpeed) * Math.min(1, dt * smoothRate);
          audioEngine.update(smoothedSpeed, true);
        }

        if (dim > 0.97 && !warpRef.current && frame % 2 === 1) return;

        let warp = 0;
        let warpProgress = 0;
        let focusX = 0;
        let focusY = 0;
        const wstate = warpRef.current;
        if (wstate) {
          warpProgress = Math.min(1, (now - wstate.start) / wstate.duration);
          warp = reduced ? 0 : Math.sin(Math.PI * Math.pow(warpProgress, 0.8));
          const e = easeInOutCubic(warpProgress);
          focusX = wstate.focusX * e;
          focusY = wstate.focusY * e;
          if (warpProgress >= 1) {
            wstate.resolve?.();
            warpRef.current = null;
          }
        }

        const k = reduced ? 0.25 : Math.min(1, dt * 6);
        mouse.sx += (mouse.x - mouse.sx) * k;
        mouse.sy += (mouse.y - mouse.sy) * k;
        const nx = (mouse.sx / w - 0.5) * 2;
        const ny = (mouse.sy / h - 0.5) * 2;

        const v = viewRef.current;
        if (!reduced) v.ra0 = (v.ra0 + dt * 0.6) % 360;
        const skyDec0 = 12 - ny * 6;
        v.dec0 += (skyDec0 - v.dec0) * Math.min(1, dt * 2);

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = warp > 0.05 ? `rgba(8,11,16,${0.5 - warp * 0.3})` : "#080B10";
        ctx.fillRect(0, 0, w, h);

        const fade = 1 - dim * 0.62;
        const gateFactor = reduced ? 0 : 1 - dim;
        const music: MusicMetrics =
          !reduced && modeRef.current === "gate" && sampleMusicRef.current
            ? sampleMusicRef.current(dt)
            : { bass: 0, mid: 0, energy: 0, beat: 0 };

        const neb = [
          [w * 0.22, h * 0.28, Math.max(w, h) * 0.45, "0,140,200", 0.1],
          [w * 0.8, h * 0.74, Math.max(w, h) * 0.42, "160,96,40", 0.09],
        ] as const;
        neb.forEach(([x, y, r, c, a]) => {
          const g = ctx.createRadialGradient(x - nx * 20, y - ny * 20, 0, x, y, r);
          g.addColorStop(0, `rgba(${c},${a * fade})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        });

        drawGraticule(0.055 * fade * (1 - warp));

        ctx.globalCompositeOperation = "lighter";

        const vpX = w / 2 + focusX * w - nx * 14;
        const vpY = h / 2 + focusY * h - ny * 14;
        const musicSpeedBoost = gateFactor * (music.bass * 0.045 + music.beat * 0.09);
        const speed = reduced ? 0 : 0.012 + warp * 1.9 + musicSpeedBoost;
        const scale =
          Math.max(w, h) * 0.5 * (1 + gateFactor * (music.bass * 0.025 + music.beat * 0.045));
        for (const s of stars) {
          s.pz = s.z;
          s.z -= speed * dt * (warp > 0 ? 1 : 0.4);
          if (s.z <= 0.02) {
            s.x = (Math.random() - 0.5) * 2;
            s.y = (Math.random() - 0.5) * 2;
            s.z = 1;
            s.pz = 1;
          }
          const px = vpX + (s.x / s.z) * scale * 0.5;
          const py = vpY + (s.y / s.z) * scale * 0.5;
          if (px < -50 || px > w + 50 || py < -50 || py > h + 50) continue;
          const bright =
            Math.min(
              1,
              ((1 - s.z) * 1.3 + 0.15) * (1 + gateFactor * (music.energy * 0.3 + music.beat * 0.45))
            ) * fade;
          if (warp > 0.05) {
            const ox = vpX + (s.x / s.pz) * scale * 0.5;
            const oy = vpY + (s.y / s.pz) * scale * 0.5;
            const tail = 1 + warp * 6;
            ctx.strokeStyle = `rgba(${s.x > 0 ? "170,235,255" : "255,220,160"},${
              bright * (0.4 + warp * 0.6)
            })`;
            ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.2);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (ox - px) * tail, py + (oy - py) * tail);
            ctx.stroke();
          } else {
            const size = ((1 - s.z) * 1.6 + 0.4) * (1 + gateFactor * music.beat * 0.45);
            ctx.fillStyle = `rgba(226,236,255,${bright * 0.75})`;
            ctx.fillRect(px, py, size, size);
          }
        }

        const warpExpand = wstate && !reduced ? Math.pow(warpProgress, 0.75) * 2.8 : 0;
        const gScale =
          Math.min(w, h) *
          (0.5 + dim * 0.1) *
          (1 + warpExpand) *
          (1 + gateFactor * (music.bass * 0.055 + music.beat * 0.075));
        const gcx = w * 0.5 - nx * 26 + focusX * w * 0.5;
        const gcy = h * 0.5 - ny * 18 + focusY * h * 0.5;
        const tilt = (62 + ny * 7) * DEG;
        const yaw = nx * 0.18;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const camZ = 2.4;
        const warpFade = wstate && !reduced ? 1 - Math.pow(warpProgress, 2) * 0.75 : 1;
        const galaxyAlpha = fade * warpFade * (1 - dim * 0.35);
        const presenceR = Math.min(w, h) * 0.16;
        const mx = mouse.sx;
        const my = mouse.sy;
        const presence = mouse.inside && !reduced ? 1 - dim : 0;
        const spin = reduced ? 0 : dt * (1 + gateFactor * (music.energy * 1.4 + music.beat * 2.4));

        for (const p of galaxy) {
          p.theta += p.omega * spin * (1 + warp * 6);
          const a = p.theta + yaw;
          const x3 = Math.cos(a) * p.r;
          const z3 = Math.sin(a) * p.r;
          const y3 = p.y;
          const yr = y3 * cosT - z3 * sinT;
          const zr = y3 * sinT + z3 * cosT;
          const persp = camZ / (camZ + zr);
          let sx = gcx + x3 * gScale * persp;
          let sy = gcy + yr * gScale * persp;

          let boost = 0;
          if (presence > 0) {
            const dx = sx - mx;
            const dy = sy - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < presenceR * presenceR) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / presenceR) * presence;
              sx += (dx / d) * f * 22 - (dy / d) * f * 10;
              sy += (dy / d) * f * 22 + (dx / d) * f * 10;
              boost = f * 0.6;
            }
          }
          if (sx < -4 || sx > w + 4 || sy < -4 || sy > h + 4) continue;
          const alpha = Math.min(
            1,
            (p.alpha + boost) * galaxyAlpha * (0.6 + persp * 0.4) * (1 + gateFactor * music.beat * 0.28)
          );
          if (alpha < 0.02) continue;
          ctx.fillStyle = `rgba(${p.rgb},${alpha})`;
          const size = p.size * persp * (1 + warp * 0.8 + gateFactor * music.beat * 0.35);
          ctx.fillRect(sx, sy, size, size);
        }

        const coreR = gScale * (0.22 + gateFactor * music.beat * 0.04);
        const core = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR);
        core.addColorStop(0, `rgba(255,214,140,${(0.32 + gateFactor * music.beat * 0.16) * galaxyAlpha})`);
        core.addColorStop(0.4, `rgba(255,170,60,${0.1 * galaxyAlpha})`);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.fillRect(gcx - coreR, gcy - coreR, coreR * 2, coreR * 2);

        if (warp > 0.4) {
          const flash = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, Math.max(w, h) * 0.5);
          flash.addColorStop(0, `rgba(180,240,255,${(warp - 0.4) * 0.35})`);
          flash.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = flash;
          ctx.fillRect(0, 0, w, h);
        }

        if (mouse.inside && (mouse.moved || frame % 6 === 0)) {
          mouse.moved = false;
          const sky = viewToSky(
            (mouse.x - v.cx) / v.sphereR,
            -(mouse.y - v.cy) / v.sphereR,
            v.ra0,
            v.dec0
          );
          onCursorSkyRef.current?.(sky);
        }
      };
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", tryUnlockAudio);
        window.removeEventListener("keydown", tryUnlockAudio);
        window.removeEventListener("blur", onVisibilityOrBlur);
        document.removeEventListener("visibilitychange", onVisibilityOrBlur);
        document.removeEventListener("pointerleave", onLeave);
        reducedMq.removeEventListener("change", onReducedChange);
        audioEngine.dispose();
        audioEngineRef.current = null;
        warpRef.current?.resolve?.();
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        id="cosmos-bg"
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
      />
    );
  }
);

export interface GateKnownTarget {
  id: string;
  label: string;
  queryName: string;
  shortCoords: string;
  raHms: string;
  decDms: string;
  collection: CollectionQueryMode;
  subtitleEs: string;
  subtitleEn: string;
}

export const GATE_KNOWN_TARGETS: GateKnownTarget[] = [
  {
    id: "wise_0855",
    label: "WISE 0855",
    queryName: "WISE 0855",
    shortCoords: "08h 55m · -07° 14'",
    raHms: "08h 55m 10.831s",
    decDms: "-07° 14' 42.53\"",
    collection: "spherex_dr1",
    subtitleEs: "Enana marrón helada",
    subtitleEn: "Frosty Y-type brown dwarf",
  },
  {
    id: "barnards_star",
    label: "Barnard's Star",
    queryName: "Barnard's Star",
    shortCoords: "17h 57m · +04° 41'",
    raHms: "17h 57m 48.498s",
    decDms: "+04° 41' 36.11\"",
    collection: "spherex_dr1",
    subtitleEs: "Estrella de alto movimiento propio",
    subtitleEn: "High proper-motion red dwarf",
  },
  {
    id: "epsilon_indi_b",
    label: "Epsilon Indi B",
    queryName: "Epsilon Indi B",
    shortCoords: "22h 04m · -56° 47'",
    raHms: "22h 04m 10.595s",
    decDms: "-56° 46' 58.24\"",
    collection: "spherex_dr1",
    subtitleEs: "Enana marrón T1/T6",
    subtitleEn: "Binary brown dwarf T1/T6",
  },
  {
    id: "rw_aurigae",
    label: "RW Aurigae",
    queryName: "RW Aurigae",
    shortCoords: "05h 07m · +30° 24'",
    raHms: "05h 07m 49.566s",
    decDms: "+30° 24' 05.18\"",
    collection: "spherex_dr1",
    subtitleEs: "Estrella joven variable",
    subtitleEn: "Young T Tauri variable star",
  },
  {
    id: "r_draconis",
    label: "R Draconis",
    queryName: "R Draconis",
    shortCoords: "16h 32m · +66° 45'",
    raHms: "16h 32m 40.227s",
    decDms: "+66° 45' 17.93\"",
    collection: "spherex_dr1",
    subtitleEs: "Gigante roja variable Mira",
    subtitleEn: "Mira-type variable red giant",
  },
];

export interface SpaceGateProps {
  raInput: string;
  setRaInput: (val: string) => void;
  decInput: string;
  setDecInput: (val: string) => void;
  cursorSky?: { ra: number; dec: number } | null;
  warping?: boolean;
  loading?: boolean;
  /** Si es true (por defecto), incluye el Canvas 3D de Galaxia + Vórtice automáticamente */
  withBackground?: boolean;
  backgroundMode?: "gate" | "explorer";
  onExploreFree: () => void;
  onLaunchToCoords: (params: {
    ra: string;
    dec: string;
    raDeg: number;
    decDeg: number;
    targetLabel?: string;
    preset?: TargetPreset | null;
    resolved?: ResolvedCelestialObject | null;
  }) => void;
}

const TELEMETRY_GLYPHS = "0123456789h°'\"+-.";

function isDecimalFormat(raw: string): boolean {
  const s = raw.trim().replace(/°|deg$/i, "").trim();
  return /^[+-]?\d+(\.\d+)?$/.test(s);
}

export const SpaceGate: React.FC<SpaceGateProps> = ({
  raInput,
  setRaInput,
  decInput,
  setDecInput,
  warping = false,
  loading = false,
  withBackground = false,
  backgroundMode = "gate",
  onExploreFree,
  onLaunchToCoords,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const internalBgRef = useRef<CosmicBackgroundHandle | null>(null);

  const cardStarsRef = useRef<HTMLCanvasElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const [magOffset, setMagOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [coordError, setCoordError] = useState<string | null>(null);
  const [isTypingTelemetry, setIsTypingTelemetry] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("wise_0855");

  const raDeg = useMemo(() => parseRAFlexible(raInput), [raInput]);
  const decDeg = useMemo(() => parseDecFlexible(decInput), [decInput]);
  const coordsValid = raDeg !== null && decDeg !== null;

  useEffect(() => {
    const drawCardStars = () => {
      const c = cardStarsRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      c.width = c.offsetWidth || 520;
      c.height = c.offsetHeight || 220;
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);

      const rg = ctx.createRadialGradient(w * 0.3, h * 0.3, 8, w * 0.5, h * 0.5, w * 0.75);
      rg.addColorStop(0, "rgba(0, 210, 255, 0.14)");
      rg.addColorStop(0.55, "rgba(255, 183, 3, 0.07)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 130; i++) {
        const x = (i * 104729) % w;
        const y = (i * 32452843) % h;
        const r = i % 9 === 0 ? 1.4 : 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.22 + (i % 6) * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawCardStars();
    window.addEventListener("resize", drawCardStars);
    return () => window.removeEventListener("resize", drawCardStars);
  }, []);

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

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    };
  }, []);

  const animateTelemetryFill = useCallback(
    (targetRa: string, targetDec: string) => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      setCoordError(null);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setRaInput(targetRa);
        setDecInput(targetDec);
        setIsTypingTelemetry(false);
        return;
      }

      setIsTypingTelemetry(true);
      const totalSteps = 14;
      let step = 0;

      typingTimerRef.current = window.setInterval(() => {
        step++;
        const progress = step / totalSteps;
        if (step >= totalSteps) {
          if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          setRaInput(targetRa);
          setDecInput(targetDec);
          setIsTypingTelemetry(false);
          return;
        }

        const scramble = (finalStr: string) => {
          const revealCount = Math.floor(finalStr.length * progress);
          let out = finalStr.slice(0, revealCount);
          for (let i = revealCount; i < finalStr.length; i++) {
            const ch = finalStr[i];
            if (ch === " ") out += " ";
            else out += TELEMETRY_GLYPHS[(step * 7 + i * 13) % TELEMETRY_GLYPHS.length];
          }
          return out;
        };

        setRaInput(scramble(targetRa));
        setDecInput(scramble(targetDec));
      }, 24);
    },
    [setRaInput, setDecInput]
  );

  const isCurrentlyDecimal = isDecimalFormat(raInput) && isDecimalFormat(decInput);

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
    playCoordChangeSound();
    setSelectedTargetId(target.id);
    setDropdownOpen(false);
    animateTelemetryFill(target.raHms, target.decDms);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
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

    const activeKnown =
      GATE_KNOWN_TARGETS.find((k) => k.id === selectedTargetId) ?? null;

    const matchingPreset = activeKnown
      ? t.presets.find((p) => p.id === activeKnown.id) ?? null
      : null;

    const label = activeKnown ? activeKnown.label : undefined;

    if (withBackground && internalBgRef.current) {
      void internalBgRef.current.warpTo({ ra: raDeg, dec: decDeg }, 1200);
    }

    onLaunchToCoords({
      ra: raInput.trim(),
      dec: decInput.trim(),
      raDeg,
      decDeg,
      targetLabel: label,
      preset: matchingPreset,
      resolved: null,
    });
  };

  const handleFreeClick = () => {
    if (withBackground && internalBgRef.current) {
      void internalBgRef.current.warpTo(
        raDeg !== null && decDeg !== null ? { ra: raDeg, dec: decDeg } : null,
        1200
      );
    }
    onExploreFree();
  };

  const activeKnownTarget =
    GATE_KNOWN_TARGETS.find((k) => k.id === selectedTargetId) ?? GATE_KNOWN_TARGETS[0];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-y-auto">
      {withBackground && (
        <CosmicBackground
          ref={internalBgRef}
          mode={backgroundMode}
        />
      )}

      {/* CONTENEDOR CENTRAL CON LOS 3 BLOQUES */}
      <div className="relative z-10 w-full max-w-[540px] flex flex-col gap-3.5 my-auto">
        {/* TARJETA HERO — Free Navigation */}
        <div
          id="hero-start-card"
          role="button"
          tabIndex={0}
          onClick={handleFreeClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleFreeClick();
            }
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
            const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
            setMagOffset({ x: dx * 8, y: dy * 5 });
          }}
          onPointerLeave={() => setMagOffset({ x: 0, y: 0 })}
          className="hero-card relative w-full rounded-[22px] px-7 py-6 flex flex-col items-center text-center cursor-pointer overflow-hidden"
        >
          <canvas
            ref={cardStarsRef}
            id="card-stars"
            className="absolute inset-0 w-full h-full opacity-75 pointer-events-none"
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3 text-[#00D2FF] drop-shadow-[0_0_18px_rgba(0,210,255,0.65)]">
              <svg
                className="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.015em] text-white mb-1">
              {t.chrono.heroTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/90 mb-4">{t.chrono.heroSubtitle}</p>

            <span
              style={{
                transform: `translate3d(${magOffset.x.toFixed(1)}px, ${magOffset.y.toFixed(1)}px, 0)`,
                transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className="btn-press inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00D2FF]/15 hover:bg-[#00D2FF]/25 border border-[#00D2FF]/75 text-[#00D2FF] text-xs sm:text-sm font-semibold shadow-[0_0_24px_rgba(0,210,255,0.28)]"
            >
              <span>{isEn ? "Explore the space →" : "Explorar el espacio →"}</span>
            </span>
          </div>
        </div>

        {/* BLOQUE OBLIGATORIO 1 — Search by Coordinates (HMS / DMS or Degrees) */}
        <form
          id="tutorial-coords-card"
          onSubmit={handleSearchSubmit}
          className="glass-panel rounded-[20px] p-4 sm:p-5 border border-white/12 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
              <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                {isEn
                  ? "Search by Coordinates (HMS / DMS or Degrees)"
                  : "Buscar por Coordenadas (HMS / DMS o Grados)"}
              </h3>
            </div>

            <CoordinateFormatToggle
              isDecimal={isCurrentlyDecimal}
              disabled={!coordsValid}
              isEn={isEn}
              onChange={handleSetCoordinateFormat}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="gate-ra-input" className="font-mono text-slate-300 font-medium">
                  RA
                </label>
                {raDeg !== null ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <input
                id="gate-ra-input"
                type="text"
                required
                value={raInput}
                onChange={(e) => {
                  setRaInput(e.target.value);
                  setCoordError(null);
                }}
                placeholder="00h 00m 00.0s / 0.0000°"
                className={`w-full rounded-xl bg-black/50 border px-3 py-1.5 text-xs sm:text-[13px] text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                  isTypingTelemetry
                    ? "border-[#00D2FF] text-[#00D2FF] shadow-[0_0_14px_rgba(0,210,255,0.25)]"
                    : raDeg !== null
                      ? "border-white/15 focus:border-[#00D2FF]"
                      : "border-amber-400/60 focus:border-amber-400"
                }`}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="gate-dec-input" className="font-mono text-slate-300 font-medium">
                  Dec
                </label>
                {decDeg !== null ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <input
                id="gate-dec-input"
                type="text"
                required
                value={decInput}
                onChange={(e) => {
                  setDecInput(e.target.value);
                  setCoordError(null);
                }}
                placeholder="+00° 00' 00&quot; / +0.0000°"
                className={`w-full rounded-xl bg-black/50 border px-3 py-1.5 text-xs sm:text-[13px] text-white placeholder-slate-500 font-mono focus:outline-none transition-colors ${
                  isTypingTelemetry
                    ? "border-[#00D2FF] text-[#00D2FF] shadow-[0_0_14px_rgba(0,210,255,0.25)]"
                    : decDeg !== null
                      ? "border-white/15 focus:border-[#00D2FF]"
                      : "border-amber-400/60 focus:border-amber-400"
                }`}
              />
            </div>
          </div>

          {coordError && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{coordError}</span>
            </div>
          )}

          <button
            type="submit"
            data-sfx="none"
            disabled={warping || loading}
            className="btn-press w-full py-2.5 px-4 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,210,255,0.22)] cursor-pointer disabled:opacity-50"
          >
            {warping || loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#00D2FF]" />
            ) : (
              <Search className="w-4 h-4 text-[#00D2FF]" />
            )}
            <span>{isEn ? "Search" : "Buscar"}</span>
            {coordsValid && (
              <span className="font-mono text-[11px] text-[#00D2FF] ml-1">
                ({formatRAtoHMS(raDeg)}, {formatDectoDMS(decDeg)})
              </span>
            )}
          </button>
        </form>

        {/* BLOQUE OBLIGATORIO 2 — Example Celestial Bodies */}
        <div
          id="tutorial-presets-card"
          ref={dropdownRef}
          className="glass-panel rounded-[20px] p-4 sm:p-5 border border-white/12 space-y-2.5 relative z-30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00D2FF]" />
              <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                {isEn
                  ? "You can start with some example celestial bodies"
                  : "Puedes comenzar con algunos cuerpos celestes de ejemplo"}
              </h3>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-expanded={dropdownOpen}
              className="btn-press w-full rounded-xl bg-black/55 hover:bg-black/70 border border-white/15 hover:border-[#00D2FF]/60 px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full min-w-0 pr-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#00D2FF] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                    {activeKnownTarget.label}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                    — {isEn ? activeKnownTarget.subtitleEn : activeKnownTarget.subtitleEs}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180 text-[#00D2FF]" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[122px] overflow-y-auto rounded-2xl bg-[#0B101B]/95 backdrop-blur-2xl border border-[#00D2FF]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] divide-y divide-white/10">
                {GATE_KNOWN_TARGETS.map((item) => {
                  const active = selectedTargetId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-sfx="none"
                      onClick={() => handlePickKnownTarget(item)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-[#00D2FF]/15 text-white"
                          : "hover:bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 leading-5">
                        <span className="text-xs sm:text-[13px] font-semibold text-white shrink-0">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          — {isEn ? item.subtitleEn : item.subtitleEs}
                        </span>
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
        </div>
      </div>
    </div>
  );
};

export default SpaceGate;
