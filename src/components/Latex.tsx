import React, { useMemo } from "react";
import katex from "katex";

interface LatexProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * Renderiza una expresión matemática o química en LaTeX usando KaTeX.
 */
export const Latex: React.FC<LatexProps> = ({
  math,
  displayMode = false,
  className = "",
}) => {
  const html = useMemo(
    () =>
      katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        strict: false,
      }),
    [math, displayMode]
  );

  if (displayMode) {
    return (
      <div
        className={`katex-block overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`katex-inline ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

const SUPERSCRIPT_CHARS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
};

const GREEK_MAP: Record<string, string> = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  Δ: "\\Delta",
  λ: "\\lambda",
  μ: "\\mu",
  µ: "\\mu",
  σ: "\\sigma",
  τ: "\\tau",
};

/**
 * Convierte una fórmula química o espectroscópica con subíndices/superíndices Unicode
 * (p. ej. "H₂O (2.0 µm)", "¹³CO₂", "OCN⁻", "H I (Paα)") a sintaxis LaTeX limpia.
 */
export function formatChemicalFormulaToLatex(raw: string): string {
  // Casos especiales frecuentes de espectroscopía astronómica
  if (raw === "H I (Paα)") return "\\mathrm{H\\,I}\\;(\\mathrm{Pa}\\alpha)";
  if (raw === "H I (Brγ)") return "\\mathrm{H\\,I}\\;(\\mathrm{Br}\\gamma)";
  if (raw === "H I (Brα)") return "\\mathrm{H\\,I}\\;(\\mathrm{Br}\\alpha)";

  let out = "";
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    // Agrupar subíndices consecutivos
    if (SUBSCRIPT_DIGITS[ch]) {
      let sub = "";
      while (i < raw.length && SUBSCRIPT_DIGITS[raw[i]]) {
        sub += SUBSCRIPT_DIGITS[raw[i]];
        i++;
      }
      out += `_{${sub}}`;
      continue;
    }

    // Agrupar superíndices consecutivos
    if (SUPERSCRIPT_CHARS[ch]) {
      let sup = "";
      while (i < raw.length && SUPERSCRIPT_CHARS[raw[i]]) {
        sup += SUPERSCRIPT_CHARS[raw[i]];
        i++;
      }
      out += `^{${sup}}`;
      continue;
    }

    // Letras griegas
    if (GREEK_MAP[ch]) {
      out += `${GREEK_MAP[ch]} `;
      i++;
      continue;
    }

    // Espacios
    if (ch === " ") {
      out += "\\,";
      i++;
      continue;
    }

    // Letras latinas consecutivas en \mathrm{} para tipografía química estándar
    if (/[A-Za-z]/.test(ch)) {
      let word = "";
      while (i < raw.length && /[A-Za-z]/.test(raw[i])) {
        word += raw[i];
        i++;
      }
      out += `\\mathrm{${word}}`;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Renderiza una fórmula química o banda diagnóstica usando KaTeX.
 */
export const ChemicalFormula: React.FC<{
  formula: string;
  className?: string;
}> = ({ formula, className = "" }) => {
  const math = useMemo(() => formatChemicalFormulaToLatex(formula), [formula]);
  return <Latex math={math} className={className} />;
};
