# 📊🔥 CHRONO-SPHEREx — Módulo de Estadística (PyE), Patrones Multitemporales y Termodinámica (Sector A — Joaquín & Jonás)

> **Para**: Tomás Achával (Tomy) y el equipo de desarrollo principal.  
> **Estado**: 100% desacoplado, compilado con 0 errores y listo para ser llamado en **1 sola línea de código** desde `ViewerPanel.tsx` o `App.tsx`.  
> **Ubicación**: `src/features/statistics/`

---

## 🚀 1. Cómo Llamar la Función desde el Código Principal (Para Tomy)

Creamos **dos funciones puras** (sin efectos secundarios, listas para usarse donde Tomy prefiera) y **un componente visual completo**:

### Opción A — Llamar exclusivamente a la función de Joaquín (Estadística MVUE + Termodinámica de Çengel):
```ts
import { computeJoakoStatisticalThermodynamics } from "../features/statistics";

const joakoResult = computeJoakoStatisticalThermodynamics({
  observations,                   // Lista de observaciones de NASA IRSA SIA
  cachedCutouts: cachedCutoutsMap, // Map de recortes FITS descargados (opcional)
  epochACutout: cutoutA,          // Recorte Época 1 (opcional)
  epochBCutout: cutoutB,          // Recorte Época 2 (opcional)
  targetName,                     // Ej: "WISE 0855", "Barnard's Star", "RW Aurigae"
  coordinates: { ra: lastCoords?.ra ?? 0, dec: lastCoords?.dec ?? 0 },
  strictLiveNasaOnly: false,      // Si es true, aplica la Prueba del Desenchufe NASA estricta
});

// Qué te devuelve `joakoResult`:
// - joakoResult.coaddition: SNR_coadd (×4.123), Flujo MVUE, IC 95% y 99% (Devore Cap. 7), Potencia (1 - β) y curva n=1..17
// - joakoResult.thermodynamics: T_eff (Wien), E_b (Stefan-Boltzmann), Semáforo Térmico D6/D1, Fracciones F_(D1..D6) (Çengel Cap. 12) y Curva de Planck
// - joakoResult.hypothesisTest: Z-Score, p-valor bilateral, decisión H0/H1 y topología Dipolo vs. Monopolo
// - joakoResult.humanSummaryEs / humanSummaryEn: Explicación en criollo ("Factura de Luz" y "Moneda al Aire")
```

### Opción B — Llamar a la función maestra de las 6 Salidas de Obsidian (`analyzeTemporalAstrophysics`):
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

### Opción C — Montar el Laboratorio Interactivo Completo en 1 línea JSX (`<TemporalStatsLab />`):
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

## 🔬 2. Perfección Físico-Matemática según la Bóveda de Obsidian

1. **Salida 1 — Ganancia SNR por Co-adición, MVUE e Intervalos de Confianza (Joaquín — *Jay Devore Caps. 5, 6, 7 y 8*)**:
   - Pesos óptimos de varianza mínima: $w_i = 1/\sigma_i^2$, $\quad I_{\text{coadd}} = \frac{\sum_{i=1}^{17} w_i I_i}{\sum_{i=1}^{17} w_i}$.
   - Ganancia cuadrática: $\text{SNR}_{\text{coadd}} = \sqrt{\sum_{i=1}^{17} \text{SNR}_i^2} \approx \sqrt{17}\,\text{SNR}_{\text{banda}} \approx 4.1231\times$ ($+312.3\%$, reducción del $94.1\%$ en varianza $\sigma^2/17$).
   - Intervalos de Confianza del $95\%$ ($z=1.96$) y $99\%$ ($z=2.576$), más cálculo exacto de **Potencia Estadística ($1 - \beta$)** frente a Error Tipo II ($\beta$).

2. **Salida 2 — Matriz Diferencia $D(x,y) = I_{t_2} - I_{t_1}$, Prueba de Hipótesis $Z$-Score y Clasificador Dipolo vs. Monopolo (Jonás — *Devore Cap. 8 & Kreyszig Cap. 24*)**:
   - Estimación robusta de fondo mediante Mediana y $\text{MAD} \times 1.4826$, filtrado de rayos cósmicos (`HDU[2] FLAGS`) y resta de luz zodiacal (`HDU[4] ZODI`).
   - Distingue **Dipolos Móviles** (*WISE 0855*, *Barnard's Star*, *Epsilon Indi B*, *Planeta X*) de **Monopolos Variables Fijos** (*RW Aurigae*, *R Draconis*).

3. **Salida 5 — Termodinámica Radiativa de Cuerpo Negro, Ley de Planck, Wien, Stefan-Boltzmann y Semáforo Térmico (Joaquín — *Yunus A. Çengel & Michael A. Boles 7.ª ed., Cap. 12*)**:
   - **Ley de Planck** $E_{b\lambda}(\lambda, T)$ evaluada e integrada numéricamente (cuadratura de Simpson compuesta) sobre cada uno de los **6 detectores de SPHEREx (`D1` a `D6`)** para obtener las fracciones de radiación de banda $F_{\lambda_1 \to \lambda_2}$ (*Çengel Sección 12-2*).
   - **Ley de Desplazamiento de Wien**: $T_{\text{eff}} = 2897.77 / \lambda_{\max}\;[\text{K}]$ y conversión a $^\circ\text{C}$.
   - **Ley de Stefan-Boltzmann**: $E_b = \sigma T_{\text{eff}}^4\;[\text{W/m}^2]$ y su traducción a la **Analogía de la Factura de Luz** (focos LED de $10\,\text{W}$ por $\text{m}^2$).
   - **Semáforo Térmico SPHEREx**: $\text{Color}_{\text{IR}} = -2.5\log_{10}(F_{\text{D6}}/F_{\text{D1}})$.
