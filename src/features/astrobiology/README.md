# Módulo probabilístico de astrobiología, química prebiótica (CHNOPS) y habitabilidad

- **Ubicación**: `src/features/astrobiology/`
- **Estado**: Módulo desacoplado conectado con `src/lib/spectralAnalysis.ts` y `src/features/statistics/joakoEngine.ts`.

---

## 1. Integración desde el código principal

### Opción A — Función de evaluación (`evaluateProbabilisticAstrobiology`)
```ts
import { evaluateProbabilisticAstrobiology } from "../features/astrobiology";

const astroBioReport = evaluateProbabilisticAstrobiology({
  observations,
  cachedCutouts: cachedCutoutsMap,
  roi: selectedRoi,
  roiAnalysis,
  targetName: resolvedObject?.canonicalName ?? targetName ?? "Target",
  coordinates: { ra: targetRa ?? 0, dec: targetDec ?? 0 },
});
```

### Opción B — Componente visual (`<AstrobiologyLab />`)
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

## 2. Modelo matemático y criterios de evaluación

El módulo evalúa compatibilidad prebiótica y térmica expresando siempre los resultados como probabilidades condicionales e intervalos de confianza, sin emitir afirmaciones deterministas:

1. **Inferencia bayesiana sobre tres hipótesis mutuamente excluyentes (*Jay Devore, Cap. 2.4*)**:
   - $P(H_1 \mid E)$: Hipótesis nula abiótica (equilibrio termoquímico inerte).
   - $P(H_2 \mid E)$: Reservorio prebiótico de hielos e hidrocarburos CHNOPS ($\text{H}_2\text{O}, \text{CH}_3\text{OH}, \text{OCN}^-, \text{NH}_3, \text{PAHs}, \text{CH}_4$).
   - $P(H_3 \mid E)$: Desequilibrio termoquímico atmosférico ($\text{CH}_4/\text{NH}_3 + \text{CO}_2/\text{H}_2\text{O}$).
   - Calcula intervalos de confianza al $95\%$, factores de Bayes ($K_{21}, K_{31}$) y probabilidades de error tipo I ($\alpha$) y tipo II ($\beta$).

2. **Parámetros físico-químicos evaluados**:
   - **Absorción de agua**: Bandas de $\text{H}_2\text{O}$ en $2.02$ y $3.05\,\mu\text{m}$ mediante Ley de Beer-Lambert (*Chang, Cap. 11*).
   - **Compuestos orgánicos y volátiles**: Metanol ($\text{CH}_3\text{OH}$), cianato ($\text{OCN}^-$), amoníaco ($\text{NH}_3$) y PAHs (*Chang, Cap. 24*).
   - **Desequilibrio redox**: Coexistencia de especies reducidas y oxidadas (*Chang, Caps. 15 y 18*).
   - **Régimen térmico y descenso crioscópico**: Temperatura efectiva de Wien ($T_{\text{eff}}$), emitancia de Stefan-Boltzmann ($E_b$) y depresión del punto de congelación en mezclas agua-amoníaco ($\Delta T_f = K_f \cdot m_{\text{NH}_3}$, *Çengel Cap. 12 y Chang Cap. 12*).
   - **Calidad estadística de la muestra**: Ganancia de relación señal-ruido por co-adición ($\text{SNR}_{\text{coadd}} \approx 4.123\times$, *Devore Caps. 5–8*).
