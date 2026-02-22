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
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='header-templates']",
    title: "Templates & Plugins",
    description: "Start with pre-built templates or install plugins from the community to extend functionality.",
    position: "bottom",
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
];

const STORAGE_KEY = "openscope_tour_completed";

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markTourCompleted(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

export default function TourModal({ isOpen, onClose, onComplete }: TourModalProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [showWelcome, setShowWelcome] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < TOUR_STEPS.length) {
      const step = TOUR_STEPS[currentStep];
      const targetEl = document.querySelector(step.target);

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case "top":
            top = rect.top + scrollY - 12;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "bottom":
            top = rect.bottom + scrollY + 12;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "left":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX - 12;
            break;
          case "right":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.right + scrollX + 12;
            break;
        }

        setTooltipPosition({ top, left });
      }
    }
  }, [currentStep]);

  useEffect(() => {
    const handleScroll = () => {
      if (currentStep >= 0) {
        setCurrentStep(-1);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [currentStep]);

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
      {showWelcome ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
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
