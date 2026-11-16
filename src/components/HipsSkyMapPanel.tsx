import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Columns2,
  Compass,
  Crosshair,
  Globe,
  Grid,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  formatDectoDMS,
  formatDectoDMSCompact,
  formatRAtoHMS,
  formatRAtoHMSCompact,
} from "../lib/coordinates";
import {
  getBandLabelForChannel,
  getHealpixCellCenter,
  getOrLoadHipsTile,
  healpixFaceXYToRaDec,
  nest2xyInFace,
  parseSRegionPolygon,
  retryHipsApiHealth,
  SPHEREX_HIPS_WAVELENGTHS_UM,
  subscribeHipsApiStatus,
} from "../lib/hips";
import type {
  CelestialTrajectoryResult,
  ColormapName,
  ExtrapolatedPosition,
  RenderedCutout,
  SpherexObservation,
  StretchMode,
} from "../lib/types";

interface HipsSkyMapPanelProps {
  targetCoords: { ra: number; dec: number; size: number } | null;
  targetName?: string;
  observations: SpherexObservation[];
  selectedObs: SpherexObservation | null;
  cutout?: RenderedCutout | null;
  cutoutLoading?: boolean;
  stretch?: StretchMode;
  colormap?: ColormapName;
  subtractZodi?: boolean;
  secondMapOpen?: boolean;
  onToggleSecondMap?: (open: boolean) => void;
  externalChannelIdx?: number | null;
  secondMapZoom?: number;
  secondMapViewCorners?: { ra: number; dec: number }[] | null;
  activeTrajectory?: {
    trajectory: CelestialTrajectoryResult;
    extrapolated: ExtrapolatedPosition | null;
  } | null;
  onChangeFov?: (newSize: number) => void;
  onSelectObservation?: (obs: SpherexObservation) => void;
  onQueryAtCoords?: (raDeg: number, decDeg: number) => void;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const AITOFF_THRESHOLD_FOV = 90;
const MIN_FOV_DEG = 0.25;
const MAX_FOV_DEG = 360;

function wrapRaDeltaDeg(dRa: number): number {
  return ((dRa + 540) % 360) - 180;
}

function computeFitsBoundsFov(
  center: { ra: number; dec: number },
  observations: SpherexObservation[],
  cutoutSizeDeg?: number
): number {
  const cosDec = Math.max(0.15, Math.cos(center.dec * DEG2RAD));
  let maxHalfSpan = 0;
  const maxFootprints = Math.min(observations.length, 60);

  for (let i = 0; i < maxFootprints; i++) {
    const poly = parseSRegionPolygon(observations[i].s_region);
    if (poly.length < 3) continue;
    for (const v of poly) {
      const dRa = Math.abs(wrapRaDeltaDeg(v.ra - center.ra)) * cosDec;
      const dDec = Math.abs(v.dec - center.dec);
      if (dRa > maxHalfSpan) maxHalfSpan = dRa;
      if (dDec > maxHalfSpan) maxHalfSpan = dDec;
    }
  }

  if (maxHalfSpan > 0) {
    return Math.max(1.5, Math.min(35, Number((maxHalfSpan * 2 * 1.2).toFixed(2))));
  }
  return Math.max(2.5, Math.min(12, Number(((cutoutSizeDeg ?? 0.15) * 25).toFixed(2))));
}

function getAitoffScale(width: number, height: number, fovDeg: number): number {
  const baseScale = Math.min(
    (width * 0.92) / (4 * Math.SQRT2),
    (height * 0.86) / (2 * Math.SQRT2)
  );
  return baseScale * (360 / Math.max(AITOFF_THRESHOLD_FOV, Math.min(MAX_FOV_DEG, fovDeg)));
}

/**
 * Proyección Hammer-Aitoff (FITS WCS `AIT`) para vista All-Sky / gran campo,
 * equivalente al modo alejado del visor Firefly de NASA/IPAC IRSA SPHEREx.
 */
function projectAitoffRaw(
  dRaDeg: number,
  decDeg: number,
  aitoffScale: number,
  cx: number,
  cy: number
): { x: number; y: number; cosC: number } {
  const lambda = dRaDeg * DEG2RAD;
  const phi = Math.max(-90, Math.min(90, decDeg)) * DEG2RAD;
  const cosPhi = Math.cos(phi);
  const halfLambda = lambda * 0.5;
  const denom = Math.sqrt(Math.max(1e-9, 1 + cosPhi * Math.cos(halfLambda)));
  const xNorm = (-2 * Math.SQRT2 * cosPhi * Math.sin(halfLambda)) / denom;
  const yNorm = (-Math.SQRT2 * Math.sin(phi)) / denom;
  return {
    x: cx + aitoffScale * xNorm,
    y: cy + aitoffScale * yNorm,
    cosC: 1,
  };
}

/**
 * Rota (ra, dec) al marco esférico centrado en (ra0, dec0) para proyección Aitoff oblicua.
 */
function rotateToAitoffLonLat(
  raDeg: number,
  decDeg: number,
  ra0Deg: number,
  dec0Deg: number
): { lonDeg: number; latDeg: number } {
  const dRa = (raDeg - ra0Deg) * DEG2RAD;
  const phi = decDeg * DEG2RAD;
  const phi0 = dec0Deg * DEG2RAD;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  const cosDra = Math.cos(dRa);

  const sinLat = Math.max(-1, Math.min(1, cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosDra));
  const yRot = cosPhi * Math.sin(dRa);
  const xRot = cosPhi0 * cosPhi * cosDra + sinPhi0 * sinPhi;

  return {
    lonDeg: Math.atan2(yRot, xRot) * RAD2DEG,
    latDeg: Math.asin(sinLat) * RAD2DEG,
  };
}

function unprojectAitoffToRaDec(
  x: number,
  y: number,
  ra0: number,
  dec0: number,
  aitoffScale: number,
  cx: number,
  cy: number
): { ra: number; dec: number } | null {
  const xNorm = -(x - cx) / aitoffScale;
  const yNorm = -(y - cy) / aitoffScale;
  const r2 = (xNorm * xNorm) / 16 + (yNorm * yNorm) / 4;
  if (r2 > 0.5) return null;
  const z = Math.sqrt(Math.max(0, 1 - r2));
  const latRad = Math.asin(Math.max(-1, Math.min(1, z * yNorm)));
  const lonRad = 2 * Math.atan2(z * xNorm, 2 * (2 * z * z - 1));

  const phi0 = dec0 * DEG2RAD;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  const cosLon = Math.cos(lonRad);

  const sinDec = Math.max(-1, Math.min(1, cosPhi0 * sinLat + sinPhi0 * cosLat * cosLon));
  const ySky = cosLat * Math.sin(lonRad);
  const xSky = cosPhi0 * cosLat * cosLon - sinPhi0 * sinLat;

  const raDeg = (((ra0 + Math.atan2(ySky, xSky) * RAD2DEG) % 360) + 360) % 360;
  return { ra: raDeg, dec: Math.asin(sinDec) * RAD2DEG };
}

function buildAitoffEllipsePath(
  ctx: CanvasRenderingContext2D,
  aitoffScale: number,
  cx: number,
  cy: number
): void {
  ctx.beginPath();
  let first = true;
  for (let dec = -90; dec <= 90; dec += 3) {
    const p = projectAitoffRaw(180, dec, aitoffScale, cx, cy);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  for (let dec = 90; dec >= -90; dec -= 3) {
    const p = projectAitoffRaw(-180, dec, aitoffScale, cx, cy);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/**
 * Proyección estereográfica suave centrada en (ra0, dec0).
 * Convención astronómica: Norte arriba (+Y pantalla es -Y canvas), Este a la izquierda (RA crece hacia la izquierda).
 */
function projectRaDecToCanvas(
  ra: number,
  dec: number,
  ra0: number,
  dec0: number,
  scalePxPerRad: number,
  cx: number,
  cy: number
): { x: number; y: number; cosC: number } {
  const dRa = (ra - ra0) * DEG2RAD;
  const decRad = dec * DEG2RAD;
  const dec0Rad = dec0 * DEG2RAD;

  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinDec0 = Math.sin(dec0Rad);
  const cosDec0 = Math.cos(dec0Rad);
  const cosDra = Math.cos(dRa);
  const sinDra = Math.sin(dRa);

  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * cosDra;

  const k = cosC <= -0.95 ? 0 : 2 / (1 + cosC);
  const x = cx - scalePxPerRad * k * (cosDec * sinDra);
  const y = cy - scalePxPerRad * k * (cosDec0 * sinDec - sinDec0 * cosDec * cosDra);

  return { x, y, cosC };
}

/**
 * Inversa de la proyección estereográfica desde píxeles del canvas (x, y) a (RA, Dec) en grados.
 */
function unprojectCanvasToRaDec(
  x: number,
  y: number,
  ra0: number,
  dec0: number,
  scalePxPerRad: number,
  cx: number,
  cy: number
): { ra: number; dec: number } | null {
  const dx = -(x - cx) / scalePxPerRad;
  const dy = -(y - cy) / scalePxPerRad;
  const rho = Math.hypot(dx, dy);

  if (rho > 2.2) return null;
  if (rho < 1e-9) {
    return { ra: ((ra0 % 360) + 360) % 360, dec: dec0 };
  }

  const c = 2 * Math.atan(rho / 2);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const dec0Rad = dec0 * DEG2RAD;
  const sinDec0 = Math.sin(dec0Rad);
  const cosDec0 = Math.cos(dec0Rad);

  const decRad = Math.asin(
    Math.max(-1, Math.min(1, cosC * sinDec0 + (dy * sinC * cosDec0) / rho))
  );
  const dRa = Math.atan2(dx * sinC, rho * cosDec0 * cosC - dy * sinDec0 * sinC);

  const raDeg = (((ra0 + dRa * RAD2DEG) % 360) + 360) % 360;
  const decDeg = decRad * RAD2DEG;
  return { ra: raDeg, dec: decDeg };
}

/**
 * Dibuja una imagen fuente o sub-rectángulo en un cuadrilátero arbitrario (p00, p10, p11, p01)
 * dividiéndolo en 2 triángulos afines sobre el contexto 2D del Canvas.
 */
function drawTexturedQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx0: number,
  sy0: number,
  sw: number,
  sh: number,
  p00: { x: number; y: number },
  p10: { x: number; y: number },
  p11: { x: number; y: number },
  p01: { x: number; y: number }
): void {
  const maxSpan = Math.max(
    Math.hypot(p10.x - p00.x, p10.y - p00.y),
    Math.hypot(p11.x - p10.x, p11.y - p10.y),
    Math.hypot(p01.x - p11.x, p01.y - p11.y),
    Math.hypot(p00.x - p01.x, p00.y - p01.y)
  );
  if (maxSpan > 2400 || maxSpan < 0.5) return;

  // Triángulo 1: p00 -> p10 -> p01
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p00.x, p00.y);
  ctx.lineTo(p10.x, p10.y);
  ctx.lineTo(p01.x, p01.y);
  ctx.closePath();
  ctx.clip();

  const ax1 = (p10.x - p00.x) / sw;
  const ay1 = (p10.y - p00.y) / sw;
  const bx1 = (p01.x - p00.x) / sh;
  const by1 = (p01.y - p00.y) / sh;
  const tx1 = p00.x - ax1 * sx0 - bx1 * sy0;
  const ty1 = p00.y - ay1 * sx0 - by1 * sy0;

  ctx.transform(ax1, ay1, bx1, by1, tx1, ty1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Triángulo 2: p11 -> p10 -> p01
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p11.x, p11.y);
  ctx.lineTo(p10.x, p10.y);
  ctx.lineTo(p01.x, p01.y);
  ctx.closePath();
  ctx.clip();

  const sx1 = sx0 + sw;
  const sy1 = sy0 + sh;
  const ax2 = (p11.x - p01.x) / sw;
  const ay2 = (p11.y - p01.y) / sw;
  const bx2 = (p11.x - p10.x) / sh;
  const by2 = (p11.y - p10.y) / sh;
  const tx2 = p11.x - ax2 * sx1 - bx2 * sy1;
  const ty2 = p11.y - ay2 * sx1 - by2 * sy1;

  ctx.transform(ax2, ay2, bx2, by2, tx2, ty2);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export const HipsSkyMapPanel: React.FC<HipsSkyMapPanelProps> = ({
  targetCoords,
  targetName = "WISE 0855",
  observations,
  selectedObs,
  secondMapOpen = false,
  onToggleSecondMap,
  externalChannelIdx,
  secondMapZoom = 1,
  secondMapViewCorners = null,
  activeTrajectory = null,
  onQueryAtCoords,
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 760,
    height: 480,
  });

  const [viewCenter, setViewCenter] = useState<{ ra: number; dec: number }>(() => ({
    ra: targetCoords?.ra ?? 133.79513,
    dec: targetCoords?.dec ?? -7.24515,
  }));
  const [fovDeg, setFovDeg] = useState<number>(35);
  const [channelIdx, setChannelIdx] = useState<number>(0);
  const [showChannelBar, setShowChannelBar] = useState<boolean>(false);

  const [showFootprints, setShowFootprints] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hipsApiDown, setHipsApiDown] = useState<boolean>(false);

  useEffect(() => {
    return subscribeHipsApiStatus(setHipsApiDown);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === mapViewportRef.current);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const el = mapViewportRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Ignore if fullscreen is blocked by browser
    }
  };

  const [cursorCoords, setCursorCoords] = useState<{ ra: number; dec: number } | null>(null);
  const [renderTick, setRenderTick] = useState<number>(0);
  const [markedPoint, setMarkedPoint] = useState<{ ra: number; dec: number } | null>(null);

  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startRa: number;
    startDec: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startRa: 0,
    startDec: 0,
  });

  useEffect(() => {
    if (typeof externalChannelIdx === "number" && externalChannelIdx >= 0) {
      setChannelIdx(externalChannelIdx);
    }
  }, [externalChannelIdx]);

  // Observe container resize (especially when splitting into 2 maps side by side)
  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(120, Math.floor(rect.width));
      const h = Math.max(120, Math.floor(rect.height));
      setCanvasSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, [secondMapOpen]);

  // Sincronizar centro del mapa cuando el usuario busca nuevas coordenadas desde el panel izquierdo
  useEffect(() => {
    if (!targetCoords) return;
    setViewCenter({ ra: targetCoords.ra, dec: targetCoords.dec });
  }, [targetCoords?.ra, targetCoords?.dec]);

  // Al abrir el Mapa 2, encuadrar el Mapa 1 solo en las secciones FITS del punto mostrado; al cerrar, restaurar FOV
  const prevFovRef = useRef<number>(35);
  const wasSecondMapOpenRef = useRef<boolean>(false);
  const prevAutoFrameTargetRef = useRef<{ ra?: number; dec?: number; obsRef: SpherexObservation[] | null }>({
    ra: undefined,
    dec: undefined,
    obsRef: null,
  });
  useEffect(() => {
    if (secondMapOpen) {
      const justOpened = !wasSecondMapOpenRef.current;
      if (justOpened) {
        prevFovRef.current = fovDeg;
        wasSecondMapOpenRef.current = true;
        setShowFootprints(true);
      }
      const nextObsRef = observations.length > 0 ? observations : null;
      const targetChanged =
        prevAutoFrameTargetRef.current.ra !== targetCoords?.ra ||
        prevAutoFrameTargetRef.current.dec !== targetCoords?.dec;
      const obsLoadedChanged =
        nextObsRef !== null && prevAutoFrameTargetRef.current.obsRef !== nextObsRef;

      if (justOpened || targetChanged || obsLoadedChanged) {
        prevAutoFrameTargetRef.current = {
          ra: targetCoords?.ra,
          dec: targetCoords?.dec,
          obsRef: nextObsRef,
        };
        const center = targetCoords ?? markedPoint ?? viewCenter;
        setViewCenter({ ra: center.ra, dec: center.dec });
        setFovDeg(computeFitsBoundsFov(center, observations, targetCoords?.size));
      }
    } else if (wasSecondMapOpenRef.current) {
      wasSecondMapOpenRef.current = false;
      prevAutoFrameTargetRef.current = { ra: undefined, dec: undefined, obsRef: null };
      setFovDeg(prevFovRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondMapOpen, observations, targetCoords?.ra, targetCoords?.dec]);

  const activeOrder = fovDeg > 85 ? 0 : fovDeg > 38 ? 1 : fovDeg > 16 ? 2 : fovDeg > 7 ? 3 : 4;

  const triggerRepaint = useCallback(() => {
    setRenderTick((n) => n + 1);
  }, []);

  // Renderizado principal del mapa celeste HiPS + MOC + Footprints + Punto Marcado en el Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const isAitoff = fovDeg >= AITOFF_THRESHOLD_FOV;
    const fovRad = Math.max(MIN_FOV_DEG, Math.min(160, fovDeg)) * DEG2RAD;
    const scalePxPerRad = Math.min(width, height) / (2 * Math.tan(fovRad / 4) * 2);
    const aitoffScale = getAitoffScale(width, height, fovDeg);

    ctx.fillStyle = "#04060A";
    ctx.fillRect(0, 0, width, height);

    const ra0 = viewCenter.ra;
    const dec0 = viewCenter.dec;

    const projectSky = (ra: number, dec: number) => {
      if (isAitoff) {
        const { lonDeg, latDeg } = rotateToAitoffLonLat(ra, dec, ra0, dec0);
        return projectAitoffRaw(lonDeg, latDeg, aitoffScale, cx, cy);
      }
      return projectRaDecToCanvas(ra, dec, ra0, dec0, scalePxPerRad, cx, cy);
    };

    if (isAitoff) {
      ctx.save();
      buildAitoffEllipsePath(ctx, aitoffScale, cx, cy);
      ctx.fillStyle = "#060911";
      ctx.fill();
      ctx.clip();
    }

    const halfDiagRad = Math.min(Math.PI * 0.85, fovRad * 0.95 + 0.45 / (1 << activeOrder));
    const minCosVisibility = isAitoff ? -1 : Math.cos(halfDiagRad);

    const nside = 1 << activeOrder;
    const npixTotal = 12 * nside * nside;
    const subDiv = isAitoff ? 8 : activeOrder === 0 ? 6 : activeOrder === 1 ? 4 : 2;

    for (let npix = 0; npix < npixTotal; npix++) {
      if (!isAitoff) {
        const center = getHealpixCellCenter(activeOrder, npix);
        const cProj = projectRaDecToCanvas(
          center.ra,
          center.dec,
          ra0,
          dec0,
          scalePxPerRad,
          cx,
          cy
        );
        if (cProj.cosC < minCosVisibility) continue;
      }

      let img = getOrLoadHipsTile(activeOrder, npix, channelIdx, triggerRepaint);
      let tileOrder = activeOrder;
      let tileNpix = npix;

      if (!img && activeOrder > 0) {
        const face0 = Math.floor(npix / (nside * nside));
        img = getOrLoadHipsTile(0, face0, channelIdx, triggerRepaint);
        tileOrder = 0;
        tileNpix = face0;
      }

      if (!img) continue;

      const tileNside = 1 << tileOrder;
      const tileNpface = tileNside * tileNside;
      const face = Math.floor(tileNpix / tileNpface);
      const local = tileNpix - face * tileNpface;
      const { ix: tileIx, iy: tileIy } = nest2xyInFace(local);

      const cellFace = Math.floor(npix / (nside * nside));
      const cellLocal = npix - cellFace * (nside * nside);
      const { ix: cellIx, iy: cellIy } = nest2xyInFace(cellLocal);

      const fxBase0 = cellIx / nside;
      const fyBase0 = cellIy / nside;
      const fStep = 1 / nside / subDiv;

      const imgW = img.naturalWidth || 512;
      const imgH = img.naturalHeight || 512;

      for (let sx = 0; sx < subDiv; sx++) {
        for (let sy = 0; sy < subDiv; sy++) {
          const fx0 = fxBase0 + sx * fStep;
          const fy0 = fyBase0 + sy * fStep;
          const fx1 = fx0 + fStep;
          const fy1 = fy0 + fStep;

          const w00 = healpixFaceXYToRaDec(cellFace, fx0, fy0);
          const w10 = healpixFaceXYToRaDec(cellFace, fx1, fy0);
          const w11 = healpixFaceXYToRaDec(cellFace, fx1, fy1);
          const w01 = healpixFaceXYToRaDec(cellFace, fx0, fy1);

          const u0 = fx0 * tileNside - tileIx;
          const v0 = fy0 * tileNside - tileIy;
          const uSpan = fStep * tileNside;
          const vSpan = fStep * tileNside;

          // Convención IVOA HiPS / Aladin HipsGen: X del PNG = fy (v), Y del PNG = fx (u) de arriba hacia abajo
          const srcX = v0 * imgW;
          const srcY = u0 * imgH;
          const srcW = vSpan * imgW;
          const srcH = uSpan * imgH;

          if (isAitoff) {
            const r00 = rotateToAitoffLonLat(w00.ra, w00.dec, ra0, dec0);
            const r10 = rotateToAitoffLonLat(w10.ra, w10.dec, ra0, dec0);
            const r11 = rotateToAitoffLonLat(w11.ra, w11.dec, ra0, dec0);
            const r01 = rotateToAitoffLonLat(w01.ra, w01.dec, ra0, dec0);
            const nonPolarLon = [r00, r10, r11, r01]
              .filter((pt) => Math.abs(pt.latDeg) < 89.9)
              .map((pt) => pt.lonDeg);
            const minD = nonPolarLon.length ? Math.min(...nonPolarLon) : 0;
            const maxD = nonPolarLon.length ? Math.max(...nonPolarLon) : 0;

            if (maxD - minD <= 180) {
              const p00 = projectAitoffRaw(r00.lonDeg, r00.latDeg, aitoffScale, cx, cy);
              const p10 = projectAitoffRaw(r10.lonDeg, r10.latDeg, aitoffScale, cx, cy);
              const p11 = projectAitoffRaw(r11.lonDeg, r11.latDeg, aitoffScale, cx, cy);
              const p01 = projectAitoffRaw(r01.lonDeg, r01.latDeg, aitoffScale, cx, cy);
              drawTexturedQuad(ctx, img, srcX, srcY, srcW, srcH, p00, p01, p11, p10);
            } else {
              // Cuadrante cruza el antimeridiano (±180°): dibujar en ambos bordes dentro del clip elíptico
              const pos00 = projectAitoffRaw(r00.lonDeg < 0 ? r00.lonDeg + 360 : r00.lonDeg, r00.latDeg, aitoffScale, cx, cy);
              const pos10 = projectAitoffRaw(r10.lonDeg < 0 ? r10.lonDeg + 360 : r10.lonDeg, r10.latDeg, aitoffScale, cx, cy);
              const pos11 = projectAitoffRaw(r11.lonDeg < 0 ? r11.lonDeg + 360 : r11.lonDeg, r11.latDeg, aitoffScale, cx, cy);
              const pos01 = projectAitoffRaw(r01.lonDeg < 0 ? r01.lonDeg + 360 : r01.lonDeg, r01.latDeg, aitoffScale, cx, cy);
              drawTexturedQuad(ctx, img, srcX, srcY, srcW, srcH, pos00, pos01, pos11, pos10);

              const neg00 = projectAitoffRaw(r00.lonDeg > 0 ? r00.lonDeg - 360 : r00.lonDeg, r00.latDeg, aitoffScale, cx, cy);
              const neg10 = projectAitoffRaw(r10.lonDeg > 0 ? r10.lonDeg - 360 : r10.lonDeg, r10.latDeg, aitoffScale, cx, cy);
              const neg11 = projectAitoffRaw(r11.lonDeg > 0 ? r11.lonDeg - 360 : r11.lonDeg, r11.latDeg, aitoffScale, cx, cy);
              const neg01 = projectAitoffRaw(r01.lonDeg > 0 ? r01.lonDeg - 360 : r01.lonDeg, r01.latDeg, aitoffScale, cx, cy);
              drawTexturedQuad(ctx, img, srcX, srcY, srcW, srcH, neg00, neg01, neg11, neg10);
            }
          } else {
            const p00 = projectRaDecToCanvas(w00.ra, w00.dec, ra0, dec0, scalePxPerRad, cx, cy);
            const p10 = projectRaDecToCanvas(w10.ra, w10.dec, ra0, dec0, scalePxPerRad, cx, cy);
            const p11 = projectRaDecToCanvas(w11.ra, w11.dec, ra0, dec0, scalePxPerRad, cx, cy);
            const p01 = projectRaDecToCanvas(w01.ra, w01.dec, ra0, dec0, scalePxPerRad, cx, cy);

            if (p00.cosC < -0.2 || p10.cosC < -0.2 || p11.cosC < -0.2 || p01.cosC < -0.2) {
              continue;
            }

            drawTexturedQuad(ctx, img, srcX, srcY, srcW, srcH, p00, p01, p11, p10);
          }
        }
      }
    }

    // 2. Malla Celeste Ecuatorial (RA / Dec Graticule)
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = isAitoff ? "rgba(148, 163, 184, 0.24)" : "rgba(148, 163, 184, 0.18)";
      ctx.fillStyle = "rgba(148, 163, 184, 0.72)";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.lineWidth = 1;

      if (isAitoff) {
        const seamJumpPx = aitoffScale * 2.2;
        // Paralelos de Declinación en Aitoff rotado
        for (let dec = -60; dec <= 60; dec += 30) {
          ctx.beginPath();
          let prevX: number | null = null;
          for (let ra = 0; ra <= 360; ra += 4) {
            const p = projectSky(ra, dec);
            if (prevX === null || Math.abs(p.x - prevX) > seamJumpPx) {
              ctx.moveTo(p.x, p.y);
            } else {
              ctx.lineTo(p.x, p.y);
            }
            prevX = p.x;
          }
          ctx.stroke();

          if (dec !== 0) {
            const decLabelPt = projectSky(ra0, dec);
            if (decLabelPt.x > 16 && decLabelPt.x < width - 36 && decLabelPt.y > 24 && decLabelPt.y < height - 24) {
              ctx.fillText(formatDectoDMSCompact(dec), decLabelPt.x + 4, decLabelPt.y - 3);
            }
          }
        }

        // Meridianos de Ascensión Recta cada 30° (2h)
        for (let ra = 0; ra < 360; ra += 30) {
          ctx.beginPath();
          let prevX: number | null = null;
          for (let dec = -90; dec <= 90; dec += 3) {
            const p = projectSky(ra, dec);
            if (prevX === null || Math.abs(p.x - prevX) > seamJumpPx) {
              ctx.moveTo(p.x, p.y);
            } else {
              ctx.lineTo(p.x, p.y);
            }
            prevX = p.x;
          }
          ctx.stroke();

          const { lonDeg } = rotateToAitoffLonLat(ra, 0, ra0, dec0);
          if (Math.abs(lonDeg) < 168) {
            const eqPt = projectSky(ra, 0);
            ctx.fillText(formatRAtoHMSCompact(ra), eqPt.x + 3, eqPt.y - 3);
          }
        }
      } else {
        const stepRa = fovDeg > 60 ? 30 : fovDeg > 20 ? 10 : fovDeg > 6 ? 2 : 1;
        const stepDec = fovDeg > 60 ? 20 : fovDeg > 20 ? 10 : fovDeg > 6 ? 2 : 1;

        for (let dec = -80; dec <= 80; dec += stepDec) {
          ctx.beginPath();
          let started = false;
          for (let ra = 0; ra <= 360; ra += 2) {
            const p = projectRaDecToCanvas(ra, dec, ra0, dec0, scalePxPerRad, cx, cy);
            if (
              p.cosC > 0.1 &&
              p.x >= -50 &&
              p.x <= width + 50 &&
              p.y >= -50 &&
              p.y <= height + 50
            ) {
              if (!started) {
                ctx.moveTo(p.x, p.y);
                started = true;
              } else {
                ctx.lineTo(p.x, p.y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        }

        for (let ra = 0; ra < 360; ra += stepRa) {
          ctx.beginPath();
          let started = false;
          for (let dec = -85; dec <= 85; dec += 2) {
            const p = projectRaDecToCanvas(ra, dec, ra0, dec0, scalePxPerRad, cx, cy);
            if (
              p.cosC > 0.1 &&
              p.x >= -50 &&
              p.x <= width + 50 &&
              p.y >= -50 &&
              p.y <= height + 50
            ) {
              if (!started) {
                ctx.moveTo(p.x, p.y);
                started = true;
              } else {
                ctx.lineTo(p.x, p.y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();

          const labelPt = projectRaDecToCanvas(ra, dec0, ra0, dec0, scalePxPerRad, cx, cy);
          if (
            labelPt.cosC > 0.2 &&
            labelPt.x > 24 &&
            labelPt.x < width - 40 &&
            labelPt.y > 54 &&
            labelPt.y < height - 54
          ) {
            ctx.fillText(formatRAtoHMSCompact(ra), labelPt.x + 3, labelPt.y - 3);
          }
        }
      }
      ctx.restore();
    }

    // 4. Huellas poligonales (`s_region`) de las exposiciones encontradas
    if (showFootprints && observations.length > 0) {
      ctx.save();
      const maxFootprints = Math.min(observations.length, 60);
      const isSameObs = (a: SpherexObservation, b: SpherexObservation) =>
        (a.access_url && b.access_url && a.access_url === b.access_url) ||
        (a.obs_id === b.obs_id && a.bandpass === b.bandpass);

      const drawFootprint = (obs: SpherexObservation, isSelected: boolean) => {
        const poly = parseSRegionPolygon(obs.s_region);
        if (poly.length < 3) return;

        const pts = poly.map((v) => projectSky(v.ra, v.dec));
        if (!isAitoff && pts.some((p) => p.cosC <= 0.05)) return;
        if (isAitoff) {
          const lons = poly.map((v) => rotateToAitoffLonLat(v.ra, v.dec, ra0, dec0).lonDeg);
          if (Math.max(...lons) - Math.min(...lons) > 180) return;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k].x, pts[k].y);
        }
        ctx.closePath();

        if (isSelected) {
          ctx.save();
          ctx.shadowColor = "#00D2FF";
          ctx.shadowBlur = 8;
          ctx.strokeStyle = "#00D2FF";
          ctx.fillStyle = "rgba(0, 210, 255, 0.16)";
          ctx.lineWidth = 2.5;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = "rgba(251, 191, 36, 0.30)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      for (let i = 0; i < maxFootprints; i++) {
        const obs = observations[i];
        if (selectedObs && isSameObs(obs, selectedObs)) continue;
        drawFootprint(obs, false);
      }

      // Always draw the active/selected FITS footprint on top, even if its index >= 60
      if (selectedObs) {
        drawFootprint(selectedObs, true);
      }
      ctx.restore();
    }

    // 4b. Resaltar en el Mapa 1 el recuadro exacto de lo que muestra el Mapa 2 cuando está abierto
    if (secondMapOpen) {
      const skyCorners =
        secondMapViewCorners && secondMapViewCorners.length === 4
          ? secondMapViewCorners
          : (() => {
              const boxCenter = markedPoint ?? targetCoords ?? viewCenter;
              const baseSizeDeg = targetCoords?.size ?? 0.15;
              const effectiveSizeDeg = baseSizeDeg / Math.max(1, secondMapZoom);
              const halfDec = effectiveSizeDeg / 2;
              const halfRa = halfDec / Math.max(0.15, Math.cos(boxCenter.dec * DEG2RAD));
              return [
                { ra: boxCenter.ra - halfRa, dec: boxCenter.dec - halfDec },
                { ra: boxCenter.ra + halfRa, dec: boxCenter.dec - halfDec },
                { ra: boxCenter.ra + halfRa, dec: boxCenter.dec + halfDec },
                { ra: boxCenter.ra - halfRa, dec: boxCenter.dec + halfDec },
              ];
            })();

      const boxCorners = skyCorners.map((c) => projectSky(c.ra, c.dec));

      if (isAitoff || !boxCorners.some((p) => p.cosC <= 0.05)) {
        ctx.save();
        ctx.strokeStyle = "#00D2FF";
        ctx.fillStyle = "rgba(0, 210, 255, 0.16)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(boxCorners[0].x, boxCorners[0].y);
        ctx.lineTo(boxCorners[1].x, boxCorners[1].y);
        ctx.lineTo(boxCorners[2].x, boxCorners[2].y);
        ctx.lineTo(boxCorners[3].x, boxCorners[3].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 6. Marcador destacado del punto seleccionado con doble clic (`markedPoint`)
    if (markedPoint) {
      const mProj = projectSky(markedPoint.ra, markedPoint.dec);
      if (isAitoff || mProj.cosC > 0.05) {
        ctx.save();
        ctx.strokeStyle = "#FFB703";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(mProj.x, mProj.y, 13, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#FFB703";
        ctx.beginPath();
        ctx.arc(mProj.x, mProj.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 6b. Trayectoria observada y ubicación predicha (extrapolación)
    if (activeTrajectory) {
      const obsProjected = activeTrajectory.trajectory.points
        .map((pt, idx) => ({
          idx,
          pt,
          proj: projectSky(pt.ra, pt.dec),
        }))
        .filter((item) => isAitoff || item.proj.cosC > 0.05);

      ctx.save();
      if (obsProjected.length >= 2) {
        ctx.strokeStyle = "#00D2FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obsProjected[0].proj.x, obsProjected[0].proj.y);
        for (let i = 1; i < obsProjected.length; i++) {
          ctx.lineTo(obsProjected[i].proj.x, obsProjected[i].proj.y);
        }
        ctx.stroke();
      }

      for (const item of obsProjected) {
        ctx.fillStyle = "#00D2FF";
        ctx.beginPath();
        ctx.arc(item.proj.x, item.proj.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (activeTrajectory.extrapolated) {
        const ext = activeTrajectory.extrapolated;
        const extProj = projectSky(ext.ra, ext.dec);
        if (isAitoff || extProj.cosC > 0.05) {
          const lastObs = obsProjected[obsProjected.length - 1];
          if (lastObs) {
            ctx.save();
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(lastObs.proj.x, lastObs.proj.y);
            ctx.lineTo(extProj.x, extProj.y);
            ctx.stroke();
            ctx.restore();
          }

          // Uncertainty halo & radius
          const uncertaintyRad = (ext.uncertaintyArcsec / 3600) * DEG2RAD;
          const sigmaPx = isAitoff
            ? 12
            : Math.max(10, Math.min(80, uncertaintyRad * scalePxPerRad));

          const glow = ctx.createRadialGradient(
            extProj.x,
            extProj.y,
            2,
            extProj.x,
            extProj.y,
            sigmaPx + 10
          );
          glow.addColorStop(0, "rgba(251, 191, 36, 0.7)");
          glow.addColorStop(0.5, "rgba(251, 191, 36, 0.2)");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(extProj.x, extProj.y, sigmaPx + 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(extProj.x, extProj.y, sigmaPx, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Predicted location center marker
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(extProj.x, extProj.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Label next to predicted location
          const label = `${ext.targetDate} (±${ext.uncertaintyArcsec.toFixed(1)}″)`;
          ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
          const textW = ctx.measureText(label).width;
          const padX = 6;
          const boxW = textW + padX * 2;
          const boxH = 18;
          const boxX = Math.min(width - boxW - 6, Math.max(6, extProj.x + 10));
          const boxY = Math.min(height - boxH - 6, Math.max(6, extProj.y - boxH / 2));

          ctx.fillStyle = "rgba(7, 11, 25, 0.88)";
          ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fde68a";
          ctx.textBaseline = "middle";
          ctx.fillText(label, boxX + padX, boxY + boxH / 2);
        }
      }
      ctx.restore();
    }

    // 7. Cerrar clip elíptico y dibujar borde de la proyección Aitoff All-Sky
    if (isAitoff) {
      ctx.restore();
      ctx.save();
      buildAitoffEllipsePath(ctx, aitoffScale, cx, cy);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }, [
    canvasSize,
    viewCenter,
    fovDeg,
    channelIdx,
    activeOrder,
    showFootprints,
    showGrid,
    observations,
    selectedObs,
    targetCoords,
    markedPoint,
    secondMapOpen,
    secondMapZoom,
    secondMapViewCorners,
    activeTrajectory,
    renderTick,
    triggerRepaint,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startRa: viewCenter.ra,
      startDec: viewCenter.dec,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const isAitoff = fovDeg >= AITOFF_THRESHOLD_FOV;
    const fovRad = Math.max(MIN_FOV_DEG, Math.min(160, fovDeg)) * DEG2RAD;
    const scalePxPerRad = Math.min(canvas.width, canvas.height) / (2 * Math.tan(fovRad / 4) * 2);
    const aitoffScale = getAitoffScale(canvas.width, canvas.height, fovDeg);

    const hovered = isAitoff
      ? unprojectAitoffToRaDec(
          canvasX,
          canvasY,
          viewCenter.ra,
          viewCenter.dec,
          aitoffScale,
          canvas.width / 2,
          canvas.height / 2
        )
      : unprojectCanvasToRaDec(
          canvasX,
          canvasY,
          viewCenter.ra,
          viewCenter.dec,
          scalePxPerRad,
          canvas.width / 2,
          canvas.height / 2
        );
    setCursorCoords(hovered);

    if (!dragRef.current.dragging) return;

    const dxPx = e.clientX - dragRef.current.startX;
    const dyPx = e.clientY - dragRef.current.startY;

    if (isAitoff) {
      const aitoffWidthPx = Math.max(1, (aitoffScale * 4 * Math.SQRT2) / scaleX);
      const degPerPx = 360 / aitoffWidthPx;
      const cosDec = Math.max(0.2, Math.cos(dragRef.current.startDec * DEG2RAD));
      const newRa = (((dragRef.current.startRa + (dxPx * degPerPx) / cosDec) % 360) + 360) % 360;
      const newDec = Math.max(-88, Math.min(88, dragRef.current.startDec + dyPx * degPerPx));
      setViewCenter({ ra: newRa, dec: newDec });
      return;
    }

    const degPerPx = fovDeg / Math.min(rect.width, rect.height);
    const cosDec = Math.max(0.15, Math.cos(dragRef.current.startDec * DEG2RAD));
    const newRa = (((dragRef.current.startRa + (dxPx * degPerPx) / cosDec) % 360) + 360) % 360;
    const newDec = Math.max(-88, Math.min(88, dragRef.current.startDec + dyPx * degPerPx));

    setViewCenter({ ra: newRa, dec: newDec });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.dragging) {
      dragRef.current.dragging = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Zoom con rueda del mouse en el mapa celeste
  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY === 0) return;
      const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
      setFovDeg((prev) => Number(Math.max(MIN_FOV_DEG, Math.min(MAX_FOV_DEG, prev * factor)).toFixed(2)));
    };

    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onNativeWheel);
    };
  }, []);

  // Al hacer doble clic sobre un punto en el mapa, marca el punto y hace surgir el segundo mapa dividiendo el espacio en 2
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    let picked = cursorCoords;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
      const isAitoff = fovDeg >= AITOFF_THRESHOLD_FOV;
      const fovRad = Math.max(MIN_FOV_DEG, Math.min(160, fovDeg)) * DEG2RAD;
      const scalePxPerRad = Math.min(canvas.width, canvas.height) / (2 * Math.tan(fovRad / 4) * 2);
      const aitoffScale = getAitoffScale(canvas.width, canvas.height, fovDeg);
      picked =
        (isAitoff
          ? unprojectAitoffToRaDec(
              canvasX,
              canvasY,
              viewCenter.ra,
              viewCenter.dec,
              aitoffScale,
              canvas.width / 2,
              canvas.height / 2
            )
          : unprojectCanvasToRaDec(
              canvasX,
              canvasY,
              viewCenter.ra,
              viewCenter.dec,
              scalePxPerRad,
              canvas.width / 2,
              canvas.height / 2
            )) ?? cursorCoords;
    }

    if (!picked) return;
    setMarkedPoint({ ra: picked.ra, dec: picked.dec });
    onToggleSecondMap?.(true);
    onQueryAtCoords?.(picked.ra, picked.dec);
  };

  const currentWavelengthUm = SPHEREX_HIPS_WAVELENGTHS_UM[channelIdx] ?? 0.753;
  const currentBandLabel = getBandLabelForChannel(channelIdx);

  const readoutRa = targetCoords?.ra ?? viewCenter.ra;
  const readoutDec = targetCoords?.dec ?? viewCenter.dec;

  return (
    <div
      id="tutorial-exp-map1"
      ref={mapViewportRef}
      className={`relative w-full h-full overflow-hidden border border-white/15 bg-black shadow-2xl select-none overscroll-none ${
        isFullscreen ? "rounded-none" : "rounded-[22px]"
      } ${secondMapOpen ? "min-h-0" : "min-h-[280px]"}`}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setCursorCoords(null)}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
      />

      {secondMapOpen ? (
        <>
          {/* Compact Top Bar when Map 2 is dominant */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="glass-panel rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-200 min-w-0 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF] shrink-0" />
              <span className="truncate">{targetName}</span>
              <span className="text-[10px] text-[#00D2FF] shrink-0">
                {fovDeg.toFixed(1)}°
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="btn-press glass-panel rounded-full p-1.5 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title={isFullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
                aria-label={isFullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {cursorCoords && (
            <div className="glass-panel absolute top-12 left-3 z-10 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono text-slate-100 pointer-events-none border-[#00D2FF]/40 max-w-[calc(100%-1.5rem)] truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
              <span className="truncate">
                RA {formatRAtoHMS(cursorCoords.ra)} · Dec {formatDectoDMS(cursorCoords.dec)}
              </span>
            </div>
          )}

          {/* Compact Bottom Bar: FITS sections & Zoom/Refit */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1.5 pointer-events-none">
            <div className="glass-panel rounded-full px-2 py-1 flex items-center gap-1 text-[10px] pointer-events-auto">
              <button
                type="button"
                onClick={() => setShowFootprints((v) => !v)}
                className={`btn-press px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                  showFootprints
                    ? "bg-amber-500/30 text-amber-200"
                    : "text-slate-400 hover:text-white"
                }`}
                title={t.skyMap.footprintsLabel}
              >
                <Compass className="w-3 h-3" />
                <span>FITS</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={`btn-press p-1 rounded-full transition-colors cursor-pointer ${
                  showGrid ? "bg-[#00D2FF]/25 text-[#00D2FF]" : "text-slate-400 hover:text-white"
                }`}
                title={t.skyMap.gridLabel}
              >
                <Grid className="w-3 h-3" />
              </button>
            </div>

            <div className="glass-panel rounded-full px-2 py-1 flex items-center gap-0.5 text-xs text-slate-300 pointer-events-auto">
              <button
                type="button"
                onClick={() => setFovDeg((f) => Math.max(MIN_FOV_DEG, Number((f * 0.7).toFixed(2))))}
                className="p-1 hover:text-white cursor-pointer"
                title={t.viewer.zoomInTitle}
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setFovDeg((f) => Math.min(MAX_FOV_DEG, Number((f / 0.7).toFixed(2))))}
                className="p-1 hover:text-white cursor-pointer"
                title={t.viewer.zoomOutTitle}
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const center = targetCoords ?? markedPoint ?? viewCenter;
                  setViewCenter({ ra: center.ra, dec: center.dec });
                  setFovDeg(computeFitsBoundsFov(center, observations, targetCoords?.size));
                }}
                className="p-1 hover:text-[#00D2FF] border-l border-white/10 pl-1.5 cursor-pointer"
                title={t.skyMap.centerOnTarget}
              >
                <Crosshair className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Top-Left Coordinates Pill (Exact CHRONO-SPHEREx style) */}
          <div className="glass-panel absolute top-4 left-4 rounded-full px-4 py-1.5 flex items-center gap-2.5 text-xs font-mono text-slate-100 pointer-events-none max-w-[65%] truncate">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF] shrink-0" />
            <span className="truncate">
              RA {formatRAtoHMS(readoutRa)} · Dec {formatDectoDMS(readoutDec)}
            </span>
          </div>

          {cursorCoords && (
            <div className="glass-panel absolute top-14 left-4 z-10 rounded-full px-3.5 py-1 flex items-center gap-2 text-[11px] font-mono text-slate-100 pointer-events-none border-[#00D2FF]/40 max-w-[65%] truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
              <span className="truncate">
                RA {formatRAtoHMS(cursorCoords.ra)} · Dec {formatDectoDMS(cursorCoords.dec)}
              </span>
            </div>
          )}

          {/* Top-Right Target Badge + Map Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end max-w-[65%]">
            <div className="glass-panel rounded-full px-3.5 py-1.5 text-xs text-slate-200 font-medium flex items-center gap-2">
              <span className="truncate max-w-[160px]">{targetName}</span>
              <span className="text-[10px] font-mono text-[#00D2FF]">
                {fovDeg >= AITOFF_THRESHOLD_FOV ? "AIT · " : ""}FOV {fovDeg.toFixed(0)}°
              </span>
            </div>

            {/* Toggle 2nd Map Split Button */}
            {onToggleSecondMap && (
              <button
                type="button"
                onClick={() => onToggleSecondMap(!secondMapOpen)}
                className="btn-press glass-panel rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors text-slate-200 hover:text-white"
                title={t.chrono.splitSecondMapButton}
              >
                <Columns2 className="w-3.5 h-3.5 text-[#00D2FF]" />
                <span className="hidden sm:inline">{t.chrono.splitSecondMapButton}</span>
              </button>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="btn-press glass-panel rounded-full p-2 text-slate-200 hover:text-white cursor-pointer transition-colors"
              title={isFullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
              aria-label={isFullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Bottom-Left Layer & Zoom Pill Controls */}
          <div
            id="tutorial-exp-map1-controls"
            className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
          >
            <div className="glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] pointer-events-auto flex-wrap">
              <button
                type="button"
                onClick={() => setShowFootprints((v) => !v)}
                className={`btn-press px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                  showFootprints
                    ? "bg-amber-500/30 text-amber-200"
                    : "text-slate-400 hover:text-white"
                }`}
                title={t.skyMap.footprintsLabel}
              >
                <Compass className="w-3 h-3" />
                <span>FITS</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={`btn-press px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                  showGrid ? "bg-[#00D2FF]/25 text-[#00D2FF]" : "text-slate-400 hover:text-white"
                }`}
                title={t.skyMap.gridLabel}
              >
                <Grid className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setShowChannelBar((v) => !v)}
                className={`btn-press px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 font-mono ${
                  showChannelBar
                    ? "bg-[#00D2FF]/25 text-[#00D2FF]"
                    : "text-slate-300 hover:text-white"
                }`}
                title={t.skyMap.channelLabel}
              >
                <SlidersHorizontal className="w-3 h-3 text-[#00D2FF]" />
                <span>{currentWavelengthUm.toFixed(2)}µm</span>
              </button>
            </div>

            {/* Right Floating Zoom & Pin Pill */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {markedPoint && (
                <div className="glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-200">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="hidden md:inline">
                    RA {formatRAtoHMS(markedPoint.ra)} · Dec {formatDectoDMS(markedPoint.dec)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMarkedPoint(null)}
                    className="hover:text-white cursor-pointer"
                    title={t.skyMap.clearPinAction}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {onQueryAtCoords && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSecondMap?.(true);
                    onQueryAtCoords(viewCenter.ra, viewCenter.dec);
                  }}
                  className="btn-press glass-panel rounded-full px-3 py-1.5 text-[11px] font-medium text-[#00D2FF] hover:text-white flex items-center gap-1.5 cursor-pointer"
                  title={t.skyMap.searchHereButton}
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">{t.skyMap.searchHereButton}</span>
                </button>
              )}

              <div className="glass-panel rounded-full px-2.5 py-1 flex items-center gap-1 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => setFovDeg((f) => Math.max(MIN_FOV_DEG, Number((f * 0.7).toFixed(2))))}
                  className="p-1 hover:text-white cursor-pointer"
                  title={t.viewer.zoomInTitle}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFovDeg((f) => Math.min(MAX_FOV_DEG, Number((f / 0.7).toFixed(2))))}
                  className="p-1 hover:text-white cursor-pointer"
                  title={t.viewer.zoomOutTitle}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewCenter((v) => ({ ra: v.ra, dec: 0 }));
                    setFovDeg(MAX_FOV_DEG);
                  }}
                  className={`p-1 border-l border-white/10 pl-1.5 cursor-pointer ${
                    fovDeg >= AITOFF_THRESHOLD_FOV
                      ? "text-[#00D2FF]"
                      : "hover:text-[#00D2FF]"
                  }`}
                  title={t.skyMap.allSkyButton}
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
                {targetCoords && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewCenter({ ra: targetCoords.ra, dec: targetCoords.dec });
                      setFovDeg(25);
                    }}
                    className="p-1 hover:text-[#00D2FF] border-l border-white/10 pl-1.5 cursor-pointer"
                    title={t.skyMap.centerOnTarget}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFovDeg(35)}
                  className="p-1 hover:text-white border-l border-white/10 pl-1.5 cursor-pointer"
                  title={t.viewer.resetZoomTitle}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Map 1 NASA/IRSA HiPS API Down Alert */}
      {hipsApiDown && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-auto">
          <div className="glass-panel rounded-2xl border border-rose-500/40 bg-rose-950/75 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-100 shadow-xl">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-snug">{t.status.map1ApiDown}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                void retryHipsApiHealth().then(() => triggerRepaint());
              }}
              className="btn-press px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/35 text-[11px] font-medium text-white shrink-0 cursor-pointer"
            >
              {t.status.retryApi}
            </button>
          </div>
        </div>
      )}

      {/* Popover HiPS 102-Channel Spectral Slider */}
      {showChannelBar && (
        <div className="glass-panel absolute bottom-16 left-4 right-4 max-w-md rounded-2xl px-4 py-2.5 flex items-center gap-3 text-xs z-20">
          <span className="font-mono text-[11px] text-[#00D2FF] shrink-0">
            Ch {channelIdx + 1}/102 · {currentWavelengthUm.toFixed(3)} µm ({currentBandLabel})
          </span>
          <input
            type="range"
            min={0}
            max={SPHEREX_HIPS_WAVELENGTHS_UM.length - 1}
            step={1}
            value={channelIdx}
            onChange={(e) => setChannelIdx(Number(e.target.value))}
            className="apple-slider flex-1"
            aria-label={t.skyMap.channelLabel}
          />
        </div>
      )}
    </div>
  );
};
