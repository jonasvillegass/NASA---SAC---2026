import type {
  ColormapName,
  CutoutStats,
  FitsWaveCalibration,
  FitsWcs,
  RenderedCutout,
  StretchMode,
} from "./types";

interface FitsHdu {
  name: string;
  header: Record<string, string>;
  bitpix: number;
  naxis: number;
  naxis1: number;
  naxis2: number;
  bscale: number;
  bzero: number;
  dataOffset: number;
  dataBytes: number;
}

const FITS_BLOCK = 2880;

function parseHeaderCard(card: string): { key: string; value: string } | null {
  const key = card.slice(0, 8).trim();
  if (!key || key === "COMMENT" || key === "HISTORY" || key === "END") return null;
  if (card[8] !== "=") return null;

  let raw = card.slice(10).trim();
  if (raw.startsWith("'")) {
    const endQuote = raw.indexOf("'", 1);
    if (endQuote !== -1) {
      return { key, value: raw.slice(1, endQuote).trim() };
    }
  }
  const slashIdx = raw.indexOf("/");
  if (slashIdx !== -1) {
    raw = raw.slice(0, slashIdx).trim();
  }
  return { key, value: raw };
}

/**
 * Descomprime gzip usando el API estándar web DecompressionStream si viene comprimido.
 */
export async function decompressIfNeeded(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(arrayBuffer);
  // Cabecera GZIP: 0x1F, 0x8B
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("gzip");
      const stream = new Response(arrayBuffer).body!.pipeThrough(ds);
      return await new Response(stream).arrayBuffer();
    }
  }
  return arrayBuffer;
}

function parseFitsHdus(buffer: ArrayBuffer): FitsHdu[] {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder("ascii");
  const hdus: FitsHdu[] = [];
  let offset = 0;

  while (offset + FITS_BLOCK <= bytes.length) {
    const header: Record<string, string> = {};
    let foundEnd = false;
    let headerOffset = offset;

    while (headerOffset + FITS_BLOCK <= bytes.length) {
      const block = textDecoder.decode(bytes.subarray(headerOffset, headerOffset + FITS_BLOCK));
      for (let i = 0; i < 36; i++) {
        const card = block.slice(i * 80, (i + 1) * 80);
        if (card.slice(0, 8).trim() === "END") {
          foundEnd = true;
          break;
        }
        const parsed = parseHeaderCard(card);
        if (parsed) {
          header[parsed.key] = parsed.value;
        }
      }
      headerOffset += FITS_BLOCK;
      if (foundEnd) break;
    }

    if (!foundEnd) break;

    const bitpix = Number(header["BITPIX"] ?? 8);
    const naxis = Number(header["NAXIS"] ?? 0);
    const gcount = Number(header["GCOUNT"] ?? 1);
    const pcount = Number(header["PCOUNT"] ?? 0);

    let axisProduct = naxis > 0 ? 1 : 0;
    for (let a = 1; a <= naxis; a++) {
      axisProduct *= Number(header[`NAXIS${a}`] ?? 0);
    }

    const rawDataBytes = Math.floor((Math.abs(bitpix) / 8) * gcount * (pcount + axisProduct));
    const paddedDataBytes =
      rawDataBytes === 0 ? 0 : Math.ceil(rawDataBytes / FITS_BLOCK) * FITS_BLOCK;

    hdus.push({
      name: (header["EXTNAME"] ?? (hdus.length === 0 ? "PRIMARY" : "")).toUpperCase(),
      header,
      bitpix,
      naxis,
      naxis1: Number(header["NAXIS1"] ?? 0),
      naxis2: Number(header["NAXIS2"] ?? 0),
      bscale: Number(header["BSCALE"] ?? 1),
      bzero: Number(header["BZERO"] ?? 0),
      dataOffset: headerOffset,
      dataBytes: rawDataBytes,
    });

    offset = headerOffset + paddedDataBytes;
  }

  return hdus;
}

function readImagePixels(buffer: ArrayBuffer, hdu: FitsHdu): Float64Array {
  const count = hdu.naxis1 * hdu.naxis2;
  const out = new Float64Array(count);
  const view = new DataView(buffer);
  const bscale = hdu.bscale;
  const bzero = hdu.bzero;
  const start = hdu.dataOffset;

  for (let i = 0; i < count; i++) {
    let val: number;
    switch (hdu.bitpix) {
      case -32:
        val = view.getFloat32(start + i * 4, false); // Big-Endian
        break;
      case -64:
        val = view.getFloat64(start + i * 8, false);
        break;
      case 64:
        val = Number(view.getBigInt64(start + i * 8, false));
        break;
      case 32:
        val = view.getInt32(start + i * 4, false);
        break;
      case 16:
        val = view.getInt16(start + i * 2, false);
        break;
      case 8:
        val = view.getUint8(start + i);
        break;
      default:
        val = Number.NaN;
    }
    out[i] = Number.isFinite(val) ? val * bscale + bzero : Number.NaN;
  }
  return out;
}

type RGB = [number, number, number];

const CMAP_STOPS: Record<ColormapName, RGB[]> = {
  inferno: [
    [0, 0, 4],
    [87, 16, 110],
    [188, 55, 84],
    [249, 142, 9],
    [252, 255, 164],
  ],
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  plasma: [
    [13, 8, 135],
    [126, 3, 168],
    [204, 71, 120],
    [248, 149, 64],
    [240, 249, 33],
  ],
  magma: [
    [0, 0, 4],
    [81, 18, 124],
    [183, 55, 121],
    [252, 137, 97],
    [252, 253, 191],
  ],
  gray: [
    [0, 0, 0],
    [64, 64, 64],
    [128, 128, 128],
    [192, 192, 192],
    [255, 255, 255],
  ],
};

function buildLut(name: ColormapName): Uint8Array {
  const stops = CMAP_STOPS[name] ?? CMAP_STOPS.inferno;
  const lut = new Uint8Array(256 * 3);
  const segments = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * segments;
    const idx = Math.min(segments - 1, Math.floor(t));
    const frac = t - idx;
    const c0 = stops[idx];
    const c1 = stops[idx + 1];
    lut[i * 3] = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
    lut[i * 3 + 1] = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
    lut[i * 3 + 2] = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
  }
  return lut;
}

const LUTS: Record<ColormapName, Uint8Array> = {
  inferno: buildLut("inferno"),
  viridis: buildLut("viridis"),
  plasma: buildLut("plasma"),
  magma: buildLut("magma"),
  gray: buildLut("gray"),
};

function applyStretch(norm: number, mode: StretchMode): number {
  switch (mode) {
    case "asinh": {
      const a = 0.1;
      return Math.asinh(norm / a) / Math.asinh(1 / a);
    }
    case "log": {
      const a = 100.0;
      return Math.log(1 + a * norm) / Math.log(1 + a);
    }
    case "sqrt":
      return Math.sqrt(norm);
    case "linear":
    default:
      return norm;
  }
}

function parseNum(header: Record<string, string>, key: string): number | null {
  const raw = header[key];
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function extractWcsFromHeader(header: Record<string, string>): FitsWcs | null {
  const crval1 = parseNum(header, "CRVAL1");
  const crval2 = parseNum(header, "CRVAL2");
  const crpix1 = parseNum(header, "CRPIX1");
  const crpix2 = parseNum(header, "CRPIX2");

  if (crval1 === null || crval2 === null || crpix1 === null || crpix2 === null) {
    return null;
  }

  const cd1_1 = parseNum(header, "CD1_1");
  const cd2_2 = parseNum(header, "CD2_2");
  if (cd1_1 !== null && cd2_2 !== null) {
    return {
      crval1,
      crval2,
      crpix1,
      crpix2,
      cd1_1,
      cd1_2: parseNum(header, "CD1_2") ?? 0,
      cd2_1: parseNum(header, "CD2_1") ?? 0,
      cd2_2,
    };
  }

  const cdelt1 = parseNum(header, "CDELT1");
  const cdelt2 = parseNum(header, "CDELT2");
  if (cdelt1 === null || cdelt2 === null) {
    return null;
  }

  const pc1_1 = parseNum(header, "PC1_1");
  const pc2_2 = parseNum(header, "PC2_2");
  if (pc1_1 !== null && pc2_2 !== null) {
    const pc1_2 = parseNum(header, "PC1_2") ?? 0;
    const pc2_1 = parseNum(header, "PC2_1") ?? 0;
    return {
      crval1,
      crval2,
      crpix1,
      crpix2,
      cd1_1: cdelt1 * pc1_1,
      cd1_2: cdelt1 * pc1_2,
      cd2_1: cdelt2 * pc2_1,
      cd2_2: cdelt2 * pc2_2,
    };
  }

  const crota2 = parseNum(header, "CROTA2") ?? 0;
  const rad = (crota2 * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  return {
    crval1,
    crval2,
    crpix1,
    crpix2,
    cd1_1: cdelt1 * cosR,
    cd1_2: -cdelt2 * sinR,
    cd2_1: cdelt1 * sinR,
    cd2_2: cdelt2 * cosR,
  };
}

function extractWaveCalibration(
  rawBuffer: ArrayBuffer,
  imageHeader: Record<string, string>,
  hdus: FitsHdu[]
): FitsWaveCalibration | null {
  const waveHdu = hdus.find((h) => h.name === "WCS-WAVE");
  if (!waveHdu || waveHdu.dataBytes < 720 || waveHdu.dataOffset + 720 > rawBuffer.byteLength) {
    return null;
  }
  const crpix1w = parseNum(imageHeader, "CRPIX1W");
  const crpix2w = parseNum(imageHeader, "CRPIX2W");
  if (crpix1w === null || crpix2w === null) return null;

  const dv = new DataView(rawBuffer, waveHdu.dataOffset, 720);
  const xCoords: number[] = [];
  const yCoords: number[] = [];
  const values: number[] = [];

  for (let i = 0; i < 9; i++) {
    xCoords.push(dv.getInt32(i * 4, false));
  }
  for (let i = 0; i < 9; i++) {
    yCoords.push(dv.getInt32(36 + i * 4, false));
  }
  for (let i = 0; i < 162; i++) {
    values.push(dv.getFloat32(72 + i * 4, false));
  }

  return {
    crpix1w,
    crpix2w,
    xCoords,
    yCoords,
    values,
  };
}

export interface FitsPixelResult {
  rgba: Uint8ClampedArray;
  outW: number;
  outH: number;
  width: number;
  height: number;
  stats: CutoutStats;
  wcs: FitsWcs | null;
  fitsCutoutUrl: string;
  fluxData: Float32Array;
  varianceData: Float32Array | null;
  waveGrid: FitsWaveCalibration | null;
}

export function computeFitsPixels(
  rawBuffer: ArrayBuffer,
  options: {
    stretch: StretchMode;
    colormap: ColormapName;
    subtractZodi: boolean;
    fitsCutoutUrl: string;
    skipRender?: boolean;
  }
): FitsPixelResult {
  const hdus = parseFitsHdus(rawBuffer);
  const imageHdu = hdus.find((h) => h.name === "IMAGE" && h.naxis === 2);
  if (!imageHdu) {
    throw new Error("El archivo FITS no contiene extensión IMAGE 2D.");
  }

  const width = imageHdu.naxis1;
  const height = imageHdu.naxis2;
  if (width <= 0 || height <= 0) {
    throw new Error("Dimensiones de imagen FITS inválidas.");
  }

  const data = readImagePixels(rawBuffer, imageHdu);
  const zodiHdu = hdus.find((h) => h.name === "ZODI" && h.naxis === 2);
  const hasZodi = Boolean(zodiHdu && zodiHdu.naxis1 === width && zodiHdu.naxis2 === height);

  if (options.subtractZodi && hasZodi && zodiHdu) {
    const zodi = readImagePixels(rawBuffer, zodiHdu);
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] - zodi[i];
    }
  }

  const varianceHdu = hdus.find((h) => h.name === "VARIANCE" && h.naxis === 2);
  let varianceData: Float32Array | null = null;
  if (varianceHdu && varianceHdu.naxis1 === width && varianceHdu.naxis2 === height) {
    const rawVar = readImagePixels(rawBuffer, varianceHdu);
    varianceData = new Float32Array(rawVar);
  }

  // Enmascarar píxeles corruptos (rayos cósmicos, saturación, píxeles muertos/NoData) usando HDU[2] FLAGS
  const flagsHdu = hdus.find(
    (h) => (h.name === "FLAGS" || h.name === "MASK") && h.naxis === 2
  );
  if (flagsHdu && flagsHdu.naxis1 === width && flagsHdu.naxis2 === height) {
    const rawFlags = readImagePixels(rawBuffer, flagsHdu);
    const SEVERE_FLAG_MASK = 0x7ffffffe;
    let validAfterMask = 0;
    let totalFiniteBefore = 0;
    for (let i = 0; i < data.length; i++) {
      if (!Number.isFinite(data[i])) continue;
      totalFiniteBefore++;
      const flagVal = Number.isFinite(rawFlags[i]) ? Math.trunc(rawFlags[i]) : 0;
      if ((flagVal & SEVERE_FLAG_MASK) === 0) {
        validAfterMask++;
      }
    }
    if (totalFiniteBefore > 0 && validAfterMask >= Math.max(4, totalFiniteBefore * 0.2)) {
      for (let i = 0; i < data.length; i++) {
        const flagVal = Number.isFinite(rawFlags[i]) ? Math.trunc(rawFlags[i]) : 0;
        if ((flagVal & SEVERE_FLAG_MASK) !== 0) {
          data[i] = Number.NaN;
          if (varianceData) varianceData[i] = Number.NaN;
        }
      }
    }
  }

  const fluxData = new Float32Array(data);
  const waveGrid = extractWaveCalibration(rawBuffer, imageHdu.header, hdus);

  // Contar y copiar valores finitos en Float64Array para ordenamiento numérico nativo rápido
  let finiteCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (Number.isFinite(data[i])) finiteCount++;
  }
  if (finiteCount === 0) {
    throw new Error("Todos los píxeles del recorte son NaN o vacíos.");
  }

  const finiteVals = new Float64Array(finiteCount);
  let sum = 0;
  let k = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (Number.isFinite(v)) {
      finiteVals[k++] = v;
      sum += v;
    }
  }

  finiteVals.sort();
  const n = finiteCount;
  const min = finiteVals[0];
  const max = finiteVals[n - 1];
  const median =
    n % 2 === 1 ? finiteVals[(n - 1) / 2] : (finiteVals[n / 2 - 1] + finiteVals[n / 2]) / 2;
  const mean = sum / n;

  // PercentileInterval(99.5): [0.25%, 99.75%]
  const vmin = finiteVals[Math.max(0, Math.floor(0.0025 * (n - 1)))];
  const vmax = finiteVals[Math.min(n - 1, Math.floor(0.9975 * (n - 1)))];
  const span = vmax > vmin ? vmax - vmin : 1;

  const maxDim = Math.max(width, height);
  const scale = maxDim < 512 ? Math.max(1, Math.floor(512 / maxDim)) : 1;
  const outW = options.skipRender ? 0 : width * scale;
  const outH = options.skipRender ? 0 : height * scale;

  const pixels = new Uint8ClampedArray(outW * outH * 4);

  if (!options.skipRender) {
    const lut = LUTS[options.colormap] ?? LUTS.inferno;
    for (let y = 0; y < height; y++) {
      // Flip vertical: FITS almacena el origen abajo a la izquierda (Astronomical North-up)
      const srcRow = height - 1 - y;
      for (let x = 0; x < width; x++) {
        const val = data[srcRow * width + x];
        let r = 15;
        let g = 23;
        let b = 42;

        if (Number.isFinite(val)) {
          const norm = vmax > vmin ? Math.min(1, Math.max(0, (val - vmin) / span)) : 0;
          const stretched = applyStretch(norm, options.stretch);
          const idx = Math.min(255, Math.max(0, Math.round(stretched * 255)));
          r = lut[idx * 3];
          g = lut[idx * 3 + 1];
          b = lut[idx * 3 + 2];
        }

        for (let sy = 0; sy < scale; sy++) {
          const py = y * scale + sy;
          for (let sx = 0; sx < scale; sx++) {
            const px = x * scale + sx;
            const outIdx = (py * outW + px) * 4;
            pixels[outIdx] = r;
            pixels[outIdx + 1] = g;
            pixels[outIdx + 2] = b;
            pixels[outIdx + 3] = 255;
          }
        }
      }
    }
  }

  return {
    rgba: pixels,
    outW,
    outH,
    width,
    height,
    stats: {
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      median: Number(median.toFixed(4)),
      mean: Number(mean.toFixed(4)),
      unit: imageHdu.header["BUNIT"] ?? "MJy/sr",
      detector: imageHdu.header["DETECTOR"] ?? "",
      shape: [width, height],
      has_zodi: hasZodi,
    },
    wcs: extractWcsFromHeader(imageHdu.header),
    fitsCutoutUrl: options.fitsCutoutUrl,
    fluxData,
    varianceData,
    waveGrid,
  };
}

export function rgbaToRenderedCutout(result: FitsPixelResult): RenderedCutout {
  if (result.outW <= 0 || result.outH <= 0) {
    return {
      imageData: new ImageData(1, 1),
      dataUrl: "",
      width: result.width,
      height: result.height,
      stats: result.stats,
      wcs: result.wcs,
      fits_cutout_url: result.fitsCutoutUrl,
      fluxData: result.fluxData,
      varianceData: result.varianceData,
      waveGrid: result.waveGrid,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = result.outW;
  canvas.height = result.outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar contexto 2D de Canvas.");
  }

  const imgData = new ImageData(
    new Uint8ClampedArray(result.rgba),
    result.outW,
    result.outH
  );
  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  return {
    imageData: imgData,
    dataUrl,
    width: result.width,
    height: result.height,
    stats: result.stats,
    wcs: result.wcs,
    fits_cutout_url: result.fitsCutoutUrl,
    fluxData: result.fluxData,
    varianceData: result.varianceData,
    waveGrid: result.waveGrid,
  };
}

export function renderFitsBuffer(
  rawBuffer: ArrayBuffer,
  options: {
    stretch: StretchMode;
    colormap: ColormapName;
    subtractZodi: boolean;
    fitsCutoutUrl: string;
    skipRender?: boolean;
  }
): RenderedCutout {
  return rgbaToRenderedCutout(computeFitsPixels(rawBuffer, options));
}
