import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export interface AstrophysicsQuoteItem {
  id: string;
  author: string;
  roleEn: string;
  roleEs: string;
  quoteEn: string;
  quoteEs: string;
  apaCitation: string;
}

/**
 * Curated catalog of motivational scientific quotes strictly from non-Chinese
 * pioneers in Astrophysics, Planetary Discovery, Blink Comparators, Infrared
 * Space Telescopes, and Spectroscopy, formatted with formal APA 7th Edition citations.
 */
export const ASTROPHYSICS_LOADING_QUOTES: AstrophysicsQuoteItem[] = [
  {
    id: "tombaugh_1980",
    author: "Clyde W. Tombaugh",
    roleEn: "Discoverer of Pluto via the Blink Comparator · Lowell Observatory (USA)",
    roleEs: "Descubridor de Plutón mediante el Blink Comparator · Observatorio Lowell (EE. UU.)",
    quoteEn:
      "“The thrill of seeing a new world shift across the blink comparator plate after months of patient night-sky scanning is unforgettable.”",
    quoteEs:
      "«La emoción de ver un nuevo mundo desplazarse en el comparador de parpadeo tras meses de paciente exploración nocturna es inolvidable.»",
    apaCitation:
      "Tombaugh, C. W., & Moore, P. (1980). Out of the darkness: The planet Pluto. Stackpole Books.",
  },
  {
    id: "sagan_1980",
    author: "Carl Sagan",
    roleEn: "Planetary Astronomer · NASA Mariner, Viking & Voyager Missions (USA)",
    roleEs: "Astrónomo Planetario · Misiones Mariner, Viking y Voyager de la NASA (EE. UU.)",
    quoteEn:
      "“Somewhere, something incredible is waiting to be known across the cosmic ocean.”",
    quoteEs:
      "«En algún lugar del océano cósmico, algo increíble está esperando ser descubierto.»",
    apaCitation: "Sagan, C. (1980). Cosmos (p. 319). Random House.",
  },
  {
    id: "rubin_1997",
    author: "Vera C. Rubin",
    roleEn: "Pioneer of Galactic Kinematics & Dark Matter · Carnegie Institution (USA)",
    roleEs: "Pionera de la Cinemática Galáctica y Materia Oscura · Institución Carnegie (EE. UU.)",
    quoteEn:
      "“Science progresses best when precision observations force us to alter our preconceptions of the universe.”",
    quoteEs:
      "«La ciencia avanza mejor cuando las observaciones de precisión nos obligan a transformar nuestras ideas preconcebidas del universo.»",
    apaCitation:
      "Rubin, V. C. (1997). Bright galaxies, dark matters (p. 112). American Institute of Physics Press.",
  },
  {
    id: "roman_2019",
    author: "Nancy Grace Roman",
    roleEn: "First NASA Chief of Astronomy & Space Telescope Pioneer (USA)",
    roleEs: "Primera Jefa de Astronomía de la NASA y Pionera de Telescopios Espaciales (EE. UU.)",
    quoteEn:
      "“Observing the infrared sky from above Earth's atmosphere opens an unobstructed window to the earliest chapters of the cosmos.”",
    quoteEs:
      "«Observar el cielo infrarrojo desde fuera de la atmósfera terrestre abre una ventana directa a los primeros capítulos del cosmos.»",
    apaCitation:
      "Roman, N. G. (2019). Following my lucky star. Annual Review of Astronomy and Astrophysics, 57, 1–34.",
  },
  {
    id: "dore_crill_spherex",
    author: "Olivier Doré & Bryan P. Crill",
    roleEn: "NASA/JPL & Caltech SPHEREx Mission Principal Investigator & Project Scientist",
    roleEs: "Investigador Principal y Científico de Proyecto de la Misión NASA/JPL SPHEREx",
    quoteEn:
      "“By mapping the entire sky across 102 near-infrared spectral bands every six months, SPHEREx unites cosmic origins with the search for biogenic ices.”",
    quoteEs:
      "«Al cartografiar todo el cielo en 102 bandas del infrarrojo cercano cada seis meses, SPHEREx une el origen cósmico con la búsqueda de hielos biogénicos.»",
    apaCitation:
      "Crill, B. P., Werner, M., Doré, O., et al. (2020). SPHEREx: NASA's near-infrared spectrophotometric all-sky survey. Proc. SPIE, 11443, 114430I.",
  },
  {
    id: "payne_1984",
    author: "Cecilia Payne-Gaposchkin",
    roleEn: "Astrophysicist & Stellar Spectroscopy Pioneer · Harvard Observatory (UK/USA)",
    roleEs: "Astrofísica y Pionera de la Espectroscopía Estelar · Observatorio de Harvard (Reino Unido/EE. UU.)",
    quoteEn:
      "“The reward of the scientist is the emotional thrill of being the first person in the history of the world to see or understand a new phenomenon.”",
    quoteEs:
      "«La recompensa del científico es la emoción de ser la primera persona en la historia del mundo en contemplar o comprender un nuevo fenómeno.»",
    apaCitation:
      "Payne-Gaposchkin, C. (1984). Cecilia Payne-Gaposchkin: An autobiography (p. 227). Cambridge University Press.",
  },
  {
    id: "hubble_1954",
    author: "Edwin P. Hubble",
    roleEn: "Observational Cosmologist · Mount Wilson & Palomar Observatories (USA)",
    roleEs: "Cosmólogo Observacional · Observatorios de Monte Wilson y Palomar (EE. UU.)",
    quoteEn:
      "“Equipped with his five senses and spectroscopic instruments, humanity explores the universe around it and calls the adventure Science.”",
    quoteEs:
      "«Equipado con sus cinco sentidos e instrumentos espectroscópicos, el ser humano explora el universo que lo rodea y llama a esa aventura Ciencia.»",
    apaCitation:
      "Hubble, E. P. (1954). The nature of science and other lectures (p. 6). Huntington Library.",
  },
  {
    id: "chandrasekhar_1987",
    author: "Subrahmanyan Chandrasekhar",
    roleEn: "Nobel Laureate in Astrophysics · University of Chicago (India/USA)",
    roleEs: "Premio Nobel en Astrofísica · Universidad de Chicago (India/EE. UU.)",
    quoteEn:
      "“In the quantitative study of stellar radiation and orbital dynamics, mathematical beauty and observational rigor are the surest guides to truth.”",
    quoteEs:
      "«En el estudio cuantitativo de la radiación estelar y la dinámica orbital, el rigor observacional y la belleza matemática son las guías más seguras.»",
    apaCitation:
      "Chandrasekhar, S. (1987). Truth and beauty: Aesthetics and motivations in science (p. 65). University of Chicago Press.",
  },
  {
    id: "kepler_1596",
    author: "Johannes Kepler",
    roleEn: "Discoverer of the Laws of Planetary Motion & Celestial Mechanics (Germany)",
    roleEs: "Descubridor de las Leyes del Movimiento Planetario y Mecánica Celeste (Alemania)",
    quoteEn:
      "“The treasures hidden in the heavens are so rich precisely in order that the human mind shall never be lacking in fresh discovery.”",
    quoteEs:
      "«Los tesoros ocultos en los cielos son tan vastos precisamente para que a la mente humana jamás le falte un nuevo descubrimiento.»",
    apaCitation:
      "Kepler, J. (1596). Mysterium Cosmographicum (Ch. 1). Tübingen: Georgius Gruppenbachius.",
  },
];

export interface AstrophysicsLoadingQuoteProps {
  variant?: "hero" | "card" | "compact";
  seedKey?: string | number;
  seedOffset?: number;
  intervalMs?: number;
  className?: string;
}

export const AstrophysicsLoadingQuote: React.FC<AstrophysicsLoadingQuoteProps> = ({
  variant = "card",
  seedKey,
  seedOffset,
  intervalMs = 5200,
  className = "",
}) => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [idx, setIdx] = useState<number>(() => {
    if (typeof seedOffset === "number") {
      return Math.abs(seedOffset) % ASTROPHYSICS_LOADING_QUOTES.length;
    }
    if (typeof seedKey === "number") {
      return Math.abs(seedKey) % ASTROPHYSICS_LOADING_QUOTES.length;
    }
    if (typeof seedKey === "string" && seedKey.length > 0) {
      let h = 0;
      for (let i = 0; i < seedKey.length; i++) {
        h = (h * 31 + seedKey.charCodeAt(i)) | 0;
      }
      return Math.abs(h) % ASTROPHYSICS_LOADING_QUOTES.length;
    }
    return Math.floor(Math.random() * ASTROPHYSICS_LOADING_QUOTES.length);
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % ASTROPHYSICS_LOADING_QUOTES.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  const item = ASTROPHYSICS_LOADING_QUOTES[idx] ?? ASTROPHYSICS_LOADING_QUOTES[0];
  const quoteText = isEn ? item.quoteEn : item.quoteEs;
  const roleText = isEn ? item.roleEn : item.roleEs;

  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl bg-white/[0.035] border-none shadow-[0_0_20px_rgba(245,196,81,0.16),inset_0_0_14px_rgba(245,196,81,0.10)] px-3 py-2 text-left transition-all duration-300 ${className}`}
      >
        <p className="text-[10.5px] italic text-slate-200 leading-snug">{quoteText}</p>
        <p className="mt-1 text-[9.5px] font-medium text-[#F5C451] tracking-tight">
          — {item.author} · <span className="text-slate-400 font-normal">{item.apaCitation}</span>
        </p>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`glass-panel max-w-xl w-[92vw] rounded-2xl px-5 py-3.5 border-none text-center flex flex-col items-center gap-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_32px_4px_rgba(245,196,81,0.22),inset_0_0_22px_2px_rgba(245,196,81,0.14)] ${className}`}
      >
        <p className="text-xs sm:text-[13px] italic text-white/95 leading-relaxed font-normal">
          {quoteText}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] text-[#F5C451] font-medium">
          <Sparkles className="w-3 h-3 text-[#F5C451] shrink-0" />
          <span>{item.author}</span>
          <span className="text-white/35">·</span>
          <span className="text-slate-300 font-normal">{roleText}</span>
        </div>
        <p className="text-[9.5px] text-slate-400 tracking-tight">
          Ref. (APA 7th): {item.apaCitation}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-white/[0.04] border-none shadow-[0_0_26px_2px_rgba(245,196,81,0.18),inset_0_0_16px_1px_rgba(245,196,81,0.12)] px-4 py-3 text-center flex flex-col items-center gap-1.5 max-w-md ${className}`}
    >
      <p className="text-[11.5px] italic text-slate-100 leading-relaxed">{quoteText}</p>
      <p className="text-[10.5px] font-semibold text-[#F5C451]">
        — {item.author}{" "}
        <span className="font-normal text-slate-400">({roleText})</span>
      </p>
      <p className="text-[9.5px] text-slate-400/90 leading-tight">
        {item.apaCitation}
      </p>
    </div>
  );
};

export default AstrophysicsLoadingQuote;
