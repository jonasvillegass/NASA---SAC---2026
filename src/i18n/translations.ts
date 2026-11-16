import type { SpherexCollectionId, TargetPreset } from "../lib/types";

export type Language = "es" | "en";

export interface Translations {
  navbar: {
    title: string;
    subtitle: string;
    badge: string;
    missionLink: string;
    tutorialsLink: string;
    languageAriaLabel: string;
    selectLanguage: string;
    spanish: string;
    english: string;
  };
  controls: {
    celestialSearchTitle: string;
    celestialSearchLabel: string;
    celestialSearchPlaceholder: string;
    celestialSearchButton: string;
    celestialSearchingButton: string;
    celestialSearchHelp: string;
    resolvedBadgeTitle: string;
    resolvedTypeLabel: string;
    resolvedPmLabel: string;
    resolvedAliasesLabel: string;
    coordsTitle: string;
    raLabel: string;
    raPlaceholder: string;
    raHelp: string;
    decLabel: string;
    decPlaceholder: string;
    decHelp: string;
    recommendedTargets: string;
    queryTitle: string;
    collectionLabel: string;
    allCollectionsOption: string;
    collectionLabels: Record<SpherexCollectionId, string>;
    collectionShortLabels: Record<SpherexCollectionId, string>;
    bandLabel: string;
    allBands: string;
    radiusLabel: string;
    sizeLabel: string;
    queryButton: string;
    queryingButton: string;
    displayTitle: string;
    stretchLabel: string;
    stretchOptions: {
      asinh: string;
      log: string;
      sqrt: string;
      linear: string;
    };
    colormapLabel: string;
    colormapOptions: {
      inferno: string;
      viridis: string;
      plasma: string;
      magma: string;
      gray: string;
    };
    subtractZodi: string;
    showCrosshair: string;
  };
  viewer: {
    defaultTitle: string;
    centerCoords: (params: { ra: string; dec: string; size: string }) => string;
    enterCoordsPrompt: string;
    savePng: string;
    savePngTitle: string;
    originalFits: string;
    originalFitsTitle: string;
    altCutout: string;
    zoomInTitle: string;
    zoomOutTitle: string;
    resetZoomTitle: string;
    fovInTitle: string;
    fovOutTitle: string;
    fovResetTitle: string;
    map2FovInTitle: string;
    map2FovOutTitle: string;
    map2FovMaxTitle: string;
    fovUpdating: string;
    raAxisLabel: string;
    decAxisLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
    apiErrorTitle: string;
    apiErrorSubtitle: string;
    queryingApiTitle: string;
    queryingApiSubtitle: string;
    detectorBand: string;
    wavelength: string;
    infrared: string;
    dimensions: string;
    fluxMedianMax: string;
    copySiaTitle: string;
    copyCutoutTitle: string;
    galleryTitle: string;
    gallerySubtitle: (params: { count: number; collections: number }) => string;
    galleryLoadAllBands: string;
    galleryModeByCollection: string;
    galleryModeByBand: string;
    galleryActiveBadge: string;
    galleryClickToInspect: string;
    galleryExposuresCount: (count: number) => string;
    galleryLoadingCutout: string;
    galleryErrorCutout: string;
    galleryPaginationInfo: (params: { from: number; to: number; total: number }) => string;
    galleryPageIndicator: (params: { page: number; totalPages: number }) => string;
    galleryPrevPage: string;
    galleryNextPage: string;
    viewModeCutout: string;
    viewModeSkyMap: string;
    viewModeSplit: string;
    visualZoomLabel: (zoom: string) => string;
    visualZoomReset: string;
    asteroidGameScore: (score: number) => string;
    asteroidGameHint: string;
    asteroidGameAria: string;
  };
  skyMap: {
    title: string;
    subtitle: string;
    channelLabel: string;
    channelInfo: (params: { idx: number; total: number; um: string; band: string }) => string;
    mocWideLabel: string;
    mocDeepLabel: string;
    footprintsLabel: string;
    gridLabel: string;
    allSkyButton: string;
    centerOnTarget: string;
    searchHereButton: string;
    doubleClickHint: string;
    fovLabel: (deg: string) => string;
    orderLabel: (order: number) => string;
    cursorCoords: (params: { ra: string; dec: string }) => string;
    loadingMoc: string;
    markedPointBadge: (params: { ra: string; dec: string }) => string;
    openSideBySideAction: string;
    sideBySideActiveBadge: string;
    closeSideBySideAction: string;
    clearPinAction: string;
    sidePanelTitle: string;
    sidePanelSubtitle: (params: { ra: string; dec: string; count: number }) => string;
    sidePanelCenterMarkerLabel: string;
    sidePanelTabVideo: string;
    sidePanelTabCutout: string;
    sidePanelTabBands: string;
    sidePanelLoading: string;
    sidePanelNoCoverage: string;
    sideDatesLabel: string;
    sideDatesSelectAll: string;
    sideDatesClear: string;
    sideNoDatesSelected: string;
    sideZoomLabel: (zoom: string) => string;
  };
  epochPlayer: {
    title: string;
    subtitle: (params: { total: number; selected: number }) => string;
    allBands: string;
    modeVideo: string;
    modeGrid: string;
    play: string;
    pause: string;
    prevFrame: string;
    nextFrame: string;
    loopLabel: string;
    crossfadeLabel: string;
    speedLabel: string;
    speedUnit: (ms: number) => string;
    selectAll: string;
    clearAll: string;
    readyProgress: (params: { ready: number; total: number }) => string;
    frameCounter: (params: { current: number; total: number }) => string;
    versionNumber: (num: number) => string;
    includeInSet: string;
    viewIndividual: string;
    noSelectionTitle: string;
    noSelectionDesc: string;
    loadingFrame: string;
    errorFrame: string;
    exposuresInEpoch: (count: number) => string;
    paginationInfo: (params: { from: number; to: number; total: number }) => string;
    pageIndicator: (params: { page: number; totalPages: number }) => string;
    prevPage: string;
    nextPage: string;
  };
  observations: {
    title: string;
    versionsHeader: string;
    searching: string;
    emptyDesc: string;
    noObsInCollection: string;
    expTime: (seconds: number) => string;
    irFallback: string;
    paginationInfo: (params: { from: number; to: number; total: number }) => string;
    pageIndicator: (params: { page: number; totalPages: number }) => string;
    prevPage: string;
    nextPage: string;
    pageSizeLabel: string;
  };
  status: {
    invalidRa: string;
    invalidDec: string;
    resolvingObject: (name: string) => string;
    objectNotFound: (name: string) => string;
    queryingSia: (params: { ra: string; dec: string; collection: string }) => string;
    queryingAllVersions: (params: { ra: string; dec: string }) => string;
    noImagesFound: (params: { collection: string; ra: string; dec: string }) => string;
    downloadingFits: (params: { band: string; id: string }) => string;
    renderError: string;
    unexpectedError: string;
    fitsNoImage: string;
    fitsInvalidDimensions: string;
    fitsAllNan: string;
    fitsCanvasError: string;
    map1ApiDown: string;
    map2ApiDown: string;
    retryApi: string;
  };
  chrono: {
    entryTitle: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    loadingLabel: string;
    backButton: string;
    panelLabel: string;
    newSearchButton: string;
    togglePanelOpen: string;
    togglePanelClose: string;
    searchByCoords: string;
    coordsInputPlaceholder: string;
    goButton: string;
    searchByName: string;
    nameInputPlaceholder: string;
    searchButton: string;
    zoomFov: string;
    molecularSignatures: string;
    standbyBadge: string;
    activeBadge: string;
    onLabel: string;
    advancedControls: string;
    exposuresDrawerButton: (count: number) => string;
    apiStatusConnected: (count: number) => string;
    apiStatusQuerying: string;
    apiStatusReady: string;
    epochLabel: string;
    speedLabel: string;
    playPauseAria: string;
    prevFrameAria: string;
    nextFrameAria: string;
    loopLabel: string;
    loopAria: string;
    enterFullscreen: string;
    exitFullscreen: string;
    splitSecondMapButton: string;
    closeSecondMapButton: string;
    map1Title: string;
    map2Title: string;
    customSkyPatch: string;
    playbackDatesTitle: string;
    selectAllDates: string;
    selectNoDates: string;
    selectAtLeastOneDate: string;
    noDatesAvailable: string;
    preloadingFrames: (loaded: number, total: number) => string;
    selectDatesTooltip: string;
    noDateLabel: string;
    cursorAudioOn: string;
    cursorAudioOff: string;
    cursorAudioAria: string;
    musicVolumeAria: string;
    musicOn: string;
    musicOff: string;
    musicAria: string;
    sfxOn: string;
    sfxOff: string;
    sfxAria: string;
    molecules: {
      h2o: string;
      co2: string;
      co: string;
      ch3oh: string;
      ch4: string;
      nh3: string;
      pahs: string;
    };
  };
  urlError: {
    invalidTargetTitle: string;
    invalidTargetMessage: (name: string) => string;
    invalidCoordsTitle: string;
    invalidCoordsMessage: (coords: string) => string;
    dismissButton: string;
  };
  entryTutorial: {
    welcomeTitle: string;
    welcomeDescription: string;
    startButton: string;
    skipButton: string;
    prevButton: string;
    nextButton: string;
    finishButton: string;
    replayButton: string;
    replayTitle: string;
    stepCounter: (current: number, total: number) => string;
    steps: {
      language: { title: string; description: string };
      coordinates: { title: string; description: string };
      presets: { title: string; description: string };
      explore: { title: string; description: string };
    };
  };
  explorerTutorial: {
    mainPartsButton: string;
    generalButton: string;
    welcomeTitle: string;
    welcomeDescription: string;
    startGeneralButton: string;
    skipButton: string;
    prevButton: string;
    nextButton: string;
    finishButton: string;
    stepCounter: (current: number, total: number) => string;
    steps: {
      back: { title: string; description: string };
      settings: { title: string; description: string };
      newSearch: { title: string; description: string };
      share: { title: string; description: string };
      playback: { title: string; description: string };
      generalMapOverview: { title: string; description: string };
      generalMapControls: { title: string; description: string };
      detailedMapLoading: { title: string; description: string };
      detailedMapDates: { title: string; description: string };
      detailedMapTools: { title: string; description: string };
    };
  };
  roiTutorial: {
    buttonLabel: string;
    buttonTitle: string;
    skipButton: string;
    prevButton: string;
    nextButton: string;
    finishButton: string;
    stepCounter: (current: number, total: number) => string;
    current: {
      tabs: { title: string; description: string };
      coverage: { title: string; description: string };
      save: { title: string; description: string };
      spectrum: { title: string; description: string };
      classification: { title: string; description: string };
      composition: { title: string; description: string };
      table: { title: string; description: string };
    };
    compare: {
      selectors: { title: string; description: string };
      similarity: { title: string; description: string };
      saved: { title: string; description: string };
    };
    trajectory: {
      select: { title: string; description: string };
      identity: { title: string; description: string };
      kinematics: { title: string; description: string };
      extrapolate: { title: string; description: string };
    };
  };
  sidebarTutorial: {
    buttonLabel: string;
    buttonTitle: string;
    skipButton: string;
    prevButton: string;
    nextButton: string;
    finishButton: string;
    stepCounter: (current: number, total: number) => string;
    steps: {
      zoom: { title: string; description: string };
      bands: { title: string; description: string };
      stretchAndColormap: { title: string; description: string };
      detector: { title: string; description: string };
      toggles: { title: string; description: string };
      exposures: { title: string; description: string };
    };
  };
  presets: TargetPreset[];
}

export const translations: Record<Language, Translations> = {
  es: {
    navbar: {
      title: "Explorador de Imágenes Espectrales SPHEREx",
      subtitle:
        "Consulta y visualización interactiva de datos FITS de NASA / IPAC IRSA (SIA & IBE Cutouts)",
      badge: "Vite + React & Tailwind",
      missionLink: "Misión SPHEREx",
      tutorialsLink: "Tutoriales IRSA",
      languageAriaLabel: "Seleccionar idioma de la interfaz",
      selectLanguage: "Idioma",
      spanish: "Español",
      english: "Inglés",
    },
    controls: {
      celestialSearchTitle: "Buscador de Cuerpos Celestes",
      celestialSearchLabel: "Nombre del cuerpo celeste",
      celestialSearchPlaceholder: "Ej. Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae...",
      celestialSearchButton: "Resolver",
      celestialSearchingButton: "Buscando...",
      celestialSearchHelp:
        "Resuelve coordenadas ICRS desde el catálogo de ejemplos SPHEREx.",
      resolvedBadgeTitle: "Identificador Astronómico Resuelto",
      resolvedTypeLabel: "Tipo:",
      resolvedPmLabel: "Mov. propio:",
      resolvedAliasesLabel: "Alias:",
      coordsTitle: "Coordenadas Celestes (ICRS)",
      raLabel: "Ascensión Recta (RA)",
      raPlaceholder: "210.80227 o 08h55m10.8s",
      raHelp: "0° a 360° o formato HMS",
      decLabel: "Declinación (Dec)",
      decPlaceholder: "54.34895 o -7d14m42.5s",
      decHelp: "-90° a +90° o formato DMS",
      recommendedTargets: "Catálogo de Cuerpos Celestes Destacados (SPHEREx):",
      queryTitle: "Parámetros de Consulta IRSA",
      collectionLabel: "Versión / Colección SPHEREx",
      allCollectionsOption: "Todas las versiones disponibles (Multiversión)",
      collectionLabels: {
        spherex_dr1: "spherex_dr1 (Wide Survey DR1)",
      },
      collectionShortLabels: {
        spherex_dr1: "Wide DR1",
      },
      bandLabel: "Detector / Banda",
      allBands: "Todas (D1 a D6)",
      radiusLabel: "Radio búsqueda (°)",
      sizeLabel: "Campo de visión (°)",
      queryButton: "Consultar Versiones SPHEREx",
      queryingButton: "Consultando IRSA...",
      displayTitle: "Opciones de Visualización",
      stretchLabel: "Escala de flujo",
      stretchOptions: {
        asinh: "Asinh (Recomendado)",
        log: "Logarítmica",
        sqrt: "Raíz Cuadrada",
        linear: "Lineal",
      },
      colormapLabel: "Paleta de color",
      colormapOptions: {
        inferno: "Inferno",
        viridis: "Viridis",
        plasma: "Plasma",
        magma: "Magma",
        gray: "Escala de grises",
      },
      subtractZodi: "Restar luz zodiacal (extensión ZODI)",
      showCrosshair: "Mostrar retícula en coordenada central",
    },
    viewer: {
      defaultTitle: "Visor Espectral SPHEREx",
      centerCoords: ({ ra, dec, size }) =>
        `Centro: RA ${ra}°, Dec ${dec}° · Tamaño de corte: ${size}°`,
      enterCoordsPrompt:
        'Selecciona un cuerpo celeste o ingresa coordenadas y presiona "Consultar Versiones SPHEREx".',
      savePng: "Guardar PNG",
      savePngTitle: "Descargar imagen PNG procesada",
      originalFits: "FITS Original",
      originalFitsTitle: "Descargar archivo FITS original desde IRSA",
      altCutout: "Recorte SPHEREx",
      zoomInTitle: "Acercar zoom",
      zoomOutTitle: "Alejar zoom",
      resetZoomTitle: "Restablecer zoom a 100%",
      fovInTitle: "Acercar",
      fovOutTitle: "Alejar",
      fovResetTitle: "Restablecer campo de visión (0.15°)",
      map2FovInTitle: "Acercar",
      map2FovOutTitle: "Alejar",
      map2FovMaxTitle: "Ampliar campo de visión al máximo (1.00°)",
      fovUpdating: "Actualizando FOV...",
      raAxisLabel: "RA (ICRS)",
      decAxisLabel: "Dec (ICRS)",
      emptyTitle: "Aún no se ha realizado ninguna consulta",
      emptySubtitle:
        "Selecciona un cuerpo celeste o escribe coordenadas para visualizar sus imágenes detalladas",
      apiErrorTitle: "Falló la consulta a la API de NASA/IRSA",
      apiErrorSubtitle:
        "El servicio no respondió correctamente. Por favor, reintenta más tarde.",
      queryingApiTitle: "Realizando consulta a la API de NASA/IRSA...",
      queryingApiSubtitle: "Buscando observaciones espectrales disponibles para estas coordenadas",
      detectorBand: "Detector / Banda",
      wavelength: "Longitud de onda",
      infrared: "Infrarrojo",
      dimensions: "Dimensiones",
      fluxMedianMax: "Flujo (Mediana / Máx)",
      copySiaTitle: "Copiar URL SIA",
      copyCutoutTitle: "Copiar URL IBE Cutout",
      galleryTitle: "Galería de Versiones y Bandas Espectrales Disponibles",
      gallerySubtitle: ({ count, collections }) =>
        `${count} versiones espectrales representativas en ${collections} colección(es) de SPHEREx`,
      galleryLoadAllBands: "Renderizando vistas previas FITS...",
      galleryModeByCollection: "Por Versión de Colección",
      galleryModeByBand: "Todas las Bandas (D1–D6) por Versión",
      galleryActiveBadge: "En visor",
      galleryClickToInspect: "Clic para inspeccionar en el visor principal",
      galleryExposuresCount: (count) => `${count} exp. disponibles`,
      galleryLoadingCutout: "Cargando FITS...",
      galleryErrorCutout: "Sin cobertura en el recorte",
      galleryPaginationInfo: ({ from, to, total }) => `Mostrando ${from}–${to} de ${total}`,
      galleryPageIndicator: ({ page, totalPages }) => `Pág. ${page} / ${totalPages}`,
      galleryPrevPage: "Página anterior",
      galleryNextPage: "Página siguiente",
      viewModeCutout: "Recorte FITS",
      viewModeSkyMap: "Mapa Espacial HiPS / MOC",
      viewModeSplit: "Vista Dividida (Mapa + FITS)",
      visualZoomLabel: (zoom) => `Zoom ${zoom}x`,
      visualZoomReset: "Restablecer zoom visual (1x)",
      asteroidGameScore: (score) => `Score: ${score}`,
      asteroidGameHint: "¡Haz clic en los asteroides para destruirlos mientras carga!",
      asteroidGameAria: "Minijuego de asteroides durante la carga",
    },
    skyMap: {
      title: "Mapa Celeste Interactivo SPHEREx (HiPS All-Sky Cube & MOC)",
      subtitle:
        "Teselas HEALPix progresivas de IRSA (102 canales espectrales) + cobertura MOC y huellas s_region",
      channelLabel: "Canal del Cubo HiPS:",
      channelInfo: ({ idx, total, um, band }) =>
        `Canal ${idx}/${total} · ${um} µm (${band})`,
      mocWideLabel: "Cobertura MOC Wide",
      mocDeepLabel: "Cobertura MOC Deep Field",
      footprintsLabel: "Ver/ocultar regiones detalladas",
      gridLabel: "Mostrar/ocultar cuadrícula",
      allSkyButton: "Vista All-Sky (Aitoff)",
      centerOnTarget: "Centrar en objetivo",
      searchHereButton: "Consultar FITS en el centro del mapa",
      doubleClickHint:
        "Arrastra para rotar · Rueda para zoom · Doble clic en cualquier punto para marcarlo y abrir sus imágenes/video al lado",
      fovLabel: (deg) => `FOV Mapa ${deg}°`,
      orderLabel: (order) => `HEALPix Norder ${order}`,
      cursorCoords: ({ ra, dec }) => `Cursor: RA ${ra}°, Dec ${dec}°`,
      loadingMoc: "Cargando MOC...",
      markedPointBadge: ({ ra, dec }) => `Punto marcado: RA ${ra}°, Dec ${dec}°`,
      openSideBySideAction: "Ver imágenes de color y transición al lado",
      sideBySideActiveBadge: "Panel lateral activo",
      closeSideBySideAction: "Cerrar panel lateral",
      clearPinAction: "Quitar marca",
      sidePanelTitle: "Inspección de Zona Seleccionada (Transición e Imágenes FITS)",
      sidePanelSubtitle: ({ ra, dec, count }) =>
        `Centro marcado: RA ${ra}°, Dec ${dec}° · ${count} exposiciones incluyen este punto`,
      sidePanelCenterMarkerLabel: "Punto central seleccionado (RA / Dec)",
      sidePanelTabVideo: "Video / Transición",
      sidePanelTabCutout: "Imagen FITS Activa",
      sidePanelTabBands: "Bandas de Color (D1–D6)",
      sidePanelLoading: "Consultando y renderizando recortes FITS del punto marcado...",
      sidePanelNoCoverage: "No se encontraron recortes FITS para este punto.",
      sideDatesLabel: "Fechas:",
      sideDatesSelectAll: "Todas",
      sideDatesClear: "Limpiar",
      sideNoDatesSelected: "Selecciona al menos una fecha arriba para cargar sus imágenes.",
      sideZoomLabel: (zoom) => `Zoom ${zoom}x`,
    },
    epochPlayer: {
      title: "Versiones por Época y Transición (Video)",
      subtitle: ({ total, selected }) =>
        `${total} épocas disponibles · ${selected} seleccionadas para ver en conjunto / video`,
      allBands: "Todas",
      modeVideo: "Video / Transición",
      modeGrid: "Ver en Conjunto",
      play: "Reproducir",
      pause: "Pausar",
      prevFrame: "Época anterior",
      nextFrame: "Siguiente época",
      loopLabel: "Bucle",
      crossfadeLabel: "Transición suave",
      speedLabel: "Velocidad:",
      speedUnit: (ms) => `${(ms / 1000).toFixed(2)}s / img`,
      selectAll: "Seleccionar página",
      clearAll: "Limpiar",
      readyProgress: ({ ready, total }) => `${ready}/${total} listas`,
      frameCounter: ({ current, total }) => `Imagen ${current} de ${total}`,
      versionNumber: (num) => `#${num}`,
      includeInSet: "Incluir en el conjunto / video",
      viewIndividual: "Clic para ver individualmente",
      noSelectionTitle: "No hay versiones seleccionadas en el conjunto",
      noSelectionDesc:
        "Marca los números de versión abajo para verlas en conjunto o reproducir la transición.",
      loadingFrame: "Descargando FITS de época...",
      errorFrame: "Sin cobertura FITS en esta época",
      exposuresInEpoch: (count) => `${count} exp.`,
      paginationInfo: ({ from, to, total }) => `Épocas ${from}–${to} de ${total}`,
      pageIndicator: ({ page, totalPages }) => `Pág. ${page} / ${totalPages}`,
      prevPage: "Página anterior de épocas",
      nextPage: "Página siguiente de épocas",
    },
    observations: {
      title: "Exposiciones FITS",
      versionsHeader: "Versiones del Catálogo SPHEREx:",
      searching: "Buscando exposiciones astronómicas en IRSA...",
      emptyDesc:
        "Aquí se listarán las exposiciones espectrales de SPHEREx disponibles en cada versión del catálogo.",
      noObsInCollection:
        "Esta versión de colección no tiene exposiciones para la coordenada seleccionada. Elige otra versión arriba.",
      expTime: (s) => `${s}s exp`,
      irFallback: "IR",
      paginationInfo: ({ from, to, total }) => `Mostrando ${from}–${to} de ${total}`,
      pageIndicator: ({ page, totalPages }) => `Pág. ${page} / ${totalPages}`,
      prevPage: "Página anterior",
      nextPage: "Página siguiente",
      pageSizeLabel: "Por pág.:",
    },
    status: {
      invalidRa:
        "Ascensión Recta (RA) inválida. Usa grados decimales (0–360) o formato HMS (ej. 08h55m10.831s).",
      invalidDec:
        "Declinación (Dec) inválida. Usa grados decimales (-90 a +90) o formato DMS (ej. -7d14m42.53s).",
      resolvingObject: (name) => `Resolviendo coordenadas de "${name}"...`,
      objectNotFound: (name) =>
        `No se encontró el cuerpo celeste "${name}" en el catálogo de ejemplos. Selecciona un objeto destacado o ingresa las coordenadas RA/Dec.`,
      queryingSia: ({ ra, dec, collection }) =>
        `Consultando catálogo IRSA SIA en RA=${ra}°, Dec=${dec}° (${collection})...`,
      queryingAllVersions: ({ ra, dec }) =>
        `Consultando SPHEREx DR1 Wide en RA=${ra}°, Dec=${dec}°...`,
      noImagesFound: ({ collection, ra, dec }) =>
        `No se encontraron imágenes en "${collection}" para RA=${ra}°, Dec=${dec}°. Prueba ampliando el radio o cambiando de versión.`,
      downloadingFits: ({ band, id }) =>
        `Descargando y renderizando FITS (${band} — ${id})...`,
      renderError: "Error renderizando el recorte FITS.",
      unexpectedError: "Error inesperado consultando IRSA SIA.",
      fitsNoImage: "El archivo FITS no contiene extensión IMAGE 2D.",
      fitsInvalidDimensions: "Dimensiones de imagen FITS inválidas.",
      fitsAllNan: "Todos los píxeles del recorte son NaN o vacíos.",
      fitsCanvasError: "No se pudo inicializar contexto 2D de Canvas.",
      map1ApiDown:
        "La API de la NASA/IRSA para el Mapa 1 (HiPS) está caída o no responde en este momento.",
      map2ApiDown:
        "La API de la NASA/IRSA para el Mapa 2 (SIA / Cutouts) está caída o no responde en este momento.",
      retryApi: "Reintentar",
    },
    chrono: {
      entryTitle: "Explora el espacio",
      heroTitle: "Navegación libre",
      heroSubtitle: "Descubrí las locuras del espacio",
      heroCta: "Comenzar →",
      loadingLabel: "Analizando el espacio...",
      backButton: "Volver",
      panelLabel: "Ajustes",
      newSearchButton: "Nueva búsqueda",
      togglePanelOpen: "Abrir panel de ajustes",
      togglePanelClose: "Cerrar panel de ajustes",
      searchByCoords: "Buscador por coordenadas",
      coordsInputPlaceholder: "RA, Dec (ej. 133.79, -7.24)",
      goButton: "Ir",
      searchByName: "Buscador por nombre",
      nameInputPlaceholder: "ej. WISE 0855, Barnard...",
      searchButton: "Buscar",
      zoomFov: "Zoom (Campo visual)",
      molecularSignatures: "Firmas moleculares",
      standbyBadge: "Listo",
      activeBadge: "Activo",
      onLabel: "ON",
      advancedControls: "Ajustes científicos y bandas",
      exposuresDrawerButton: (count) => `Exposiciones FITS (${count})`,
      apiStatusConnected: (count) => `IRSA Conectado (${count} exp.)`,
      apiStatusQuerying: "Consultando IRSA SIA...",
      apiStatusReady: "Visor Celeste en Vivo",
      epochLabel: "Época",
      speedLabel: "Velocidad",
      playPauseAria: "Reproducir o Pausar",
      prevFrameAria: "Imagen anterior",
      nextFrameAria: "Imagen siguiente",
      loopLabel: "Bucle",
      loopAria: "Reproducir en bucle",
      enterFullscreen: "Ver en pantalla completa",
      exitFullscreen: "Salir de pantalla completa",
      splitSecondMapButton: "Abrir Mapa detallado",
      closeSecondMapButton: "Cerrar 2º Mapa",
      map1Title: "Mapa 1 · Cielo HiPS / MOC",
      map2Title: "Mapa 2 · Recorte FITS y Épocas",
      customSkyPatch: "Sector Celeste Personalizado",
      playbackDatesTitle: "Fechas de reproducción",
      selectAllDates: "Todas",
      selectNoDates: "Ninguna",
      selectAtLeastOneDate: "Selecciona al menos una fecha para reproducir",
      noDatesAvailable: "No hay fechas disponibles",
      preloadingFrames: (loaded, total) => `Guardando imágenes (${loaded}/${total})...`,
      selectDatesTooltip: "Seleccionar fechas para el video",
      noDateLabel: "Sin fecha",
      cursorAudioOn: "Audio activo",
      cursorAudioOff: "Audio silenciado",
      cursorAudioAria: "Activar o silenciar sonido espacial",
      musicVolumeAria: "Volumen de la música de fondo",
      musicOn: "Música",
      musicOff: "Música silenciada",
      musicAria: "Activar o silenciar música de fondo",
      sfxOn: "Sonidos",
      sfxOff: "Sonidos silenciados",
      sfxAria: "Activar o silenciar efectos de sonido",
      molecules: {
        h2o: "Hielo de agua (H₂O)",
        co2: "Dióxido de carbono (CO₂)",
        co: "Monóxido de carbono (CO)",
        ch3oh: "Metanol",
        ch4: "Metano (CH₄)",
        nh3: "Amoníaco / Cianato",
        pahs: "PAHs",
      },
    },
    urlError: {
      invalidTargetTitle: "Cuerpo celeste no válido",
      invalidTargetMessage: (name) =>
        `El cuerpo celeste "${name}" no se encuentra en el catálogo de ejemplos disponibles. Verifica el nombre o ingresa coordenadas RA/Dec.`,
      invalidCoordsTitle: "Coordenadas no válidas",
      invalidCoordsMessage: (coords) =>
        `Las coordenadas proporcionadas en el enlace${coords ? ` ("${coords}")` : ""} no son válidas. Usa un formato válido para RA (0–360° o HMS) y Dec (-90° a +90° o DMS).`,
      dismissButton: "Entendido",
    },
    entryTutorial: {
      welcomeTitle: "Bienvenido al Explorador SPHEREx",
      welcomeDescription:
        "¿Es tu primera vez aquí? Te mostramos en 4 pasos simples cómo cambiar el idioma, ingresar coordenadas, probar astros de ejemplo o comenzar a explorar el espacio de inmediato.",
      startButton: "Iniciar tutorial",
      skipButton: "Omitir",
      prevButton: "Anterior",
      nextButton: "Siguiente",
      finishButton: "Finalizar",
      replayButton: "Tutorial",
      replayTitle: "Ver tutorial de la pantalla de inicio",
      stepCounter: (current, total) => `Paso ${current} de ${total}`,
      steps: {
        language: {
          title: "1. Cambiar el idioma",
          description:
            "Desde este selector puedes cambiar toda la página entre Español (ES) e Inglés (EN) en cualquier momento.",
        },
        coordinates: {
          title: "2. Ingresar coordenadas y formato",
          description:
            "Aquí escribes la Ascensión Recta (RA) y Declinación (Dec) del punto del cielo que quieras ver. Con el botón HMS/DMS | DEG de arriba a la derecha puedes cambiar entre formato horario/sexagesimal (horas, minutos y segundos) y grados decimales (por ejemplo, 133.79°).",
        },
        presets: {
          title: "3. Probar con astros de ejemplo",
          description:
            "Si no tienes coordenadas a mano, abre este menú para elegir entre varios astros de prueba ya listos. Al seleccionar uno, sus coordenadas se completan automáticamente arriba para que solo tengas que pulsar Buscar.",
        },
        explore: {
          title: "4. Explorar sin coordenadas",
          description:
            "¿Prefieres recorrer el cielo libremente sin ingresar datos? Haz clic en esta tarjeta para abrir directamente el mapa espacial interactivo.",
        },
      },
    },
    explorerTutorial: {
      mainPartsButton: "Tutorial partes principales",
      generalButton: "General",
      welcomeTitle: "Tutorial de partes principales",
      welcomeDescription:
        "El recorrido General te guía paso a paso por los botones superiores, la barra de reproducción de video, el Mapa general y el Mapa detallado.",
      startGeneralButton: "Iniciar tutorial General",
      skipButton: "Omitir",
      prevButton: "Anterior",
      nextButton: "Siguiente",
      finishButton: "Finalizar",
      stepCounter: (current, total) => `Paso ${current} de ${total}`,
      steps: {
        back: {
          title: "1. Botón Volver",
          description:
            "Te regresa a la pantalla de inicio para elegir otro astro de prueba, ingresar nuevas coordenadas o reiniciar la exploración.",
        },
        settings: {
          title: "2. Botón Ajustes",
          description:
            "Abre o cierra el panel lateral de controles. Allí puedes ajustar coordenadas, colección, banda infrarroja, escala de brillo, paleta de colores y retícula.",
        },
        newSearch: {
          title: "3. Botón Nueva búsqueda",
          description:
            "Abre una ventana rápida para buscar otro objeto celeste por nombre o coordenadas sin tener que volver a la pantalla de inicio.",
        },
        share: {
          title: "4. Compartir observación",
          description:
            "Copia un enlace directo con tus coordenadas y ajustes actuales para que otra persona vea exactamente la misma región del cielo.",
        },
        playback: {
          title: "5. Barra de reproducción de video",
          description:
            "Controla el video entre fechas de observación: usa ⏮ y ⏭ para avanzar o retroceder un cuadro, ▶/⏸ para reproducir o pausar, Bucle para repetir al terminar, el deslizador de Época para saltar a una fecha y Velocidad para ajustar el ritmo (0.5× a 3.0×).",
        },
        generalMapOverview: {
          title: "6. Mapa general",
          description:
            "Es el mapa interactivo del cielo completo. Arrastra para moverte, usa la rueda para hacer zoom y haz doble clic para marcar un punto. Arriba ves las coordenadas del centro y del cursor, el nombre del objetivo, el campo de visión (FOV), el botón para abrir el Mapa detallado y pantalla completa.",
        },
        generalMapControls: {
          title: "7. Botones del Mapa general",
          description:
            "Abajo a la izquierda controlas las capas: FITS (muestra u oculta huellas de observación), Grilla (líneas de coordenadas) y Canal espectral (µm) para explorar 102 longitudes de onda. A la derecha tienes Buscar aquí (consulta esa zona del cielo) y los controles de zoom, vista global (Todo el cielo), centrar objetivo y restablecer.",
        },
        detailedMapLoading: {
          title: "8. Mapa detallado: carga y juego inicial",
          description:
            "Al abrir una observación en el Mapa detallado, mientras se descargan las imágenes reales de la NASA aparece un minijuego de asteroides para entretenerte en la espera. Cuando termina de cargar, ves la imagen infrarroja con zoom, coordenadas del cursor y botones para descargar en PNG o FITS.",
        },
        detailedMapDates: {
          title: "9. Modificar las fechas mostradas",
          description:
            "Haz clic en esta píldora con la fecha y banda arriba a la izquierda para abrir el menú de Fechas de reproducción. Allí puedes marcar o desmarcar qué fechas quieres incluir en el video, elegir Todas o Ninguna y ver cuáles ya están listas.",
        },
        detailedMapTools: {
          title: "10. Botones de Área, Comparar y Trayectoria",
          description:
            "Arriba a la derecha tienes las herramientas de análisis del Mapa detallado: Área cambia el cursor para dibujar una zona y medir su espectro químico; Comparar (aparece al guardar lecturas) permite contrastar varias áreas o fechas guardadas; y Trayectoria (con 2 o más lecturas) traza el movimiento del astro y proyecta su posición futura. Al lado tienes los controles de FOV, pantalla completa y cerrar.",
        },
      },
    },
    roiTutorial: {
      buttonLabel: "Tutorial",
      buttonTitle: "Ver explicación de esta vista",
      skipButton: "Omitir",
      prevButton: "Anterior",
      nextButton: "Siguiente",
      finishButton: "Finalizar",
      stepCounter: (current, total) => `Paso ${current} de ${total}`,
      current: {
        tabs: {
          title: "Pestañas de análisis",
          description:
            "Aquí cambias entre Área Actual (el análisis de la zona recién marcada), Comparar (para contrastar lecturas guardadas) y Trayectoria (para calcular movimiento). Al lado tienes los botones de borrar área y cerrar.",
        },
        coverage: {
          title: "Cobertura FITS Real",
          description:
            "Indica cuántas observaciones y cuántos canales infrarrojos (de 102 totales) tienen datos reales en tu selección. Si faltan canales por cargar, el botón de escaneo los descarga para completar el espectro.",
        },
        save: {
          title: "Guardar lectura",
          description:
            "Escribe un nombre para identificar esta medición y pulsa Guardar. Las lecturas guardadas quedan disponibles en el navegador para usarlas luego en Comparar y Trayectoria.",
        },
        spectrum: {
          title: "Espectro Infrarrojo del Área",
          description:
            "Muestra el brillo promedio (MJy/sr) en cada longitud de onda (µm). Las líneas verticales punteadas marcan las posiciones donde distintas moléculas absorben o emiten luz infrarroja.",
        },
        classification: {
          title: "Clasificación y Condiciones de vida",
          description:
            "A la izquierda estima qué tipo de objeto celeste coincide mejor con el espectro (junto a su temperatura Wien y pendiente). A la derecha calcula un índice orientativo de habitabilidad según la presencia combinada de agua, carbono, metano, amoníaco y PAHs.",
        },
        composition: {
          title: "Composición Química Detectada",
          description:
            "Resume el peso relativo de cada compuesto detectado en el área. Puedes alternar entre Peso Espectral (W_λ) y Proporción Molar de Hielos (N_i).",
        },
        table: {
          title: "Bandas Diagnósticas y Estimadores",
          description:
            "Detalla cada molécula evaluada: longitud de onda, tipo, número de muestras y si fue Detectada (≥3σ), Marginal (2–3σ) o No detectada (<2σ). Abajo muestra las fórmulas físicas de los estimadores.",
        },
      },
      compare: {
        selectors: {
          title: "Región A y Región B",
          description:
            "Elige aquí las dos lecturas que quieres comparar (pueden ser zonas distintas o la misma zona en diferentes fechas).",
        },
        similarity: {
          title: "Similitud Global y Métricas",
          description:
            "Muestra qué tan parecidas son ambas regiones: porcentaje de Similitud Global, desglose Espectral y Química, canales en común (Solapamiento), especies compartidas, la fórmula coseno utilizada y la comparación directa entre Región A y Región B.",
        },
        saved: {
          title: "Lecturas Guardadas en el Navegador",
          description:
            "Lista todas las mediciones que guardaste con su fecha, coordenadas y canales disponibles. Puedes eliminar cualquiera con el icono de papelera.",
        },
      },
      trajectory: {
        select: {
          title: "Selección de lecturas por fecha",
          description:
            "Marca al menos 2 lecturas de fechas distintas para calcular la trayectoria del objeto. Usa Todas o Ninguna para seleccionar rápidamente.",
        },
        identity: {
          title: "Verificación de Identidad",
          description:
            "Comprueba si las lecturas elegidas pertenecen realmente al mismo cuerpo celeste comparando su similitud espectral promedio, mínima y especies en común.",
        },
        kinematics: {
          title: "Cinemática y Modelo de Movimiento",
          description:
            "Elige entre ajuste Lineal (velocidad constante) o Cuadrático (disponible con 3 o más fechas). Debajo verás el Lapso Total, Desplazamiento Neto, Velocidad Aparente y Dirección (PA).",
        },
        extrapolate: {
          title: "Estimar fecha y Trazar en Mapa",
          description:
            "Elige una fecha futura (o usa +30 d, +6 m, +1 año) para calcular las coordenadas estimadas del astro y su margen de error (1σ). Pulsa Trazar en Mapa 2 para ver la ruta dibujada sobre el Mapa detallado.",
        },
      },
    },
    sidebarTutorial: {
      buttonLabel: "Tutorial",
      buttonTitle: "Explicar ajustes de la barra lateral",
      skipButton: "Omitir",
      prevButton: "Anterior",
      nextButton: "Siguiente",
      finishButton: "Finalizar",
      stepCounter: (current, total) => `Paso ${current} de ${total}`,
      steps: {
        zoom: {
          title: "1. Zoom (Campo visual)",
          description:
            "Desliza este control para cambiar el tamaño del recorte del cielo (en grados) que se descarga y se muestra en el Mapa detallado.",
        },
        bands: {
          title: "2. Bandas D1–D6",
          description:
            "Abre una galería visual donde puedes ver y comparar la misma región del cielo en las 6 bandas infrarrojas del telescopio SPHEREx (D1 a D6) y sus distintas versiones.",
        },
        stretchAndColormap: {
          title: "3. Escala de flujo y Paleta de color",
          description:
            "Escala de flujo ajusta cómo se resalta el brillo (Asinh es ideal para ver detalles débiles y brillantes a la vez). Paleta de color cambia los colores falsos de la imagen (Inferno, Viridis, Plasma, Magma o Gris) para distinguir mejor las estructuras.",
        },
        detector: {
          title: "4. Detector / Banda",
          description:
            "Filtra las observaciones por una banda de longitud de onda específica (de D1 a D6, entre 0.75 y 5.00 µm) o deja Todas para ver el rango completo.",
        },
        toggles: {
          title: "5. Luz zodiacal y Retícula",
          description:
            "Restar luz zodiacal (ZODI) elimina el brillo del polvo del sistema solar para aislar mejor tu objeto. Mostrar retícula activa o oculta la cruz guía sobre las coordenadas centrales.",
        },
        exposures: {
          title: "6. Exposiciones FITS",
          description:
            "Abre el listado completo con todas las imágenes FITS disponibles en esta zona para elegir e inspeccionar manualmente cualquier observación individual.",
        },
      },
    },
    presets: [
      {
        id: "barnards_star",
        label: "Barnard's Star",
        queryName: "Barnard's Star",
        category: "Alto Mov. Propio",
        ra: "17h57m48.498s",
        dec: "+04d41m36.11s",
        collection: "spherex_dr1",
        description:
          "Estrella enana roja (M4V) con el mayor movimiento propio conocido respecto al Sol.",
      },
      {
        id: "epsilon_indi_b",
        label: "Epsilon Indi B",
        queryName: "Epsilon Indi B",
        category: "Enanas Marrones",
        ra: "22h04m10.595s",
        dec: "-56d46m58.24s",
        collection: "spherex_dr1",
        description:
          "Par binario de enanas marrones (T1 + T6) que orbitan la estrella Epsilon Indi.",
      },
      {
        id: "wise_0855",
        label: "WISE 0855",
        queryName: "WISE 0855",
        category: "Enana Marrón Rápida",
        ra: "08h55m10.831s",
        dec: "-7d14m42.53s",
        collection: "spherex_dr1",
        description:
          "Enana marrón (sub-enana tipo Y) de rápido movimiento a 7.4 años luz (RA 08h55m10.831s, Dec -7d14m42.53s).",
      },
      {
        id: "rw_aurigae",
        label: "RW Aurigae",
        queryName: "RW Aurigae",
        category: "Estrella Variable",
        ra: "05h07m49.566s",
        dec: "+30d24m05.18s",
        collection: "spherex_dr1",
        description:
          "Sistema estelar joven variable tipo T Tauri con episodios de oscurecimiento circumestelar.",
      },
      {
        id: "r_draconis",
        label: "R Draconis",
        queryName: "R Draconis",
        category: "Estrella Variable",
        ra: "16h32m40.227s",
        dec: "+66d45m17.93s",
        collection: "spherex_dr1",
        description:
          "Estrella gigante roja variable tipo Mira en Draco (disponible en Wide DR1 y Deep DR1).",
      },
      {
        id: "m101",
        label: "Galaxia M101 (Molinete)",
        queryName: "M101",
        category: "Galaxias",
        ra: "210.80227",
        dec: "54.34895",
        collection: "spherex_dr1",
        description: "Gran galaxia espiral en la constelación de la Osa Mayor.",
      },
      {
        id: "m51",
        label: "Galaxia M51 (Remolino)",
        queryName: "M51",
        category: "Galaxias",
        ra: "202.46958",
        dec: "47.19526",
        collection: "spherex_dr1",
        description: "Galaxia espiral interactuando con NGC 5195.",
      },
      {
        id: "vela_carina",
        label: "Vela / Carina",
        queryName: "NGC 3372",
        category: "Plano Galáctico",
        ra: "127.69444",
        dec: "-39.17760",
        collection: "spherex_dr1",
        description: "Región rica en emisión interestelar e infrarroja.",
      },
      {
        id: "nep_deep",
        label: "Campo Profundo NEP",
        queryName: "NGC 6543",
        category: "Sondeo Profundo",
        ra: "270.0",
        dec: "66.0",
        collection: "spherex_dr1",
        description: "Polo Eclíptico Norte (North Ecliptic Pole).",
      },
    ],
  },
  en: {
    navbar: {
      title: "SPHEREx Spectral Image Explorer",
      subtitle:
        "Interactive query and visualization of NASA / IPAC IRSA FITS data (SIA & IBE Cutouts)",
      badge: "Vite + React & Tailwind",
      missionLink: "SPHEREx Mission",
      tutorialsLink: "IRSA Tutorials",
      languageAriaLabel: "Select interface language",
      selectLanguage: "Language",
      spanish: "Spanish",
      english: "English",
    },
    controls: {
      celestialSearchTitle: "Celestial Body Search",
      celestialSearchLabel: "Celestial body name",
      celestialSearchPlaceholder: "E.g. Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae...",
      celestialSearchButton: "Resolve",
      celestialSearchingButton: "Searching...",
      celestialSearchHelp:
        "Resolves ICRS coordinates from the SPHEREx example catalog.",
      resolvedBadgeTitle: "Resolved Astronomical Identifier",
      resolvedTypeLabel: "Type:",
      resolvedPmLabel: "Proper motion:",
      resolvedAliasesLabel: "Aliases:",
      coordsTitle: "Celestial Coordinates (ICRS)",
      raLabel: "Right Ascension (RA)",
      raPlaceholder: "210.80227 or 08h55m10.8s",
      raHelp: "0° to 360° or HMS format",
      decLabel: "Declination (Dec)",
      decPlaceholder: "54.34895 or -7d14m42.5s",
      decHelp: "-90° to +90° or DMS format",
      recommendedTargets: "Featured Celestial Bodies Catalog (SPHEREx):",
      queryTitle: "IRSA Query Parameters",
      collectionLabel: "SPHEREx Version / Collection",
      allCollectionsOption: "All available versions (Multi-version)",
      collectionLabels: {
        spherex_dr1: "spherex_dr1 (Wide Survey DR1)",
      },
      collectionShortLabels: {
        spherex_dr1: "Wide DR1",
      },
      bandLabel: "Detector / Band",
      allBands: "All (D1 to D6)",
      radiusLabel: "Search radius (°)",
      sizeLabel: "Field of view (°)",
      queryButton: "Query SPHEREx Versions",
      queryingButton: "Querying IRSA...",
      displayTitle: "Visualization Options",
      stretchLabel: "Flux stretch",
      stretchOptions: {
        asinh: "Asinh (Recommended)",
        log: "Logarithmic",
        sqrt: "Square Root",
        linear: "Linear",
      },
      colormapLabel: "Color palette",
      colormapOptions: {
        inferno: "Inferno",
        viridis: "Viridis",
        plasma: "Plasma",
        magma: "Magma",
        gray: "Grayscale",
      },
      subtractZodi: "Subtract zodiacal light (ZODI extension)",
      showCrosshair: "Show crosshair at center coordinates",
    },
    viewer: {
      defaultTitle: "SPHEREx Spectral Viewer",
      centerCoords: ({ ra, dec, size }) =>
        `Center: RA ${ra}°, Dec ${dec}° · Cutout size: ${size}°`,
      enterCoordsPrompt:
        'Select a celestial body or enter coordinates and click "Query SPHEREx Versions".',
      savePng: "Save PNG",
      savePngTitle: "Download processed PNG image",
      originalFits: "Original FITS",
      originalFitsTitle: "Download original FITS file from IRSA",
      altCutout: "SPHEREx Cutout",
      zoomInTitle: "Zoom in",
      zoomOutTitle: "Zoom out",
      resetZoomTitle: "Reset zoom to 100%",
      fovInTitle: "Zoom in",
      fovOutTitle: "Zoom out",
      fovResetTitle: "Reset field of view (0.15°)",
      map2FovInTitle: "Zoom in",
      map2FovOutTitle: "Zoom out",
      map2FovMaxTitle: "Maximize field of view (1.00°)",
      fovUpdating: "Updating FOV...",
      raAxisLabel: "RA (ICRS)",
      decAxisLabel: "Dec (ICRS)",
      emptyTitle: "No query performed yet",
      emptySubtitle:
        "Select a celestial body or enter coordinates to view its detailed images",
      apiErrorTitle: "NASA/IRSA API request failed",
      apiErrorSubtitle:
        "The service did not respond properly. Please retry later.",
      queryingApiTitle: "Querying NASA/IRSA API...",
      queryingApiSubtitle: "Searching for available spectral observations at these coordinates",
      detectorBand: "Detector / Band",
      wavelength: "Wavelength",
      infrared: "Infrared",
      dimensions: "Dimensions",
      fluxMedianMax: "Flux (Median / Max)",
      copySiaTitle: "Copy SIA URL",
      copyCutoutTitle: "Copy IBE Cutout URL",
      galleryTitle: "Available Versions & Spectral Bands Gallery",
      gallerySubtitle: ({ count, collections }) =>
        `${count} representative spectral versions across ${collections} SPHEREx collection(s)`,
      galleryLoadAllBands: "Rendering FITS previews...",
      galleryModeByCollection: "By Collection Version",
      galleryModeByBand: "All Bands (D1–D6) per Version",
      galleryActiveBadge: "Viewing",
      galleryClickToInspect: "Click to inspect in main viewer",
      galleryExposuresCount: (count) => `${count} exp. available`,
      galleryLoadingCutout: "Loading FITS...",
      galleryErrorCutout: "No coverage in cutout",
      galleryPaginationInfo: ({ from, to, total }) => `Showing ${from}–${to} of ${total}`,
      galleryPageIndicator: ({ page, totalPages }) => `Page ${page} / ${totalPages}`,
      galleryPrevPage: "Previous page",
      galleryNextPage: "Next page",
      viewModeCutout: "FITS Cutout",
      viewModeSkyMap: "HiPS / MOC Sky Map",
      viewModeSplit: "Split View (Map + FITS)",
      visualZoomLabel: (zoom) => `Zoom ${zoom}x`,
      visualZoomReset: "Reset visual zoom (1x)",
      asteroidGameScore: (score) => `Score: ${score}`,
      asteroidGameHint: "Click the asteroids to destroy them while loading!",
      asteroidGameAria: "Asteroid mini-game while loading",
    },
    skyMap: {
      title: "SPHEREx Interactive Sky Map (HiPS All-Sky Cube & MOC)",
      subtitle:
        "IRSA progressive HEALPix tiles (102 spectral channels) + MOC coverage & s_region footprints",
      channelLabel: "HiPS Cube Channel:",
      channelInfo: ({ idx, total, um, band }) =>
        `Channel ${idx}/${total} · ${um} µm (${band})`,
      mocWideLabel: "Wide MOC Coverage",
      mocDeepLabel: "Deep Field MOC Coverage",
      footprintsLabel: "Show/hide detailed regions",
      gridLabel: "Show/hide grid",
      allSkyButton: "All-Sky View (Aitoff)",
      centerOnTarget: "Center on target",
      searchHereButton: "Query FITS at map center",
      doubleClickHint:
        "Drag to pan · Scroll to zoom · Double-click any point to mark it and open its color images/video alongside",
      fovLabel: (deg) => `Map FOV ${deg}°`,
      orderLabel: (order) => `HEALPix Norder ${order}`,
      cursorCoords: ({ ra, dec }) => `Cursor: RA ${ra}°, Dec ${dec}°`,
      loadingMoc: "Loading MOC...",
      markedPointBadge: ({ ra, dec }) => `Marked point: RA ${ra}°, Dec ${dec}°`,
      openSideBySideAction: "View color images & transition alongside",
      sideBySideActiveBadge: "Side panel active",
      closeSideBySideAction: "Close side panel",
      clearPinAction: "Clear pin",
      sidePanelTitle: "Selected Zone Inspection (Transition & FITS Images)",
      sidePanelSubtitle: ({ ra, dec, count }) =>
        `Marked center: RA ${ra}°, Dec ${dec}° · ${count} exposures cover this point`,
      sidePanelCenterMarkerLabel: "Selected center point (RA / Dec)",
      sidePanelTabVideo: "Video / Transition",
      sidePanelTabCutout: "Active FITS Image",
      sidePanelTabBands: "Color Bands (D1–D6)",
      sidePanelLoading: "Querying and rendering FITS cutouts for marked point...",
      sidePanelNoCoverage: "No FITS cutouts found for this point.",
      sideDatesLabel: "Dates:",
      sideDatesSelectAll: "All",
      sideDatesClear: "Clear",
      sideNoDatesSelected: "Select at least one date above to load its images.",
      sideZoomLabel: (zoom) => `Zoom ${zoom}x`,
    },
    epochPlayer: {
      title: "Epoch Versions & Transition (Video)",
      subtitle: ({ total, selected }) =>
        `${total} available epochs · ${selected} selected for group view / video`,
      allBands: "All",
      modeVideo: "Video / Transition",
      modeGrid: "View Together",
      play: "Play",
      pause: "Pause",
      prevFrame: "Previous epoch",
      nextFrame: "Next epoch",
      loopLabel: "Loop",
      crossfadeLabel: "Smooth fade",
      speedLabel: "Speed:",
      speedUnit: (ms) => `${(ms / 1000).toFixed(2)}s / img`,
      selectAll: "Select page",
      clearAll: "Clear",
      readyProgress: ({ ready, total }) => `${ready}/${total} ready`,
      frameCounter: ({ current, total }) => `Frame ${current} of ${total}`,
      versionNumber: (num) => `#${num}`,
      includeInSet: "Include in set / video",
      viewIndividual: "Click to view individually",
      noSelectionTitle: "No versions selected in set",
      noSelectionDesc:
        "Check version numbers below to view them together or play the transition.",
      loadingFrame: "Downloading epoch FITS...",
      errorFrame: "No FITS coverage in this epoch",
      exposuresInEpoch: (count) => `${count} exp.`,
      paginationInfo: ({ from, to, total }) => `Epochs ${from}–${to} of ${total}`,
      pageIndicator: ({ page, totalPages }) => `Page ${page} / ${totalPages}`,
      prevPage: "Previous epochs page",
      nextPage: "Next epochs page",
    },
    observations: {
      title: "FITS Exposures",
      versionsHeader: "SPHEREx Catalog Versions:",
      searching: "Searching astronomical exposures in IRSA...",
      emptyDesc:
        "SPHEREx spectral exposures available in each catalog version will be listed here.",
      noObsInCollection:
        "This collection version has no exposures for the selected coordinates. Choose another version above.",
      expTime: (s) => `${s}s exp`,
      irFallback: "IR",
      paginationInfo: ({ from, to, total }) => `Showing ${from}–${to} of ${total}`,
      pageIndicator: ({ page, totalPages }) => `Page ${page} / ${totalPages}`,
      prevPage: "Previous page",
      nextPage: "Next page",
      pageSizeLabel: "Per page:",
    },
    status: {
      invalidRa:
        "Invalid Right Ascension (RA). Use decimal degrees (0–360) or HMS format (e.g. 08h55m10.831s).",
      invalidDec:
        "Invalid Declination (Dec). Use decimal degrees (-90 to +90) or DMS format (e.g. -7d14m42.53s).",
      resolvingObject: (name) => `Resolving coordinates for "${name}"...`,
      objectNotFound: (name) =>
        `Could not find celestial body "${name}" in the example catalog. Select a featured object or enter RA/Dec coordinates directly.`,
      queryingSia: ({ ra, dec, collection }) =>
        `Querying IRSA SIA catalog at RA=${ra}°, Dec=${dec}° (${collection})...`,
      queryingAllVersions: ({ ra, dec }) =>
        `Querying SPHEREx DR1 Wide at RA=${ra}°, Dec=${dec}°...`,
      noImagesFound: ({ collection, ra, dec }) =>
        `No images found in "${collection}" for RA=${ra}°, Dec=${dec}°. Try increasing the radius or choosing another version.`,
      downloadingFits: ({ band, id }) =>
        `Downloading and rendering FITS (${band} — ${id})...`,
      renderError: "Error rendering FITS cutout.",
      unexpectedError: "Unexpected error querying IRSA SIA.",
      fitsNoImage: "The FITS file does not contain a 2D IMAGE extension.",
      fitsInvalidDimensions: "Invalid FITS image dimensions.",
      fitsAllNan: "All pixels in cutout are NaN or empty.",
      fitsCanvasError: "Could not initialize Canvas 2D context.",
      map1ApiDown:
        "The NASA/IRSA API for Map 1 (HiPS) is currently down or unreachable.",
      map2ApiDown:
        "The NASA/IRSA API for Map 2 (SIA / Cutouts) is currently down or unreachable.",
      retryApi: "Retry",
    },
    chrono: {
      entryTitle: "Explore the space",
      heroTitle: "Free Navigation",
      heroSubtitle: "Discover the wonders of space",
      heroCta: "Start →",
      loadingLabel: "Analyzing space...",
      backButton: "Back",
      panelLabel: "Settings",
      newSearchButton: "New search",
      togglePanelOpen: "Open settings panel",
      togglePanelClose: "Close settings panel",
      searchByCoords: "Search by Coordinates",
      coordsInputPlaceholder: "RA, Dec (e.g. 133.79, -7.24)",
      goButton: "Go",
      searchByName: "Search by Name",
      nameInputPlaceholder: "e.g. WISE 0855, Barnard...",
      searchButton: "Search",
      zoomFov: "Zoom (Field of View)",
      molecularSignatures: "Molecular Signatures",
      standbyBadge: "UI Ready",
      activeBadge: "Active",
      onLabel: "ON",
      advancedControls: "Scientific & Band Settings",
      exposuresDrawerButton: (count) => `FITS Exposures (${count})`,
      apiStatusConnected: (count) => `IRSA Connected (${count} exp.)`,
      apiStatusQuerying: "Querying IRSA SIA...",
      apiStatusReady: "Live Sky Renderer",
      epochLabel: "Epoch",
      speedLabel: "Speed",
      playPauseAria: "Play or Pause",
      prevFrameAria: "Previous image",
      nextFrameAria: "Next image",
      loopLabel: "Loop",
      loopAria: "Loop playback",
      enterFullscreen: "View fullscreen",
      exitFullscreen: "Exit fullscreen",
      splitSecondMapButton: "Open Detailed Map",
      closeSecondMapButton: "Close 2nd Map",
      map1Title: "Map 1 · HiPS / MOC Sky",
      map2Title: "Map 2 · FITS Cutout & Epochs",
      customSkyPatch: "Custom Sky Patch",
      playbackDatesTitle: "Playback dates",
      selectAllDates: "All",
      selectNoDates: "None",
      selectAtLeastOneDate: "Select at least one date to play",
      noDatesAvailable: "No dates available",
      preloadingFrames: (loaded, total) => `Caching images (${loaded}/${total})...`,
      selectDatesTooltip: "Select dates for video playback",
      noDateLabel: "No date",
      cursorAudioOn: "Audio on",
      cursorAudioOff: "Audio muted",
      cursorAudioAria: "Toggle space audio",
      musicVolumeAria: "Background music volume",
      musicOn: "Music",
      musicOff: "Music muted",
      musicAria: "Toggle background music",
      sfxOn: "Sounds",
      sfxOff: "Sounds muted",
      sfxAria: "Toggle sound effects",
      molecules: {
        h2o: "Water Ice (H₂O)",
        co2: "Carbon Dioxide (CO₂)",
        co: "Carbon Monoxide (CO)",
        ch3oh: "Methanol",
        ch4: "Methane (CH₄)",
        nh3: "Ammonia / Cyanate",
        pahs: "PAHs",
      },
    },
    urlError: {
      invalidTargetTitle: "Invalid Celestial Body",
      invalidTargetMessage: (name) =>
        `The celestial body "${name}" is not in the available example catalog. Please check the name or use RA/Dec coordinates.`,
      invalidCoordsTitle: "Invalid Coordinates",
      invalidCoordsMessage: (coords) =>
        `The coordinates provided in the link${coords ? ` ("${coords}")` : ""} are not valid. Please use a valid format for RA (0–360° or HMS) and Dec (-90° to +90° or DMS).`,
      dismissButton: "Got it",
    },
    entryTutorial: {
      welcomeTitle: "Welcome to SPHEREx Explorer",
      welcomeDescription:
        "First time here? In 4 simple steps we'll show you how to change the language, enter coordinates, try sample celestial objects, or start exploring space right away.",
      startButton: "Start tutorial",
      skipButton: "Skip",
      prevButton: "Back",
      nextButton: "Next",
      finishButton: "Finish",
      replayButton: "Tutorial",
      replayTitle: "View home screen tutorial",
      stepCounter: (current, total) => `Step ${current} of ${total}`,
      steps: {
        language: {
          title: "1. Change the language",
          description:
            "Use this selector to switch the entire page between Spanish (ES) and English (EN) at any time.",
        },
        coordinates: {
          title: "2. Enter coordinates & format",
          description:
            "Type the Right Ascension (RA) and Declination (Dec) of the sky region you want to observe. Use the HMS/DMS | DEG toggle at the top right to switch between sexagesimal format (hours, minutes, seconds) and decimal degrees (e.g. 133.79°).",
        },
        presets: {
          title: "3. Try sample celestial objects",
          description:
            "Don't have coordinates handy? Open this menu to pick from several ready-to-use sample objects. Selecting one automatically fills its coordinates above so you just need to click Search.",
        },
        explore: {
          title: "4. Explore without coordinates",
          description:
            "Prefer to browse the sky freely without entering anything? Click this card to jump straight into the interactive space map.",
        },
      },
    },
    explorerTutorial: {
      mainPartsButton: "Main parts tutorial",
      generalButton: "General",
      welcomeTitle: "Main Parts Tutorial",
      welcomeDescription:
        "The General tour guides you step by step through the top buttons, the video playback bar, the General Map, and the Detailed Map.",
      startGeneralButton: "Start General tutorial",
      skipButton: "Skip",
      prevButton: "Back",
      nextButton: "Next",
      finishButton: "Finish",
      stepCounter: (current, total) => `Step ${current} of ${total}`,
      steps: {
        back: {
          title: "1. Back Button",
          description:
            "Returns you to the home screen so you can pick another sample object, enter new coordinates, or start over.",
        },
        settings: {
          title: "2. Settings Button",
          description:
            "Opens or closes the side control panel, where you can adjust coordinates, collection, infrared band, brightness stretch, colormap, and crosshair.",
        },
        newSearch: {
          title: "3. New Search Button",
          description:
            "Opens a quick search dialog to look up another celestial object by name or coordinates without leaving the explorer.",
        },
        share: {
          title: "4. Share Observation",
          description:
            "Copies a direct link with your current coordinates and display settings so anyone can open the exact same sky view.",
        },
        playback: {
          title: "5. Video Playback Bar",
          description:
            "Controls the multi-date time-lapse: use ⏮ and ⏭ to step one frame back or forward, ▶/⏸ to play or pause, Loop to repeat continuously, the Epoch slider to jump to any date, and Speed to adjust playback rate (0.5× to 3.0×).",
        },
        generalMapOverview: {
          title: "6. General Map",
          description:
            "This is the interactive all-sky map. Drag to pan, scroll to zoom, and double-click to drop a pin. At the top you can see center and cursor coordinates, target name, field of view (FOV), the button to open the Detailed Map, and fullscreen.",
        },
        generalMapControls: {
          title: "7. General Map Controls",
          description:
            "Bottom-left buttons toggle map layers: FITS (observation footprints), Grid (coordinate lines), and Spectral Channel (µm) for the 102-wavelength slider. Bottom-right buttons let you Search here (query the current center) and control zoom, All-Sky view, center on target, and reset.",
        },
        detailedMapLoading: {
          title: "8. Detailed Map: Loading & Initial Game",
          description:
            "When opening an observation in the Detailed Map, an interactive asteroid minigame appears while real NASA FITS images download. Once loaded, you see the infrared image with zoom/pan, cursor coordinates, and PNG or FITS download buttons.",
        },
        detailedMapDates: {
          title: "9. Modifying Displayed Dates",
          description:
            "Click the date and band pill at the top-left to open the Playback Dates menu. Here you can check or uncheck which observation dates appear in the video, select All or None, and see which frames are cached.",
        },
        detailedMapTools: {
          title: "10. Area, Compare & Trajectory Buttons",
          description:
            "Top-right analysis tools for the Detailed Map: Area switches the cursor to draw a box and measure its infrared chemical spectrum; Compare (available after saving readings) lets you compare multiple saved regions or dates; and Trajectory (with 2+ saved readings) traces object motion and extrapolates its future sky position. Beside them are FOV, fullscreen, and close controls.",
        },
      },
    },
    roiTutorial: {
      buttonLabel: "Tutorial",
      buttonTitle: "Explain this view",
      skipButton: "Skip",
      prevButton: "Back",
      nextButton: "Next",
      finishButton: "Finish",
      stepCounter: (current, total) => `Step ${current} of ${total}`,
      current: {
        tabs: {
          title: "Analysis Tabs",
          description:
            "Switch between Current Area (the newly selected region), Compare (contrast saved readings), and Trajectory (motion tracking). Next to them are buttons to clear the area or close.",
        },
        coverage: {
          title: "Real FITS Coverage",
          description:
            "Shows how many observations and infrared channels (out of 102) have real data in your selection. If channels are missing, use the scan button to download the full spectrum.",
        },
        save: {
          title: "Save Reading",
          description:
            "Enter a name for this measurement and click Save. Saved readings stay in your browser so you can use them later in Compare and Trajectory.",
        },
        spectrum: {
          title: "Area Infrared Spectrum",
          description:
            "Displays average brightness (MJy/sr) across wavelengths (µm). Vertical dashed lines mark where specific molecules absorb or emit infrared light.",
        },
        classification: {
          title: "Classification & Life Conditions",
          description:
            "On the left, estimates which celestial object type best matches the spectrum (with Wien temperature and slope). On the right, computes an indicative habitability index from water, carbon, methane, ammonia, and PAHs.",
        },
        composition: {
          title: "Detected Chemical Composition",
          description:
            "Summarizes the relative share of each detected compound. You can toggle between Spectral Weight (W_λ) and Ice Molar Ratio (N_i).",
        },
        table: {
          title: "Diagnostic Bands & Estimators",
          description:
            "Lists each evaluated molecule: wavelength, type, sample count, and status—Detected (≥3σ), Marginal (2–3σ), or Not detected (<2σ)—plus the physical estimator formulas below.",
        },
      },
      compare: {
        selectors: {
          title: "Region A & Region B",
          description:
            "Pick the two readings you want to compare (different sky regions or the same region at different dates).",
        },
        similarity: {
          title: "Overall Similarity & Metrics",
          description:
            "Shows how closely the two regions match: Overall Similarity percentage, Spectral and Chemical scores, overlapping channels, shared species, cosine similarity formula, and a side-by-side summary of Region A vs Region B.",
        },
        saved: {
          title: "Browser-Saved Readings",
          description:
            "Lists all your saved measurements with date, coordinates, and available channels. You can remove any entry with the trash icon.",
        },
      },
      trajectory: {
        select: {
          title: "Select Readings by Date",
          description:
            "Check at least 2 readings from distinct dates to compute the object's trajectory. Use All or None for quick selection.",
        },
        identity: {
          title: "Identity Check",
          description:
            "Verifies whether the selected readings chemically and spectrally match the same celestial body using average/minimum similarity and shared species.",
        },
        kinematics: {
          title: "Kinematics & Motion Model",
          description:
            "Choose between a Linear fit (constant velocity) or Quadratic fit (requires 3+ dates). Below you'll see Total Span, Net Displacement, Apparent Speed, and Direction (PA).",
        },
        extrapolate: {
          title: "Estimate Date & Trace on Map",
          description:
            "Pick a target date (or use +30 d, +6 mo, +1 yr) to compute estimated sky coordinates and 1σ uncertainty. Click Trace on Map 2 to draw the path directly on the Detailed Map.",
        },
      },
    },
    sidebarTutorial: {
      buttonLabel: "Tutorial",
      buttonTitle: "Explain sidebar settings",
      skipButton: "Skip",
      prevButton: "Back",
      nextButton: "Next",
      finishButton: "Finish",
      stepCounter: (current, total) => `Step ${current} of ${total}`,
      steps: {
        zoom: {
          title: "1. Zoom (Field of View)",
          description:
            "Drag this slider to change the sky cutout size (in degrees) downloaded and displayed in the Detailed Map.",
        },
        bands: {
          title: "2. Bands D1–D6",
          description:
            "Opens a visual gallery to inspect and compare the same sky region across all 6 SPHEREx infrared detector bands (D1–D6) and available versions.",
        },
        stretchAndColormap: {
          title: "3. Flux Stretch & Colormap",
          description:
            "Flux Stretch controls how brightness is scaled (Asinh is best for seeing both faint and bright details). Colormap changes the false-color palette (Inferno, Viridis, Plasma, Magma, or Gray) to highlight infrared structures.",
        },
        detector: {
          title: "4. Detector / Band",
          description:
            "Filters observations by a specific infrared wavelength band (D1 through D6, from 0.75 to 5.00 µm), or keeps All for the full range.",
        },
        toggles: {
          title: "5. Zodiacal Light & Crosshair",
          description:
            "Subtract zodiacal light (ZODI) removes foreground solar-system dust glow to isolate the target. Show crosshair toggles the center guide marker.",
        },
        exposures: {
          title: "6. FITS Exposures",
          description:
            "Opens the full list of all FITS exposures found in this sky region so you can manually pick and inspect any individual observation.",
        },
      },
    },
    presets: [
      {
        id: "barnards_star",
        label: "Barnard's Star",
        queryName: "Barnard's Star",
        category: "High Proper Motion",
        ra: "17h57m48.498s",
        dec: "+04d41m36.11s",
        collection: "spherex_dr1",
        description:
          "Red dwarf star (M4V) with the highest known proper motion relative to the Sun.",
      },
      {
        id: "epsilon_indi_b",
        label: "Epsilon Indi B",
        queryName: "Epsilon Indi B",
        category: "Brown Dwarfs",
        ra: "22h04m10.595s",
        dec: "-56d46m58.24s",
        collection: "spherex_dr1",
        description:
          "Binary pair of brown dwarfs (T1 + T6) orbiting the star Epsilon Indi.",
      },
      {
        id: "wise_0855",
        label: "WISE 0855",
        queryName: "WISE 0855",
        category: "Fast Brown Dwarf",
        ra: "08h55m10.831s",
        dec: "-7d14m42.53s",
        collection: "spherex_dr1",
        description:
          "Fast-moving Y-type brown dwarf at 7.4 light-years (RA 08h55m10.831s, Dec -7d14m42.53s).",
      },
      {
        id: "rw_aurigae",
        label: "RW Aurigae",
        queryName: "RW Aurigae",
        category: "Variable Star",
        ra: "05h07m49.566s",
        dec: "+30d24m05.18s",
        collection: "spherex_dr1",
        description:
          "Young T Tauri variable star system exhibiting circumstellar dimming events.",
      },
      {
        id: "r_draconis",
        label: "R Draconis",
        queryName: "R Draconis",
        category: "Variable Star",
        ra: "16h32m40.227s",
        dec: "+66d45m17.93s",
        collection: "spherex_dr1",
        description:
          "Mira-type red giant variable star in Draco (available in Wide DR1 and Deep DR1).",
      },
      {
        id: "m101",
        label: "M101 Pinwheel Galaxy",
        queryName: "M101",
        category: "Galaxies",
        ra: "210.80227",
        dec: "54.34895",
        collection: "spherex_dr1",
        description: "Grand design spiral galaxy in Ursa Major.",
      },
      {
        id: "m51",
        label: "M51 Whirlpool Galaxy",
        queryName: "M51",
        category: "Galaxies",
        ra: "202.46958",
        dec: "47.19526",
        collection: "spherex_dr1",
        description: "Spiral galaxy interacting with NGC 5195.",
      },
      {
        id: "vela_carina",
        label: "Vela / Carina",
        queryName: "NGC 3372",
        category: "Galactic Plane",
        ra: "127.69444",
        dec: "-39.17760",
        collection: "spherex_dr1",
        description: "Region rich in interstellar and infrared emission.",
      },
      {
        id: "nep_deep",
        label: "NEP Deep Field",
        queryName: "NGC 6543",
        category: "Deep Survey",
        ra: "270.0",
        dec: "66.0",
        collection: "spherex_dr1",
        description: "North Ecliptic Pole deep survey field.",
      },
    ],
  },
};

const TARGET_NAME_PAIRS: Array<{ es: string; en: string }> = [
  { es: "Sector Celeste Personalizado", en: "Custom Sky Patch" },
  { es: "Estrella de Barnard", en: "Barnard's Star" },
  { es: "Galaxia M101 (Molinete)", en: "M101 Pinwheel Galaxy" },
  { es: "Galaxia M51 (Remolino)", en: "M51 Whirlpool Galaxy" },
  { es: "Campo Profundo NEP", en: "NEP Deep Field" },
];

export function localizeTargetName(rawName: string, isEn: boolean): string {
  const trimmed = rawName.trim();
  if (!trimmed) return rawName;
  const lower = trimmed.toLowerCase();
  for (const pair of TARGET_NAME_PAIRS) {
    if (lower === pair.es.toLowerCase() || lower === pair.en.toLowerCase()) {
      return isEn ? pair.en : pair.es;
    }
  }
  return rawName;
}

const READING_WORD_PAIRS: Array<{ esSingular: string; esPlural: string; enSingular: string; enPlural: string }> = [
  { esSingular: "lectura", esPlural: "lecturas", enSingular: "Reading", enPlural: "Readings" },
  { esSingular: "muestra", esPlural: "muestras", enSingular: "Sample", enPlural: "Samples" },
  { esSingular: "región", esPlural: "regiones", enSingular: "Region", enPlural: "Regions" },
  { esSingular: "region", esPlural: "regiones", enSingular: "Region", enPlural: "Regions" },
  { esSingular: "área", esPlural: "áreas", enSingular: "Area", enPlural: "Areas" },
  { esSingular: "area", esPlural: "areas", enSingular: "Area", enPlural: "Areas" },
  { esSingular: "época", esPlural: "épocas", enSingular: "Epoch", enPlural: "Epochs" },
  { esSingular: "epoca", esPlural: "epocas", enSingular: "Epoch", enPlural: "Epochs" },
  { esSingular: "punto", esPlural: "puntos", enSingular: "Point", enPlural: "Points" },
  { esSingular: "objeto", esPlural: "objetos", enSingular: "Object", enPlural: "Objects" },
  { esSingular: "prueba", esPlural: "pruebas", enSingular: "Test", enPlural: "Tests" },
];

export function localizeReadingName(rawName: string, isEn: boolean): string {
  let result = rawName.trim();
  if (!result) return rawName;

  // 1. Handle "Current area (...)" / "Área actual (...)" wrapper
  const currentAreaMatch = /^(?:Current area|Área actual|Area actual)\s*\((.+)\)$/i.exec(result);
  if (currentAreaMatch) {
    const innerTarget = localizeTargetName(currentAreaMatch[1], isEn);
    return isEn ? `Current area (${innerTarget})` : `Área actual (${innerTarget})`;
  }

  // 2. Replace any known target name substrings (e.g. Sector Celeste Personalizado)
  for (const pair of TARGET_NAME_PAIRS) {
    const from = isEn ? pair.es : pair.en;
    const to = isEn ? pair.en : pair.es;
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, to);
  }

  // 3. Translate common reading words (e.g. "lectura 1" <-> "Reading 1")
  for (const w of READING_WORD_PAIRS) {
    if (isEn) {
      const pluralRe = new RegExp(`\\b${w.esPlural}\\b`, "gi");
      const singularRe = new RegExp(`\\b${w.esSingular}\\b`, "gi");
      result = result.replace(pluralRe, w.enPlural).replace(singularRe, w.enSingular);
    } else {
      const pluralRe = new RegExp(`\\b${w.enPlural}\\b`, "gi");
      const singularRe = new RegExp(`\\b${w.enSingular}\\b`, "gi");
      const capEsPlural = w.esPlural.charAt(0).toUpperCase() + w.esPlural.slice(1);
      const capEsSingular = w.esSingular.charAt(0).toUpperCase() + w.esSingular.slice(1);
      result = result.replace(pluralRe, capEsPlural).replace(singularRe, capEsSingular);
    }
  }

  return localizeTargetName(result, isEn);
}

