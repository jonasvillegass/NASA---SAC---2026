import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const SPOTLIGHT_PADDING = 6;
const VIEWPORT_MARGIN = 16;

interface SidebarStepDef {
  targetId: string;
  getText: (t: ReturnType<typeof useLanguage>["t"]) => { title: string; description: string };
}

const SIDEBAR_STEPS: SidebarStepDef[] = [
  { targetId: "sidebar-tut-zoom", getText: (t) => t.sidebarTutorial.steps.zoom },
  { targetId: "sidebar-tut-bands", getText: (t) => t.sidebarTutorial.steps.bands },
  {
    targetId: "sidebar-tut-stretch-cmap",
    getText: (t) => t.sidebarTutorial.steps.stretchAndColormap,
  },
  { targetId: "sidebar-tut-detector", getText: (t) => t.sidebarTutorial.steps.detector },
  { targetId: "sidebar-tut-toggles", getText: (t) => t.sidebarTutorial.steps.toggles },
  { targetId: "sidebar-tut-exposures", getText: (t) => t.sidebarTutorial.steps.exposures },
];

interface TooltipPosition {
  top: number;
  left: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeSidebarTooltipPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  // On desktop, place to the right of the sidebar control
  if (vw - rect.right - gap - tooltipWidth >= VIEWPORT_MARGIN) {
    return {
      top: clamp(
        rect.top + rect.height / 2 - tooltipHeight / 2,
        VIEWPORT_MARGIN,
        vh - tooltipHeight - VIEWPORT_MARGIN
      ),
      left: rect.right + gap,
    };
  }

  // On narrower screens, place below or above
  const centeredLeft = clamp(
    rect.left + rect.width / 2 - tooltipWidth / 2,
    VIEWPORT_MARGIN,
    vw - tooltipWidth - VIEWPORT_MARGIN
  );
  if (vh - rect.bottom - gap >= tooltipHeight + VIEWPORT_MARGIN) {
    return { top: rect.bottom + gap, left: centeredLeft };
  }
  return {
    top: clamp(rect.top - gap - tooltipHeight, VIEWPORT_MARGIN, vh - tooltipHeight - VIEWPORT_MARGIN),
    left: centeredLeft,
  };
}

export interface SidebarTutorialProps {
  open: boolean;
  onClose: () => void;
}

export const SidebarTutorial: React.FC<SidebarTutorialProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const availableSteps = useMemo(() => {
    if (!open) return [];
    const present = SIDEBAR_STEPS.filter((s) => Boolean(document.getElementById(s.targetId)));
    return present.length > 0 ? present : SIDEBAR_STEPS.slice(0, 1);
  }, [open]);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const currentStep = availableSteps[Math.min(stepIndex, Math.max(0, availableSteps.length - 1))];

  const updateMeasurement = useCallback(() => {
    if (!open || !currentStep) {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(currentStep.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    setTargetRect(el.getBoundingClientRect());
  }, [open, currentStep]);

  useEffect(() => {
    if (!open || !currentStep) return;
    const el = document.getElementById(currentStep.targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    updateMeasurement();
    const timer = window.setTimeout(updateMeasurement, 200);
    return () => window.clearTimeout(timer);
  }, [open, currentStep, updateMeasurement]);

  useEffect(() => {
    if (!open) return;
    const onUpdate = () => updateMeasurement();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const raf = window.requestAnimationFrame(onUpdate);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.cancelAnimationFrame(raf);
    };
  }, [open, updateMeasurement]);

  useLayoutEffect(() => {
    if (!open || !targetRect) {
      setTooltipPos(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    const width = tooltipEl?.offsetWidth || Math.min(350, window.innerWidth - 32);
    const height = tooltipEl?.offsetHeight || 200;
    setTooltipPos(computeSidebarTooltipPosition(targetRect, width, height));
  }, [open, targetRect, currentStep, t]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (stepIndex < availableSteps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        e.preventDefault();
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, stepIndex, availableSteps.length, onClose]);

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

  if (!open || !currentStep) return null;

  const stepText = currentStep.getText(t);
  const safeIndex = Math.min(stepIndex, availableSteps.length - 1);
  const isLastStep = safeIndex === availableSteps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[70] pointer-events-none">
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
            className="fixed rounded-2xl border-2 border-[#00D2FF] shadow-[0_0_24px_rgba(0,210,255,0.45)] pointer-events-none transition-all duration-200"
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
        aria-labelledby="sidebar-tutorial-step-title"
        style={
          tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
        className="fixed z-[75] w-[min(350px,calc(100vw-32px))] rounded-[18px] bg-[#0B101B]/95 backdrop-blur-xl border border-[#00D2FF]/50 shadow-[0_20px_50px_rgba(0,0,0,0.92)] p-4 sm:p-5 space-y-3 pointer-events-auto transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#00D2FF] bg-[#00D2FF]/12 border border-[#00D2FF]/35 rounded-full px-2.5 py-0.5">
            {t.sidebarTutorial.stepCounter(safeIndex + 1, availableSteps.length)}
          </span>

          <div className="flex items-center gap-1" aria-hidden="true">
            {availableSteps.map((step, idx) => (
              <span
                key={step.targetId}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === safeIndex
                    ? "w-3.5 bg-[#00D2FF]"
                    : idx < safeIndex
                      ? "w-1.5 bg-[#00D2FF]/50"
                      : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <h3
          id="sidebar-tutorial-step-title"
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
            onClick={onClose}
            className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {t.sidebarTutorial.skipButton}
          </button>

          <div className="flex items-center gap-2">
            {safeIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="btn-press px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.sidebarTutorial.prevButton}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  onClose();
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="btn-press px-3.5 py-1.5 rounded-xl bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 border border-[#00D2FF]/75 text-xs font-semibold text-white flex items-center gap-1.5 shadow-[0_0_16px_rgba(0,210,255,0.22)] transition-colors cursor-pointer"
            >
              <span>
                {isLastStep ? t.sidebarTutorial.finishButton : t.sidebarTutorial.nextButton}
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
    </div>,
    document.body
  );
};
