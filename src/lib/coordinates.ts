import type { FitsWcs } from "./types";

export const MIN_CUTOUT_FOV_DEG = 0.02;
export const MAX_CUTOUT_FOV_DEG = 1.0;
export const DEFAULT_CUTOUT_FOV_DEG = MAX_CUTOUT_FOV_DEG;

export function clampCutoutFov(sizeDeg: number): number {
  return Number(Math.min(MAX_CUTOUT_FOV_DEG, Math.max(MIN_CUTOUT_FOV_DEG, sizeDeg)).toFixed(3));
}

/**
 * Parsea Ascensión Recta en grados decimales (ej. "133.795129")
 * o en formato sexagesimal HMS (ej. "08h55m10.831s", "08:55:10.831", "08 55 10.831").
 */
export function parseRA(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Decimal puro
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    const val = Number(s);
    if (!Number.isFinite(val) || val < 0 || val > 360) return null;
    return val;
  }

  // Sexagesimal HMS: 08h55m10.831s | 08:55:10.831 | 08 55 10.831
  const match = s.match(
    /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:\s]\s*(\d{1,2}(?:\.\d+)?)\s*s?$/i
  );
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  const sec = Number(match[3]);
  if (h > 24 || m >= 60 || sec >= 60) return null;

  const deg = (h + m / 60 + sec / 3600) * 15;
  return deg >= 0 && deg <= 360 ? deg : null;
}

/**
 * Parsea Declinación en grados decimales (ej. "-7.245147")
 * o en formato sexagesimal DMS (ej. "-7d14m42.53s", "-07:14:42.53", "-7°14'42.53\"").
 */
export function parseDec(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    const val = Number(s);
    if (!Number.isFinite(val) || val < -90 || val > 90) return null;
    return val;
  }

  const match = s.match(
    /^([+-]?)\s*(\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m':\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"]?$/i
  );
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const d = Number(match[2]);
  const m = Number(match[3]);
  const sec = Number(match[4]);
  if (d > 90 || m >= 60 || sec >= 60) return null;

  const deg = sign * (d + m / 60 + sec / 3600);
  return deg >= -90 && deg <= 90 ? deg : null;
}

/**
 * Convierte grados a formato sexagesimal HMS (para RA)
 */
export function formatRAtoHMS(deg: number): string {
  const hoursTotal = deg / 15;
  const h = Math.floor(hoursTotal);
  const minutesTotal = (hoursTotal - h) * 60;
  const m = Math.floor(minutesTotal);
  const s = ((minutesTotal - m) * 60).toFixed(3);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${s.padStart(6, "0")}s`;
}

/**
 * Convierte grados a formato sexagesimal DMS (para Dec)
 */
export function formatDectoDMS(deg: number): string {
  const sign = deg < 0 ? "-" : "+";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const minutesTotal = (abs - d) * 60;
  const m = Math.floor(minutesTotal);
  const s = ((minutesTotal - m) * 60).toFixed(2);
  return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${s.padStart(5, "0")}"`;
}

/**
 * Convierte Día Juliano Modificado (MJD) a fecha y hora UTC legible.
 * MJD 40587 corresponde a 1970-01-01T00:00:00Z.
 */
export function mjdToUtc(mjd: number | null): { date: string; dateTime: string } | null {
  if (mjd === null || !Number.isFinite(mjd)) return null;
  const unixMs = (mjd - 40587) * 86400 * 1000;
  const d = new Date(unixMs);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString();
  return {
    date: iso.slice(0, 10),
    dateTime: `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`,
  };
}

export interface AxisTick {
  /** Posición normalizada [0..1] a lo largo del eje (X: izq->der, Y: arriba->abajo) */
  fraction: number;
  /** Etiqueta formateada en HMS (RA) o DMS (Dec) */
  label: string;
  /** Valor numérico en grados */
  value: number;
}

/**
 * Convierte coordenadas de píxel FITS (1-indexadas, origen abajo-izquierda)
 * a coordenadas celestes ICRS (RA, Dec en grados) usando proyección gnomónica (TAN).
 */
export function pixelToWorld(
  px: number,
  py: number,
  wcs: FitsWcs
): { ra: number; dec: number } {
  const dx = px - wcs.crpix1;
  const dy = py - wcs.crpix2;

  const xiDeg = wcs.cd1_1 * dx + wcs.cd1_2 * dy;
  const etaDeg = wcs.cd2_1 * dx + wcs.cd2_2 * dy;

  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const xi = xiDeg * deg2rad;
  const eta = etaDeg * deg2rad;
  const ra0 = wcs.crval1 * deg2rad;
  const dec0 = wcs.crval2 * deg2rad;

  const rho = Math.hypot(xi, eta);
  if (rho === 0) {
    return {
      ra: ((wcs.crval1 % 360) + 360) % 360,
      dec: wcs.crval2,
    };
  }

  const c = Math.atan(rho);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const sinDec0 = Math.sin(dec0);
  const cosDec0 = Math.cos(dec0);

  const decRad = Math.asin(cosC * sinDec0 + (eta * sinC * cosDec0) / rho);
  const raRad = ra0 + Math.atan2(xi * sinC, rho * cosDec0 * cosC - eta * sinDec0 * sinC);

  const raDeg = ((raRad * rad2deg) % 360 + 360) % 360;
  const decDeg = decRad * rad2deg;

  return { ra: raDeg, dec: decDeg };
}

/**
 * Convierte coordenadas celestes ICRS (RA, Dec en grados) a coordenadas de píxel FITS
 * (1-indexadas, origen abajo-izquierda) usando proyección gnomónica inversa (TAN).
 */
export function worldToPixel(
  ra: number,
  dec: number,
  wcs: FitsWcs
): { px: number; py: number } | null {
  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const raRad = ra * deg2rad;
  const decRad = dec * deg2rad;
  const ra0 = wcs.crval1 * deg2rad;
  const dec0 = wcs.crval2 * deg2rad;
  const dRa = raRad - ra0;

  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinDec0 = Math.sin(dec0);
  const cosDec0 = Math.cos(dec0);
  const cosDRa = Math.cos(dRa);

  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * cosDRa;
  if (cosC <= 1e-9) return null;

  const xiDeg = ((cosDec * Math.sin(dRa)) / cosC) * rad2deg;
  const etaDeg = ((cosDec0 * sinDec - sinDec0 * cosDec * cosDRa) / cosC) * rad2deg;

  const det = wcs.cd1_1 * wcs.cd2_2 - wcs.cd1_2 * wcs.cd2_1;
  if (Math.abs(det) < 1e-18) return null;

  const dx = (wcs.cd2_2 * xiDeg - wcs.cd1_2 * etaDeg) / det;
  const dy = (-wcs.cd2_1 * xiDeg + wcs.cd1_1 * etaDeg) / det;

  return {
    px: wcs.crpix1 + dx,
    py: wcs.crpix2 + dy,
  };
}

/**
 * Devuelve la posición normalizada [0..1, 0..1] (origen arriba-izquierda de la imagen)
 * de un objetivo celeste dentro de un recorte FITS renderizado.
 */
export function getTargetImageFraction(
  width: number,
  height: number,
  wcs: FitsWcs | null,
  target: { ra: number; dec: number } | null
): { xFrac: number; yFrac: number } | null {
  if (width <= 0 || height <= 0) return null;
  if (!wcs || !target) return { xFrac: 0.5, yFrac: 0.5 };

  const pix = worldToPixel(target.ra, target.dec, wcs);
  if (!pix) return { xFrac: 0.5, yFrac: 0.5 };

  return {
    xFrac: (pix.px - 0.5) / width,
    yFrac: 1 - (pix.py - 0.5) / height,
  };
}

/**
 * Formatea RA (grados) en HMS compacto para etiquetas de grilla y ejes.
 */
export function formatRAtoHMSCompact(deg: number): string {
  const totalSec = Math.round(((((deg % 360) + 360) % 360) * 240) * 10) / 10;
  const wrapped = ((totalSec % 86400) + 86400) % 86400;
  const h = Math.floor(wrapped / 3600);
  const rem = wrapped - h * 3600;
  const m = Math.floor(rem / 60);
  const s = Math.round((rem - m * 60) * 10) / 10;
  if (Math.abs(s) < 1e-6) {
    if (m === 0) return `${String(h).padStart(2, "0")}h`;
    return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m`;
  }
  const sStr = Number.isInteger(s) ? String(s).padStart(2, "0") : s.toFixed(1).padStart(4, "0");
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${sStr}s`;
}

/**
 * Formatea Dec (grados) en DMS compacto para etiquetas de grilla y ejes.
 */
export function formatDectoDMSCompact(deg: number): string {
  const sign = deg < 0 ? "-" : "+";
  const totalArcsec = Math.round(Math.abs(deg) * 3600 * 10) / 10;
  const d = Math.floor(totalArcsec / 3600);
  const rem = totalArcsec - d * 3600;
  const m = Math.floor(rem / 60);
  const s = Math.round((rem - m * 60) * 10) / 10;
  if (Math.abs(s) < 1e-6) {
    if (m === 0) return `${sign}${String(d).padStart(2, "0")}°`;
    return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'`;
  }
  const sStr = Number.isInteger(s) ? String(s).padStart(2, "0") : s.toFixed(1).padStart(4, "0");
  return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${sStr}"`;
}

const NICE_SEXAGESIMAL_STEPS = [
  0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 18000, 36000,
];

function formatSexagesimalTick(
  valUnits: number,
  stepUnits: number,
  axis: "ra" | "dec"
): string {
  const showDecimals = stepUnits < 1;
  const scale = showDecimals ? 10 : 1;

  if (axis === "ra") {
    const wrapped = (((Math.round(valUnits * scale) / scale) % 86400) + 86400) % 86400;
    const h = Math.floor(wrapped / 3600);
    const rem = wrapped - h * 3600;
    const m = Math.floor(rem / 60);
    const s = Math.round((rem - m * 60) * scale) / scale;
    if (stepUnits >= 60 && Math.abs(s) < 1e-6) {
      return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m`;
    }
    const sStr = showDecimals ? s.toFixed(1).padStart(4, "0") : String(Math.round(s)).padStart(2, "0");
    return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${sStr}s`;
  }

  const sign = valUnits < 0 ? "-" : "+";
  const absUnits = Math.round(Math.abs(valUnits) * scale) / scale;
  const d = Math.floor(absUnits / 3600);
  const rem = absUnits - d * 3600;
  const m = Math.floor(rem / 60);
  const s = Math.round((rem - m * 60) * scale) / scale;
  if (stepUnits >= 60 && Math.abs(s) < 1e-6) {
    return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'`;
  }
  const sStr = showDecimals ? s.toFixed(1).padStart(4, "0") : String(Math.round(s)).padStart(2, "0");
  return `${sign}${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${sStr}"`;
}

function generateNiceTicks(
  startVal: number,
  endVal: number,
  targetCount: number,
  axis: "ra" | "dec"
): AxisTick[] {
  const minVal = Math.min(startVal, endVal);
  const maxVal = Math.max(startVal, endVal);
  const range = maxVal - minVal;

  if (range <= 0 || !Number.isFinite(range)) return [];

  const unitScale = axis === "ra" ? 240 : 3600;
  const minUnits = minVal * unitScale;
  const maxUnits = maxVal * unitScale;
  const rangeUnits = maxUnits - minUnits;
  const rawStep = rangeUnits / targetCount;

  const step =
    NICE_SEXAGESIMAL_STEPS.find((s) => s >= rawStep * 0.85) ??
    Math.pow(10, Math.ceil(Math.log10(rawStep)));

  const kStart = Math.ceil(minUnits / step);
  const kEnd = Math.floor(maxUnits / step);
  const ticks: AxisTick[] = [];

  for (let k = kStart; k <= kEnd; k++) {
    const valUnits = k * step;
    const valDeg = valUnits / unitScale;
    const fraction = (valDeg - startVal) / (endVal - startVal);
    if (fraction < 0.04 || fraction > 0.96) continue;

    const displayVal = axis === "ra" ? ((valDeg % 360) + 360) % 360 : valDeg;
    const cleanVal = Math.abs(displayVal) < 1e-12 ? 0 : displayVal;

    ticks.push({
      fraction,
      value: cleanVal,
      label: formatSexagesimalTick(valUnits, step, axis),
    });
  }

  return ticks;
}

export interface NormalizedImageBounds {
  xMinFrac: number;
  xMaxFrac: number;
  yMinFrac: number;
  yMaxFrac: number;
}

/**
 * Calcula los 4 vértices celestes (RA, Dec) del sub-rectángulo visible actual
 * dentro de un recorte FITS renderizado.
 */
export function computeVisibleSkyPolygon(
  width: number,
  height: number,
  wcs: FitsWcs | null,
  visibleBounds?: NormalizedImageBounds
): { ra: number; dec: number }[] | null {
  if (!wcs || width <= 0 || height <= 0) return null;
  const xMin = visibleBounds?.xMinFrac ?? 0;
  const xMax = visibleBounds?.xMaxFrac ?? 1;
  const yMin = visibleBounds?.yMinFrac ?? 0;
  const yMax = visibleBounds?.yMaxFrac ?? 1;

  const pxLeft = 0.5 + xMin * width;
  const pxRight = 0.5 + xMax * width;
  const pyBottom = 0.5 + (1 - yMax) * height;
  const pyTop = 0.5 + (1 - yMin) * height;

  return [
    pixelToWorld(pxLeft, pyBottom, wcs),
    pixelToWorld(pxRight, pyBottom, wcs),
    pixelToWorld(pxRight, pyTop, wcs),
    pixelToWorld(pxLeft, pyTop, wcs),
  ];
}

/**
 * Calcula los ticks cartesianos de RA (eje X inferior) y Dec (eje Y izquierdo)
 * alrededor de la imagen FITS, ajustados al WCS real y a la región visible actual.
 */
export function computeAxisTicks(
  width: number,
  height: number,
  wcs: FitsWcs | null,
  fallbackCenter: { ra: number; dec: number; size: number },
  visibleBounds?: NormalizedImageBounds
): { xTicks: AxisTick[]; yTicks: AxisTick[] } {
  const xMin = visibleBounds?.xMinFrac ?? 0;
  const xMax = visibleBounds?.xMaxFrac ?? 1;
  const yMin = visibleBounds?.yMinFrac ?? 0;
  const yMax = visibleBounds?.yMaxFrac ?? 1;

  let raStart: number;
  let raEnd: number;
  let decTop: number;
  let decBottom: number;

  if (wcs && width > 0 && height > 0) {
    const pxLeft = 0.5 + xMin * width;
    const pxRight = 0.5 + xMax * width;
    const pyBottom = 0.5 + (1 - yMax) * height;
    const pyTop = 0.5 + (1 - yMin) * height;

    const bottomLeft = pixelToWorld(pxLeft, pyBottom, wcs);
    const bottomRight = pixelToWorld(pxRight, pyBottom, wcs);
    const topLeft = pixelToWorld(pxLeft, pyTop, wcs);

    raStart = bottomLeft.ra;
    raEnd = bottomRight.ra;
    if (raEnd - raStart > 180) raEnd -= 360;
    if (raEnd - raStart < -180) raEnd += 360;

    decTop = topLeft.dec;
    decBottom = bottomLeft.dec;
  } else {
    const cosDec = Math.max(0.05, Math.cos((fallbackCenter.dec * Math.PI) / 180));
    const fullRaSpan = MAX_CUTOUT_FOV_DEG / cosDec;
    const fullDecSpan = MAX_CUTOUT_FOV_DEG;
    const raLeftEdge = fallbackCenter.ra + fullRaSpan / 2;
    const decTopEdge = fallbackCenter.dec + fullDecSpan / 2;

    raStart = raLeftEdge - xMin * fullRaSpan;
    raEnd = raLeftEdge - xMax * fullRaSpan;
    decTop = decTopEdge - yMin * fullDecSpan;
    decBottom = decTopEdge - yMax * fullDecSpan;
  }

  return {
    xTicks: generateNiceTicks(raStart, raEnd, 4, "ra"),
    yTicks: generateNiceTicks(decTop, decBottom, 4, "dec"),
  };
}
