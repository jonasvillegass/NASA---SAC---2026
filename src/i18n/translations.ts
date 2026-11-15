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
      cursorAudioAria: "Activar o silenciar sonido espacial del cursor",
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
      cursorAudioAria: "Toggle cursor space audio",
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
