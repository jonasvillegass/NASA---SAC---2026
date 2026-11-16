import React from "react";
import { AstrophysicsLoadingQuote } from "./AstrophysicsLoadingQuote";

export const AstroExploreBrandMark: React.FC<{
  className?: string;
  glow?: boolean;
}> = ({ className = "w-8 h-8", glow = true }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="aeSphereGrad" x1="10%" y1="5%" x2="90%" y2="95%">
        <stop offset="0%" stopColor="#FFF6D6" stopOpacity="0.98" />
        <stop offset="50%" stopColor="#F5C451" stopOpacity="0.96" />
        <stop offset="100%" stopColor="#D99B26" stopOpacity="0.75" />
      </linearGradient>
      <linearGradient id="aeOrbitSweep" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#D99B26" stopOpacity="0.35" />
        <stop offset="48%" stopColor="#F5C451" stopOpacity="1" />
        <stop offset="100%" stopColor="#FFF8E1" stopOpacity="1" />
      </linearGradient>
      {glow && (
        <filter id="aeBrandGlow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
    </defs>

    <g filter={glow ? "url(#aeBrandGlow)" : undefined}>
      <path
        d="M 46.5 13.2 A 22 22 0 1 0 53.6 36.8"
        stroke="url(#aeSphereGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="7.8"
        transform="rotate(-28 32 32)"
        stroke="#F5C451"
        strokeOpacity="0.78"
        strokeWidth="1.4"
        strokeDasharray="3 2.5"
      />
      <path
        d="M 21.5 43.5 L 30.2 21.5 Q 32 17 33.8 21.5 L 42.5 43.5"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 10 47 C 21 44, 35 33, 53 13"
        stroke="url(#aeOrbitSweep)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 53 6.5 L 54.6 11.4 L 59.5 13 L 54.6 14.6 L 53 19.5 L 51.4 14.6 L 46.5 13 L 51.4 11.4 Z"
        fill="#FFE48F"
      />
      <circle cx="32" cy="31" r="2.4" fill="#F5C451" />
    </g>
  </svg>
);

interface SpaceGlyphDef {
  char: string;
  width: number;
  paths: string[];
  isSpecialX?: boolean;
  fillPaths?: string[];
}

const ASTRO_EXPLORE_SPACE_GLYPHS: SpaceGlyphDef[] = [
  {
    char: "A",
    width: 92,
    paths: ["M 10 86 L 40 22 Q 46 9 52 22 L 82 86"],
  },
  {
    char: "S",
    width: 88,
    paths: [
      "M 76 20 H 30 Q 12 20 12 35 Q 12 50 32 50 H 56 Q 78 50 78 68 Q 78 86 56 86 H 14",
    ],
  },
  {
    char: "T",
    width: 84,
    paths: ["M 8 18.5 Q 42 18 76 18.5", "M 41.5 18.5 Q 42 52 41.5 86"],
  },
  {
    char: "R",
    width: 90,
    paths: [
      "M 14 86 V 26 Q 14 18 24 18 H 58 Q 78 18 78 36 Q 78 54 56 54 H 14",
      "M 50 54 L 78 86",
    ],
  },
  {
    char: "O",
    width: 94,
    paths: [
      "M 34 18 H 60 Q 82 18 82 40 V 64 Q 82 86 60 86 H 34 Q 12 86 12 64 V 40 Q 12 18 34 18 Z",
    ],
  },
  {
    char: " ",
    width: 56,
    paths: [],
  },
  {
    char: "E",
    width: 86,
    paths: [
      "M 76 18 H 34 Q 14 18 14 35 Q 14 52 36 52 H 70",
      "M 36 52 Q 14 52 14 69 Q 14 86 34 86 H 76",
    ],
  },
  {
    char: "X",
    width: 132,
    isSpecialX: true,
    paths: [
      "M 6 4 Q 24 4 38 22 L 94 82 Q 108 98 126 98",
      "M 18 4 Q 34 4 48 22 L 104 82 Q 116 98 130 98",
      "M 122 4 Q 102 6 86 24 L 46 78 Q 30 96 10 98",
      "M 16 51.5 Q 66 51 116 51.5",
    ],
    fillPaths: [
      "M 66 24 L 71.5 45.5 L 93 51 L 71.5 56.5 L 66 78 L 60.5 56.5 L 39 51 L 60.5 45.5 Z",
    ],
  },
  {
    char: "P",
    width: 88,
    paths: [
      "M 14 86 V 26 Q 14 18 24 18 H 58 Q 78 18 78 36 Q 78 54 56 54 H 14",
    ],
  },
  {
    char: "L",
    width: 80,
    paths: ["M 16 18 V 72 Q 16 86 30 86 H 74"],
  },
  {
    char: "O",
    width: 94,
    paths: [
      "M 34 18 H 60 Q 82 18 82 40 V 64 Q 82 86 60 86 H 34 Q 12 86 12 64 V 40 Q 12 18 34 18 Z",
    ],
  },
  {
    char: "R",
    width: 90,
    paths: [
      "M 14 86 V 26 Q 14 18 24 18 H 58 Q 78 18 78 36 Q 78 54 56 54 H 14",
      "M 50 54 L 78 86",
    ],
  },
  {
    char: "E",
    width: 86,
    paths: [
      "M 76 18 H 34 Q 14 18 14 35 Q 14 52 36 52 H 70",
      "M 36 52 Q 14 52 14 69 Q 14 86 34 86 H 76",
    ],
  },
];

const GLYPH_LETTER_SPACING = 18;
const ASTRO_EXPLORE_TOTAL_UNITS =
  ASTRO_EXPLORE_SPACE_GLYPHS.reduce((acc, g) => acc + g.width, 0) +
  GLYPH_LETTER_SPACING * (ASTRO_EXPLORE_SPACE_GLYPHS.length - 1);

export const AstroExploreSpaceLogo: React.FC<{
  className?: string;
  strokeOpacity?: number;
}> = ({ className = "w-full h-auto", strokeOpacity = 1 }) => {
  let cursorX = 0;
  return (
    <svg
      viewBox={`-24 -16 ${ASTRO_EXPLORE_TOTAL_UNITS + 48} 136`}
      className={className}
      aria-label="AstroExplore"
      role="img"
    >
      <defs>
        <linearGradient
          id="spaceWhiteGrad"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FFE48F" />
          <stop offset="100%" stopColor="#F5C451" />
        </linearGradient>
        <linearGradient
          id="softGoldXGrad"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="130"
          y2="100"
        >
          <stop offset="0%" stopColor="#FFF5CC" />
          <stop offset="45%" stopColor="#F5C451" />
          <stop offset="100%" stopColor="#D99B26" />
        </linearGradient>
        <filter id="softGoldGlow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {ASTRO_EXPLORE_SPACE_GLYPHS.map((g, idx) => {
        const xOffset = cursorX;
        cursorX += g.width + GLYPH_LETTER_SPACING;
        const isX = Boolean(g.isSpecialX);

        return (
          <g
            key={`${g.char}-${idx}`}
            transform={`translate(${xOffset}, 0)`}
            opacity={strokeOpacity}
            filter={isX ? "url(#softGoldGlow)" : undefined}
          >
            {g.paths.map((d, pIdx) => (
              <path
                key={pIdx}
                d={d}
                fill="none"
                stroke={isX ? "url(#softGoldXGrad)" : "url(#spaceWhiteGrad)"}
                strokeWidth={isX ? (pIdx === 3 ? 4.5 : 10) : 13.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {g.fillPaths?.map((d, fIdx) => (
              <path
                key={`f-${fIdx}`}
                d={d}
                fill="#FFF8EB"
                stroke="url(#softGoldXGrad)"
                strokeWidth={1.8}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

export const AstroExplorerCornerBadge: React.FC<{
  visible?: boolean;
  className?: string;
}> = ({ visible = true, className = "" }) => (
  <div
    aria-label="Astro Explore Official Brand Signature"
    aria-hidden={!visible}
    className={`fixed bottom-5 right-6 z-40 pointer-events-none select-none flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#080B12]/76 backdrop-blur-2xl border border-[#F5C451]/26 shadow-[0_8px_28px_rgba(0,0,0,0.65),0_0_14px_1px_rgba(245,196,81,0.28),0_0_28px_3px_rgba(245,196,81,0.12),inset_0_0_14px_1px_rgba(245,196,81,0.18)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
      visible
        ? "translate-x-0 scale-100 opacity-95 blur-0"
        : "translate-x-[145%] scale-[0.94] opacity-0 blur-[2px]"
    } ${className}`}
  >
    <AstroExploreBrandMark className="w-5 h-5 shrink-0" glow={true} />
    <div className="w-[128px] sm:w-[144px]">
      <AstroExploreSpaceLogo strokeOpacity={0.96} />
    </div>
  </div>
);

export const StarConstellationLoader: React.FC<{
  progress: number;
  statusText: string;
}> = ({ progress, statusText }) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-6 select-none bg-transparent">
      <div className="glass-panel rounded-[26px] px-8 sm:px-10 py-7 flex flex-col items-center text-center max-w-lg w-full">
        <div className="mb-4 flex flex-col items-center justify-center gap-3">
          <AstroExploreBrandMark className="w-12 h-12" glow={true} />
          <div className="w-52 sm:w-64">
            <AstroExploreSpaceLogo strokeOpacity={0.98} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#F5C451] text-[#F5C451] live-dot-pulse shrink-0" />
          <p className="text-sm sm:text-base font-medium tracking-tight text-white">
            {statusText}
          </p>
          <span className="text-xs font-mono text-[#F5C451] font-semibold">
            {Math.min(100, Math.round(progress))}%
          </span>
        </div>

        <div className="w-56 sm:w-64 h-[3px] rounded-full bg-white/12 overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white via-[#F5C451] to-[#FFE082] shadow-[0_0_16px_rgba(245,196,81,0.9)] transition-all duration-300 ease-out"
            style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
          />
        </div>

        <AstrophysicsLoadingQuote variant="card" />
      </div>
    </div>
  );
};
