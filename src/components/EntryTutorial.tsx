import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle, Sparkles } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const TUTORIAL_STORAGE_KEY = "spherex_entry_tutorial_seen";
const SPOTLIGHT_PADDING = 6;
const VIEWPORT_MARGIN = 16;

type TutorialPhase = "idle" | "welcome" | "steps";

interface StepConfig {
  id: "language" | "coordinates" | "presets" | "explore";
  targetId: string;
}

const TUTORIAL_STEPS: StepConfig[] = [
  { id: "language", targetId: "tutorial-language-selector" },
  { id: "coordinates", targetId: "tutorial-coords-card" },
  { id: "presets", targetId: "tutorial-presets-card" },
  { id: "explore", targetId: "hero-start-card" },
];

interface TooltipPosition {
  top: number;
  left: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeTooltipPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  stepId: StepConfig["id"]
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  // Step 1 (Language selector is pinned top-right): place to the left if room, else below it
  if (stepId === "language") {
    if (rect.left - gap - tooltipWidth >= VIEWPORT_MARGIN) {
      return {
        top: clamp(rect.top, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
        left: rect.left - gap - tooltipWidth,
      };
    }
    return {
      top: clamp(rect.bottom + gap, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
      left: clamp(rect.right - tooltipWidth, VIEWPORT_MARGIN, vw - tooltipWidth - VIEWPORT_MARGIN),
    };
  }

  // On wide viewports, place beside the central card (right preferred, then left)
  if (vw >= 960) {
    const centeredTop = clamp(
      rect.top + rect.height / 2 - tooltipHeight / 2,
      VIEWPORT_MARGIN,
      vh - tooltipHeight - VIEWPORT_MARGIN
    );
    if (vw - rect.right - gap - tooltipWidth >= VIEWPORT_MARGIN) {
      return { top: centeredTop, left: rect.right + gap };
    }
    if (rect.left - gap - tooltipWidth >= VIEWPORT_MARGIN) {
      return { top: centeredTop, left: rect.left - gap - tooltipWidth };
    }
  }

  // Fallback for narrower screens: place below or above the card, centered horizontally
  const centeredLeft = clamp(
    rect.left + rect.width / 2 - tooltipWidth / 2,
    VIEWPORT_MARGIN,
    vw - tooltipWidth - VIEWPORT_MARGIN
  );
  const spaceBelow = vh - rect.bottom - gap;
  if (spaceBelow >= tooltipHeight + VIEWPORT_MARGIN || rect.top < spaceBelow) {
    return {
      top: clamp(rect.bottom + gap, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
      left: centeredLeft,
    };
  }
  return {
    top: clamp(rect.top - gap - tooltipHeight, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
    left: centeredLeft,
  };
}

export interface EntryTutorialProps {
  active: boolean;
}

export const EntryTutorial: React.FC<EntryTutorialProps> = ({ active }) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<TutorialPhase>(() => {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1" ? "idle" : "welcome";
    } catch {
      return "welcome";
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const currentStep = TUTORIAL_STEPS[stepIndex];

  const markSeenAndClose = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors in private mode
    }
    setPhase("idle");
  }, []);

  const startSteps = useCallback(() => {
    setStepIndex(0);
    setPhase("steps");
  }, []);

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

  // Scroll target into view when step changes on small viewports
  useEffect(() => {
    if (!active || phase !== "steps") return;
    const el = document.getElementById(currentStep.targetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 16 || rect.bottom > window.innerHeight - 16) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateTargetMeasurement();
  }, [active, phase, currentStep.targetId, updateTargetMeasurement]);

  // Track resize and scroll while steps are active
  useEffect(() => {
    if (!active || phase !== "steps") return;
    const onUpdate = () => updateTargetMeasurement();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const raf = window.requestAnimationFrame(onUpdate);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.cancelAnimationFrame(raf);
    };
  }, [active, phase, updateTargetMeasurement]);

  // Position tooltip right next to the highlighted element
  useLayoutEffect(() => {
    if (!active || phase !== "steps" || !targetRect) {
      setTooltipPos(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    const width = tooltipEl?.offsetWidth || Math.min(340, window.innerWidth - 32);
    const height = tooltipEl?.offsetHeight || 210;
    setTooltipPos(computeTooltipPosition(targetRect, width, height, currentStep.id));
  }, [active, phase, targetRect, currentStep.id, t]);

  // Keyboard navigation (Escape skips, arrows/Enter step through)
  useEffect(() => {
    if (!active || phase === "idle") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        markSeenAndClose();
      } else if (phase === "steps") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (stepIndex < TUTORIAL_STEPS.length - 1) {
            setStepIndex((i) => i + 1);
          } else {
            markSeenAndClose();
          }
        } else if (e.key === "ArrowLeft" && stepIndex > 0) {
          e.preventDefault();
          setStepIndex((i) => i - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, phase, stepIndex, markSeenAndClose]);

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

  // Idle state: subtle button to reopen the home tutorial anytime
  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("welcome")}
        title={t.entryTutorial.replayTitle}
        className="btn-press fixed bottom-5 left-5 z-30 glass-panel rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-[#00D2FF] hover:border-[#00D2FF]/50 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#00D2FF]" />
        <span>{t.entryTutorial.replayButton}</span>
      </button>
    );
  }

  // Welcome modal: darkened background + choice to start or skip
  if (phase === "welcome") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-tutorial-welcome-title"
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-[22px] bg-[#0B101B]/95 border border-[#00D2FF]/45 shadow-[0_24px_64px_rgba(0,0,0,0.88)] p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-[#00D2FF]">
            <div className="w-9 h-9 rounded-xl bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2
              id="entry-tutorial-welcome-title"
              className="text-base sm:text-lg font-semibold text-white tracking-tight"
            >
              {t.entryTutorial.welcomeTitle}
            </h2>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            {t.entryTutorial.welcomeDescription}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={markSeenAndClose}
              className="btn-press px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {t.entryTutorial.skipButton}
            </button>
            <button
              type="button"
              onClick={startSteps}
              className="btn-press px-4 py-2 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,210,255,0.25)] transition-colors cursor-pointer"
            >
              {t.entryTutorial.startButton}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Steps phase: 4-panel darkened backdrop around the spotlighted control + floating tooltip
  const stepText = t.entryTutorial.steps[currentStep.id];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {spotlightBox ? (
        <>
          {/* Top darkened region */}
          <div
            className="fixed left-0 right-0 top-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{ height: spotlightBox.top }}
          />
          {/* Bottom darkened region */}
          <div
            className="fixed left-0 right-0 bottom-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{ top: spotlightBox.bottom }}
          />
          {/* Left darkened region */}
          <div
            className="fixed left-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{
              top: spotlightBox.top,
              height: spotlightBox.height,
              width: spotlightBox.left,
            }}
          />
          {/* Right darkened region */}
          <div
            className="fixed right-0 bg-black/68 backdrop-blur-[1.5px] pointer-events-auto transition-all duration-200"
            style={{
              top: spotlightBox.top,
              height: spotlightBox.height,
              left: spotlightBox.right,
            }}
          />
          {/* Glowing cyan spotlight frame */}
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

      {/* Floating tutorial card positioned next to the target element */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-tutorial-step-title"
        style={
          tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
        className="fixed z-50 w-[min(340px,calc(100vw-32px))] rounded-[18px] bg-[#0B101B]/95 backdrop-blur-xl border border-[#00D2FF]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-5 space-y-3 pointer-events-auto transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#00D2FF] bg-[#00D2FF]/12 border border-[#00D2FF]/35 rounded-full px-2.5 py-0.5">
            {t.entryTutorial.stepCounter(stepIndex + 1, TUTORIAL_STEPS.length)}
          </span>

          <div className="flex items-center gap-1.5" aria-hidden="true">
            {TUTORIAL_STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === stepIndex
                    ? "w-4 bg-[#00D2FF]"
                    : idx < stepIndex
                      ? "w-1.5 bg-[#00D2FF]/50"
                      : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <h3
          id="entry-tutorial-step-title"
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
            onClick={markSeenAndClose}
            className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {t.entryTutorial.skipButton}
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.entryTutorial.prevButton}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  markSeenAndClose();
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="btn-press px-3.5 py-1.5 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-xs font-semibold text-white flex items-center gap-1.5 shadow-[0_0_16px_rgba(0,210,255,0.22)] transition-colors cursor-pointer"
            >
              <span>
                {isLastStep ? t.entryTutorial.finishButton : t.entryTutorial.nextButton}
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
