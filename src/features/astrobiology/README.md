# 🧬🪐 CHRONO-SPHEREx — Módulo Probabilístico de Astrobiología, Química Prebiótica (CHNOPS) y Habitabilidad

> **Para**: Tomás Achával (Tomy) y el equipo de desarrollo principal.  
> **Estado**: 100% desacoplado, conectado con `src/lib/spectralAnalysis.ts` de Tomy y `src/features/statistics/joakoEngine.ts` de Joaquín y Jonás.  
> **Ubicación**: `src/features/astrobiology/`

---

## 🚀 1. Cómo Llamar la Función o el Componente en 1 Sola Línea (Para Tomy)

### Opción A — Función Pura (`evaluateProbabilisticAstrobiology`):
```ts
import { evaluateProbabilisticAstrobiology } from "../features/astrobiology";

const astroBioReport = evaluateProbabilisticAstrobiology({
  observations,
  cachedCutouts: cachedCutoutsMap,
  roi: selectedRoi,       // Opcional: ROI seleccionado por el usuario en Mapa 2
  roiAnalysis,            // Opcional: resultado directo de analyzeRoiChemistry() de Tomy
  targetName: resolvedObject?.canonicalName ?? targetName ?? "Target",
  coordinates: { ra: targetRa ?? 0, dec: targetDec ?? 0 },
});
```

### Opción B — Componente Visual Interactivo (`<AstrobiologyLab />`):
```tsx
import { AstrobiologyLab } from "../features/astrobiology";

<AstrobiologyLab
  observations={observations}
  cachedCutouts={cachedCutoutsMap}
  roi={selectedRoi}
  roiAnalysis={roiAnalysis}
  targetName={resolvedObject?.canonicalName ?? targetName ?? "Target"}
  coordinates={{ ra: targetRa ?? 0, dec: targetDec ?? 0 }}
/>
```

---

## 🔬 2. Rigor Científico: Siempre Probabilidades Condicionales (Nunca Afirmaciones Binarias)

1. **Inferencia Bayesiana Tripartita (*Jay Devore Cap. 2.4 & Catling et al., 2018 — NASA Astrobiology*)**:
   - $P(H_1 \mid E)$: **Hipótesis Nula Abiótica** (Equilibrio termoquímico inerte).
   - $P(H_2 \mid E)$: **Reservorio Prebiótico Activo CHNOPS** (Tema 3 de NASA SPHEREx: Hielos Galácticos de $\text{H}_2\text{O}, \text{CH}_3\text{OH}, \text{OCN}^-, \text{NH}_3, \text{PAHs}, \text{CH}_4$).
   - $P(H_3 \mid E)$: **Nicho Habitable / Anomalía por Desequilibrio Redox** ($\text{CH}_4/\text{NH}_3 + \text{CO}_2/\text{H}_2\text{O}$).
   - Reporta intervalos de confianza al $95\%$ ($\pm \Delta P_{95\%}$), Factores de Bayes ($K_{21}, K_{31}$), Riesgo de Falso Positivo Abiótico ($\alpha$) y Riesgo de Señal Omitida ($\beta$).

2. **Los 5 Pilares Físico-Químicos y Estadísticos Validados**:
   - **Pilar 1**: Solvente Hidrológico ($\text{H}_2\text{O}$ en $2.02$ y $3.05\,\mu\text{m}$ — *Chang Cap. 11: Ley de Beer-Lambert*).
   - **Pilar 2**: Inventario Prebiótico CHNOPS ($\text{CH}_3\text{OH}$ metanol, $\text{OCN}^-$ cianato, $\text{NH}_3$, $\text{PAHs}$ — *Chang Cap. 24 & SPHEREx Theme 3*).
   - **Pilar 3**: Desequilibrio Termoquímico Redox ($\Omega_{\text{redox}}$ — *Chang Caps. 15 y 18: Equilibrio Químico y Energía Libre de Gibbs*).
   - **Pilar 4**: Compatibilidad Termodinámica y Descenso Crioscópico Eutéctico ($T_{\text{eff}}$ de Wien, $E_b$ de Stefan-Boltzmann y $\Delta T_f = K_f \cdot m_{\text{NH}_3}$ que permite agua líquida eutéctica hasta $176\,\text{K}$ / $-97\,^\circ\text{C}$ — *Yunus Çengel Cap. 12 & Raymond Chang Cap. 12*).
   - **Pilar 5**: Rigor Estadístico MVUE y Cobertura Instrumental ($\text{SNR}_{\text{coadd}} \approx 4.123\times$ y Potencia $1 - \beta$ — *Jay Devore Caps. 5–8*).
