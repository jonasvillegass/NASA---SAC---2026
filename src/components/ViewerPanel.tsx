import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Bookmark,
  BoxSelect,
  Calendar,
  Check,
  ChevronDown,
  Dna,
  Download,
  FileDown,
  FlaskConical,
  GitCompareArrows,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  Orbit,
  Play,
  Plus,
  Repeat,
  SkipBack,
  SkipForward,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import type {
  CelestialTrajectoryResult,
  CollectionVersionData,
  ColormapName,
  ExtrapolatedPosition,
  Map2TabSession,
  RenderedCutout,
  ResolvedCelestialObject,
  SavedRoiReading,
  SkyRoiSelection,
  SpherexCollectionId,
  SpherexObservation,
  StretchMode,
} from "../lib/types";
import {
  DEFAULT_CUTOUT_FOV_DEG,
  MAX_CUTOUT_FOV_DEG,
  MIN_CUTOUT_FOV_DEG,
  clampCutoutFov,
  computeAxisTicks,
  computeVisibleSkyPolygon,
  formatDectoDMS,
  formatRAtoHMS,
  getTargetImageFraction,
  pixelToWorld,
  worldToPixel,
} from "../lib/coordinates";
import { getRenderedCutout } from "../lib/irsa";
import { NasaApiDownError } from "../lib/apiError";
import { deleteRoiReading, loadSavedRoiReadings, saveRoiReading } from "../lib/roiStorage";
import {
  analyzeRoiChemistry,
  computeRoiPhotocenter,
  extractRoiSpectrumFromCutouts,
} from "../lib/spectralAnalysis";
import { useLanguage } from "../i18n/LanguageContext";
import { HipsSkyMapPanel } from "./HipsSkyMapPanel";
import { MultiVersionGallery } from "./MultiVersionGallery";
import { DetectorGuide } from "./DetectorGuide";
import { SpectralProfile } from "./SpectralProfile";
import { BlinkComparator } from "./BlinkComparator";
import { RoiAnalysisModal } from "./RoiAnalysisModal";
import { AsteroidLoadingGame } from "./AsteroidLoadingGame";

interface ViewerPanelProps {
  map2Tabs: Map2TabSession[];
  activeMap2TabId: string;
  onSelectMap2Tab: (tabId: string) => void;
  onCloseMap2Tab: (tabId: string) => void;
  onRenameMap2Tab?: (tabId: string, newLabel: string) => void;
  galleryOpen?: boolean;
  onCloseGallery?: () => void;
  selectedObs: SpherexObservation | null;
  cutout: RenderedCutout | null;
  cutoutLoading: boolean;
  lastCoords: { ra: number; dec: number; size: number } | null;
  targetName?: string;
  showCrosshair: boolean;
  status: { text: string; isError: boolean } | null;
  siaUrl: string;
  resolvedObject: ResolvedCelestialObject | null;
  versions: Record<SpherexCollectionId, CollectionVersionData> | null;
  activeCollection: SpherexCollectionId;
  stretch: StretchMode;
  colormap: ColormapName;
  subtractZodi: boolean;
  secondMapOpen: boolean;
  onToggleSecondMap: (open: boolean) => void;
  externalChannelIdx?: number | null;
  onChangeFov: (newSize: number) => void;
  onSelectVersionObservation: (
    tabId: string,
    collection: SpherexCollectionId,
    obs: SpherexObservation
  ) => void;
  onQueryAtCoords?: (raDeg: number, decDeg: number) => void;
}

interface Map2TabPanelProps {
  tabId: string;
  isActive: boolean;
  selectedObs: SpherexObservation | null;
  cutout: RenderedCutout | null;
  loading: boolean;
  cutoutLoading: boolean;
  lastCoords: { ra: number; dec: number; size: number } | null;
  targetName?: string;
  showCrosshair: boolean;
  status: { text: string; isError: boolean } | null;
  resolvedObject: ResolvedCelestialObject | null;
  versions: Record<SpherexCollectionId, CollectionVersionData> | null;
  activeCollection: SpherexCollectionId;
  stretch: StretchMode;
  colormap: ColormapName;
  subtractZodi: boolean;
  secondMapOpen: boolean;
  onToggleSecondMap: (open: boolean) => void;
  onChangeFov: (newSize: number) => void;
  onSelectVersionObservation: (collection: SpherexCollectionId, obs: SpherexObservation) => void;
  savedReadings: SavedRoiReading[];
  onSaveReading: (reading: SavedRoiReading) => void;
  onDeleteSavedReading: (id: string) => void;
  activeTrajectory: {
    trajectory: CelestialTrajectoryResult;
    extrapolated: ExtrapolatedPosition | null;
  } | null;
  onChangeActiveTrajectory: (
    next: {
      trajectory: CelestialTrajectoryResult;
      extrapolated: ExtrapolatedPosition | null;
    } | null
  ) => void;
  playbackSlotEl: HTMLDivElement | null;
  onSyncMap1Preview: (
    scale: number,
    corners: Array<{ ra: number; dec: number }> | null
  ) => void;
  galleryOpen?: boolean;
  onCloseGallery?: () => void;
}

const FALLBACK_EPOCHS = ["2025.5 (t₁)", "2026.0 (t₂)", "2026.5 (t₃)", "2027.0 (t₄)"];

const getEpochKey = (obs: SpherexObservation) => `${obs.obs_id}|${obs.bandpass}`;

const isSameObs = (a: SpherexObservation | null | undefined, b: SpherexObservation | null | undefined) => {
  if (!a || !b) return false;
  return (
    (Boolean(a.access_url) && Boolean(b.access_url) && a.access_url === b.access_url) ||
    (a.obs_id === b.obs_id && a.bandpass === b.bandpass)
  );
};

const Map2TabPanel: React.FC<Map2TabPanelProps> = ({
  isActive,
  selectedObs,
  cutout,
  loading,
  cutoutLoading,
  lastCoords,
  targetName = "WISE 0855",
  showCrosshair,
  status,
  resolvedObject,
  versions,
  activeCollection,
  stretch,
  colormap,
  subtractZodi,
  secondMapOpen,
  onToggleSecondMap,
  onChangeFov,
  onSelectVersionObservation,
  savedReadings,
  onSaveReading,
  onDeleteSavedReading,
  activeTrajectory,
  onChangeActiveTrajectory,
  playbackSlotEl,
  onSyncMap1Preview,
  galleryOpen = false,
  onCloseGallery,
}) => {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCutout, setIsDraggingCutout] = useState<boolean>(false);
  const [map2ToolMode, setMap2ToolMode] = useState<"pan" | "roi">("pan");
  const [selectedRoi, setSelectedRoi] = useState<SkyRoiSelection | null>(null);
  const [roiDraftBox, setRoiDraftBox] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [showRoiModal, setShowRoiModal] = useState<boolean>(false);
  const [roiModalTab, setRoiModalTab] = useState<"current" | "compare" | "trajectory">("current");
  const [savedCurrentRoiId, setSavedCurrentRoiId] = useState<string | null>(null);
  const [floatingSaveName, setFloatingSaveName] = useState<string>("");
  const [cutoutCursorCoords, setCutoutCursorCoords] = useState<{
    ra: number;
    dec: number;
  } | null>(null);
  const [secondMapTab, setSecondMapTab] = useState<
    "cutout" | "bands" | "sed" | "blink" | "guide"
  >("cutout");

  const cutoutImageFrameRef = useRef<HTMLDivElement | null>(null);
  const cutoutDragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startCx: number;
    startCy: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startCx: 0.5,
    startCy: 0.5,
  });

  // Floating Epoch Playback Bar state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [fallbackEpochIdx, setFallbackEpochIdx] = useState<number>(0);
  const [prevCutoutUrl, setPrevCutoutUrl] = useState<string | null>(null);
  const lastCutoutUrlRef = useRef<string | null>(null);
  const [isMap2Fullscreen, setIsMap2Fullscreen] = useState<boolean>(false);
  const [map2ApiDown, setMap2ApiDown] = useState<boolean>(false);

  useEffect(() => {
    if (cutout) {
      setMap2ApiDown(false);
    }
  }, [cutout]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsMap2Fullscreen(document.fullscreenElement === cutoutViewportRef.current);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleToggleMap2Fullscreen = async () => {
    const el = cutoutViewportRef.current;
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

  // Date selector dropdown & preloaded epoch cutouts cache
  const [dateMenuOpen, setDateMenuOpen] = useState<boolean>(false);
  const [selectedEpochKeys, setSelectedEpochKeys] = useState<Set<string>>(() => new Set());
  const dateMenuRef = useRef<HTMLDivElement | null>(null);
  const [epochCutouts, setEpochCutouts] = useState<
    Record<string, { status: "loading" | "ready" | "error"; cutout?: RenderedCutout }>
  >({});
  const epochCutoutsRef = useRef(epochCutouts);
  epochCutoutsRef.current = epochCutouts;

  // 6-band representatives for Map 2 "Bands" tab
  const [bandCutouts, setBandCutouts] = useState<
    Record<string, { status: "loading" | "ready" | "error"; cutout?: RenderedCutout }>
  >({});



  // Caching for Instant SED Spectra and Blink Comparator
  const [cachedCutoutsMap, setCachedCutoutsMap] = useState<Map<string, RenderedCutout>>(new Map());
  const [isScanningBands, setIsScanningBands] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (selectedObs && cutout) {
      setCachedCutoutsMap((prev) => new Map(prev).set(selectedObs.obs_id, cutout));
    }
  }, [selectedObs, cutout]);

  const cachedImages = useMemo(() => {
    const map = new Map<string, string>();
    cachedCutoutsMap.forEach((v, k) => {
      if (v.dataUrl) map.set(k, v.dataUrl);
    });
    return map;
  }, [cachedCutoutsMap]);

  const cachedFluxes = useMemo(() => {
    const map = new Map<string, { flux: number; unit: string; snr: number | null; mjd: number | null }>();
    cachedCutoutsMap.forEach((v, k) => {
      map.set(k, { flux: v.stats.median, unit: v.stats.unit, snr: null, mjd: null });
    });
    return map;
  }, [cachedCutoutsMap]);



  const cutoutViewportRef = useRef<HTMLDivElement | null>(null);
  const loadingCardRef = useRef<HTMLDivElement | null>(null);

  const observations = useMemo(
    () => versions?.[activeCollection]?.observations ?? [],
    [versions, activeCollection]
  );

  const selectedIdx = observations.findIndex(
    (o) => o.obs_id === selectedObs?.obs_id && o.bandpass === selectedObs?.bandpass
  );

  const targetRa = lastCoords?.ra;
  const targetDec = lastCoords?.dec;

  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setSelectedRoi(null);
    setRoiDraftBox(null);
    setShowRoiModal(false);
    scanAbortRef.current?.abort();
  }, [targetRa, targetDec]);

  const handleCancelScanBands = () => {
    scanAbortRef.current?.abort();
  };

  const handleScanAllBands = async () => {
    if (targetRa === undefined || targetDec === undefined || isScanningBands || observations.length === 0) return;
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setIsScanningBands(true);
    let done = 0;
    const total = observations.length;
    setScanProgress({ current: 0, total });

    // Filtrar primero observaciones pendientes; las ya cacheadas con fluxData suman de inmediato
    const pending: SpherexObservation[] = [];
    for (const obs of observations) {
      const existing = cachedCutoutsMap.get(obs.obs_id);
      if (existing && existing.fluxData) {
        done++;
      } else {
        pending.push(obs);
      }
    }
    if (done > 0) {
      setScanProgress({ current: done, total });
    }

    // Pool paralelo de 5 descargas + decodificación en Web Worker sin renderizar PNG
    const CONCURRENCY = 5;
    let nextIdx = 0;

    const runWorker = async () => {
      while (nextIdx < pending.length && !controller.signal.aborted) {
        const obs = pending[nextIdx++];
        try {
          const rendered = await getRenderedCutout({
            accessUrl: obs.access_url,
            ra: targetRa,
            dec: targetDec,
            size: MAX_CUTOUT_FOV_DEG,
            stretch,
            colormap,
            subtractZodi,
            priority: "low",
            skipRender: true,
            signal: controller.signal,
          });
          setCachedCutoutsMap((prev) => new Map(prev).set(obs.obs_id, rendered));
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            break;
          }
        } finally {
          if (!controller.signal.aborted) {
            done++;
            setScanProgress({ current: done, total });
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () =>
      runWorker()
    );
    await Promise.all(workers);
    setIsScanningBands(false);
  };

  // Build chronological epoch list from current observations (or fallback)
  const epochFrames = useMemo(() => {
    if (observations.length === 0) return [];
    const targetBand = selectedObs?.bandpass;
    const sameBand = targetBand
      ? observations.filter((o) => o.bandpass === targetBand)
      : observations;
    const pool = sameBand.length > 1 ? sameBand : observations;

    const byDate = new Map<string, SpherexObservation>();
    for (const obs of pool) {
      const key = obs.epoch_date ?? obs.obs_id;
      if (!byDate.has(key)) {
        byDate.set(key, obs);
      }
    }
    const list = Array.from(byDate.values());
    return list.length > 1 ? list.slice(0, 16) : pool.slice(0, 12);
  }, [observations, selectedObs?.bandpass]);

  const epochFramesSignature = useMemo(
    () => epochFrames.map(getEpochKey).join(","),
    [epochFrames]
  );

  // Select all available epoch dates by default when the epoch list changes
  useEffect(() => {
    setSelectedEpochKeys(new Set(epochFrames.map(getEpochKey)));
    setDateMenuOpen(false);
  }, [epochFramesSignature]);

  // Close date selector dropdown on outside click or Escape
  useEffect(() => {
    if (!dateMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setDateMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDateMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dateMenuOpen]);

  const playbackFrames = useMemo(
    () => epochFrames.filter((obs) => selectedEpochKeys.has(getEpochKey(obs))),
    [epochFrames, selectedEpochKeys]
  );

  // Pause playback if user deselects all dates
  useEffect(() => {
    if (epochFrames.length > 0 && playbackFrames.length === 0 && isPlaying) {
      setIsPlaying(false);
    }
  }, [epochFrames.length, playbackFrames.length, isPlaying]);

  const renderSignature = useMemo(() => {
    if (targetRa === undefined || targetDec === undefined) return "";
    return `${targetRa.toFixed(6)}|${targetDec.toFixed(6)}|${stretch}|${colormap}|${subtractZodi}`;
  }, [targetRa, targetDec, stretch, colormap, subtractZodi]);

  // Clear rendered frame cache when coordinates or visual parameters change
  useEffect(() => {
    setEpochCutouts({});
    setBandCutouts({});
  }, [renderSignature]);

  // Preload and cache all selected playback frames before showing the first image
  // Always load at MAX_CUTOUT_FOV_DEG so reducing FOV keeps the exact same image
  useEffect(() => {
    if (
      !secondMapOpen ||
      secondMapTab !== "cutout" ||
      targetRa === undefined ||
      targetDec === undefined ||
      playbackFrames.length === 0
    ) {
      return;
    }
    const controller = new AbortController();

    playbackFrames.forEach((obs, idx) => {
      const frameKey = `${renderSignature}|${getEpochKey(obs)}`;
      if (epochCutoutsRef.current[frameKey]?.status === "ready") {
        return;
      }

      setEpochCutouts((prev) =>
        prev[frameKey]?.status === "ready"
          ? prev
          : { ...prev, [frameKey]: { status: "loading" } }
      );

      void getRenderedCutout({
        accessUrl: obs.access_url,
        ra: targetRa,
        dec: targetDec,
        size: MAX_CUTOUT_FOV_DEG,
        stretch,
        colormap,
        subtractZodi,
        priority: idx === 0 ? "high" : "low",
        signal: controller.signal,
      })
        .then((rendered) => {
          if (controller.signal.aborted) return;
          setMap2ApiDown(false);
          setEpochCutouts((prev) => ({
            ...prev,
            [frameKey]: { status: "ready", cutout: rendered },
          }));
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (err instanceof NasaApiDownError) {
            setMap2ApiDown(true);
          }
          setEpochCutouts((prev) => ({
            ...prev,
            [frameKey]: { status: "error" },
          }));
        });
    });

    return () => controller.abort();
  }, [
    secondMapOpen,
    secondMapTab,
    playbackFrames,
    renderSignature,
    targetRa,
    targetDec,
    stretch,
    colormap,
    subtractZodi,
  ]);

  const settledPlaybackCount = useMemo(() => {
    if (playbackFrames.length === 0) return 0;
    return playbackFrames.filter((obs) => {
      const st = epochCutouts[`${renderSignature}|${getEpochKey(obs)}`]?.status;
      return st === "ready" || st === "error";
    }).length;
  }, [playbackFrames, epochCutouts, renderSignature]);

  const allPlaybackFramesSettled =
    playbackFrames.length > 0 && settledPlaybackCount === playbackFrames.length;

  // Exclude any frames that failed to load once all selected frames have settled
  const readyPlaybackFrames = useMemo(
    () =>
      playbackFrames.filter(
        (obs) => epochCutouts[`${renderSignature}|${getEpochKey(obs)}`]?.status === "ready"
      ),
    [playbackFrames, epochCutouts, renderSignature]
  );

  const effectivePlaybackFrames = allPlaybackFramesSettled ? readyPlaybackFrames : playbackFrames;

  // Keep selectedObs synced to an active (and valid) playback frame when selection or load state changes
  useEffect(() => {
    if (effectivePlaybackFrames.length === 0 || !selectedObs) return;
    const exists = effectivePlaybackFrames.some((o) => isSameObs(o, selectedObs));
    if (!exists) {
      onSelectVersionObservation(activeCollection, effectivePlaybackFrames[0]);
    }
  }, [effectivePlaybackFrames, selectedObs, activeCollection, onSelectVersionObservation]);

  const activeEpochIdx = useMemo(() => {
    if (epochFrames.length === 0) return fallbackEpochIdx;
    if (effectivePlaybackFrames.length === 0) return 0;
    if (!selectedObs) return 0;
    const idx = effectivePlaybackFrames.findIndex((o) => isSameObs(o, selectedObs));
    return idx >= 0 ? idx : 0;
  }, [epochFrames.length, effectivePlaybackFrames, selectedObs, fallbackEpochIdx]);

  const canAutoplayCutout =
    secondMapOpen &&
    secondMapTab === "cutout" &&
    allPlaybackFramesSettled &&
    readyPlaybackFrames.length > 1;

  const prevCanAutoplayRef = useRef<boolean>(false);

  // Autoplay Map 2 epoch video once all selected playback frames finish loading
  useEffect(() => {
    if (canAutoplayCutout && !prevCanAutoplayRef.current) {
      setIsPlaying(true);
    }
    prevCanAutoplayRef.current = canAutoplayCutout;
  }, [canAutoplayCutout]);

  const isPreloadingAll =
    epochFrames.length > 0 && playbackFrames.length > 0 && !allPlaybackFramesSettled;

  const isWaitingForSelectedDates = epochFrames.length > 0 && playbackFrames.length === 0;

  const activePlaybackObs =
    effectivePlaybackFrames[activeEpochIdx] ?? effectivePlaybackFrames[0] ?? null;
  const activePreloadedCutout = activePlaybackObs
    ? epochCutouts[`${renderSignature}|${getEpochKey(activePlaybackObs)}`]?.cutout ?? null
    : null;

  const displayCutout = useMemo(() => {
    if (epochFrames.length > 0) {
      if (!allPlaybackFramesSettled || readyPlaybackFrames.length === 0) return null;
      return activePreloadedCutout ?? cutout;
    }
    return cutout;
  }, [
    epochFrames.length,
    allPlaybackFramesSettled,
    readyPlaybackFrames.length,
    activePreloadedCutout,
    cutout,
  ]);

  const isApiDownOrError = map2ApiDown || Boolean(status?.isError);
  const isMap2LoadingImages =
    secondMapOpen &&
    secondMapTab === "cutout" &&
    !isWaitingForSelectedDates &&
    !displayCutout &&
    !isApiDownOrError &&
    (loading || cutoutLoading || isPreloadingAll);

  // Smooth crossfade tracking for Map 2
  useEffect(() => {
    if (
      displayCutout?.dataUrl &&
      lastCutoutUrlRef.current &&
      lastCutoutUrlRef.current !== displayCutout.dataUrl
    ) {
      setPrevCutoutUrl(lastCutoutUrlRef.current);
    }
    if (displayCutout?.dataUrl) {
      lastCutoutUrlRef.current = displayCutout.dataUrl;
    }
  }, [displayCutout?.dataUrl]);

  const playbackStateRef = useRef({
    activeEpochIdx,
    readyPlaybackFrames,
    epochFramesLength: epochFrames.length,
    activeCollection,
    isLooping,
    onSelectVersionObservation,
  });
  playbackStateRef.current = {
    activeEpochIdx,
    readyPlaybackFrames,
    epochFramesLength: epochFrames.length,
    activeCollection,
    isLooping,
    onSelectVersionObservation,
  };

  // Automatic epoch playback interval (only advances once all selected frames are cached)
  useEffect(() => {
    if (!isPlaying || !isActive || !secondMapOpen || secondMapTab !== "cutout") return;
    if (epochFrames.length > 0 && (!allPlaybackFramesSettled || readyPlaybackFrames.length <= 1)) {
      return;
    }
    const intervalMs = Math.max(250, Math.round(950 / speedMultiplier));
    const timer = window.setInterval(() => {
      const {
        activeEpochIdx: curIdx,
        readyPlaybackFrames: frames,
        epochFramesLength,
        activeCollection: col,
        isLooping: looping,
        onSelectVersionObservation: selectObs,
      } = playbackStateRef.current;

      if (frames.length > 1) {
        const nextIdx = (curIdx + 1) % frames.length;
        selectObs(col, frames[nextIdx]);
        if (!looping && nextIdx === 0) {
          setIsPlaying(false);
        }
      } else if (epochFramesLength === 0) {
        const nextIdx = (curIdx + 1) % FALLBACK_EPOCHS.length;
        setFallbackEpochIdx(nextIdx);
        if (!looping && nextIdx === 0) {
          setIsPlaying(false);
        }
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    isPlaying,
    isActive,
    secondMapOpen,
    secondMapTab,
    speedMultiplier,
    epochFrames.length,
    readyPlaybackFrames.length,
    allPlaybackFramesSettled,
  ]);

  const currentFov = clampCutoutFov(lastCoords?.size ?? DEFAULT_CUTOUT_FOV_DEG);
  const fovScale = MAX_CUTOUT_FOV_DEG / currentFov;
  const totalCutoutScale = fovScale;
  const canPanCutout = totalCutoutScale > 1.001;
  const cutoutHalfSpan = Math.min(0.5, 0.5 / totalCutoutScale);

  // Mouse wheel FOV zoom inside Map 2 (FITS Cutout viewport)
  useEffect(() => {
    const el = cutoutViewportRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY === 0) return;
      const factor = e.deltaY < 0 ? 1 / 1.15 : 1.15;
      onChangeFov(clampCutoutFov(currentFov * factor));
    };

    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onNativeWheel);
    };
  }, [secondMapOpen, secondMapTab, cutout, currentFov, onChangeFov]);

  // Representative D1..D6 observations for Map 2 "Bands" mode
  const bandRepresentatives = useMemo(() => {
    const map = new Map<string, SpherexObservation>();
    for (const obs of observations) {
      const b = obs.bandpass || "IR";
      if (!map.has(b)) map.set(b, obs);
    }
    return Array.from(map.values()).sort((a, b) => a.bandpass.localeCompare(b.bandpass));
  }, [observations]);

  useEffect(() => {
    if (
      !secondMapOpen ||
      secondMapTab !== "bands" ||
      targetRa === undefined ||
      targetDec === undefined ||
      bandRepresentatives.length === 0
    ) {
      return;
    }
    const controller = new AbortController();

    for (const obs of bandRepresentatives) {
      const key = `${renderSignature}|${obs.bandpass}|${obs.obs_id}`;
      setBandCutouts((prev) =>
        prev[key]?.status === "ready" ? prev : { ...prev, [key]: { status: "loading" } }
      );

      void getRenderedCutout({
        accessUrl: obs.access_url,
        ra: targetRa,
        dec: targetDec,
        size: MAX_CUTOUT_FOV_DEG,
        stretch,
        colormap,
        subtractZodi,
        priority: "low",
        signal: controller.signal,
      })
        .then((rendered) => {
          if (controller.signal.aborted) return;
          setMap2ApiDown(false);
          setBandCutouts((prev) => ({
            ...prev,
            [key]: { status: "ready", cutout: rendered },
          }));
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (err instanceof NasaApiDownError) {
            setMap2ApiDown(true);
          }
          setBandCutouts((prev) => ({
            ...prev,
            [key]: { status: "error" },
          }));
        });
    }

    return () => controller.abort();
  }, [
    secondMapOpen,
    secondMapTab,
    bandRepresentatives,
    renderSignature,
    targetRa,
    targetDec,
    stretch,
    colormap,
    subtractZodi,
  ]);

  const targetFraction = useMemo(() => {
    if (!displayCutout || targetRa === undefined || targetDec === undefined) return null;
    return getTargetImageFraction(
      displayCutout.width,
      displayCutout.height,
      displayCutout.wcs,
      { ra: targetRa, dec: targetDec }
    );
  }, [displayCutout, targetRa, targetDec]);

  const cutoutAnchor = useMemo(() => {
    const baseX = targetFraction?.xFrac ?? 0.5;
    const baseY = targetFraction?.yFrac ?? 0.5;
    return {
      x: Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, baseX)),
      y: Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, baseY)),
    };
  }, [targetFraction, cutoutHalfSpan]);

  const cutoutViewCenter = useMemo(() => {
    return {
      cx: Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, cutoutAnchor.x + panOffset.x)),
      cy: Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, cutoutAnchor.y + panOffset.y)),
    };
  }, [cutoutAnchor, panOffset, cutoutHalfSpan]);

  const cutoutVisibleBounds = useMemo(
    () => ({
      xMinFrac: Math.max(0, cutoutViewCenter.cx - cutoutHalfSpan),
      xMaxFrac: Math.min(1, cutoutViewCenter.cx + cutoutHalfSpan),
      yMinFrac: Math.max(0, cutoutViewCenter.cy - cutoutHalfSpan),
      yMaxFrac: Math.min(1, cutoutViewCenter.cy + cutoutHalfSpan),
    }),
    [cutoutViewCenter, cutoutHalfSpan]
  );

  const cutoutTransformStyle = useMemo(() => {
    const tx = (0.5 - cutoutViewCenter.cx) * totalCutoutScale * 100;
    const ty = (0.5 - cutoutViewCenter.cy) * totalCutoutScale * 100;
    return {
      transform: `translate(${tx}%, ${ty}%) scale(${totalCutoutScale})`,
      transformOrigin: "center center" as const,
    };
  }, [cutoutViewCenter, totalCutoutScale]);

  const axisTicks = useMemo(() => {
    if (!displayCutout || !lastCoords) return null;
    return computeAxisTicks(
      displayCutout.width,
      displayCutout.height,
      displayCutout.wcs,
      lastCoords,
      cutoutVisibleBounds
    );
  }, [displayCutout, lastCoords, cutoutVisibleBounds]);

  const secondMapViewCorners = useMemo(() => {
    if (!displayCutout) return null;
    return computeVisibleSkyPolygon(
      displayCutout.width,
      displayCutout.height,
      displayCutout.wcs,
      cutoutVisibleBounds
    );
  }, [displayCutout, cutoutVisibleBounds]);

  const roiAnalysis = useMemo(() => {
    if (!selectedRoi) return null;
    // Si la imagen seleccionada pertenece a una época con suficiente cobertura (±7 días),
    // aislar esas observaciones para no mezclar posiciones de fechas distintas en objetos con movimiento propio.
    let targetObs = observations;
    if (selectedRoi.epochMjd !== null && selectedRoi.epochMjd !== undefined) {
      const epochObs = observations.filter(
        (o) => o.t_min !== null && Math.abs(o.t_min - selectedRoi.epochMjd!) <= 7
      );
      if (epochObs.length >= 10) {
        targetObs = epochObs;
      }
    }
    const pts = extractRoiSpectrumFromCutouts(selectedRoi, targetObs, cachedCutoutsMap);
    return analyzeRoiChemistry(pts, pts.length);
  }, [selectedRoi, observations, cachedCutoutsMap]);

  const roiOverlayBox = useMemo(() => {
    if (roiDraftBox) {
      return {
        xMin: Math.min(roiDraftBox.x0, roiDraftBox.x1),
        xMax: Math.max(roiDraftBox.x0, roiDraftBox.x1),
        yMin: Math.min(roiDraftBox.y0, roiDraftBox.y1),
        yMax: Math.max(roiDraftBox.y0, roiDraftBox.y1),
      };
    }
    if (!selectedRoi || !displayCutout?.wcs) return null;
    const fracs: Array<{ x: number; y: number }> = [];
    for (const c of selectedRoi.corners) {
      const p = worldToPixel(c.ra, c.dec, displayCutout.wcs);
      if (!p) continue;
      fracs.push({
        x: (p.px - 0.5) / displayCutout.width,
        y: 1 - (p.py - 0.5) / displayCutout.height,
      });
    }
    if (fracs.length < 3) return null;
    return {
      xMin: Math.min(...fracs.map((f) => f.x)),
      xMax: Math.max(...fracs.map((f) => f.x)),
      yMin: Math.min(...fracs.map((f) => f.y)),
      yMax: Math.max(...fracs.map((f) => f.y)),
    };
  }, [roiDraftBox, selectedRoi, displayCutout]);

  const clientToImageFraction = (clientX: number, clientY: number) => {
    const frameEl = cutoutImageFrameRef.current;
    if (!frameEl) return null;
    const rect = frameEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const frameX = (clientX - rect.left) / rect.width;
    const frameY = (clientY - rect.top) / rect.height;
    const xFrac = Math.min(1, Math.max(0, cutoutViewCenter.cx + (frameX - 0.5) / totalCutoutScale));
    const yFrac = Math.min(1, Math.max(0, cutoutViewCenter.cy + (frameY - 0.5) / totalCutoutScale));
    return { xFrac, yFrac };
  };

  const handleCutoutPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (map2ToolMode === "roi" && displayCutout?.wcs) {
      // Solo se permite analizar de a 1 área a la vez mientras procesa
      if (isScanningBands) return;
      const pt = clientToImageFraction(e.clientX, e.clientY);
      if (!pt) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setRoiDraftBox({ x0: pt.xFrac, y0: pt.yFrac, x1: pt.xFrac, y1: pt.yFrac });
      return;
    }

    if (!canPanCutout) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingCutout(true);
    cutoutDragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startCx: cutoutViewCenter.cx,
      startCy: cutoutViewCenter.cy,
    };
  };

  const handleCutoutPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const frameEl = cutoutImageFrameRef.current;
    if (!frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (displayCutout?.wcs) {
      const frameX = (e.clientX - rect.left) / rect.width;
      const frameY = (e.clientY - rect.top) / rect.height;
      const xFrac = cutoutViewCenter.cx + (frameX - 0.5) / totalCutoutScale;
      const yFrac = cutoutViewCenter.cy + (frameY - 0.5) / totalCutoutScale;

      if (xFrac >= 0 && xFrac <= 1 && yFrac >= 0 && yFrac <= 1) {
        const px = xFrac * displayCutout.width + 0.5;
        const py = (1 - yFrac) * displayCutout.height + 0.5;
        setCutoutCursorCoords(pixelToWorld(px, py, displayCutout.wcs));
      } else {
        setCutoutCursorCoords(null);
      }
    } else {
      setCutoutCursorCoords(null);
    }

    if (roiDraftBox) {
      const pt = clientToImageFraction(e.clientX, e.clientY);
      if (pt) {
        setRoiDraftBox((prev) => (prev ? { ...prev, x1: pt.xFrac, y1: pt.yFrac } : null));
      }
      return;
    }

    if (!cutoutDragRef.current.dragging) return;

    const dxPx = e.clientX - cutoutDragRef.current.startX;
    const dyPx = e.clientY - cutoutDragRef.current.startY;

    const rawCx = cutoutDragRef.current.startCx - dxPx / (rect.width * totalCutoutScale);
    const rawCy = cutoutDragRef.current.startCy - dyPx / (rect.height * totalCutoutScale);
    const clampedCx = Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, rawCx));
    const clampedCy = Math.min(1 - cutoutHalfSpan, Math.max(cutoutHalfSpan, rawCy));

    setPanOffset({
      x: clampedCx - cutoutAnchor.x,
      y: clampedCy - cutoutAnchor.y,
    });
  };

  const handleCutoutPointerLeave = () => {
    setCutoutCursorCoords(null);
  };

  const handleCutoutPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (roiDraftBox) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const xMin = Math.min(roiDraftBox.x0, roiDraftBox.x1);
      const xMax = Math.max(roiDraftBox.x0, roiDraftBox.x1);
      const yMin = Math.min(roiDraftBox.y0, roiDraftBox.y1);
      const yMax = Math.max(roiDraftBox.y0, roiDraftBox.y1);
      setRoiDraftBox(null);

      if (displayCutout?.wcs && xMax - xMin > 0.005 && yMax - yMin > 0.005) {
        const w = displayCutout.width;
        const h = displayCutout.height;
        const toSky = (xf: number, yf: number) =>
          pixelToWorld(xf * w + 0.5, (1 - yf) * h + 0.5, displayCutout.wcs!);

        const corners = [
          toSky(xMin, yMin),
          toSky(xMax, yMin),
          toSky(xMax, yMax),
          toSky(xMin, yMax),
        ];
        const center = toSky((xMin + xMax) / 2, (yMin + yMax) / 2);
        const topMid = toSky((xMin + xMax) / 2, yMin);
        const botMid = toSky((xMin + xMax) / 2, yMax);
        const leftMid = toSky(xMin, (yMin + yMax) / 2);
        const rightMid = toSky(xMax, (yMin + yMax) / 2);
        const cosDec = Math.max(0.1, Math.cos((center.dec * Math.PI) / 180));
        const widthArcsec =
          Math.hypot((rightMid.ra - leftMid.ra) * cosDec, rightMid.dec - leftMid.dec) * 3600;
        const heightArcsec =
          Math.hypot((botMid.ra - topMid.ra) * cosDec, botMid.dec - topMid.dec) * 3600;

        const baseRoi: SkyRoiSelection = {
          corners,
          centerRa: center.ra,
          centerDec: center.dec,
          widthArcsec: Number.isFinite(widthArcsec) ? widthArcsec : 0,
          heightArcsec: Number.isFinite(heightArcsec) ? heightArcsec : 0,
          epochDate: selectedObs?.epoch_date ?? null,
          epochMjd: selectedObs?.t_min ?? null,
          obsId: selectedObs?.obs_id ?? null,
        };
        const photocenter = computeRoiPhotocenter(baseRoi, displayCutout);
        setSelectedRoi({
          ...baseRoi,
          centroidRa: photocenter?.ra,
          centroidDec: photocenter?.dec,
        });
        setSavedCurrentRoiId(null);
        setFloatingSaveName("");
        setShowRoiModal(false);
        setMap2ToolMode("pan");
        void handleScanAllBands();
      }
      return;
    }

    if (cutoutDragRef.current.dragging) {
      cutoutDragRef.current.dragging = false;
      setIsDraggingCutout(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleStepFov = (direction: "in" | "out") => {
    const next = direction === "in" ? currentFov * 0.7 : currentFov / 0.7;
    onChangeFov(clampCutoutFov(next));
  };

  const handleDownloadPng = () => {
    if (!displayCutout) return;
    const a = document.createElement("a");
    a.href = displayCutout.dataUrl;
    const name = selectedObs
      ? `spherex_${selectedObs.obs_collection}_${selectedObs.bandpass}_${selectedObs.obs_id}.png`
      : "spherex_cutout.png";
    a.download = name;
    a.click();
  };

  const toggleEpochDate = (obs: SpherexObservation) => {
    const key = getEpochKey(obs);
    setSelectedEpochKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allEpochDatesSelected =
    epochFrames.length > 0 && selectedEpochKeys.size === epochFrames.length;

  const handleToggleAllDates = () => {
    if (allEpochDatesSelected) {
      setSelectedEpochKeys(new Set());
    } else {
      setSelectedEpochKeys(new Set(epochFrames.map(getEpochKey)));
    }
  };

  const currentDatePillLabel = useMemo(() => {
    if (effectivePlaybackFrames.length > 0) {
      const current = effectivePlaybackFrames[activeEpochIdx] ?? effectivePlaybackFrames[0];
      return current.epoch_date ?? current.obs_id;
    }
    if (epochFrames.length > 0) {
      return `0/${epochFrames.length}`;
    }
    if (selectedObs?.epoch_date) {
      return selectedObs.epoch_date;
    }
    return FALLBACK_EPOCHS[fallbackEpochIdx] ?? t.chrono.noDateLabel;
  }, [effectivePlaybackFrames, activeEpochIdx, epochFrames.length, selectedObs?.epoch_date, fallbackEpochIdx, t.chrono.noDateLabel]);

  const epochReadoutText = useMemo(() => {
    if (effectivePlaybackFrames.length > 0) {
      const current = effectivePlaybackFrames[activeEpochIdx] ?? effectivePlaybackFrames[0];
      const dateStr = current.epoch_date ?? current.bandpass ?? "SPHEREx";
      return `${dateStr} (t${activeEpochIdx + 1}/${effectivePlaybackFrames.length})`;
    }
    if (epochFrames.length > 0) {
      return `0/${epochFrames.length}`;
    }
    return FALLBACK_EPOCHS[fallbackEpochIdx] ?? FALLBACK_EPOCHS[0];
  }, [effectivePlaybackFrames, epochFrames.length, activeEpochIdx, fallbackEpochIdx]);

  const maxEpochSlider = Math.max(
    1,
    (epochFrames.length > 0 ? Math.max(1, effectivePlaybackFrames.length) : FALLBACK_EPOCHS.length) - 1
  );

  const totalFramesCount =
    epochFrames.length > 0 ? effectivePlaybackFrames.length : FALLBACK_EPOCHS.length;
  const canStepFrames = !isPlaying && totalFramesCount > 1;

  const handleStepFrame = (delta: -1 | 1) => {
    if (!canStepFrames) return;
    if (!secondMapOpen) {
      onToggleSecondMap(true);
    }
    const nextIdx = (activeEpochIdx + delta + totalFramesCount) % totalFramesCount;
    if (effectivePlaybackFrames.length > 0 && effectivePlaybackFrames[nextIdx]) {
      onSelectVersionObservation(activeCollection, effectivePlaybackFrames[nextIdx]);
    } else if (epochFrames.length === 0) {
      setFallbackEpochIdx(nextIdx);
    }
  };

  const renderPlaybackBar = () => (
    <div
      id={isActive ? "tutorial-exp-playback" : undefined}
      className="glass-panel rounded-2xl px-5 py-3 flex flex-wrap items-center gap-5 w-full max-w-[740px]"
    >
      {/* Previous / Play-Pause / Next */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => handleStepFrame(-1)}
          disabled={!canStepFrames}
          className="btn-press w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
          title={t.chrono.prevFrameAria}
          aria-label={t.chrono.prevFrameAria}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!secondMapOpen) {
              onToggleSecondMap(true);
            }
            setIsPlaying((p) => !p);
          }}
          className="btn-press w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shrink-0 cursor-pointer"
          aria-label={t.chrono.playPauseAria}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleStepFrame(1)}
          disabled={!canStepFrames}
          className="btn-press w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
          title={t.chrono.nextFrameAria}
          aria-label={t.chrono.nextFrameAria}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsLooping((v) => !v)}
          aria-pressed={isLooping}
          className={`btn-press h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            isLooping
              ? "bg-[#00D2FF]/20 border-[#00D2FF]/60 text-[#00D2FF]"
              : "bg-white/10 border-white/15 text-slate-300 hover:bg-white/20 hover:text-white"
          }`}
          title={t.chrono.loopAria}
          aria-label={t.chrono.loopAria}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>{t.chrono.loopLabel}</span>
        </button>
      </div>

      {/* Epoch Scrubber */}
      <div className="flex-1 min-w-[180px] space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">{t.chrono.epochLabel}</span>
          <span className="font-mono text-[#00D2FF]">{epochReadoutText}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxEpochSlider}
          step={1}
          value={Math.min(activeEpochIdx, maxEpochSlider)}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            setIsPlaying(false);
            if (!secondMapOpen) {
              onToggleSecondMap(true);
            }
            if (effectivePlaybackFrames.length > 0 && effectivePlaybackFrames[idx]) {
              onSelectVersionObservation(activeCollection, effectivePlaybackFrames[idx]);
            } else if (epochFrames.length === 0) {
              setFallbackEpochIdx(idx);
            }
          }}
          className="apple-slider w-full"
        />
      </div>

      {/* Video Speed */}
      <div className="w-32 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">{t.chrono.speedLabel}</span>
          <span className="font-mono text-slate-200">{speedMultiplier.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.5}
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
          className="apple-slider w-full"
        />
      </div>
    </div>
  );

  useEffect(() => {
    if (!isActive) return;
    onSyncMap1Preview(totalCutoutScale, secondMapViewCorners);
  }, [isActive, totalCutoutScale, secondMapViewCorners, onSyncMap1Preview]);

  return (
    <>
      {secondMapOpen && (
        <div
          id={isActive ? "tutorial-exp-map2" : undefined}
          ref={cutoutViewportRef}
          className={`relative w-full h-full min-h-[280px] overflow-hidden border border-[#00D2FF]/45 bg-black shadow-2xl select-none overscroll-none ${
            isActive ? "flex-1 flex flex-col" : "hidden"
          } ${isMap2Fullscreen ? "rounded-none" : "rounded-[22px]"}`}
        >
            {/* Top-Left Map 2 Current Date Pill + Playback Date Selector Dropdown */}
            <div
              id={isActive ? "tutorial-exp-map2-dates" : undefined}
              ref={dateMenuRef}
              className="absolute top-4 left-4 z-30 max-w-[58%]"
            >
              <button
                type="button"
                onClick={() => setDateMenuOpen((o) => !o)}
                title={t.chrono.selectDatesTooltip}
                className="glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-mono text-slate-100 hover:border-[#00D2FF]/60 transition-colors cursor-pointer max-w-full"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] shrink-0" />
                <Calendar className="w-3.5 h-3.5 text-[#00D2FF] shrink-0" />
                <span className="font-mono font-medium text-amber-300 truncate">
                  {currentDatePillLabel}
                </span>
                {(loading || cutoutLoading || isPreloadingAll) && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00D2FF] shrink-0" />
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    dateMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dateMenuOpen && (
                <div className="mt-2 w-72 max-w-[calc(100vw-3rem)] glass-panel rounded-2xl border border-white/15 bg-slate-950/90 backdrop-blur-xl shadow-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-semibold text-slate-200 truncate">
                        {t.chrono.playbackDatesTitle}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-[#00D2FF]">
                        {selectedEpochKeys.size}/{epochFrames.length}
                      </span>
                    </div>
                    {epochFrames.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleAllDates}
                        className="text-[11px] font-medium text-[#00D2FF] hover:text-white cursor-pointer shrink-0"
                      >
                        {allEpochDatesSelected ? t.chrono.selectNoDates : t.chrono.selectAllDates}
                      </button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                    {epochFrames.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-2 text-center">
                        {t.chrono.noDatesAvailable}
                      </p>
                    ) : (
                      epochFrames.map((obs) => {
                        const key = getEpochKey(obs);
                        const isChecked = selectedEpochKeys.has(key);
                        const isCurrent = isSameObs(selectedObs, obs);
                        const frameStatus = epochCutouts[`${renderSignature}|${key}`]?.status;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleEpochDate(obs)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? "bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-white"
                                : "hover:bg-white/[0.06] border border-transparent text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  isChecked
                                    ? "bg-[#00D2FF] border-[#00D2FF] text-slate-950"
                                    : "border-slate-500 bg-transparent"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                              <span className="font-mono text-[11px] truncate">
                                {obs.epoch_date ?? obs.obs_id}
                              </span>
                            </div>
                            <span className="shrink-0 flex items-center">
                              {frameStatus === "ready" ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                              ) : frameStatus === "loading" ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[#00D2FF]" />
                              ) : frameStatus === "error" ? (
                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {epochFrames.length > 0 && selectedEpochKeys.size === 0 && (
                    <p className="text-[10px] text-amber-300/90 pt-1 border-t border-white/10">
                      {t.chrono.selectAtLeastOneDate}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Top-Right Map 2 Controls & Close Button */}
            <div
              id={isActive ? "tutorial-exp-map2-tools" : undefined}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 flex-wrap justify-end"
            >
              {/* Tool Toggle: Pan vs Select Area (ROI) */}
              {secondMapTab === "cutout" && displayCutout?.wcs && (
                <div className="glass-panel rounded-full p-1 flex items-center gap-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMap2ToolMode("pan")}
                    className={`btn-press px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-colors ${
                      map2ToolMode === "pan"
                        ? "bg-white/15 text-white font-semibold"
                        : "text-slate-300 hover:text-white"
                    }`}
                    title={isEn ? "Pan / Move Map 2" : "Mover / Desplazar Mapa 2"}
                  >
                    <Move className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMap2ToolMode("roi")}
                    disabled={isScanningBands}
                    className={`btn-press px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                      map2ToolMode === "roi"
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "text-slate-300 hover:text-white"
                    }`}
                    title={
                      isScanningBands
                        ? isEn
                          ? "Wait for the current area scan to finish"
                          : "Esperá a que termine el procesamiento del área actual"
                        : isEn
                          ? "Select area on Map 2 to analyze infrared chemical composition"
                          : "Seleccionar área en Mapa 2 para analizar composición química infrarroja"
                    }
                  >
                    <BoxSelect className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {isEn ? "Area" : "Área"}
                    </span>
                  </button>
                  {selectedRoi && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoiModalTab("current");
                        setShowRoiModal(true);
                      }}
                      className="btn-press px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 text-emerald-300 hover:bg-emerald-500/20 border-l border-white/10 ml-0.5"
                      title={
                        isEn ? "Open ROI chemical analysis" : "Abrir análisis químico del área"
                      }
                    >
                      <FlaskConical className="w-3 h-3" />
                    </button>
                  )}
                  {savedReadings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoiModalTab("compare");
                        setShowRoiModal(true);
                      }}
                      className="btn-press px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 text-[#00D2FF] hover:bg-[#00D2FF]/15 border-l border-white/10 ml-0.5"
                      title={
                        isEn
                          ? "Compare saved area readings"
                          : "Comparar lecturas guardadas"
                      }
                    >
                      <GitCompareArrows className="w-3 h-3" />
                      <span className="font-mono text-[10px]">{savedReadings.length}</span>
                    </button>
                  )}
                  {savedReadings.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoiModalTab("trajectory");
                        setShowRoiModal(true);
                      }}
                      className="btn-press px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 text-amber-300 hover:bg-amber-500/15 border-l border-white/10 ml-0.5"
                      title={
                        isEn
                          ? "Trace motion & extrapolate position"
                          : "Trazar movimiento y extrapolar posición"
                      }
                    >
                      <TrendingUp className="w-3 h-3" />
                    </button>
                  )}
                  {activeTrajectory && (
                    <button
                      type="button"
                      onClick={() => onChangeActiveTrajectory(null)}
                      className="btn-press px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 text-rose-300 hover:bg-rose-500/15 border-l border-white/10 ml-0.5"
                      title={
                        isEn
                          ? "Hide trajectory overlay"
                          : "Ocultar trazado de trayectoria"
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Map 2 Field of View (FOV) Controls */}
              <div className="glass-panel rounded-full px-2 py-1 flex items-center gap-1 text-[11px] text-slate-300">
                <button
                  type="button"
                  onClick={() => handleStepFov("out")}
                  disabled={currentFov >= MAX_CUTOUT_FOV_DEG}
                  className="p-0.5 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  title={t.viewer.map2FovOutTitle}
                  aria-label={t.viewer.map2FovOutTitle}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-[#00D2FF] px-1 whitespace-nowrap">
                  FOV {currentFov.toFixed(2)}°
                </span>
                <button
                  type="button"
                  onClick={() => handleStepFov("in")}
                  disabled={currentFov <= MIN_CUTOUT_FOV_DEG}
                  className="p-0.5 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  title={t.viewer.map2FovInTitle}
                  aria-label={t.viewer.map2FovInTitle}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fullscreen Toggle for Map 2 */}
              <button
                type="button"
                onClick={handleToggleMap2Fullscreen}
                className="btn-press glass-panel w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                title={isMap2Fullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
                aria-label={isMap2Fullscreen ? t.chrono.exitFullscreen : t.chrono.enterFullscreen}
              >
                {isMap2Fullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Close 2nd Map (Restores Map 1 to 100% Width) */}
              <button
                type="button"
                onClick={() => onToggleSecondMap(false)}
                className="btn-press glass-panel w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                title={t.chrono.closeSecondMapButton}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map 2 NASA/IRSA API Down Alert */}
            {(map2ApiDown || (status?.isError && status.text === t.status.map2ApiDown)) && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-auto">
                <div className="glass-panel rounded-2xl border border-rose-500/40 bg-rose-950/75 px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-rose-100 shadow-xl">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="leading-snug">{t.status.map2ApiDown}</span>
                </div>
              </div>
            )}

            {/* Map 2 Content Body */}
            {secondMapTab === "cutout" ? (
              <div className="flex-1 w-full h-full flex items-center justify-center pl-14 pr-5 pt-16 pb-16 relative">
                {isMap2LoadingImages && <AsteroidLoadingGame obstacleRef={loadingCardRef} />}

                {isWaitingForSelectedDates ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      {t.chrono.selectAtLeastOneDate}
                    </p>
                  </div>
                ) : isPreloadingAll ? (
                  <div
                    ref={loadingCardRef}
                    className="relative z-20 glass-panel rounded-2xl border border-[#00D2FF]/35 bg-slate-950/90 backdrop-blur-md shadow-2xl px-6 py-4 flex flex-col items-center justify-center gap-2.5 text-slate-300 text-center"
                  >
                    <Loader2 className="w-7 h-7 animate-spin text-[#00D2FF]" />
                    <span className="text-xs font-medium text-slate-200">
                      {t.chrono.preloadingFrames(settledPlaybackCount, playbackFrames.length)}
                    </span>
                  </div>
                ) : displayCutout ? (
                  <div
                    ref={cutoutImageFrameRef}
                    onPointerDown={handleCutoutPointerDown}
                    onPointerMove={handleCutoutPointerMove}
                    onPointerUp={handleCutoutPointerUp}
                    onPointerCancel={handleCutoutPointerUp}
                    onPointerLeave={handleCutoutPointerLeave}
                    className={`relative border border-white/30 shadow-2xl touch-none ${
                      map2ToolMode === "roi"
                        ? "cursor-crosshair"
                        : canPanCutout
                          ? isDraggingCutout
                            ? "cursor-grabbing"
                            : "cursor-grab"
                          : "cursor-default"
                    }`}
                    style={{
                      aspectRatio: `${displayCutout.width} / ${displayCutout.height}`,
                      ...(displayCutout.width >= displayCutout.height
                        ? { width: "100%", maxHeight: "100%" }
                        : { height: "100%", maxWidth: "100%" }),
                    }}
                  >
                    <div className="w-full h-full overflow-hidden relative bg-black">
                      {prevCutoutUrl && (
                        <img
                          src={prevCutoutUrl}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={cutoutTransformStyle}
                          className="absolute inset-0 w-full h-full object-fill block [image-rendering:pixelated] pointer-events-none"
                        />
                      )}
                      <img
                        key={displayCutout.dataUrl}
                        src={displayCutout.dataUrl}
                        alt={t.viewer.altCutout}
                        draggable={false}
                        style={cutoutTransformStyle}
                        className={`relative w-full h-full object-fill block [image-rendering:pixelated] pointer-events-none ${
                          isDraggingCutout ? "" : "transition-transform duration-150"
                        }`}
                      />

                      {/* Target Coordinate Reticle */}
                      {showCrosshair && targetFraction && (
                        <div
                          className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 ${
                            isDraggingCutout ? "" : "transition-all duration-150"
                          }`}
                          style={{
                            left: `${(0.5 + (targetFraction.xFrac - cutoutViewCenter.cx) * totalCutoutScale) * 100}%`,
                            top: `${(0.5 + (targetFraction.yFrac - cutoutViewCenter.cy) * totalCutoutScale) * 100}%`,
                          }}
                        >
                          <div className="relative flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border border-[#00D2FF]/90 shadow-[0_0_10px_rgba(0,210,255,0.65)]" />
                            <div className="absolute w-14 h-[1px] bg-[#00D2FF]/90" />
                            <div className="absolute h-14 w-[1px] bg-[#00D2FF]/90" />
                          </div>
                        </div>
                      )}

                      {/* Selected / Draft ROI Box */}
                      {roiOverlayBox && (
                        <div
                          className="absolute pointer-events-none border-2 border-emerald-400 bg-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.55)]"
                          style={{
                            left: `${(0.5 + (roiOverlayBox.xMin - cutoutViewCenter.cx) * totalCutoutScale) * 100}%`,
                            top: `${(0.5 + (roiOverlayBox.yMin - cutoutViewCenter.cy) * totalCutoutScale) * 100}%`,
                            width: `${(roiOverlayBox.xMax - roiOverlayBox.xMin) * totalCutoutScale * 100}%`,
                            height: `${(roiOverlayBox.yMax - roiOverlayBox.yMin) * totalCutoutScale * 100}%`,
                          }}
                        >
                          <span className="absolute -top-1 -left-1 w-2 h-2 bg-emerald-300 rounded-[1px]" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-[1px]" />
                          <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-300 rounded-[1px]" />
                          <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-300 rounded-[1px]" />
                        </div>
                      )}

                      {/* Celestial Motion Trajectory & Extrapolation Overlay */}
                      {activeTrajectory && displayCutout?.wcs && (() => {
                        const wcs = displayCutout.wcs;
                        const toPct = (ra: number, dec: number) => {
                          const p = worldToPixel(ra, dec, wcs);
                          if (!p) return null;
                          const xFrac = (p.px - 0.5) / displayCutout.width;
                          const yFrac = 1 - (p.py - 0.5) / displayCutout.height;
                          return {
                            x: (0.5 + (xFrac - cutoutViewCenter.cx) * totalCutoutScale) * 100,
                            y: (0.5 + (yFrac - cutoutViewCenter.cy) * totalCutoutScale) * 100,
                          };
                        };

                        const obsPts = activeTrajectory.trajectory.points
                          .map((pt, idx) => {
                            const pos = toPct(pt.ra, pt.dec);
                            return pos ? { ...pt, idx, x: pos.x, y: pos.y } : null;
                          })
                          .filter((v): v is NonNullable<typeof v> => v !== null);

                        const extrap = activeTrajectory.extrapolated
                          ? (() => {
                              const pos = toPct(
                                activeTrajectory.extrapolated!.ra,
                                activeTrajectory.extrapolated!.dec
                              );
                              if (!pos) return null;
                              const pxScale =
                                Math.hypot(wcs.cd1_1, wcs.cd2_1) * 3600 || 6.2;
                              const radiusPct = Math.max(
                                1.5,
                                ((activeTrajectory.extrapolated!.uncertaintyArcsec / pxScale) /
                                  displayCutout.width) *
                                  totalCutoutScale *
                                  100
                              );
                              return {
                                ...activeTrajectory.extrapolated!,
                                x: pos.x,
                                y: pos.y,
                                radiusPct,
                              };
                            })()
                          : null;

                        if (obsPts.length === 0) return null;
                        const polyPoints = obsPts
                          .map((p) => `${(p.x * 10).toFixed(1)},${(p.y * 10).toFixed(1)}`)
                          .join(" ");
                        const lastObs = obsPts[obsPts.length - 1];

                        return (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <svg
                              viewBox="0 0 1000 1000"
                              preserveAspectRatio="none"
                              className="absolute inset-0 w-full h-full"
                            >
                              {obsPts.length >= 2 && (
                                <polyline
                                  fill="none"
                                  stroke="#00D2FF"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={polyPoints}
                                />
                              )}
                              {extrap && (
                                <line
                                  x1={(lastObs.x * 10).toFixed(1)}
                                  y1={(lastObs.y * 10).toFixed(1)}
                                  x2={(extrap.x * 10).toFixed(1)}
                                  y2={(extrap.y * 10).toFixed(1)}
                                  stroke="#fbbf24"
                                  strokeWidth="4"
                                  strokeDasharray="10 8"
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>

                            {obsPts.map((pt) => (
                              <div
                                key={pt.readingId}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                              >
                                <div className="w-5 h-5 rounded-full bg-[#00D2FF] text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(0,210,255,0.85)] border border-white">
                                  {pt.idx + 1}
                                </div>
                                <span className="mt-1 px-1.5 py-0.5 rounded bg-black/80 border border-[#00D2FF]/50 font-mono text-[9px] text-[#00D2FF] whitespace-nowrap">
                                  {pt.epochDate}
                                </span>
                              </div>
                            ))}

                            {extrap && (
                              <div
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                                style={{ left: `${extrap.x}%`, top: `${extrap.y}%` }}
                              >
                                <div
                                  className="rounded-full border border-dashed border-amber-300/80 bg-amber-400/15 flex items-center justify-center"
                                  style={{
                                    width: `${Math.min(180, Math.max(24, extrap.radiusPct * 4))}px`,
                                    height: `${Math.min(180, Math.max(24, extrap.radiusPct * 4))}px`,
                                  }}
                                >
                                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                                </div>
                                <span className="absolute top-full mt-1 px-1.5 py-0.5 rounded bg-black/85 border border-amber-400/60 font-mono text-[9px] text-amber-300 whitespace-nowrap">
                                  {extrap.targetDate} (±{extrap.uncertaintyArcsec.toFixed(1)}″)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Callout Card Anchored Directly to Selected ROI */}
                    {selectedRoi && !roiDraftBox && !showRoiModal && roiOverlayBox && (() => {
                      const leftPct = (0.5 + (roiOverlayBox.xMin - cutoutViewCenter.cx) * totalCutoutScale) * 100;
                      const rightPct = (0.5 + (roiOverlayBox.xMax - cutoutViewCenter.cx) * totalCutoutScale) * 100;
                      const topPct = (0.5 + (roiOverlayBox.yMin - cutoutViewCenter.cy) * totalCutoutScale) * 100;
                      const bottomPct = (0.5 + (roiOverlayBox.yMax - cutoutViewCenter.cy) * totalCutoutScale) * 100;
                      const centerXPct = Math.min(82, Math.max(18, (leftPct + rightPct) / 2));
                      const placeBelow = bottomPct <= 65;

                      const pct =
                        isScanningBands && scanProgress && scanProgress.total > 0
                          ? Math.min(
                              99,
                              Math.round((scanProgress.current / scanProgress.total) * 100)
                            )
                          : observations.length > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  ((roiAnalysis?.totalObservationsAnalyzed ?? 0) /
                                    observations.length) *
                                    100
                                )
                              )
                            : 100;

                      const handleSaveFromCard = (e: React.FormEvent) => {
                        e.preventDefault();
                        const trimmed = floatingSaveName.trim();
                        if (!trimmed || !roiAnalysis) return;
                        const id = `roi_${Date.now()}`;
                        onSaveReading({
                          id,
                          name: trimmed,
                          savedAt: new Date().toISOString(),
                          targetName:
                            resolvedObject?.canonicalName ?? targetName ?? "Target",
                          roi: selectedRoi,
                          analysis: roiAnalysis,
                        });
                        setSavedCurrentRoiId(id);
                        setFloatingSaveName("");
                      };

                      return (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerMove={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          className="absolute z-30 w-64 sm:w-72 -translate-x-1/2 rounded-2xl border border-emerald-400/55 bg-[#070B19]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-3 space-y-2"
                          style={{
                            left: `${centerXPct}%`,
                            ...(placeBelow
                              ? { top: `calc(${Math.min(92, Math.max(8, bottomPct))}% + 10px)` }
                              : { bottom: `calc(${Math.min(92, Math.max(8, 100 - topPct))}% + 10px)` }),
                          }}
                        >
                          {/* Connector Triangle pointing to the selected area */}
                          <span
                            className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#070B19] border-emerald-400/55 ${
                              placeBelow
                                ? "-top-1.5 border-l border-t"
                                : "-bottom-1.5 border-r border-b"
                            }`}
                          />

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isScanningBands ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00D2FF] shrink-0" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-white truncate">
                                {isScanningBands
                                  ? isEn
                                    ? `Processing... ${pct}%`
                                    : `Procesando... ${pct}%`
                                  : isEn
                                    ? "Completed"
                                    : "Completado"}
                              </span>
                            </div>
                            {!isScanningBands && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoi(null);
                                  setRoiDraftBox(null);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                aria-label={isEn ? "Close" : "Cerrar"}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isScanningBands ? "bg-[#00D2FF]" : "bg-emerald-400"
                              }`}
                              style={{ width: isScanningBands ? `${Math.max(4, pct)}%` : "100%" }}
                            />
                          </div>

                          {!isScanningBands && roiAnalysis && (
                            <div className="space-y-1.5 pt-0.5">
                              {roiAnalysis.celestialClassification?.topCandidate && (
                                <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-[#00D2FF]/10 border border-[#00D2FF]/35 text-[11px]">
                                  <span className="flex items-center gap-1.5 min-w-0 text-slate-100">
                                    <Orbit className="w-3.5 h-3.5 text-[#00D2FF] shrink-0" />
                                    <span className="truncate">
                                      {isEn
                                        ? roiAnalysis.celestialClassification.topCandidate.nameEn
                                        : roiAnalysis.celestialClassification.topCandidate.nameEs}
                                    </span>
                                  </span>
                                  <span className="font-mono font-semibold text-[#00D2FF] shrink-0">
                                    {roiAnalysis.celestialClassification.topCandidate.probabilityPct.toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {roiAnalysis.habitability?.probabilityPct !== null &&
                                roiAnalysis.habitability?.probabilityPct !== undefined && (
                                  <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-[11px]">
                                    <span className="flex items-center gap-1.5 min-w-0 text-slate-100">
                                      <Dna className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                      <span className="truncate">
                                        {isEn ? "Life / Habitability" : "Vida / Habitabilidad"}
                                      </span>
                                    </span>
                                    <span className="font-mono font-semibold text-emerald-300 shrink-0">
                                      {roiAnalysis.habitability.probabilityPct.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}

                          {!isScanningBands && roiAnalysis && (
                            savedCurrentRoiId ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-2.5 py-1">
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isEn ? "Reading saved" : "Lectura guardada"}
                                </span>
                              </div>
                            ) : (
                              <form
                                onSubmit={handleSaveFromCard}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  value={floatingSaveName}
                                  onChange={(e) => setFloatingSaveName(e.target.value)}
                                  placeholder={
                                    isEn ? "Save reading as..." : "Guardar lectura como..."
                                  }
                                  maxLength={48}
                                  className="flex-1 min-w-0 rounded-xl bg-black/60 border border-white/15 focus:border-emerald-400 px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  disabled={!floatingSaveName.trim()}
                                  className="btn-press px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                                >
                                  <Bookmark className="w-3 h-3" />
                                  <span>{isEn ? "Save" : "Guardar"}</span>
                                </button>
                              </form>
                            )
                          )}

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {isScanningBands ? (
                              <button
                                type="button"
                                onClick={handleCancelScanBands}
                                className="btn-press px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-[11px] text-rose-200 cursor-pointer"
                              >
                                {isEn ? "Cancel" : "Cancelar"}
                              </button>
                            ) : (
                              savedReadings.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRoiModalTab("compare");
                                    setShowRoiModal(true);
                                  }}
                                  className="btn-press px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] text-slate-200 flex items-center gap-1 cursor-pointer"
                                >
                                  <GitCompareArrows className="w-3 h-3 text-[#00D2FF]" />
                                  <span>
                                    {isEn ? "Compare" : "Comparar"} ({savedReadings.length})
                                  </span>
                                </button>
                              )
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setRoiModalTab("current");
                                setShowRoiModal(true);
                              }}
                              className="btn-press ml-auto px-3 py-1 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/60 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              {isEn ? "View details" : "Ver en detalle"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Left Y-Axis (Declination) */}
                    {axisTicks && (
                      <div
                        className="absolute inset-y-0 -left-12 w-12 pointer-events-none"
                        aria-label={t.viewer.decAxisLabel}
                      >
                        {axisTicks.yTicks.map((tick, idx) => (
                          <div
                            key={`y-${idx}-${tick.label}`}
                            className="absolute right-0 flex items-center justify-end -translate-y-1/2"
                            style={{ top: `${tick.fraction * 100}%` }}
                          >
                            <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap -rotate-90 origin-center mr-1">
                              {tick.label}
                            </span>
                            <div className="w-1.5 h-[1px] bg-slate-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom X-Axis (Right Ascension) */}
                    {axisTicks && (
                      <div
                        className="absolute inset-x-0 -bottom-10 h-10 pointer-events-none"
                        aria-label={t.viewer.raAxisLabel}
                      >
                        {axisTicks.xTicks.map((tick, idx) => (
                          <div
                            key={`x-${idx}-${tick.label}`}
                            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                            style={{ left: `${tick.fraction * 100}%` }}
                          >
                            <div className="w-[1px] h-1.5 bg-slate-400 shrink-0" />
                            <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap mt-1">
                              {tick.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : loading || cutoutLoading ? (
                  <div
                    ref={loadingCardRef}
                    className="relative z-20 glass-panel rounded-2xl border border-[#00D2FF]/35 bg-slate-950/90 backdrop-blur-md shadow-2xl px-6 py-5 flex flex-col items-center justify-center gap-2.5 text-center text-slate-300"
                  >
                    <Loader2 className="w-7 h-7 animate-spin text-[#00D2FF]" />
                    <p className="text-xs font-medium text-slate-200">
                      {loading
                        ? status?.text ?? t.viewer.queryingApiTitle
                        : status?.text ?? t.epochPlayer.loadingFrame}
                    </p>
                    {loading && (
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        {t.viewer.queryingApiSubtitle}
                      </p>
                    )}
                  </div>
                ) : isApiDownOrError ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-rose-200">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    </div>
                    <p className="text-xs font-medium text-rose-200">{t.viewer.apiErrorTitle}</p>
                    <p className="text-[11px] text-rose-300/75 max-w-xs">
                      {t.viewer.apiErrorSubtitle}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                      <Info className="w-5 h-5 text-[#00D2FF]" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">{t.viewer.emptyTitle}</p>
                    <p className="text-[11px] text-slate-500 max-w-xs">{t.viewer.emptySubtitle}</p>
                  </div>
                )}

                {/* Bottom Floating Controls inside Map 2 */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 flex-wrap pointer-events-none">
                  <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
                    {/* Metadata / Wavelength Pill */}
                    <div className="glass-panel rounded-full px-3 py-1.5 text-[11px] font-mono text-slate-200 flex items-center gap-2">
                      {selectedObs ? (
                        <>
                          <span>
                            {selectedObs.em_min_um !== null && selectedObs.em_max_um !== null
                              ? `${selectedObs.em_min_um}–${selectedObs.em_max_um} µm`
                              : t.viewer.infrared}
                          </span>
                          {selectedObs.epoch_date && (
                            <>
                              <span className="text-slate-500">·</span>
                              <span className="text-amber-300">{selectedObs.epoch_date}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span>FOV {currentFov.toFixed(2)}°</span>
                      )}
                    </div>

                    {/* Hovered Mouse Coordinates Pill (outside FITS image area) */}
                    {displayCutout && cutoutCursorCoords && (
                      <div className="glass-panel rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono text-slate-100 pointer-events-none border-[#00D2FF]/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
                        <span className="whitespace-nowrap">
                          RA {formatRAtoHMS(cutoutCursorCoords.ra)} · Dec{" "}
                          {formatDectoDMS(cutoutCursorCoords.dec)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Download Actions */}
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    {displayCutout && (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadPng}
                          className="btn-press glass-panel rounded-full px-2.5 py-1 text-[11px] text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer"
                          title={t.viewer.savePngTitle}
                        >
                          <Download className="w-3 h-3 text-[#00D2FF]" />
                          <span className="hidden sm:inline">PNG</span>
                        </button>
                        <a
                          href={displayCutout.fits_cutout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-press glass-panel rounded-full px-2.5 py-1 text-[11px] text-[#00D2FF] hover:text-white flex items-center gap-1"
                          title={t.viewer.originalFitsTitle}
                        >
                          <FileDown className="w-3 h-3" />
                          <span className="hidden sm:inline">FITS</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : secondMapTab === "bands" ? (
              /* Map 2 Tab: 6 Spectral Bands (D1 - D6) Grid */
              <div className="flex-1 w-full h-full pt-16 pb-4 px-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-start">
                {bandRepresentatives.map((obs) => {
                  const key = `${renderSignature}|${obs.bandpass}|${obs.obs_id}`;
                  const entry = bandCutouts[key];
                  const isCurrent = isSameObs(selectedObs, obs);
                  const bandTarget =
                    entry?.status === "ready" && entry.cutout
                      ? getTargetImageFraction(
                          entry.cutout.width,
                          entry.cutout.height,
                          entry.cutout.wcs,
                          lastCoords
                        )
                      : null;
                  const bandHalfSpan = Math.min(0.5, 0.5 / fovScale);
                  const bandAnchorX = Math.min(
                    1 - bandHalfSpan,
                    Math.max(bandHalfSpan, bandTarget?.xFrac ?? 0.5)
                  );
                  const bandAnchorY = Math.min(
                    1 - bandHalfSpan,
                    Math.max(bandHalfSpan, bandTarget?.yFrac ?? 0.5)
                  );
                  const bandCx = Math.min(
                    1 - bandHalfSpan,
                    Math.max(bandHalfSpan, bandAnchorX + panOffset.x)
                  );
                  const bandCy = Math.min(
                    1 - bandHalfSpan,
                    Math.max(bandHalfSpan, bandAnchorY + panOffset.y)
                  );
                  const bandTx = (0.5 - bandCx) * fovScale * 100;
                  const bandTy = (0.5 - bandCy) * fovScale * 100;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelectVersionObservation(activeCollection, obs);
                        setSecondMapTab("cutout");
                      }}
                      className={`btn-press rounded-2xl overflow-hidden border text-left transition-all flex flex-col cursor-pointer ${
                        isCurrent
                          ? "border-[#00D2FF] bg-[#00D2FF]/10 shadow-[0_0_16px_rgba(0,210,255,0.2)]"
                          : "border-white/10 bg-white/[0.03] hover:border-[#00D2FF]/50"
                      }`}
                    >
                      <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
                        {entry?.status === "ready" && entry.cutout ? (
                          <div
                            className="relative max-w-full max-h-full overflow-hidden"
                            style={{
                              aspectRatio: `${entry.cutout.width} / ${entry.cutout.height}`,
                              ...(entry.cutout.width >= entry.cutout.height
                                ? { width: "100%" }
                                : { height: "100%" }),
                            }}
                          >
                            <img
                              src={entry.cutout.dataUrl}
                              alt={obs.bandpass}
                              style={{
                                transform: `translate(${bandTx}%, ${bandTy}%) scale(${fovScale})`,
                                transformOrigin: "center center",
                              }}
                              className="w-full h-full object-fill block [image-rendering:pixelated]"
                            />
                            {showCrosshair && bandTarget && (
                              <div
                                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  left: `${(0.5 + (bandTarget.xFrac - bandCx) * fovScale) * 100}%`,
                                  top: `${(0.5 + (bandTarget.yFrac - bandCy) * fovScale) * 100}%`,
                                }}
                              >
                                <div className="relative flex items-center justify-center">
                                  <div className="w-5 h-5 rounded-full border border-[#00D2FF]/90 shadow-[0_0_8px_rgba(0,210,255,0.7)]" />
                                  <div className="absolute w-8 h-[1px] bg-[#00D2FF]/90" />
                                  <div className="absolute h-8 w-[1px] bg-[#00D2FF]/90" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : entry?.status === "error" ? (
                          <span className="text-[10px] text-rose-400 px-2 text-center">
                            {t.epochPlayer.errorFrame}
                          </span>
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-[#00D2FF]" />
                        )}
                        <span className="glass-panel absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-[#00D2FF]">
                          {obs.bandpass}
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-300">
                        <span className="truncate">{obs.epoch_date ?? obs.obs_id}</span>
                        {obs.em_min_um !== null && obs.em_max_um !== null && (
                          <span className="text-[#00D2FF] shrink-0">
                            {obs.em_min_um}–{obs.em_max_um}µm
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : secondMapTab === "sed" ? (
              <div className="flex-1 w-full h-full pt-16 pb-4 px-4 overflow-y-auto">
                <SpectralProfile
                  observations={observations}
                  cachedFluxes={cachedFluxes}
                  selectedObsId={selectedObs?.obs_id ?? ""}
                  onSelectObsId={(obsId) => {
                    const target = observations.find((o) => o.obs_id === obsId);
                    if (target) onSelectVersionObservation(activeCollection, target);
                  }}
                  onScanAllBands={handleScanAllBands}
                  isScanning={isScanningBands}
                  scanProgress={scanProgress}
                />
              </div>
            ) : secondMapTab === "blink" ? (
              <div className="flex-1 w-full h-full pt-16 pb-4 px-4 overflow-y-auto">
                <BlinkComparator
                  observations={observations}
                  selectedIdx={selectedIdx >= 0 ? selectedIdx : 0}
                  onSelectIndex={(idx) => {
                    const target = observations[idx];
                    if (target) onSelectVersionObservation(activeCollection, target);
                  }}
                  cachedImages={cachedImages}
                />
              </div>
            ) : (
              <div className="flex-1 w-full h-full pt-16 pb-4 px-4 overflow-y-auto">
                <DetectorGuide
                  currentBand="all"
                  onSelectBand={() => {}}
                  selectedObsBandpass={selectedObs?.bandpass}
                />
              </div>
            )}

            {/* Video Playback Bar inside Map 2 when in Fullscreen */}
            {isActive && isMap2Fullscreen && (
              <div className="px-4 pb-4 pt-1 flex justify-center shrink-0 z-30">
                {renderPlaybackBar()}
              </div>
            )}
          </div>
        )}

      {/* ===================================================================== */}
      {/* FLOATING TRANSLUCENT PLAYBACK BAR (Portaled to bottom slot)           */}
      {/* ===================================================================== */}
      {isActive && !isMap2Fullscreen && playbackSlotEl
        ? createPortal(renderPlaybackBar(), playbackSlotEl)
        : null}

      {/* Optional Multi-Version & Multi-Band Gallery Modal */}
      {isActive &&
        galleryOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="glass-panel rounded-[24px] w-full max-w-4xl max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00D2FF]" />
                  <span>{t.viewer.galleryTitle}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => onCloseGallery?.()}
                  className="btn-press p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <MultiVersionGallery
                versions={versions}
                lastCoords={lastCoords}
                stretch={stretch}
                colormap={colormap}
                subtractZodi={subtractZodi}
                activeCollection={activeCollection}
                selectedObs={selectedObs}
                onSelectVersionObservation={(col, obs) => {
                  onSelectVersionObservation(col, obs);
                  onToggleSecondMap(true);
                  onCloseGallery?.();
                }}
              />
            </div>
          </div>,
          document.body
        )}

      <RoiAnalysisModal
        isOpen={isActive && showRoiModal}
        initialTab={roiModalTab}
        roi={selectedRoi}
        analysis={roiAnalysis}
        targetName={resolvedObject?.canonicalName ?? targetName ?? "Target"}
        totalAvailableObservations={observations.length}
        isScanning={isScanningBands}
        scanProgress={scanProgress}
        savedReadings={savedReadings}
        isCurrentSaved={savedCurrentRoiId !== null}
        onSaveReading={(name) => {
          if (!selectedRoi || !roiAnalysis) return;
          const id = `roi_${Date.now()}`;
          onSaveReading({
            id,
            name,
            savedAt: new Date().toISOString(),
            targetName: resolvedObject?.canonicalName ?? targetName ?? "Target",
            roi: selectedRoi,
            analysis: roiAnalysis,
          });
          setSavedCurrentRoiId(id);
        }}
        onDeleteSavedReading={(id) => {
          onDeleteSavedReading(id);
          if (savedCurrentRoiId === id) setSavedCurrentRoiId(null);
        }}
        onScanAllBands={handleScanAllBands}
        onCancelScan={handleCancelScanBands}
        onClearRoi={() => {
          setSelectedRoi(null);
          setRoiDraftBox(null);
          setSavedCurrentRoiId(null);
          setShowRoiModal(false);
        }}
        onShowTrajectoryOnMap={(trajectory, extrapolated) => {
          onChangeActiveTrajectory({ trajectory, extrapolated });
          setSecondMapTab("cutout");
        }}
        onClose={() => setShowRoiModal(false)}
      />
    </>
  );
};

export const ViewerPanel: React.FC<ViewerPanelProps> = ({
  map2Tabs,
  activeMap2TabId,
  onSelectMap2Tab,
  onCloseMap2Tab,
  onRenameMap2Tab,
  galleryOpen = false,
  onCloseGallery,
  selectedObs,
  cutout,
  cutoutLoading,
  lastCoords,
  targetName = "WISE 0855",
  showCrosshair,
  status,
  resolvedObject,
  versions,
  activeCollection,
  stretch,
  colormap,
  subtractZodi,
  secondMapOpen,
  onToggleSecondMap,
  externalChannelIdx,
  onChangeFov,
  onSelectVersionObservation,
  onQueryAtCoords,
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabLabel, setEditingTabLabel] = useState<string>("");
  const [savedReadings, setSavedReadings] = useState<SavedRoiReading[]>(() =>
    loadSavedRoiReadings()
  );
  const [activeTrajectory, setActiveTrajectory] = useState<{
    trajectory: CelestialTrajectoryResult;
    extrapolated: ExtrapolatedPosition | null;
  } | null>(null);
  const [playbackSlotEl, setPlaybackSlotEl] = useState<HTMLDivElement | null>(null);
  const [map1Preview, setMap1Preview] = useState<{
    scale: number;
    corners: Array<{ ra: number; dec: number }> | null;
  }>({ scale: 1, corners: null });

  const handleSyncMap1Preview = React.useCallback(
    (scale: number, corners: Array<{ ra: number; dec: number }> | null) => {
      setMap1Preview((prev) => {
        if (prev.scale === scale && prev.corners === corners) return prev;
        return { scale, corners };
      });
    },
    []
  );

  const handleSaveReading = React.useCallback((reading: SavedRoiReading) => {
    setSavedReadings(saveRoiReading(reading));
  }, []);

  const handleDeleteSavedReading = React.useCallback((id: string) => {
    setSavedReadings(deleteRoiReading(id));
  }, []);

  const activeVersionData = versions ? versions[activeCollection] : null;
  const observations = React.useMemo(
    () => activeVersionData?.observations ?? [],
    [activeVersionData?.observations]
  );

  return (
    <main className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
      {/* Status Banner (only when error) */}
      {status && status.isError && (
        <div className="glass-panel px-4 py-2 rounded-2xl text-xs flex items-center gap-2 border-rose-500/40 text-rose-200 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{status.text}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEWPORT AREA: 1 Map (Full Width) or Compact Map 1 + Tabbed Map 2     */}
      {/* ===================================================================== */}
      <div
        className={`flex-1 min-h-0 grid gap-4 transition-all duration-300 ${
          secondMapOpen
            ? "grid-cols-1 grid-rows-[200px_1fr] lg:grid-rows-1 lg:grid-cols-[270px_1fr] xl:grid-cols-[300px_1fr]"
            : "grid-cols-1"
        }`}
      >
        {/* MAP 1: Interactive HiPS / MOC Sky Viewport */}
        <HipsSkyMapPanel
          targetCoords={lastCoords}
          targetName={resolvedObject?.canonicalName ?? targetName}
          observations={observations}
          selectedObs={selectedObs}
          cutout={cutout}
          cutoutLoading={cutoutLoading}
          stretch={stretch}
          colormap={colormap}
          subtractZodi={subtractZodi}
          secondMapOpen={secondMapOpen}
          onToggleSecondMap={onToggleSecondMap}
          externalChannelIdx={externalChannelIdx}
          secondMapZoom={map1Preview.scale}
          secondMapViewCorners={map1Preview.corners}
          activeTrajectory={activeTrajectory}
          onChangeFov={onChangeFov}
          onSelectObservation={(obs) =>
            onSelectVersionObservation(activeMap2TabId, activeCollection, obs)
          }
          onQueryAtCoords={onQueryAtCoords}
        />

        {/* MAP 2: Tabbed Multi-Coordinate Viewports */}
        <div className={secondMapOpen ? "flex flex-col gap-2 min-h-0 h-full" : "hidden"}>
          {secondMapOpen && map2Tabs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
              {map2Tabs.map((tab) => {
                const isTabActive = tab.id === activeMap2TabId;
                const isBusy = tab.loading || tab.cutoutLoading;
                const hasError = Boolean(tab.status?.isError);
                const isEditing = editingTabId === tab.id;
                const commitRename = () => {
                  const trimmed = editingTabLabel.trim();
                  if (trimmed && trimmed !== tab.label) {
                    onRenameMap2Tab?.(tab.id, trimmed);
                  }
                  setEditingTabId(null);
                };
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      if (!isEditing) onSelectMap2Tab(tab.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab.id);
                      setEditingTabLabel(tab.label);
                    }}
                    role="tab"
                    aria-selected={isTabActive}
                    tabIndex={0}
                    title={isEn ? "Double-click to rename tab" : "Doble clic para renombrar pestaña"}
                    onKeyDown={(e) => {
                      if (isEditing) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMap2Tab(tab.id);
                      }
                    }}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border cursor-pointer transition-colors shrink-0 max-w-[210px] ${
                      isTabActive
                        ? "bg-[#00D2FF]/15 border-[#00D2FF]/60 text-white shadow-[0_0_12px_rgba(0,210,255,0.2)]"
                        : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#00D2FF] shrink-0" />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          hasError
                            ? "bg-rose-400"
                            : isTabActive
                              ? "bg-[#00D2FF]"
                              : "bg-emerald-400"
                        }`}
                      />
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTabLabel}
                        onChange={(e) => setEditingTabLabel(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingTabId(null);
                          }
                        }}
                        aria-label={isEn ? "Rename tab" : "Renombrar pestaña"}
                        className="w-28 bg-black/60 border border-[#00D2FF]/70 rounded px-1.5 py-0 text-xs font-mono text-white focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{tab.label}</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseMap2Tab(tab.id);
                      }}
                      aria-label={isEn ? "Close tab" : "Cerrar pestaña"}
                      title={isEn ? "Close tab" : "Cerrar pestaña"}
                      className="p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/15 cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {map2Tabs.map((tab) => {
            const tabObsList = tab.versions?.[tab.activeCollection]?.observations ?? [];
            const tabSelectedObs = tabObsList[tab.selectedIdx] ?? null;
            return (
              <Map2TabPanel
                key={tab.id}
                tabId={tab.id}
                isActive={tab.id === activeMap2TabId}
                selectedObs={tabSelectedObs}
                cutout={tab.cutout}
                loading={tab.loading}
                cutoutLoading={tab.cutoutLoading}
                lastCoords={tab.lastCoords}
                targetName={tab.targetName}
                showCrosshair={showCrosshair}
                status={tab.status}
                resolvedObject={tab.resolvedObject}
                versions={tab.versions}
                activeCollection={tab.activeCollection}
                stretch={stretch}
                colormap={colormap}
                subtractZodi={subtractZodi}
                secondMapOpen={secondMapOpen}
                onToggleSecondMap={onToggleSecondMap}
                onChangeFov={onChangeFov}
                onSelectVersionObservation={(col, obs) =>
                  onSelectVersionObservation(tab.id, col, obs)
                }
                savedReadings={savedReadings}
                onSaveReading={handleSaveReading}
                onDeleteSavedReading={handleDeleteSavedReading}
                activeTrajectory={activeTrajectory}
                onChangeActiveTrajectory={setActiveTrajectory}
                playbackSlotEl={playbackSlotEl}
                onSyncMap1Preview={handleSyncMap1Preview}
                galleryOpen={galleryOpen}
                onCloseGallery={onCloseGallery}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Playback Bar Slot */}
      <div ref={setPlaybackSlotEl} className="flex justify-center shrink-0" />
    </main>
  );
};
