import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, HelpCircle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const SPOTLIGHT_PADDING = 6;
const VIEWPORT_MARGIN = 16;

type ExplorerTutorialPhase = "idle" | "welcome" | "steps";

type ExplorerStepId =
  | "back"
  | "settings"
  | "newSearch"
  | "share"
  | "playback"
  | "generalMapOverview"
  | "generalMapControls"
  | "detailedMapLoading"
  | "detailedMapDates"
  | "detailedMapTools";

interface ExplorerStepConfig {
  id: ExplorerStepId;
  targetId: string;
  requiresSecondMap?: boolean;
}

const EXPLORER_STEPS: ExplorerStepConfig[] = [
  { id: "back", targetId: "tutorial-exp-back" },
  { id: "settings", targetId: "tutorial-exp-panel" },
  { id: "newSearch", targetId: "tutorial-exp-new-search" },
  { id: "share", targetId: "tutorial-exp-share" },
  { id: "playback", targetId: "tutorial-exp-playback" },
  { id: "generalMapOverview", targetId: "tutorial-exp-map1", requiresSecondMap: false },
  { id: "generalMapControls", targetId: "tutorial-exp-map1-controls", requiresSecondMap: false },
  { id: "detailedMapLoading", targetId: "tutorial-exp-map2", requiresSecondMap: true },
  { id: "detailedMapDates", targetId: "tutorial-exp-map2-dates", requiresSecondMap: true },
  { id: "detailedMapTools", targetId: "tutorial-exp-map2-tools", requiresSecondMap: true },
];

interface TooltipPosition {
  top: number;
  left: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeExplorerTooltipPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  // Large viewport-sized panels (Mapa general / Mapa detallado): float cleanly near center-top
  if (rect.width > vw * 0.45 && rect.height > vh * 0.45) {
    return {
      top: clamp(rect.top + 68, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
      left: clamp(
        rect.left + rect.width / 2 - tooltipWidth / 2,
        VIEWPORT_MARGIN,
        vw - tooltipWidth - VIEWPORT_MARGIN
      ),
    };
  }

  // Wide bottom bar (e.g. playback bar or map1 bottom controls): place above it
  if (rect.top > vh * 0.55) {
    return {
      top: clamp(rect.top - gap - tooltipHeight, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
      left: clamp(
        rect.left + rect.width / 2 - tooltipWidth / 2,
        VIEWPORT_MARGIN,
        vw - tooltipWidth - VIEWPORT_MARGIN
      ),
    };
  }

  // Top-right corner controls (e.g. Mapa detallado tools): place below and right-aligned
  if (rect.right > vw * 0.7 && rect.top < vh * 0.3) {
    return {
      top: clamp(rect.bottom + gap, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
      left: clamp(rect.right - tooltipWidth, VIEWPORT_MARGIN, vw - tooltipWidth - VIEWPORT_MARGIN),
    };
  }

  // Top-left controls (buttons, date pill): place below and left-aligned
  return {
    top: clamp(rect.bottom + gap, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
    left: clamp(rect.left, VIEWPORT_MARGIN, vw - tooltipWidth - VIEWPORT_MARGIN),
  };
}

export interface ExplorerTutorialProps {
  active: boolean;
  sidebarOpen?: boolean;
  secondMapOpen: boolean;
  onToggleSecondMap: (open: boolean) => void;
}

export const ExplorerTutorial: React.FC<ExplorerTutorialProps> = ({
  active,
  sidebarOpen = false,
  secondMapOpen,
  onToggleSecondMap,
}) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<ExplorerTutorialPhase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const currentStep = EXPLORER_STEPS[stepIndex];

  const closeTutorial = useCallback(() => {
    setPhase("idle");
  }, []);

  const startGeneralSteps = useCallback(() => {
    setStepIndex(0);
    setPhase("steps");
  }, []);

  // Reset if user leaves explorer screen
  useEffect(() => {
    if (!active && phase !== "idle") {
      setPhase("idle");
    }
  }, [active, phase]);

  // Automatically open/close Mapa detallado when stepping into General Map vs Detailed Map steps
  useEffect(() => {
    if (!active || phase !== "steps") return;
    if (currentStep.requiresSecondMap === true && !secondMapOpen) {
      onToggleSecondMap(true);
    } else if (currentStep.requiresSecondMap === false && secondMapOpen) {
      onToggleSecondMap(false);
    }
  }, [active, phase, currentStep.requiresSecondMap, secondMapOpen, onToggleSecondMap]);

  const updateTargetMeasurement = useCallback(() => {
    if (!active || phase !== "steps") {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(currentStep.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    setTargetRect(el.getBoundingClientRect());
  }, [active, phase, currentStep.targetId]);

  useEffect(() => {
    if (!active || phase !== "steps") return;
    // Measure immediately and shortly after layout transitions (e.g. split map opening/closing)
    updateTargetMeasurement();
    const timer = window.setTimeout(updateTargetMeasurement, 180);
    const onUpdate = () => updateTargetMeasurement();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const raf = window.requestAnimationFrame(onUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.cancelAnimationFrame(raf);
    };
  }, [active, phase, secondMapOpen, updateTargetMeasurement]);

  useLayoutEffect(() => {
    if (!active || phase !== "steps" || !targetRect) {
      setTooltipPos(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    const width = tooltipEl?.offsetWidth || Math.min(380, window.innerWidth - 32);
    const height = tooltipEl?.offsetHeight || 220;
    setTooltipPos(computeExplorerTooltipPosition(targetRect, width, height));
  }, [active, phase, targetRect, currentStep.id, t]);

  useEffect(() => {
    if (!active || phase === "idle") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeTutorial();
      } else if (phase === "steps") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (stepIndex < EXPLORER_STEPS.length - 1) {
            setStepIndex((i) => i + 1);
          } else {
            closeTutorial();
          }
        } else if (e.key === "ArrowLeft" && stepIndex > 0) {
          e.preventDefault();
          setStepIndex((i) => i - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, phase, stepIndex, closeTutorial]);

  const spotlightBox = useMemo(() => {
    if (!targetRect) return null;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const top = Math.max(0, targetRect.top - SPOTLIGHT_PADDING);
    const left = Math.max(0, targetRect.left - SPOTLIGHT_PADDING);
    const right = Math.min(vw, targetRect.right + SPOTLIGHT_PADDING);
    const bottom = Math.min(vh, targetRect.bottom + SPOTLIGHT_PADDING);
    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [targetRect]);

  if (!active) return null;

  // Idle state: "Tutorial partes principales" button at bottom-left (glides smoothly right when sidebar is open on desktop)
  if (phase === "idle") {
    return (
      <div
        className={`fixed bottom-5 left-5 z-30 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          sidebarOpen ? "lg:translate-x-[338px]" : "translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setPhase("welcome")}
          className="btn-press glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-[#00D2FF] hover:border-[#00D2FF]/50 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#00D2FF]" />
          <span>{t.explorerTutorial.mainPartsButton}</span>
        </button>
      </div>
    );
  }

  // Welcome overview modal for "Tutorial partes principales"
  if (phase === "welcome") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="explorer-tutorial-welcome-title"
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-[22px] bg-[#0B101B]/95 border border-[#00D2FF]/45 shadow-[0_24px_64px_rgba(0,0,0,0.88)] p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-[#00D2FF]">
            <div className="w-9 h-9 rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2
              id="explorer-tutorial-welcome-title"
              className="text-base sm:text-lg font-semibold text-white tracking-tight"
            >
              {t.explorerTutorial.welcomeTitle}
            </h2>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            {t.explorerTutorial.welcomeDescription}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeTutorial}
              className="btn-press px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {t.explorerTutorial.skipButton}
            </button>
            <button
              type="button"
              onClick={startGeneralSteps}
              className="btn-press px-4 py-2 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,210,255,0.25)] transition-colors cursor-pointer"
            >
              {t.explorerTutorial.startGeneralButton}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Steps phase
  const stepText = t.explorerTutorial.steps[currentStep.id];
  const isLastStep = stepIndex === EXPLORER_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {spotlightBox ? (
        <>
          <div
            className="fixed left-0 right-0 top-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{ height: spotlightBox.top }}
          />
          <div
            className="fixed left-0 right-0 bottom-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{ top: spotlightBox.bottom }}
          />
          <div
            className="fixed left-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{
              top: spotlightBox.top,
              height: spotlightBox.height,
              width: spotlightBox.left,
            }}
          />
          <div
            className="fixed right-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{
              top: spotlightBox.top,
              height: spotlightBox.height,
              left: spotlightBox.right,
            }}
          />
          <div
            aria-hidden="true"
            className="fixed rounded-[22px] border-2 border-[#00D2FF] shadow-[0_0_28px_rgba(0,210,255,0.45)] pointer-events-none transition-all duration-200"
            style={{
              top: spotlightBox.top,
              left: spotlightBox.left,
              width: spotlightBox.width,
              height: spotlightBox.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explorer-tutorial-step-title"
        style={
          tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
        className="fixed z-50 w-[min(380px,calc(100vw-32px))] rounded-[18px] bg-[#0B101B]/95 backdrop-blur-xl border border-[#00D2FF]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-5 space-y-3 pointer-events-auto transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#00D2FF] bg-[#00D2FF]/12 border border-[#00D2FF]/35 rounded-full px-2.5 py-0.5">
            {t.explorerTutorial.stepCounter(stepIndex + 1, EXPLORER_STEPS.length)}
          </span>

          <div className="flex items-center gap-1" aria-hidden="true">
            {EXPLORER_STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === stepIndex
                    ? "w-3.5 bg-[#00D2FF]"
                    : idx < stepIndex
                      ? "w-1.5 bg-[#00D2FF]/50"
                      : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <h3
          id="explorer-tutorial-step-title"
          className="text-sm sm:text-base font-semibold text-white tracking-tight"
        >
          {stepText.title}
        </h3>

        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-300">
          {stepText.description}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={closeTutorial}
            className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {t.explorerTutorial.skipButton}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.explorerTutorial.prevButton}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  closeTutorial();
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="btn-press px-3.5 py-1.5 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-xs font-semibold text-white flex items-center gap-1.5 shadow-[0_0_16px_rgba(0,210,255,0.22)] transition-colors cursor-pointer"
            >
              <span>
                {isLastStep ? t.explorerTutorial.finishButton : t.explorerTutorial.nextButton}
              </span>
              {isLastStep ? (
                <Check className="w-3.5 h-3.5 text-[#00D2FF]" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-[#00D2FF]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
