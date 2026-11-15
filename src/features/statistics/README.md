# Módulo de estadística, patrones multitemporales y termodinámica (Sector A — Joaquín y Jonás)

- **Ubicación**: `src/features/statistics/`
- **Estado**: Módulo independiente en TypeScript y React, compilado sin errores y conectable desde `ViewerPanel.tsx` o `App.tsx`.

---

## 1. Uso de las funciones y del componente

El directorio expone dos funciones de cálculo puro y un componente de interfaz:

### Opción A — Función estadística y termodinámica (`computeJoakoStatisticalThermodynamics`)
```ts
import { computeJoakoStatisticalThermodynamics } from "../features/statistics";

const joakoResult = computeJoakoStatisticalThermodynamics({
  observations,                   // Lista de observaciones de NASA IRSA SIA
  cachedCutouts: cachedCutoutsMap, // Mapa de recortes FITS descargados (opcional)
  epochACutout: cutoutA,          // Recorte de época 1 (opcional)
  epochBCutout: cutoutB,          // Recorte de época 2 (opcional)
  targetName,                     // Ej.: "WISE 0855", "Barnard's Star", "RW Aurigae"
  coordinates: { ra: lastCoords?.ra ?? 0, dec: lastCoords?.dec ?? 0 },
  strictLiveNasaOnly: false,
});
```

### Opción B — Función consolidada de las 6 salidas físicas (`analyzeTemporalAstrophysics`)
```ts
import { analyzeTemporalAstrophysics } from "../features/statistics";

const fullReport = analyzeTemporalAstrophysics({
  observations,
  cachedCutouts: cachedCutoutsMap,
  epochACutout: cutoutA,
  epochBCutout: cutoutB,
  targetName,
  coordinates: { ra: 133.795, dec: -7.245 },
});
```

### Opción C — Componente visual (`<TemporalStatsLab />`)
```tsx
import { TemporalStatsLab } from "../features/statistics";

<TemporalStatsLab
  observations={observations}
  cachedCutouts={cachedCutoutsMap}
  selectedObs={selectedObs}
  targetName={targetName}
  coordinates={{ ra: lastCoords?.ra ?? 0, dec: lastCoords?.dec ?? 0 }}
  subtractZodi={subtractZodi}
/>
```

---

## 2. Formulaciones implementadas

1. **Salida 1 — Co-adición por varianza mínima, estimador MVUE e intervalos de confianza (Joaquín — *Jay Devore, Caps. 5 a 8*)**:
   - Pesos estadísticos: $w_i = 1/\sigma_i^2$, $\quad I_{\text{coadd}} = \frac{\sum_{i=1}^{17} w_i I_i}{\sum_{i=1}^{17} w_i}$.
   - Ganancia de relación señal-ruido: $\text{SNR}_{\text{coadd}} = \sqrt{\sum_{i=1}^{17} \text{SNR}_i^2} \approx \sqrt{17}\,\text{SNR}_{\text{banda}} \approx 4.1231\times$ (reducción del $94.1\%$ en la varianza del fondo).
   - Intervalos de confianza al $95\%$ ($z=1.96$) y $99\%$ ($z=2.576$), y cálculo de potencia estadística ($1 - \beta$).

2. **Salida 2 — Imagen diferencia $D(x,y) = I_{t_2} - I_{t_1}$, prueba $Z$-Score y clasificación Dipolo vs. Monopolo (Jonás — *Devore Cap. 8 y Kreyszig Cap. 24*)**:
   - Estimación robusta de ruido mediante mediana y desviación absoluta mediana ($\text{MAD} \times 1.4826$), enmascaramiento de píxeles contaminados (`HDU[2] FLAGS`) y sustracción de luz zodiacal (`HDU[4] ZODI`).
   - Clasifica firmas bipolares de objetos en movimiento (*WISE 0855*, *Barnard's Star*, *Epsilon Indi B*) frente a firmas monopolares de fuentes variables fijas (*RW Aurigae*, *R Draconis*).

3. **Salida 5 — Radiación de cuerpo negro, leyes de Planck, Wien y Stefan-Boltzmann (Joaquín — *Yunus A. Çengel & Michael A. Boles, 7.ª ed., Cap. 12*)**:
   - Integración numérica (regla de Simpson compuesta) de la distribución de Planck $E_{b\lambda}(\lambda, T)$ sobre los 6 detectores de SPHEREx (`D1` a `D6`) para obtener las fracciones de emisión por banda $F_{\lambda_1 \to \lambda_2}$.
   - Temperatura efectiva por Ley de Wien: $T_{\text{eff}} = 2897.77 / \lambda_{\max}\;[\text{K}]$.
   - Emitancia radiante total por Ley de Stefan-Boltzmann: $E_b = \sigma T_{\text{eff}}^4\;[\text{W/m}^2]$.
   - Índice de color infrarrojo: $\text{Color}_{\text{IR}} = -2.5\log_{10}(F_{\text{D6}}/F_{\text{D1}})$.
