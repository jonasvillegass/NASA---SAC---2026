# Módulo de astroquímica e infrarrojo

- **Ubicación**: `src/features/chemistry/`
- **Estado**: Módulo desacoplado en TypeScript y React (sin dependencias externas adicionales).

---

## 1. Propósito del módulo

Este módulo analiza las curvas espectrales de 102 bandas de SPHEREx ($0.75$ a $5.0\,\mu\text{m}$) para identificar bandas de absorción molecular ($\text{H}_2\text{O}$, $\text{CH}_4$, $\text{CO}_2$, $\text{CO}$, $\text{NH}_3$, PAHs) y exportar un resumen técnico con referencias en formato APA 7.ª edición.

---

## 2. Ecuaciones implementadas (`src/features/chemistry/engine.ts`)

### A. Ley de Beer-Lambert y profundidad óptica ($\tau$)
$$\tau(\lambda) = \ln\left(\frac{F_{\text{continuo}}(\lambda)}{F_{\text{observado}}(\lambda)}\right)$$
$$D = \left(1 - \frac{F_{\text{observado}}}{F_{\text{continuo}}}\right) \times 100\%$$
*Referencia: Chang, R., & Goldsby, K. A. (2016). Química (12.ª ed.), Cap. 11.*

### B. Significancia estadística de absorción ($\text{SNR}$)
Siguiendo los criterios de prueba de hipótesis de Jay Devore (*Probabilidad y Estadística para Ingeniería y Ciencias*, 9.ª ed.):
- $\text{SNR} \ge 5\sigma$: Detección confirmada.
- $3\sigma \le \text{SNR} < 5\sigma$: Detección moderada.
- $2\sigma \le \text{SNR} < 3\sigma$: Detección tentativa.
- $\text{SNR} < 2\sigma$: No concluyente (ruido de fondo).

### C. Termodinámica radiativa de cuerpo negro
- **Ley de desplazamiento de Wien**:
  $$T_{\text{eff}} = \frac{2897.77\,\mu\text{m}\cdot\text{K}}{\lambda_{\text{pico}}}$$
- **Ley de Stefan-Boltzmann**:
  $$E_b = \sigma T_{\text{eff}}^4 \quad \left(\sigma = 5.670374 \times 10^{-8}\,\frac{\text{W}}{\text{m}^2\cdot\text{K}^4}\right)$$
*Referencia: Young, H. D., & Freedman, R. A. (2018). Física Universitaria (14.ª ed.).*

### D. Equilibrio termoquímico $\text{CH}_4 / \text{CO}$
En atmósferas subestelares frías ($T < 1000\,\text{K}$), el equilibrio favorece la reducción hacia metano:
$$\text{CO} + 3\text{H}_2 \rightleftharpoons \text{CH}_4 + \text{H}_2\text{O}$$
La relación entre las bandas de $3.30\,\mu\text{m}$ ($\text{CH}_4$) y $4.67\,\mu\text{m}$ ($\text{CO}$) permite distinguir regímenes reductores fríos de atmósferas con mezcla vertical.

---

## 3. Estructura de archivos

```text
src/features/chemistry/
├── types.ts              # Tipos de datos para moléculas, bandas y perfiles espectrales
├── constants.ts          # Constantes físicas y catálogo de bandas moleculares
├── engine.ts             # Cálculo de continuo, profundidad óptica, SNR y temperatura de Wien
├── AstroChemistryLab.tsx # Componente React de visualización y exportación de informe
├── index.ts              # Punto de exportación del módulo
└── README.md             # Documentación técnica
```

---

## 4. Integración en la interfaz

```tsx
import { AstroChemistryLab } from "../features/chemistry";

{secondMapTab === "chemistry" && (
  <AstroChemistryLab
    measuredPoints={measuredChemistryPoints}
    targetName={targetName}
    coordinates={{ ra: lastCoords?.ra ?? 0, dec: lastCoords?.dec ?? 0 }}
  />
)}
```
