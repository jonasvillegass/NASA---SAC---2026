# Informe Técnico del Proyecto: CHRONO-SPHEREx

**Desafío:** NASA Space Apps Challenge 2026 — *Planet X and SPHEREx*  
**Equipo:** Ley de Conservación del Mate  
**Integrantes:** Jonás Villegas · Tomás Achával Vinuesa · Joaquín Renzo Barrionuevo · Facundo Bazán · Uriel Domínguez · Jeremías Ismael Nolte Barrios  
**Repositorio público:** `https://github.com/jonasvillegass/NASA---SAC---2026`

---

## 1. Resumen Ejecutivo

**CHRONO-SPHEREx** es una plataforma web interactiva diseñada para explorar los datos reales del telescopio espacial infrarrojo **NASA SPHEREx** (*Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer*), utilizando exclusivamente la colección oficial **`spherex_dr1`** servida por **NASA/IPAC IRSA** (`SIA` + `IBE Cutouts`).

El objetivo del proyecto es democratizar la búsqueda de objetos tenues de alto movimiento propio —como enanas marrones gélidas tipo Y, asteroides cercanos o un eventual **Planeta X**— combinando:
1. Consulta directa por coordenadas celestes (**RA / Dec** en formato decimal o sexagesimal `HMS/DMS`) y **Zoom / Campo de Visión (FoV)** configurable (`0.02°` a `1.0°`).
2. Procesamiento FITS real con sustracción opcional de **luz zodiacal** (extensión `ZODI`), funciones de estiramiento (`asinh`, `log`, `sqrt`, `linear`) y paletas científicas.
3. Un motor cuantitativo de **6 salidas físicas y matemáticas** fundamentado en bibliografía universitaria formal y contrastado con fuentes oficiales de la NASA.

### 1.1 Problema Real, Proto-Usuario, Alcance (48 hs) y Escalabilidad
* **El Dolor Común:** Los datos públicos de la NASA (`spherex_dr1`) vienen en archivos `.fits` científicos imposibles de abrir o interpretar sin saber programar en Python (`astropy`). La gente común, los estudiantes y los docentes quedan excluidos de explorar el cielo real.
* **La Solución:** Un *"Google Maps del cielo infrarrojo"* sin instalación ni código, con dos modos sobre los mismos datos reales de `spherex_dr1`:
  * **Modo Explorador (Idioma Niño / Secundario):** traduce la física a lenguaje cotidiano (*Brújula Espacial*, *Lupa Espacial / Zoom*, *Limpiar el polvo espacial* para `ZODI`, *Juego de las 2 diferencias* para movimiento, *Termómetro Cósmico* en °C).
  * **Modo Científico (Universitario):** expone las 6 salidas físico-matemáticas, ecuaciones formales y descarga del archivo `.fits` calibrado.
* **Proto-Usuario Principal:** **"Lucía" (16 años)**, estudiante de secundario / club de astronomía que no programa ni abre `.fits`, buscando explorar datos reales en 3 pasos (elegir misión lista → hacer Zoom/limpiar neblina → entender y compartir el link).
* **Multiplicador de Impacto:** **"Profe Diego" (35 años)**, docente de Física (secundario / 1.º año universitario) que lleva datos reales de la NASA al aula en 5 minutos (impacto de 30–100 estudiantes por curso).
* **Alcance 48 hs vs. Escalabilidad:** El MVP de 48 hs entrega consulta real a `spherex_dr1`, Zoom/FoV, resta `ZODI`, comparador temporal (*Blink*), URL compartible y ficha física. Al consultar directo a IRSA sin almacenar terabytes locales, escala naturalmente a todo el cielo, aulas masivas y revisión colaborativa ciudadana.

---

## 2. Organización del Equipo y Roles

| Área | Integrantes | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Programación y Backend/API** | Tomás Achával Vinuesa | Consultas a IRSA SIA (`spherex_dr1`), recortes IBE, manejo de estado en URL y lógica de visualización |
| **Diseño Visual, UX y Zoom** | Facundo Bazán, Uriel Domínguez | Interfaz del visor espectral, controles de Zoom/FoV, paletas de flujo y experiencia de usuario |
| **Física, Termodinámica y Matemática** | Jonás Villegas, Jeremías Nolte, Joaquín Barrionuevo | Modelado de las 6 salidas cuantitativas: $\text{SNR}_{\text{coadd}}$, $Z$-score, movimiento propio, paralaje, termodinámica radiativa ($T_{\text{eff}}$) y espectroscopía molecular |

---

## 3. Arquitectura Técnica y Datos Oficiales

* **Frontend y Backend Unificado:** Next.js (App Router) + TypeScript + Node.js.
* **Ingesta de Datos Oficiales (`spherex_dr1`):**
  * **Búsqueda de exposiciones:** `GET /api/search` → consulta `https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex_dr1&POS=circle {RA} {Dec} {radius}`.
  * **Recortes FITS reales y Zoom:** `GET /api/cutout` → solicita recortes calibrados a IRSA IBE mediante `?center={RA},{Dec}d&size={size}` (`0.02° <= size <= 1.0°`), preservando las extensiones científicas del archivo FITS (`IMAGE`, `FLAGS`, `VARIANCE`, `ZODI`).
* **Referencia de Diseño:** Inspirado en **WiseView** (`http://byw.tools/wiseview`), recomendado oficialmente por NASA Space Apps para inspección multi-época (*blink*), comparación temporal y detección de dipolos.

---

## 4. Las 6 Salidas Físicas y Matemáticas del Sistema

1. **Ganancia Señal-Ruido por Co-adición ($\text{SNR}_{\text{coadd}}$)** *(Responsable: Joaquín)*  
   Combinación lineal de varianza mínima ($w_i = 1/\sigma_i^2$) sobre las $N = 17$ bandas por detector:
   $$\text{SNR}_{\text{coadd}} = \sqrt{\sum_{i=1}^{17} \text{SNR}_i^2} \approx 4.123 \times \text{SNR}_{\text{banda}}$$
2. **Detección por Imagen Diferencia y $Z$-Score** *(Responsable: Jonás)*  
   Resta entre épocas ($D = I_2 - I_1$) normalizada por $\sigma_D = \sqrt{\sigma_1^2 + \sigma_2^2}$:
   $$Z(x,y) = \frac{D(x,y) - \mu_D}{\sigma_D}$$
   Distingue **dipolos** ($+Z$ contiguo a $-Z$, movimiento real) de **monopolos** (variabilidad intrínseca).
3. **Vector de Movimiento Propio ($\mu_\alpha^*, \mu_\delta, \mu, \theta$)** *(Responsable: Jeremías)*  
   Cálculo astrométrico a partir de desplazamiento angular y escala de placa de SPHEREx ($6.2''/\text{píxel}$):
   $$\mu = \sqrt{(\mu_\alpha^*)^2 + (\mu_\delta)^2}, \qquad \theta = \text{atan2}(\mu_\alpha^*, \mu_\delta)$$
4. **Paralaje Trigonométrica, Distancia y Velocidad Tangencial ($p, d, v_t$)** *(Responsable: Jeremías)*  
   $$d = \frac{1}{p}\ [\text{pc}], \qquad d_{\text{ly}} = 3.2616 \cdot d, \qquad v_t = 4.74 \cdot \mu \cdot d\ [\text{km/s}]$$
5. **Temperatura Efectiva y Radiación Térmica ($T_{\text{eff}}, E_b$)** *(Responsable: Joaquín)*  
   Fundamentado en **Termodinámica (Çengel & Boles, 7.ª ed.)** y radiación de cuerpo negro:
   $$T_{\text{eff}} = \frac{2898\,\mu\text{m}\cdot\text{K}}{\lambda_{\max}}, \qquad E_b(T_{\text{eff}}) = \sigma T_{\text{eff}}^4, \qquad \text{Color}_{\text{SPHEREx}} = -2.5\log_{10}\left(\frac{F_{\text{D6}}}{F_{\text{D1}}}\right)$$
6. **Curva Espectral Continua y Huella Molecular ($F_\lambda, A_{\text{mol}}$)** *(Responsable: Jonás)*  
   Extracción de flujo en las 102 bandas ($0.75\text{–}5.0\,\mu\text{m}$) y cálculo de absorción relativa $A_{\text{mol}} = 1 - F(\lambda_{\text{abs}})/F_{\text{cont}}$ para $\text{CH}_4$, $\text{H}_2\text{O}$, $\text{CO}_2$ y $\text{CO}$.

---

## 5. Targets de Validación Científica

* **WISE J085510.83−071442.5:** Enana marrón tipo Y ($\approx 250\,\text{K}$, $\mu \approx 8.12''/\text{año}$, $d \approx 7.53\text{ ly}$) para validar $T_{\text{eff}}$, absorción de $\text{CH}_4/\text{H}_2\text{O}$ y detección dipolar.
* **Estrella de Barnard:** Validación astrométrica de alto movimiento propio ($\mu \approx 10.39''/\text{año}$).
* **Epsilon Indi Ba/Bb:** Prueba de resolución espacial y ajuste de **Zoom / FoV**.
* **RW Aurigae y R Draconis:** Control negativo de movimiento propio (estrellas variables que producen monopolos y no dipolos).

---

## 6. Bibliografía y Trazabilidad

El registro completo de fuentes oficiales NASA/IRSA y libros académicos (incluyendo *Termodinámica* de Çengel & Boles 7.ª ed., *Probabilidad y Estadística* de Devore, *Matemáticas Avanzadas* de Kreyszig, *Física Universitaria* de Sears-Zemansky, *Serway-Jewett*, *Resnick-Halliday*, *Stewart* y *Química* de Chang & Goldsby) se encuentra documentado en [`REFERENCES.md`](./REFERENCES.md).
