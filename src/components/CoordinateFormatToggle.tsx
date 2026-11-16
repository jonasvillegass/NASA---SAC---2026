import React from "react";

interface CoordinateFormatToggleProps {
  isDecimal: boolean;
  disabled?: boolean;
  isEn: boolean;
  onChange: (format: "hms" | "deg") => void;
}

/**
 * Selector segmentado con píldora deslizante suavizada para alternar entre HMS/DMS y DEG.
 */
export const CoordinateFormatToggle: React.FC<CoordinateFormatToggleProps> = ({
  isDecimal,
  disabled = false,
  isEn,
  onChange,
}) => {
  return (
    <div
      role="group"
      aria-label={isEn ? "Coordinate format" : "Formato de coordenadas"}
      title={
        isEn
          ? "Switch between sexagesimal (HMS/DMS) and decimal degrees (DEG)"
          : "Cambiar entre sexagesimal (HMS/DMS) y grados decimales (DEG)"
      }
      className="relative inline-grid grid-cols-2 items-center p-0.5 rounded-full bg-black/55 border border-white/15 shrink-0 select-none"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-[#00D2FF]/20 border border-[#00D2FF]/55 shadow-[0_0_12px_rgba(0,210,255,0.24)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isDecimal ? "translate-x-full" : "translate-x-0"
        }`}
      />
      <button
        type="button"
        onClick={() => onChange("hms")}
        disabled={disabled}
        aria-pressed={!isDecimal}
        className={`relative z-10 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-center transition-colors duration-300 cursor-pointer disabled:opacity-40 ${
          !isDecimal
            ? "text-[#00D2FF] font-semibold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        HMS/DMS
      </button>
      <button
        type="button"
        onClick={() => onChange("deg")}
        disabled={disabled}
        aria-pressed={isDecimal}
        className={`relative z-10 px-2.5 py-0.5 rounded-full text-[10px] font-mono text-center transition-colors duration-300 cursor-pointer disabled:opacity-40 ${
          isDecimal
            ? "text-[#00D2FF] font-semibold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        DEG
      </button>
    </div>
  );
};
