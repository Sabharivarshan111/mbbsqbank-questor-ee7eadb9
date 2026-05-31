import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { walkthroughSteps } from "./walkthroughSteps";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "orbit-walkthrough-completed";
const PADDING = 8;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const Walkthrough = () => {
  const [completed, setCompleted] = useLocalStorage<boolean>(STORAGE_KEY, false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay so target elements (esp. portaled pomodoro) are in DOM
    const t = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(t);
  }, []);

  const step = walkthroughSteps[stepIndex];

  const recompute = useCallback(() => {
    if (!step?.targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    // Wait a tick for scroll to settle
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
    });
  }, [step]);

  useLayoutEffect(() => {
    if (!mounted || completed) return;
    recompute();
    const id = setTimeout(recompute, 350);
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [mounted, completed, recompute]);

  const finish = useCallback(() => {
    setCompleted(true);
  }, [setCompleted]);

  const next = useCallback(() => {
    if (stepIndex >= walkthroughSteps.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, finish]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!mounted || completed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, completed, finish, next, prev]);

  if (completed || !mounted) return null;

  const isLast = stepIndex === walkthroughSteps.length - 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;

  // Card positioning: prefer below target, else above, else center
  let cardStyle: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "min(360px, calc(100vw - 32px))",
    zIndex: 2147483647,
  };

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const cardHeightEstimate = 220;
    if (spaceBelow >= cardHeightEstimate + 16) {
      cardStyle = {
        position: "fixed",
        top: rect.top + rect.height + 16,
        left: Math.min(
          Math.max(16, rect.left + rect.width / 2 - 180),
          vw - 360 - 16,
        ),
        maxWidth: "min(360px, calc(100vw - 32px))",
        zIndex: 2147483647,
      };
    } else if (spaceAbove >= cardHeightEstimate + 16) {
      cardStyle = {
        position: "fixed",
        top: rect.top - cardHeightEstimate - 16,
        left: Math.min(
          Math.max(16, rect.left + rect.width / 2 - 180),
          vw - 360 - 16,
        ),
        maxWidth: "min(360px, calc(100vw - 32px))",
        zIndex: 2147483647,
      };
    } else {
      // Fallback: bottom center
      cardStyle = {
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "min(360px, calc(100vw - 32px))",
        zIndex: 2147483647,
      };
    }
  }

  const overlay = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483600 }}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Dim layer with spotlight cutout via box-shadow trick */}
      {rect ? (
        <div
          onClick={next}
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px hsl(var(--background) / 0.88)",
            outline: "2px solid hsl(var(--primary))",
            outlineOffset: 0,
            transition: "all 250ms ease",
            pointerEvents: "auto",
          }}
        />
      ) : (
        <div
          onClick={next}
          style={{
            position: "fixed",
            inset: 0,
            background: "hsl(var(--background) / 0.88)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-5 animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {walkthroughSteps.length}
          </div>
          <button
            onClick={finish}
            aria-label="Skip walkthrough"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-4">
          {walkthroughSteps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-muted-foreground"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? "Got it!" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default Walkthrough;
