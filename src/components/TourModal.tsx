"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Layers, Play, Settings2, Check } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStepChange?: (step: number | null) => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='header-templates']",
    title: "Templates & Plugins",
    description: "Start with pre-built templates or install plugins from the community to extend functionality.",
    position: "right",
  },
  {
    target: "[data-tour='node-palette']",
    title: "Node Palette",
    description: "Browse and drag nodes here. Each node represents a component in your video pipeline.",
    position: "right",
  },
  {
    target: "[data-tour='canvas']",
    title: "Canvas",
    description: "Drag nodes here and connect them to build your workflow. The visual flow shows how data moves.",
    position: "right",
  },
  {
    target: "[data-tour='properties-panel']",
    title: "Properties Panel",
    description: "Select any node to configure its settings. Options vary depending on the node type.",
    position: "left",
  },
  {
    target: "[data-tour='header-run']",
    title: "Run Your Pipeline",
    description: "Click play to start the pipeline. Your video will appear in the preview area.",
    position: "bottom",
  },
  {
    target: "[data-tour='header-export']",
    title: "Export Your Plugin",
    description: "Export your workflow as a plugin ZIP file that can be installed in Daydream Scope.",
    position: "bottom",
  },
];

const STORAGE_KEY = "openscope_tour_completed";

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markTourCompleted(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

export default function TourModal({ isOpen, onClose, onComplete, onStepChange }: TourModalProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [showWelcome, setShowWelcome] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < TOUR_STEPS.length) {
      const step = TOUR_STEPS[currentStep];
      const targetEl = document.querySelector(step.target);

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        setHighlightRect({
          top: rect.top + scrollY,
          left: rect.left + scrollX,
          width: rect.width,
          height: rect.height,
        });

        let top = 0;
        let left = 0;
        const padding = 12;
        const tooltipWidth = 320;
        const tooltipHeight = 200;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        switch (step.position) {
          case "top":
            top = rect.top + scrollY - tooltipHeight - padding;
            left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
            break;
          case "bottom":
            top = rect.bottom + scrollY + padding;
            left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2;
            break;
          case "left":
            top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
            left = rect.left + scrollX - tooltipWidth - padding;
            break;
          case "right":
            top = rect.top + scrollY + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + scrollX + padding;
            break;
        }

        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;

        setTooltipPosition({ top, left });
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    const handleScroll = () => {
      if (currentStep >= 0 && highlightRect) {
        const step = TOUR_STEPS[currentStep];
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          setHighlightRect({
            top: rect.top + scrollY,
            left: rect.left + scrollX,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [currentStep, highlightRect]);

  useEffect(() => {
    if (onStepChange) {
      if (currentStep >= 0 && TOUR_STEPS[currentStep]?.target === "[data-tour='properties-panel']") {
        onStepChange(currentStep);
      } else {
        onStepChange(null);
      }
    }
  }, [currentStep, onStepChange]);

  const handleStart = () => {
    setShowWelcome(false);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markTourCompleted();
      onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setShowWelcome(true);
      setCurrentStep(-1);
    }
  };

  const handleSkip = () => {
    markTourCompleted();
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Gray overlay with cutout */}
      {currentStep >= 0 && highlightRect && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Top */}
          <div className="absolute top-0 left-0 right-0" style={{ height: highlightRect.top }} />
          {/* Left */}
          <div className="absolute top-0 bottom-0 left-0" style={{ width: highlightRect.left }} />
          {/* Right */}
          <div className="absolute top-0 bottom-0" style={{ left: highlightRect.left + highlightRect.width }} />
          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0" style={{ top: highlightRect.top + highlightRect.height }} />
          {/* Highlight border */}
          <div
            className="absolute border-2 border-primary rounded-md pointer-events-none animate-pulse"
            style={{
              zIndex: 10000,
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8,
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
            }}
          />
        </div>
      )}

      {showWelcome ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0  backdrop-blur-sm" />
          <div className="relative w-[480px] bg-card rounded-2xl shadow-2xl border border-border p-8">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">

              <div className="flex gap-0.5 items-start justify-center">
                <h2 className="text-xl font-bold text-foreground mb-2 flex gap-2 items-center justify-center">Welcome to OpenScope  </h2>
                <span className="text-[9px] font-medium px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">
                  Beta
                </span>
              </div>

              <p className="text-muted-foreground">
                Let us show you around and help you get started with building plugins visually.
              </p>
            </div>

            {/* <div className="space-y-3 mb-6">
              {TOUR_STEPS.slice(0, 3).map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="text-foreground">{step.title}</span>
                </div>
              ))}
              
            </div> */}

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Start Tour
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : currentStep >= 0 ? (
        <div
          ref={stepRef}
          className="fixed z-[100] w-72 bg-card rounded-xl shadow-2xl border border-border p-4 animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: TOUR_STEPS[currentStep].position === "left"
              ? "translateX(-100%)"
              : TOUR_STEPS[currentStep].position === "right"
                ? "translateX(0)"
                : TOUR_STEPS[currentStep].position === "top"
                  ? "translateY(-100%)"
                  : "translateY(0)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <h3 className="font-semibold text-foreground mb-1">{TOUR_STEPS[currentStep].title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{TOUR_STEPS[currentStep].description}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  Finish
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div
            className="absolute w-3 h-3 bg-card border-l border-t border-border rotate-45"
            style={{
              [TOUR_STEPS[currentStep].position === "left" ? "right" :
                TOUR_STEPS[currentStep].position === "right" ? "left" :
                  TOUR_STEPS[currentStep].position === "top" ? "bottom" : "top"]: -6,
              [TOUR_STEPS[currentStep].position === "left" || TOUR_STEPS[currentStep].position === "right" ? "top" : "left"]: "50%",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      ) : null}
    </>
  );
}
