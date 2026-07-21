import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { walkthroughSteps } from "./walkthroughSteps";
import WalkthroughProfileSetup from "./WalkthroughProfileSetup";
import { Button } from "@/components/ui/button";
import { setWalkthroughActive } from "@/lib/daily-ad";

const STORAGE_KEY = "orbit-walkthrough-completed-v2";
const PADDING = 8;
const CARD_WIDTH = 360;
const CARD_HEIGHT_ESTIMATE = 240;
const GAP = 16;

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
  const lastActionStepRef = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(t);
  }, []);

  const step = walkthroughSteps[stepIndex];

  // Mark walkthrough as active for the whole tour so daily-ad triggers are
  // suppressed. Cleared when finished or unmounted.
  useEffect(() => {
    if (!mounted || completed) return;
    setWalkthroughActive(true);
    return () => setWalkthroughActive(false);
  }, [mounted, completed]);

  // Fire enter actions for the active step (map to bottom-nav tab switches)
  useEffect(() => {
    if (!mounted || completed) return;
    if (step.action === 'tab-home')     window.dispatchEvent(new CustomEvent('orbit:set-shell-tab', { detail: 'home' }));
    if (step.action === 'tab-notes')    window.dispatchEvent(new CustomEvent('orbit:set-shell-tab', { detail: 'notes' }));
    if (step.action === 'tab-timer')    window.dispatchEvent(new CustomEvent('orbit:set-shell-tab', { detail: 'timer' }));
    if (step.action === 'tab-askai')    window.dispatchEvent(new CustomEvent('orbit:set-shell-tab', { detail: 'askai' }));
    if (step.action === 'tab-progress') window.dispatchEvent(new CustomEvent('orbit:set-shell-tab', { detail: 'progress' }));
    lastActionStepRef.current = step.id;
  }, [mounted, completed, step]);

  // Cleanup on unmount / completion
  useEffect(() => {
    return () => { setWalkthroughActive(false); };
  }, []);

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
    const block: ScrollLogicalPosition = step.placement === 'below' ? 'start' : 'center';
    el.scrollIntoView({ behavior: "smooth", block, inline: "center" });
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
    const id2 = setTimeout(recompute, 700);
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      clearTimeout(id);
      clearTimeout(id2);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [mounted, completed, recompute]);

  const finish = useCallback(() => {
    setWalkthroughActive(false);
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

  // Compute card position avoiding overlap with target
  const clampLeft = (left: number) =>
    Math.min(Math.max(16, left), vw - CARD_WIDTH - 16);

  let cardStyle: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
    width: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
    zIndex: 2147483647,
  };

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const centerLeft = clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2);
    const fitsBelow = spaceBelow >= CARD_HEIGHT_ESTIMATE + GAP;
    const fitsAbove = spaceAbove >= CARD_HEIGHT_ESTIMATE + GAP;

    if (fitsBelow) {
      cardStyle = {
        position: "fixed",
        top: rect.top + rect.height + GAP,
        left: centerLeft,
        maxWidth: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        width: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        zIndex: 2147483647,
      };
    } else if (fitsAbove) {
      cardStyle = {
        position: "fixed",
        top: rect.top - CARD_HEIGHT_ESTIMATE - GAP,
        left: centerLeft,
        maxWidth: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        width: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        zIndex: 2147483647,
      };
    } else {
      // Neither side fits comfortably — pick the side with more space so the
      // card never sits on top of the spotlight target.
      const top =
        spaceAbove > spaceBelow
          ? Math.max(16, rect.top - CARD_HEIGHT_ESTIMATE - GAP)
          : Math.min(vh - CARD_HEIGHT_ESTIMATE - 16, rect.top + rect.height + GAP);
      cardStyle = {
        position: "fixed",
        top,
        left: centerLeft,
        maxWidth: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        width: `min(${CARD_WIDTH}px, calc(100vw - 32px))`,
        zIndex: 2147483647,
      };
    }
  }

  const spotlightInteractive = !step.interactive;

  const overlay = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483600, pointerEvents: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {rect ? (
        <>
          {/* Dim layer with a cut-out so the spotlighted element stays bright */}
          <div
            onClick={spotlightInteractive ? next : undefined}
            style={{
              position: "fixed",
              inset: 0,
              background: "hsl(var(--background) / 0.88)",
              backdropFilter: "blur(2px)",
              pointerEvents: spotlightInteractive ? 'auto' : 'none',
              clipPath: `polygon(
                0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                ${rect.left}px ${rect.top}px,
                ${rect.left}px ${rect.top + rect.height}px,
                ${rect.left + rect.width}px ${rect.top + rect.height}px,
                ${rect.left + rect.width}px ${rect.top}px,
                ${rect.left}px ${rect.top}px
              )`,
              transition: "clip-path 250ms ease, background 250ms ease",
            }}
          />
          {/* Outline ring around the spotlighted element (no background) */}
          <div
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 14,
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 0 0 4px hsl(var(--primary) / 0.25)",
              pointerEvents: 'none',
              transition: "all 250ms ease",
            }}
          />
        </>
      ) : (
        <div
          onClick={next}
          style={{
            position: "fixed",
            inset: 0,
            background: "hsl(var(--background) / 0.88)",
            backdropFilter: "blur(2px)",
            pointerEvents: 'auto',
          }}
        />
      )}

      <div
        style={{ ...cardStyle, pointerEvents: 'auto' }}
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

        {step.component === 'profile-setup' && (
          <div className="mb-4">
            <WalkthroughProfileSetup onDone={next} />
          </div>
        )}


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
