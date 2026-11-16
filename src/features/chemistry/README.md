# 🧪 CHRONO-SPHEREx — Módulo de Astroquímica e Infrarrojo

> **Para**: Tomás Achával y equipo de desarrollo frontend / astrofísica.  
> **Estado**: Módulo autocontenido, desacoplado y listo para revisión.  
> **Ubicación**: `src/features/chemistry/`  
> **Dependencias**: 0 dependencias externas adicionales (TypeScript nativo + React + Lucide Icons).

---

## 📌 1. ¿Por qué este módulo y qué resuelve?

En el desafío oficial de la NASA (**Planet X and SPHEREx**) y en la mentoría de **Aula Centauri**, se plantearon dos necesidades fundamentales:
1. **La Química como Factor Decisivo**: SPHEREx no es solo una cámara; es un **espectrofotómetro de todo el cielo en 102 bandas infrarrojas** ($0.75$ a $5.0\,\mu\text{m}$). Las firmas de absorción molecular ($H_2O$ hielo, $CH_4$, $CO_2$, $CO$, $NH_3$, PAHs) son la única forma de demostrar si un objeto es un cuerpo helado del sistema solar exterior (Planeta X / TNO), una enana marrón ultrafría (WISE 0855), o una estrella fría (Barnard's Star).
2. **El Caso de Estudio para Estudiantes e Investigadores**: Los estudiantes universitarios y profesores necesitan que la herramienta genere **conclusiones científicas formales y descargables** para tesis o trabajos prácticos, con citas APA 7.ª edición.

---

## 🔬 2. Fórmulas Físico-Matemáticas Implementadas

Todo el cómputo de `src/features/chemistry/engine.ts` sigue libros de texto universitarios:

### A. Ley de Beer-Lambert y Profundidad Óptica ($\tau$)
$$\tau(\lambda) = \ln\left(\frac{F_{\text{continuo}}(\lambda)}{F_{\text{observado}}(\lambda)}\right)$$
$$\text{Profundidad Relativa de Absorción } D = \left(1 - \frac{F_{\text{observado}}}{F_{\text{continuo}}}\right) \times 100\%$$
*Referencia: Chang, R. (2010). Chemistry (10th ed.), Cap. 11.*

### B. Detección y Significancia Estadística ($SNR$)
Siguiendo la formulación de hipótesis estadísticas y error estándar de **Jay Devore** (*Probability and Statistics for Engineering and the Sciences*, 9.ª ed.):
- $SNR \ge 5\sigma$: Detección Confirmada / Alta Confianza.
- $3\sigma \le SNR < 5\sigma$: Detección Moderada.
- $2\sigma \le SNR < 3\sigma$: Detección Tentativa.
- $SNR < 2\sigma$: Límite Superior (No concluyente).

### C. Termodinámica Radiativa de Cuerpo Negro
- **Ley de Desplazamiento de Wien**:
  $$T_{\text{eff}} = \frac{2897.77\,\mu\text{m}\cdot\text{K}}{\lambda_{\text{pico}}}$$
- **Ley de Stefan-Boltzmann (Emitancia Total)**:
  $$j^* = \sigma T_{\text{eff}}^4 \quad \left(\sigma = 5.670374 \times 10^{-8}\,\frac{\text{W}}{\text{m}^2\cdot\text{K}^4}\right)$$
*Referencia: Sears, F. W., & Zemansky, M. W. (2013). University Physics with Modern Physics, Cap. 18.*

### D. Termómetro Termoquímico de Desequilibrio ($CH_4 / CO$)
En atmósferas frías en equilibrio ($T < 1000\,\text{K}$), el carbono se reduce a metano:
$$\text{CO} + 3\text{H}_2 \rightleftharpoons \text{CH}_4 + \text{H}_2\text{O}$$
Si la relación $CH_4 / CO \gg 1$, el cuerpo está en régimen reductor frío. Si se detecta exceso de $CO$ a baja temperatura, indica **mezcla vertical vigorosa (convección profunda)**.

---

## 📂 3. Estructura de Archivos del Módulo

```text
src/features/chemistry/
├── types.ts              # Interfaces formales de moléculas, bandas, detecciones y perfiles
├── constants.ts          # Constantes físicas CODATA y catálogo de 8 bandas moleculares NIST/HITRAN
├── engine.ts             # Motor de cálculo continuo, tau, SNR, Wien y generador de reporte Markdown
├── AstroChemistryLab.tsx # Componente UI Apple-grade con tarjetas interactivas y modal de reporte
├── index.ts              # Barrel export para importación limpia en 1 sola línea
└── README.md             # Esta documentación técnica
```

---

## 🛠️ 4. Cómo Probarlo o Integrarlo en el Código Principal

El módulo está diseñado para montarse con **solo 2 líneas de código** en `ViewerPanel.tsx` o en cualquier otro componente:

```tsx
import { AstroChemistryLab } from "../features/chemistry";

// Dentro de tu render condicional de pestañas en Mapa 2:
{secondMapTab === "chemistry" && (
  <AstroChemistryLab
    measuredPoints={measuredChemistryPoints}
    targetName={targetName}
    coordinates={{ ra: lastCoords?.ra ?? 0, dec: lastCoords?.dec ?? 0 }}
  />
)}
```

Si el equipo decide no incluirlo en el lanzamiento principal o moverlo de lugar, **basta con remover el botón o la pestaña**, ya que no modifica ningún archivo del core de renderizado FITS o HiPS.
