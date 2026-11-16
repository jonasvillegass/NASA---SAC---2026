import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      id="tutorial-language-selector"
      className="glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-medium tracking-wide"
      role="group"
      aria-label={t.navbar.languageAriaLabel}
    >
      <svg
        className="w-3.5 h-3.5 text-slate-400 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>

      <button
        type="button"
        onClick={() => setLanguage("es")}
        aria-pressed={language === "es"}
        title={t.navbar.spanish}
        className={`btn-press cursor-pointer transition-colors ${
          language === "es"
            ? "text-[#00D2FF] font-semibold"
            : "text-slate-400 hover:text-white"
        }`}
      >
        ES
      </button>

      <span className="text-slate-600">|</span>

      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        title={t.navbar.english}
        className={`btn-press cursor-pointer transition-colors ${
          language === "en"
            ? "text-[#00D2FF] font-semibold"
            : "text-slate-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
};
