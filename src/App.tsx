import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Music, PanelLeftClose, PanelLeftOpen, Search, Volume2, VolumeX, X } from "lucide-react";
import { AstroExplorerCornerBadge, StarConstellationLoader } from "./components/AstroExploreLogo";
import { ControlsPanel } from "./components/ControlsPanel";
import { EntryTutorial } from "./components/EntryTutorial";
import { ExplorerTutorial } from "./components/ExplorerTutorial";
import { LanguageSelector } from "./components/LanguageSelector";
import { NewSearchModal } from "./components/NewSearchModal";
import { ObservationsPanel } from "./components/ObservationsPanel";
import { ShareButton } from "./components/ShareButton";
import {
  CosmicBackground,
  SpaceGate,
  type CosmicBackgroundHandle,
} from "./components/SpaceGate";
import { ViewerPanel } from "./components/ViewerPanel";
import {
  DEFAULT_CUTOUT_FOV_DEG,
  MAX_CUTOUT_FOV_DEG,
  clampCutoutFov,
  formatDectoDMS,
  formatRAtoHMS,
  parseDec,
  parseRA,
} from "./lib/coordinates";
import { resolveCelestialName } from "./lib/celestialResolver";
import { NasaApiDownError } from "./lib/apiError";
import { MusicBeatAnalyser } from "./lib/musicAnalyser";
import {
  playButtonSound,
  playStartTransitionSound,
  preloadSoundEffects,
  setSfxEnabled,
} from "./lib/soundEffects";
import { getRenderedCutout, prefetchFitsCutout, queryAllSpherexVersions } from "./lib/irsa";
import { clearUrlState, parseUrlState, syncUrlState } from "./lib/urlState";
import { useLanguage } from "./i18n/LanguageContext";
import { localizeTargetName, type Translations } from "./i18n/translations";
import type {
  CollectionQueryMode,
  CollectionVersionData,
  ColormapName,
  Map2TabSession,
  RenderedCutout,
  ResolvedCelestialObject,
  SpherexCollectionId,
  SpherexObservation,
  StretchMode,
  TargetPreset,
} from "./lib/types";

type ScreenId = "entry" | "loading" | "explorer";

type StatusState =
  | { type: "resolvingObject"; name: string }
  | { type: "objectNotFound"; name: string }
  | { type: "downloadingFits"; band: string; id: string }
  | { type: "invalidRa" }
  | { type: "invalidDec" }
  | { type: "queryingSia"; ra: string; dec: string; collection: string }
  | { type: "queryingAllVersions"; ra: string; dec: string }
  | { type: "noImagesFound"; collection: string; ra: string; dec: string }
  | { type: "map2ApiDown" }
  | { type: "customError"; message: string }
  | null;

function translateErrorMessage(msg: string, t: Translations): string {
  if (msg.includes("IMAGE 2D")) return t.status.fitsNoImage;
  if (msg.includes("Dimensiones de imagen") || msg.includes("dimensions"))
    return t.status.fitsInvalidDimensions;
  if (msg.includes("NaN") || msg.includes("vacíos") || msg.includes("empty"))
    return t.status.fitsAllNan;
  if (msg.includes("Canvas")) return t.status.fitsCanvasError;
  return msg || t.status.unexpectedError;
}

function translateStatusState(
  statusState: StatusState,
  t: Translations
): { text: string; isError: boolean } | null {
  if (!statusState) return null;
  switch (statusState.type) {
    case "resolvingObject":
      return { text: t.status.resolvingObject(statusState.name), isError: false };
    case "objectNotFound":
      return { text: t.status.objectNotFound(statusState.name), isError: true };
    case "downloadingFits":
      return {
        text: t.status.downloadingFits({ band: statusState.band, id: statusState.id }),
        isError: false,
      };
    case "invalidRa":
      return { text: t.status.invalidRa, isError: true };
    case "invalidDec":
      return { text: t.status.invalidDec, isError: true };
    case "queryingSia":
      return { text: t.status.queryingSia(statusState), isError: false };
    case "queryingAllVersions":
      return { text: t.status.queryingAllVersions(statusState), isError: false };
    case "noImagesFound":
      return { text: t.status.noImagesFound(statusState), isError: true };
    case "map2ApiDown":
      return { text: t.status.map2ApiDown, isError: true };
    case "customError":
      return { text: translateErrorMessage(statusState.message, t), isError: true };
  }
}

interface Map2TabInternal {
  id: string;
  label: string;
  raInput: string;
  decInput: string;
  targetName: string;
  resolvedObject: ResolvedCelestialObject | null;
  lastCoords: { ra: number; dec: number; size: number } | null;
  versions: Record<SpherexCollectionId, CollectionVersionData> | null;
  activeCollection: SpherexCollectionId;
  selectedIdx: number;
  cutout: RenderedCutout | null;
  loading: boolean;
  cutoutLoading: boolean;
  statusState: StatusState;
}

const INITIAL_MAP2_TAB: Map2TabInternal = {
  id: "tab_initial",
  label: "WISE 0855",
  raInput: "08h55m10.831s",
  decInput: "-7d14m42.53s",
  targetName: "WISE 0855",
  resolvedObject: null,
  lastCoords: {
    ra: 133.79513,
    dec: -7.24515,
    size: DEFAULT_CUTOUT_FOV_DEG,
  },
  versions: null,
  activeCollection: "spherex_dr1",
  selectedIdx: 0,
  cutout: null,
  loading: false,
  cutoutLoading: false,
  statusState: null,
};

export default function App() {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  // iPhone Notification Liquid Glass Specular Pointer Tracker
  useEffect(() => {
    let rafId = 0;
    let lastX = -9999;
    let lastY = -9999;

    const updateSpecularCards = () => {
      rafId = 0;
      const cards = document.querySelectorAll<HTMLElement>(
        ".glass-panel, .hero-card, .detector-guide-container, .spectral-profile-card, .blink-comparator-card"
      );
      const proximityRadius = 190;
      for (let i = 0; i < cards.length; i++) {
        const el = cards[i];
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const x = lastX - rect.left;
        const y = lastY - rect.top;
        const dx = Math.max(rect.left - lastX, 0, lastX - rect.right);
        const dy = Math.max(rect.top - lastY, 0, lastY - rect.bottom);
        const dist = Math.hypot(dx, dy);

        if (dist < proximityRadius) {
          const intensity = Math.pow(1 - dist / proximityRadius, 1.35);
          el.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
          el.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
          el.style.setProperty("--specular-intensity", intensity.toFixed(3));
        } else if (el.style.getPropertyValue("--specular-intensity") !== "0") {
          el.style.setProperty("--specular-intensity", "0");
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateSpecularCards);
      }
    };

    const onPointerLeave = () => {
      lastX = -9999;
      lastY = -9999;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateSpecularCards);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  // Screen navigation state (Entry -> Loading -> Explorer)
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("entry");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Dual-map split state: false = 1 map (100% width), true = 2 maps dividing the original map space in 2
  const [secondMapOpen, setSecondMapOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [newSearchOpen, setNewSearchOpen] = useState<boolean>(false);
  const [showExposuresModal, setShowExposuresModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);

  // Tuned HiPS spectral channel
  const [externalChannelIdx, setExternalChannelIdx] = useState<number | null>(null);

  const cosmicBgRef = useRef<CosmicBackgroundHandle | null>(null);
  const [cursorSky, setCursorSky] = useState<{ ra: number; dec: number } | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabledState] = useState(true);
  const ENTRY_MUSIC_VOLUME = 0.15;
  const EXPLORER_MUSIC_VOLUME = 0.03;
  const [entryVolume, setEntryVolume] = useState<number>(ENTRY_MUSIC_VOLUME);
  const [explorerVolume, setExplorerVolume] = useState<number>(EXPLORER_MUSIC_VOLUME);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAnalyserRef = useRef<MusicBeatAnalyser | null>(null);
  if (!musicAnalyserRef.current) {
    musicAnalyserRef.current = new MusicBeatAnalyser();
  }
  const prevScreenRef = useRef<ScreenId>(currentScreen);
  const [warping, setWarping] = useState(false);

  const [raInput, setRaInput] = useState("08h55m10.831s");
  const [decInput, setDecInput] = useState("-7d14m42.53s");
  const [collectionMode, setCollectionMode] = useState<CollectionQueryMode>("spherex_dr1");
  const [band, setBand] = useState("all");
  const [radius, setRadius] = useState("0.05");
  const [size, setSize] = useState(DEFAULT_CUTOUT_FOV_DEG.toFixed(2));

  const [stretch, setStretch] = useState<StretchMode>("asinh");
  const [colormap, setColormap] = useState<ColormapName>("inferno");
  const [subtractZodi, setSubtractZodi] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(true);

  const [tabs, setTabs] = useState<Map2TabInternal[]>(() => [INITIAL_MAP2_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_MAP2_TAB.id);
  const tabCounterRef = useRef(0);
  const secondMapOpenRef = useRef(secondMapOpen);
  secondMapOpenRef.current = secondMapOpen;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const cutoutRequestsByTabRef = useRef<
    Map<string, { reqId: number; controller: AbortController }>
  >(new Map());
  const lastCutoutSigByTabRef = useRef<Map<string, string>>(new Map());

  const [resolvingName, setResolvingName] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>("wise_0855");

  const [activeUrlCoords, setActiveUrlCoords] = useState<{ ra: string; dec: string } | null>(null);
  const [urlBootstrapDone, setUrlBootstrapDone] = useState(false);
  const urlInitializedRef = useRef(false);
  const [urlErrorModal, setUrlErrorModal] = useState<{
    kind: "invalidTarget" | "invalidCoords";
    value: string;
  } | null>(null);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );

  const updateTab = useCallback(
    (tabId: string, updater: (tab: Map2TabInternal) => Map2TabInternal) => {
      setTabs((prev) => prev.map((tab) => (tab.id === tabId ? updater(tab) : tab)));
    },
    []
  );

  const map2Tabs: Map2TabSession[] = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: localizeTargetName(tab.label, isEn),
        raInput: tab.raInput,
        decInput: tab.decInput,
        targetName: localizeTargetName(tab.targetName, isEn),
        resolvedObject: tab.resolvedObject,
        lastCoords: tab.lastCoords,
        versions: tab.versions,
        activeCollection: tab.activeCollection,
        selectedIdx: tab.selectedIdx,
        cutout: tab.cutout,
        loading: tab.loading,
        cutoutLoading: tab.cutoutLoading,
        status: translateStatusState(tab.statusState, t),
      })),
    [tabs, t, isEn]
  );

  const targetName = localizeTargetName(activeTab.targetName, isEn);
  const resolvedObject = activeTab.resolvedObject;
  const loading = activeTab.loading;
  const cutoutLoading = activeTab.cutoutLoading;
  const versions = activeTab.versions;
  const activeCollection = activeTab.activeCollection;
  const selectedIdx = activeTab.selectedIdx;
  const cutout = activeTab.cutout;
  const lastCoords = activeTab.lastCoords;
  const status = useMemo(
    () => translateStatusState(activeTab.statusState, t),
    [activeTab.statusState, t]
  );

  const activeVersionData = versions ? versions[activeCollection] : null;
  const observations = activeVersionData?.observations ?? [];
  const totalFound = activeVersionData?.total_found ?? 0;
  const siaUrl = activeVersionData?.sia_url ?? "";

  const openOrReuseMap2Tab = useCallback(
    (params: {
      label: string;
      raInput: string;
      decInput: string;
      targetName: string;
      resolvedObject: ResolvedCelestialObject | null;
      forceReuse?: boolean;
    }): string => {
      if (!secondMapOpenRef.current || params.forceReuse) {
        const currentId = activeTabIdRef.current;
        lastCutoutSigByTabRef.current.delete(currentId);
        updateTab(currentId, (tab) => ({
          ...tab,
          label: params.label,
          raInput: params.raInput,
          decInput: params.decInput,
          targetName: params.targetName,
          resolvedObject: params.resolvedObject,
          versions: null,
          cutout: null,
          selectedIdx: 0,
          statusState: null,
        }));
        setSecondMapOpen(true);
        return currentId;
      }

      const newId = `tab_${Date.now()}_${++tabCounterRef.current}`;
      const newTab: Map2TabInternal = {
        id: newId,
        label: params.label,
        raInput: params.raInput,
        decInput: params.decInput,
        targetName: params.targetName,
        resolvedObject: params.resolvedObject,
        lastCoords: null,
        versions: null,
        activeCollection: "spherex_dr1",
        selectedIdx: 0,
        cutout: null,
        loading: false,
        cutoutLoading: false,
        statusState: null,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newId);
      return newId;
    },
    [updateTab]
  );

  const loadCutoutForTab = useCallback(
    async (
      tabId: string,
      obs: SpherexObservation,
      raDeg: number,
      decDeg: number,
      sizeDeg: number,
      stretchVal: StretchMode,
      cmapVal: ColormapName,
      zodiVal: boolean
    ) => {
      const prevEntry = cutoutRequestsByTabRef.current.get(tabId);
      prevEntry?.controller.abort();
      const controller = new AbortController();
      const reqId = (prevEntry?.reqId ?? 0) + 1;
      cutoutRequestsByTabRef.current.set(tabId, { reqId, controller });

      updateTab(tabId, (tab) => ({
        ...tab,
        cutoutLoading: true,
        statusState: {
          type: "downloadingFits",
          band: obs.bandpass || "SPHEREx",
          id: obs.obs_id,
        },
      }));

      try {
        const rendered = await getRenderedCutout({
          accessUrl: obs.access_url,
          ra: raDeg,
          dec: decDeg,
          size: sizeDeg,
          stretch: stretchVal,
          colormap: cmapVal,
          subtractZodi: zodiVal,
          priority: "high",
          signal: controller.signal,
        });
        if (cutoutRequestsByTabRef.current.get(tabId)?.reqId !== reqId) return;
        updateTab(tabId, (tab) => ({
          ...tab,
          cutout: rendered,
          statusState: null,
        }));
      } catch (err) {
        if (
          cutoutRequestsByTabRef.current.get(tabId)?.reqId !== reqId ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          return;
        }
        updateTab(tabId, (tab) => ({
          ...tab,
          statusState:
            err instanceof NasaApiDownError
              ? { type: "map2ApiDown" }
              : {
                type: "customError",
                message: err instanceof Error ? err.message : "",
              },
        }));
      } finally {
        if (cutoutRequestsByTabRef.current.get(tabId)?.reqId === reqId) {
          updateTab(tabId, (tab) => ({ ...tab, cutoutLoading: false }));
        }
      }
    },
    [updateTab]
  );

  const executeSearchForTab = useCallback(
    async (
      tabId: string,
      rawRa: string,
      rawDec: string,
      colMode: CollectionQueryMode,
      bandVal: string,
      radiusStr: string,
      sizeStr: string
    ) => {
      const raDeg = parseRA(rawRa);
      const decDeg = parseDec(rawDec);
      const radiusNum = Number(radiusStr);
      const sizeNum = Number(sizeStr);

      if (raDeg === null) {
        updateTab(tabId, (tab) => ({ ...tab, statusState: { type: "invalidRa" } }));
        return;
      }
      if (decDeg === null) {
        updateTab(tabId, (tab) => ({ ...tab, statusState: { type: "invalidDec" } }));
        return;
      }

      setActiveUrlCoords({ ra: rawRa.trim(), dec: rawDec.trim() });
      updateTab(tabId, (tab) => ({
        ...tab,
        loading: true,
        statusState: {
          type: "queryingSia",
          ra: formatRAtoHMS(raDeg),
          dec: formatDectoDMS(decDeg),
          collection: colMode,
        },
      }));

      try {
        const multiData = await queryAllSpherexVersions({
          ra: raDeg,
          dec: decDeg,
          radius: radiusNum,
          collectionMode: colMode,
          band: bandVal,
        });

        const targetCol = multiData.recommendedCollection;
        const targetObsList = multiData.versions[targetCol].observations;

        updateTab(tabId, (tab) => ({
          ...tab,
          versions: multiData.versions,
          activeCollection: targetCol,
          selectedIdx: 0,
          lastCoords: { ra: raDeg, dec: decDeg, size: sizeNum },
          ...(targetObsList.length === 0
            ? {
              cutout: null,
              statusState: {
                type: "noImagesFound",
                collection: "SPHEREx DR1 Wide (spherex_dr1)",
                ra: formatRAtoHMS(raDeg),
                dec: formatDectoDMS(decDeg),
              },
            }
            : {}),
        }));
      } catch (err) {
        updateTab(tabId, (tab) => ({
          ...tab,
          statusState:
            err instanceof NasaApiDownError
              ? { type: "map2ApiDown" }
              : {
                type: "customError",
                message: err instanceof Error ? err.message : "",
              },
        }));
      } finally {
        updateTab(tabId, (tab) => ({ ...tab, loading: false }));
      }
    },
    [updateTab]
  );

  const executeSearch = useCallback(
    async (
      rawRa: string,
      rawDec: string,
      colMode: CollectionQueryMode,
      bandVal: string,
      radiusStr: string,
      sizeStr: string
    ) => {
      await executeSearchForTab(
        activeTabIdRef.current,
        rawRa,
        rawDec,
        colMode,
        bandVal,
        radiusStr,
        sizeStr
      );
    },
    [executeSearchForTab]
  );

  const targetRa = lastCoords?.ra;
  const targetDec = lastCoords?.dec;

  // Instant update of flux stretch, colormap, or zodi subtraction on loaded FITS across all open tabs
  useEffect(() => {
    for (const tab of tabs) {
      const tabObsList = tab.versions?.[tab.activeCollection]?.observations ?? [];
      const obs = tabObsList[tab.selectedIdx];
      const raDeg = tab.lastCoords?.ra;
      const decDeg = tab.lastCoords?.dec;
      if (!obs || raDeg === undefined || decDeg === undefined) continue;
      const sig = `${obs.access_url}|${obs.obs_id}|${raDeg}|${decDeg}|${stretch}|${colormap}|${subtractZodi}`;
      if (lastCutoutSigByTabRef.current.get(tab.id) === sig) continue;
      lastCutoutSigByTabRef.current.set(tab.id, sig);
      void loadCutoutForTab(
        tab.id,
        obs,
        raDeg,
        decDeg,
        MAX_CUTOUT_FOV_DEG,
        stretch,
        colormap,
        subtractZodi
      );
    }
  }, [tabs, stretch, colormap, subtractZodi, loadCutoutForTab]);

  // Background prefetch next observation
  useEffect(() => {
    if (cutoutLoading || !cutout || targetRa === undefined || targetDec === undefined) return;
    const nextObs = observations[selectedIdx + 1];
    if (!nextObs) return;

    const controller = new AbortController();
    prefetchFitsCutout({
      accessUrl: nextObs.access_url,
      ra: targetRa,
      dec: targetDec,
      size: MAX_CUTOUT_FOV_DEG,
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [cutoutLoading, cutout, targetRa, targetDec, observations, selectedIdx]);

  // URL State: Parse URL parameters on initial load (supports ?ra=&dec= and ?target=)
  useEffect(() => {
    if (typeof window === "undefined" || urlInitializedRef.current) return;
    urlInitializedRef.current = true;

    const parsed = parseUrlState(window.location.search);

    if (parsed.kind === "none") {
      setUrlBootstrapDone(true);
      return;
    }

    if (parsed.kind === "invalidCoords") {
      clearUrlState();
      setCurrentScreen("entry");
      setUrlErrorModal({ kind: "invalidCoords", value: parsed.rawCoords });
      setUrlBootstrapDone(true);
      return;
    }

    const effectiveBand = parsed.options.band ?? band;
    const effectiveSize = parsed.options.size ?? size;
    const effectiveStretch = parsed.options.stretch ?? stretch;
    const effectiveCmap = parsed.options.colormap ?? colormap;
    const effectiveZodi = parsed.options.subtractZodi ?? subtractZodi;

    if (parsed.options.band) setBand(parsed.options.band);
    if (parsed.options.size) setSize(parsed.options.size);
    if (parsed.options.stretch) setStretch(parsed.options.stretch);
    if (parsed.options.colormap) setColormap(parsed.options.colormap);
    if (parsed.options.subtractZodi !== undefined) setSubtractZodi(parsed.options.subtractZodi);

    if (parsed.kind === "coords") {
      const effectiveCol = parsed.options.collection ?? collectionMode;
      if (parsed.options.collection) setCollectionMode(parsed.options.collection);

      setRaInput(parsed.ra);
      setDecInput(parsed.dec);
      setActivePresetId(null);
      setActiveUrlCoords({ ra: parsed.ra, dec: parsed.dec });
      setCurrentScreen("explorer");
      const tabId = openOrReuseMap2Tab({
        label: `${parsed.ra}, ${parsed.dec}`,
        raInput: parsed.ra,
        decInput: parsed.dec,
        targetName: t.chrono.customSkyPatch,
        resolvedObject: null,
        forceReuse: true,
      });
      setUrlBootstrapDone(true);

      void executeSearchForTab(
        tabId,
        parsed.ra,
        parsed.dec,
        effectiveCol,
        effectiveBand,
        radius,
        effectiveSize
      );
      return;
    }

    // parsed.kind === "target"
    if (!parsed.target) {
      clearUrlState();
      setCurrentScreen("entry");
      setUrlErrorModal({ kind: "invalidTarget", value: "" });
      setUrlBootstrapDone(true);
      return;
    }

    setCurrentScreen("loading");
    setLoadingProgress(35);

    const resolveInitialTarget = async () => {
      const matchingPreset = t.presets.find(
        (p) =>
          p.label.toLowerCase() === parsed.target.toLowerCase() ||
          p.queryName.toLowerCase() === parsed.target.toLowerCase()
      );

      if (matchingPreset) {
        const effectiveCol = parsed.options.collection ?? matchingPreset.collection;
        setActivePresetId(matchingPreset.id);
        setRaInput(matchingPreset.ra);
        setDecInput(matchingPreset.dec);
        setCollectionMode(effectiveCol);
        setActiveUrlCoords({ ra: matchingPreset.ra, dec: matchingPreset.dec });

        syncUrlState({
          ra: matchingPreset.ra,
          dec: matchingPreset.dec,
          collection: effectiveCol,
          band: effectiveBand,
          size: effectiveSize,
          stretch: effectiveStretch,
          colormap: effectiveCmap,
          subtractZodi: effectiveZodi,
        });

        let resolvedObj: ResolvedCelestialObject | null = null;
        try {
          resolvedObj = await resolveCelestialName(matchingPreset.queryName);
        } catch {
          resolvedObj = null;
        }

        setLoadingProgress(100);
        setCurrentScreen("explorer");
        const tabId = openOrReuseMap2Tab({
          label: matchingPreset.label,
          raInput: matchingPreset.ra,
          decInput: matchingPreset.dec,
          targetName: matchingPreset.label,
          resolvedObject: resolvedObj,
          forceReuse: true,
        });
        setUrlBootstrapDone(true);
        await executeSearchForTab(
          tabId,
          matchingPreset.ra,
          matchingPreset.dec,
          effectiveCol,
          effectiveBand,
          radius,
          effectiveSize
        );
        return;
      }

      try {
        const resolved = await resolveCelestialName(parsed.target);
        const effectiveCol = parsed.options.collection ?? "spherex_dr1";
        setActivePresetId(null);
        setRaInput(resolved.raHms);
        setDecInput(resolved.decDms);
        setCollectionMode(effectiveCol);
        setActiveUrlCoords({ ra: resolved.raHms, dec: resolved.decDms });

        syncUrlState({
          ra: resolved.raHms,
          dec: resolved.decDms,
          collection: effectiveCol,
          band: effectiveBand,
          size: effectiveSize,
          stretch: effectiveStretch,
          colormap: effectiveCmap,
          subtractZodi: effectiveZodi,
        });

        setLoadingProgress(100);
        setCurrentScreen("explorer");
        const tabId = openOrReuseMap2Tab({
          label: resolved.canonicalName,
          raInput: resolved.raHms,
          decInput: resolved.decDms,
          targetName: resolved.canonicalName,
          resolvedObject: resolved,
          forceReuse: true,
        });
        setUrlBootstrapDone(true);
        await executeSearchForTab(
          tabId,
          resolved.raHms,
          resolved.decDms,
          effectiveCol,
          effectiveBand,
          radius,
          effectiveSize
        );
      } catch {
        clearUrlState();
        setCurrentScreen("entry");
        setUrlErrorModal({ kind: "invalidTarget", value: parsed.target });
        setUrlBootstrapDone(true);
      }
    };

    void resolveInitialTarget();
  }, [
    band,
    collectionMode,
    colormap,
    executeSearch,
    radius,
    size,
    stretch,
    subtractZodi,
    t.chrono.customSkyPatch,
    t.presets,
  ]);

  // URL State: Keep browser URL synced with active explorer coordinates & display settings
  useEffect(() => {
    if (!urlBootstrapDone || currentScreen !== "explorer" || !activeUrlCoords) return;
    syncUrlState({
      ra: activeUrlCoords.ra,
      dec: activeUrlCoords.dec,
      collection: collectionMode,
      band,
      size,
      stretch,
      colormap,
      subtractZodi,
    });
  }, [
    urlBootstrapDone,
    currentScreen,
    activeUrlCoords,
    collectionMode,
    band,
    size,
    stretch,
    colormap,
    subtractZodi,
  ]);

  // Dismiss URL validation modal with Escape
  useEffect(() => {
    if (!urlErrorModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUrlErrorModal(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [urlErrorModal]);

  // Shared full warp + loading animation when leaving the entry screen
  const runEntryExitTransition = useCallback(
    async (
      warpTarget: { ra: number; dec: number } | null,
      workPromise: Promise<unknown>
    ) => {
      const WARP_DURATION_MS = 1550;
      playStartTransitionSound();
      setWarping(true);
      setCurrentScreen("loading");
      setLoadingProgress(20);

      const warpPromise =
        cosmicBgRef.current?.warpTo(warpTarget, WARP_DURATION_MS) ??
        new Promise<void>((resolve) => window.setTimeout(resolve, WARP_DURATION_MS));

      const minDurationPromise = new Promise<void>((resolve) =>
        window.setTimeout(resolve, WARP_DURATION_MS)
      );

      const step1Timer = window.setTimeout(() => {
        setLoadingProgress(60);
      }, 420);
      const step2Timer = window.setTimeout(() => {
        setLoadingProgress(90);
      }, 980);

      await Promise.all([
        warpPromise,
        minDurationPromise,
        Promise.race([
          workPromise,
          new Promise<void>((resolve) => window.setTimeout(resolve, WARP_DURATION_MS + 200)),
        ]),
      ]);

      window.clearTimeout(step1Timer);
      window.clearTimeout(step2Timer);
      setLoadingProgress(100);
      setWarping(false);

      await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
      setCurrentScreen("explorer");
    },
    []
  );

  // Launch from Screen 1 (Entry) -> Warp + Screen 2 (Loading) -> Screen 3 (Explorer)
  const launchExplorer = useCallback(async () => {
    const raDeg = parseRA(raInput);
    const decDeg = parseDec(decInput);
    const warpTarget = raDeg !== null && decDeg !== null ? { ra: raDeg, dec: decDeg } : null;

    const searchPromise = versions
      ? Promise.resolve()
      : executeSearch(raInput, decInput, collectionMode, band, radius, size);

    await runEntryExitTransition(warpTarget, searchPromise);
  }, [versions, executeSearch, raInput, decInput, collectionMode, band, radius, size, runEntryExitTransition]);

  const launchToCoords = useCallback(
    async (params: {
      ra: string;
      dec: string;
      raDeg: number;
      decDeg: number;
      targetLabel?: string;
      preset?: TargetPreset | null;
      resolved?: ResolvedCelestialObject | null;
    }) => {
      const nextCollection = params.preset?.collection ?? collectionMode;
      const nextTargetName =
        params.targetLabel ?? params.preset?.label ?? t.chrono.customSkyPatch;
      setRaInput(params.ra);
      setDecInput(params.dec);
      setActivePresetId(params.preset?.id ?? null);
      if (params.preset?.collection) {
        setCollectionMode(params.preset.collection);
      }
      const tabId = openOrReuseMap2Tab({
        label: nextTargetName,
        raInput: params.ra,
        decInput: params.dec,
        targetName: nextTargetName,
        resolvedObject: params.resolved ?? null,
        forceReuse: true,
      });

      const searchPromise = executeSearchForTab(
        tabId,
        params.ra,
        params.dec,
        nextCollection,
        band,
        radius,
        size
      );

      await runEntryExitTransition({ ra: params.raDeg, dec: params.decDeg }, searchPromise);
    },
    [band, collectionMode, executeSearchForTab, openOrReuseMap2Tab, radius, size, t.chrono.customSkyPatch, runEntryExitTransition]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActivePresetId(null);
    const raDeg = parseRA(raInput);
    const decDeg = parseDec(decInput);
    const label =
      raDeg !== null && decDeg !== null
        ? `${formatRAtoHMS(raDeg)} · ${formatDectoDMS(decDeg)}`
        : `${raInput}, ${decInput}`;
    const tabId = openOrReuseMap2Tab({
      label,
      raInput,
      decInput,
      targetName: t.chrono.customSkyPatch,
      resolvedObject: null,
    });
    void executeSearchForTab(tabId, raInput, decInput, collectionMode, band, radius, size);
  };

  const handleSubmitCoords = useCallback(
    (raStr: string, decStr: string) => {
      setActivePresetId(null);
      const raDeg = parseRA(raStr);
      const decDeg = parseDec(decStr);
      const label =
        raDeg !== null && decDeg !== null
          ? `${formatRAtoHMS(raDeg)} · ${formatDectoDMS(decDeg)}`
          : `${raStr}, ${decStr}`;
      const tabId = openOrReuseMap2Tab({
        label,
        raInput: raStr,
        decInput: decStr,
        targetName: t.chrono.customSkyPatch,
        resolvedObject: null,
      });
      void executeSearchForTab(tabId, raStr, decStr, collectionMode, band, radius, size);
    },
    [band, collectionMode, executeSearchForTab, openOrReuseMap2Tab, radius, size, t.chrono.customSkyPatch]
  );

  const handleSelectPreset = useCallback(
    async (preset: TargetPreset) => {
      setActivePresetId(preset.id);
      setRaInput(preset.ra);
      setDecInput(preset.dec);
      setCollectionMode(preset.collection);
      const tabId = openOrReuseMap2Tab({
        label: preset.label,
        raInput: preset.ra,
        decInput: preset.dec,
        targetName: preset.label,
        resolvedObject: null,
      });

      setResolvingName(true);
      try {
        const resolved = await resolveCelestialName(preset.queryName);
        updateTab(tabId, (tab) => ({ ...tab, resolvedObject: resolved }));
      } catch {
        updateTab(tabId, (tab) => ({ ...tab, resolvedObject: null }));
      } finally {
        setResolvingName(false);
      }

      await executeSearchForTab(tabId, preset.ra, preset.dec, preset.collection, band, radius, size);
    },
    [band, executeSearchForTab, openOrReuseMap2Tab, radius, size, updateTab]
  );

  const handleSearchCelestialName = useCallback(
    async (name: string) => {
      setResolvingName(true);
      const targetTabId = activeTabIdRef.current;
      updateTab(targetTabId, (tab) => ({
        ...tab,
        statusState: { type: "resolvingObject", name },
      }));

      const matchingPreset = t.presets.find(
        (p) =>
          p.label.toLowerCase() === name.toLowerCase() ||
          p.queryName.toLowerCase() === name.toLowerCase()
      );
      setActivePresetId(matchingPreset?.id ?? null);

      if (matchingPreset) {
        setRaInput(matchingPreset.ra);
        setDecInput(matchingPreset.dec);
        setCollectionMode(matchingPreset.collection);
        const tabId = openOrReuseMap2Tab({
          label: matchingPreset.label,
          raInput: matchingPreset.ra,
          decInput: matchingPreset.dec,
          targetName: matchingPreset.label,
          resolvedObject: null,
        });
        try {
          const resolved = await resolveCelestialName(matchingPreset.queryName);
          updateTab(tabId, (tab) => ({ ...tab, resolvedObject: resolved }));
        } catch {
          updateTab(tabId, (tab) => ({ ...tab, resolvedObject: null }));
        } finally {
          setResolvingName(false);
        }
        await executeSearchForTab(
          tabId,
          matchingPreset.ra,
          matchingPreset.dec,
          matchingPreset.collection,
          band,
          radius,
          size
        );
        return;
      }

      try {
        const resolved = await resolveCelestialName(name);
        setRaInput(resolved.raHms);
        setDecInput(resolved.decDms);
        setCollectionMode("spherex_dr1");
        const tabId = openOrReuseMap2Tab({
          label: resolved.canonicalName,
          raInput: resolved.raHms,
          decInput: resolved.decDms,
          targetName: resolved.canonicalName,
          resolvedObject: resolved,
        });
        await executeSearchForTab(
          tabId,
          resolved.raHms,
          resolved.decDms,
          "spherex_dr1",
          band,
          radius,
          size
        );
      } catch {
        updateTab(targetTabId, (tab) => ({
          ...tab,
          statusState: { type: "objectNotFound", name },
        }));
      } finally {
        setResolvingName(false);
      }
    },
    [band, executeSearchForTab, openOrReuseMap2Tab, radius, size, t.presets, updateTab]
  );

  const handleSelectCollection = (col: SpherexCollectionId) => {
    updateTab(activeTabIdRef.current, (tab) => ({
      ...tab,
      activeCollection: col,
      selectedIdx: 0,
    }));
  };

  const handleSelectVersionObservation = useCallback(
    (tabId: string, col: SpherexCollectionId, targetObs: SpherexObservation) => {
      updateTab(tabId, (tab) => {
        const colObs = tab.versions?.[col]?.observations ?? [];
        const foundIdx = colObs.findIndex(
          (o) =>
            (o.access_url && targetObs.access_url && o.access_url === targetObs.access_url) ||
            (o.obs_id === targetObs.obs_id && o.bandpass === targetObs.bandpass)
        );
        return {
          ...tab,
          activeCollection: col,
          selectedIdx: foundIdx >= 0 ? foundIdx : 0,
        };
      });
    },
    [updateTab]
  );

  const handleChangeFov = useCallback(
    (newSize: number) => {
      const clamped = clampCutoutFov(newSize);
      setSize(String(clamped));
      updateTab(activeTabIdRef.current, (tab) => ({
        ...tab,
        lastCoords: tab.lastCoords ? { ...tab.lastCoords, size: clamped } : tab.lastCoords,
      }));
    },
    [updateTab]
  );

  const handleQueryAtCoords = useCallback(
    (raDeg: number, decDeg: number) => {
      const raStr = formatRAtoHMS(raDeg);
      const decStr = formatDectoDMS(decDeg);
      setActivePresetId(null);
      setRaInput(raStr);
      setDecInput(decStr);
      const tabId = openOrReuseMap2Tab({
        label: `${raStr} · ${decStr}`,
        raInput: raStr,
        decInput: decStr,
        targetName: t.chrono.customSkyPatch,
        resolvedObject: null,
      });
      void executeSearchForTab(tabId, raStr, decStr, collectionMode, band, radius, size);
    },
    [band, collectionMode, executeSearchForTab, openOrReuseMap2Tab, radius, size, t.chrono.customSkyPatch]
  );

  const handleSelectMap2Tab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const found = tabs.find((tab) => tab.id === tabId);
      if (found) {
        setRaInput(found.raInput);
        setDecInput(found.decInput);
      }
    },
    [tabs]
  );

  const handleCloseMap2Tab = useCallback((tabId: string) => {
    const req = cutoutRequestsByTabRef.current.get(tabId);
    req?.controller.abort();
    cutoutRequestsByTabRef.current.delete(tabId);
    lastCutoutSigByTabRef.current.delete(tabId);

    setTabs((prev) => {
      if (prev.length <= 1) {
        setSecondMapOpen(false);
        return prev;
      }
      const idx = prev.findIndex((tItem) => tItem.id === tabId);
      const next = prev.filter((tItem) => tItem.id !== tabId);
      if (tabId === activeTabIdRef.current && next.length > 0) {
        const nextActive = next[Math.min(idx, next.length - 1)];
        setActiveTabId(nextActive.id);
        setRaInput(nextActive.raInput);
        setDecInput(nextActive.decInput);
      }
      return next;
    });
  }, []);

  const handleRenameMap2Tab = useCallback(
    (tabId: string, newLabel: string) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return;
      updateTab(tabId, (tab) => ({ ...tab, label: trimmed }));
    },
    [updateTab]
  );

  const handleToggleSecondMap = useCallback((open: boolean) => {
    setSecondMapOpen(open);
    if (!open) {
      // User manually closed Map 2: keep only the active tab so next search starts clean
      setTabs((prev) => {
        const current = prev.find((tItem) => tItem.id === activeTabIdRef.current) ?? prev[0];
        for (const tItem of prev) {
          if (tItem.id !== current.id) {
            cutoutRequestsByTabRef.current.get(tItem.id)?.controller.abort();
            cutoutRequestsByTabRef.current.delete(tItem.id);
            lastCutoutSigByTabRef.current.delete(tItem.id);
          }
        }
        return [current];
      });
    }
  }, []);

  const selectedObs = observations[selectedIdx] ?? null;

  // Sync SFX enabled state
  useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  // Global button click sound effect for interactive UI buttons
  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest("button, .btn-press") as HTMLElement | null;
      if (!btn) return;
      if (btn instanceof HTMLButtonElement && btn.disabled) return;
      if (btn.getAttribute("aria-disabled") === "true") return;
      if (btn.dataset.sfx === "none") return;
      playButtonSound();
    };

    document.addEventListener("click", handleButtonClick, true);
    return () => {
      document.removeEventListener("click", handleButtonClick, true);
    };
  }, []);

  // Sync background music volume, mute state, and autoplay
  useEffect(() => {
    const audio = bgAudioRef.current;
    const analyser = musicAnalyserRef.current;
    if (!audio) return;

    const targetVol = currentScreen === "entry" ? entryVolume : explorerVolume;
    audio.loop = true;
    analyser?.attach(audio);
    analyser?.setOutput(targetVol, musicEnabled);

    if (musicEnabled && audio.paused) {
      void audio.play().catch(() => { });
    }
  }, [currentScreen, musicEnabled, entryVolume, explorerVolume]);

  // Restart background music and lower volume when leaving the entry screen
  useEffect(() => {
    const audio = bgAudioRef.current;
    const analyser = musicAnalyserRef.current;
    const prevScreen = prevScreenRef.current;
    prevScreenRef.current = currentScreen;

    if (!audio) return;
    if (prevScreen === "entry" && currentScreen !== "entry") {
      audio.currentTime = 0;
      setExplorerVolume(EXPLORER_MUSIC_VOLUME);
      analyser?.attach(audio);
      analyser?.setOutput(EXPLORER_MUSIC_VOLUME, musicEnabled);
      audio.loop = true;
      if (musicEnabled) {
        void audio.play().catch(() => { });
      }
    }
  }, [currentScreen, musicEnabled]);

  // Unlock background music autoplay & Web Audio beat analyser on first user interaction
  useEffect(() => {
    const tryPlayBgMusic = () => {
      preloadSoundEffects();
      const audio = bgAudioRef.current;
      if (!audio) return;
      musicAnalyserRef.current?.attach(audio);
      musicAnalyserRef.current?.unlock();
      if (!musicEnabled || !audio.paused) return;
      void audio.play().catch(() => { });
    };

    window.addEventListener("pointerdown", tryPlayBgMusic, { passive: true });
    window.addEventListener("keydown", tryPlayBgMusic, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlayBgMusic);
      window.removeEventListener("keydown", tryPlayBgMusic);
    };
  }, [musicEnabled]);

  const sampleMusic = useCallback(
    (dt: number) =>
      musicAnalyserRef.current?.sample(dt) ?? { bass: 0, mid: 0, energy: 0, beat: 0 },
    []
  );

  const activeVolume = currentScreen === "entry" ? entryVolume : explorerVolume;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#080B10] text-slate-100 select-none">
      {/* Background Space Music */}
      <audio ref={bgAudioRef} src="/music.mp3" loop autoPlay preload="auto" />
      {/* Interactive 3D Galaxy + Starfield + Celestial Graticule Canvas */}
      <CosmicBackground
        ref={cosmicBgRef}
        mode={currentScreen === "explorer" ? "explorer" : "gate"}
        cursorAudio={currentScreen === "entry" && sfxEnabled}
        onCursorSky={setCursorSky}
        sampleMusic={sampleMusic}
      />

      {/* Top-Left Back & Sidebar Toggle Pills (Explorer only) */}
      {currentScreen === "explorer" && (
        <div className="fixed top-6 left-5 sm:left-7 z-30 flex items-center gap-2">
          <button
            id="tutorial-exp-back"
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              setCurrentScreen("entry");
              void cosmicBgRef.current?.warpTo(null, 950);
            }}
            aria-label={t.chrono.backButton}
            title={t.chrono.backButton}
            className="btn-press glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white hover:border-[#00D2FF]/45 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span>{t.chrono.backButton}</span>
          </button>

          <button
            id="tutorial-exp-panel"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? t.chrono.togglePanelClose : t.chrono.togglePanelOpen}
            title={sidebarOpen ? t.chrono.togglePanelClose : t.chrono.togglePanelOpen}
            className={`btn-press glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors ${sidebarOpen
                ? "border-[#00D2FF]/60 text-[#00D2FF] bg-[#00D2FF]/10"
                : "text-slate-200 hover:text-white hover:border-[#00D2FF]/45"
              }`}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-3.5 h-3.5 text-[#00D2FF]" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5 text-[#00D2FF]" />
            )}
            <span>{t.chrono.panelLabel}</span>
          </button>

          <button
            id="tutorial-exp-new-search"
            type="button"
            onClick={() => setNewSearchOpen(true)}
            aria-label={t.chrono.newSearchButton}
            title={t.chrono.newSearchButton}
            className="btn-press glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white hover:border-[#00D2FF]/45 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#00D2FF]" />
            <span>{t.chrono.newSearchButton}</span>
          </button>

          <div id="tutorial-exp-share">
            <ShareButton
              variant="pill"
              ra={raInput}
              dec={decInput}
              collection={collectionMode}
              band={band}
              size={size}
              stretch={stretch}
              colormap={colormap}
              subtractZodi={subtractZodi}
            />
          </div>
        </div>
      )}

      {/* Persistent Top-Right Language, Music & SFX Controls */}
      <div className="fixed top-6 right-7 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMusicEnabled((prev) => {
              const next = !prev;
              if (next && activeVolume === 0) {
                if (currentScreen === "entry") {
                  setEntryVolume(ENTRY_MUSIC_VOLUME);
                } else {
                  setExplorerVolume(EXPLORER_MUSIC_VOLUME);
                }
              }
              return next;
            });
          }}
          aria-pressed={musicEnabled}
          aria-label={t.chrono.musicAria}
          title={musicEnabled ? t.chrono.musicOn : t.chrono.musicOff}
          className={`btn-press glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${musicEnabled
              ? "text-[#00D2FF] border-[#00D2FF]/45 hover:border-[#00D2FF]/75"
              : "text-slate-400 hover:text-white"
            }`}
        >
          <Music className={`w-3.5 h-3.5 shrink-0 ${musicEnabled ? "" : "opacity-50"}`} />
          <span className="hidden sm:inline">
            {musicEnabled ? t.chrono.musicOn : t.chrono.musicOff}
          </span>
        </button>

        <div className="glass-panel rounded-full px-3 py-1.5 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={musicEnabled ? activeVolume : 0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (currentScreen === "entry") {
                setEntryVolume(val);
              } else {
                setExplorerVolume(val);
              }
              if (val > 0 && !musicEnabled) {
                setMusicEnabled(true);
              } else if (val === 0 && musicEnabled) {
                setMusicEnabled(false);
              }
            }}
            aria-label={t.chrono.musicVolumeAria}
            title={`${t.chrono.musicVolumeAria}: ${Math.round(
              (musicEnabled ? activeVolume : 0) * 100
            )}%`}
            className="apple-slider w-20 sm:w-24 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-300 w-8 text-right tabular-nums">
            {Math.round((musicEnabled ? activeVolume : 0) * 100)}%
          </span>
        </div>

        <button
          type="button"
          data-sfx="none"
          onClick={() => {
            setSfxEnabledState((prev) => {
              const next = !prev;
              setSfxEnabled(next);
              if (next) {
                playButtonSound();
              }
              return next;
            });
          }}
          aria-pressed={sfxEnabled}
          aria-label={t.chrono.sfxAria}
          title={sfxEnabled ? t.chrono.sfxOn : t.chrono.sfxOff}
          className={`btn-press glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors ${sfxEnabled
              ? "text-[#00D2FF] border-[#00D2FF]/45 hover:border-[#00D2FF]/75"
              : "text-slate-400 hover:text-white"
            }`}
        >
          {sfxEnabled ? (
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {sfxEnabled ? t.chrono.sfxOn : t.chrono.sfxOff}
          </span>
        </button>

        <LanguageSelector />
      </div>

      {/* ===================================================================== */}
      {/* SCREEN 1: ENTRY (SpaceGate — 3D + HUD + 3 Interactive Blocks)         */}
      {/* ===================================================================== */}
      <section
        id="screen-entry"
        className={`screen ${currentScreen === "entry" ? "is-active" : "is-hidden"
          } flex-col items-center justify-center`}
      >
        <SpaceGate
          raInput={raInput}
          setRaInput={setRaInput}
          decInput={decInput}
          setDecInput={setDecInput}
          cursorSky={cursorSky}
          warping={warping}
          loading={loading}
          withBackground={false}
          onExploreFree={() => void launchExplorer()}
          onLaunchToCoords={(params) => void launchToCoords(params)}
        />
      </section>

      <EntryTutorial active={currentScreen === "entry"} />
      <ExplorerTutorial
        active={currentScreen === "explorer"}
        sidebarOpen={sidebarOpen}
        secondMapOpen={secondMapOpen}
        onToggleSecondMap={handleToggleSecondMap}
      />

      {/* ===================================================================== */}
      {/* SCREEN 2: LOADING TRANSITION                                          */}
      {/* ===================================================================== */}
      <section
        id="screen-loading"
        className={`screen ${currentScreen === "loading" ? "is-active" : "is-hidden"
          } items-center justify-center`}
      >
        <StarConstellationLoader
          progress={loadingProgress}
          statusText={t.chrono.loadingLabel}
        />
      </section>

      {/* ===================================================================== */}
      {/* SCREEN 3: MAIN EXPLORER (Sidebar + Live Sky Viewport(s) + Epoch Bar)  */}
      {/* ===================================================================== */}
      <section
        id="screen-explorer"
        className={`screen ${currentScreen === "explorer" ? "is-active" : "is-hidden"
          } p-5 pt-16 sm:p-7 sm:pt-16 flex-col lg:flex-row`}
      >
        <div
          aria-hidden={!sidebarOpen}
          className={`shrink-0 overflow-hidden transition-[width,max-height,margin,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarOpen
              ? "w-full max-h-[46vh] mb-5 opacity-100 lg:w-[310px] lg:max-h-full lg:mb-0 lg:mr-5"
              : "w-full max-h-0 mb-0 opacity-0 pointer-events-none lg:w-0 lg:max-h-full lg:mb-0 lg:mr-0"
            }`}
        >
          <div
            className={`w-full lg:w-[310px] h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${sidebarOpen
                ? "translate-y-0 lg:translate-x-0"
                : "-translate-y-3 lg:translate-y-0 lg:-translate-x-5"
              }`}
          >
            <ControlsPanel
              raInput={raInput}
              setRaInput={setRaInput}
              decInput={decInput}
              setDecInput={setDecInput}
              collectionMode={collectionMode}
              setCollectionMode={setCollectionMode}
              band={band}
              setBand={setBand}
              radius={radius}
              setRadius={setRadius}
              size={size}
              setSize={setSize}
              stretch={stretch}
              setStretch={setStretch}
              colormap={colormap}
              setColormap={setColormap}
              subtractZodi={subtractZodi}
              setSubtractZodi={setSubtractZodi}
              showCrosshair={showCrosshair}
              setShowCrosshair={setShowCrosshair}
              loading={loading}
              resolvingName={resolvingName}
              resolvedObject={resolvedObject}
              activePresetId={activePresetId}
              totalFound={totalFound}
              onClose={() => setSidebarOpen(false)}
              onChangeFov={handleChangeFov}
              onSubmitCoords={handleSubmitCoords}
              onSubmit={handleSubmit}
              onSelectPreset={handleSelectPreset}
              onSearchCelestialName={handleSearchCelestialName}
              onOpenExposuresDrawer={() => setShowExposuresModal(true)}
              hasVersions={Boolean(versions)}
              onOpenGalleryModal={() => setShowGalleryModal(true)}
            />
          </div>
        </div>

        <ViewerPanel
          map2Tabs={map2Tabs}
          activeMap2TabId={activeTab.id}
          onSelectMap2Tab={handleSelectMap2Tab}
          onCloseMap2Tab={handleCloseMap2Tab}
          onRenameMap2Tab={handleRenameMap2Tab}
          selectedObs={selectedObs}
          cutout={cutout}
          cutoutLoading={cutoutLoading}
          lastCoords={lastCoords}
          targetName={targetName}
          showCrosshair={showCrosshair}
          status={status}
          siaUrl={siaUrl}
          resolvedObject={resolvedObject}
          versions={versions}
          activeCollection={activeCollection}
          stretch={stretch}
          colormap={colormap}
          subtractZodi={subtractZodi}
          secondMapOpen={secondMapOpen}
          onToggleSecondMap={handleToggleSecondMap}
          externalChannelIdx={externalChannelIdx}
          onChangeFov={handleChangeFov}
          onSelectVersionObservation={handleSelectVersionObservation}
          onQueryAtCoords={handleQueryAtCoords}
          galleryOpen={showGalleryModal}
          onCloseGallery={() => setShowGalleryModal(false)}
        />
      </section>

      {/* Optional FITS Exposures Drawer / Modal */}
      {showExposuresModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-end p-4">
          <div className="relative h-full max-h-[92vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowExposuresModal(false)}
              className="btn-press glass-panel absolute -top-2 -left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <ObservationsPanel
              observations={observations}
              totalFound={totalFound}
              selectedIdx={selectedIdx}
              onSelect={(idx) => {
                updateTab(activeTab.id, (tab) => ({ ...tab, selectedIdx: idx }));
                setSecondMapOpen(true);
                setShowExposuresModal(false);
              }}
              loading={loading}
              versions={versions}
              activeCollection={activeCollection}
              onSelectCollection={handleSelectCollection}
            />
          </div>
        </div>
      )}
      {/* Invalid URL target / coordinates popup modal */}
      {urlErrorModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="url-error-modal-title"
          onClick={() => setUrlErrorModal(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel relative w-full max-w-md rounded-2xl p-6 border border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)]"
          >
            <button
              type="button"
              onClick={() => setUrlErrorModal(null)}
              aria-label={t.urlError.dismissButton}
              className="btn-press absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <h3
                  id="url-error-modal-title"
                  className="text-base font-semibold text-white mb-1.5"
                >
                  {urlErrorModal.kind === "invalidTarget"
                    ? t.urlError.invalidTargetTitle
                    : t.urlError.invalidCoordsTitle}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed break-words">
                  {urlErrorModal.kind === "invalidTarget"
                    ? t.urlError.invalidTargetMessage(urlErrorModal.value)
                    : t.urlError.invalidCoordsMessage(urlErrorModal.value)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setUrlErrorModal(null)}
                className="btn-press px-5 py-2 rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/60 text-[#00D2FF] text-sm font-medium hover:bg-[#00D2FF]/25 transition-colors cursor-pointer"
              >
                {t.urlError.dismissButton}
              </button>
            </div>
          </div>
        </div>
      )}
      <NewSearchModal
        open={newSearchOpen}
        onClose={() => setNewSearchOpen(false)}
        initialRa={raInput}
        initialDec={decInput}
        loading={loading}
        onSubmitSearch={({ ra, dec, preset }) => {
          if (preset) {
            void handleSelectPreset(preset);
            return;
          }
          setRaInput(ra);
          setDecInput(dec);
          handleSubmitCoords(ra, dec);
        }}
      />

      <AstroExplorerCornerBadge visible={(currentScreen === "entry" || currentScreen === "explorer") && !warping} />
    </div>
  );
}
