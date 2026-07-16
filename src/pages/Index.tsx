import { useCallback, useEffect, useState } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import PomodoroTimer from "@/components/PomodoroTimer";
import { SEOHead } from "@/components/SEOHead";
import { Walkthrough } from "@/components/walkthrough/Walkthrough";
import BottomNav, { type ShellTab } from "@/components/shell/BottomNav";
import HomeTab from "@/components/shell/HomeTab";
import NotesTab from "@/components/shell/NotesTab";
import TimerTab from "@/components/shell/TimerTab";
import AskAiTab from "@/components/shell/AskAiTab";
import ProgressTab from "@/components/shell/ProgressTab";
import BrowseTab from "@/components/shell/BrowseTab";

const Index = () => {
  const [tab, setTab] = useState<ShellTab>("home");
  const [aiInitialQuestion, setAiInitialQuestion] = useState<string | undefined>(undefined);
  const [askAiKey, setAskAiKey] = useState(0);
  const [browseMeta, setBrowseMeta] = useState<{ subject?: string; year?: string; focus?: "search" } | undefined>(undefined);

  const goTo = useCallback((next: ShellTab, meta?: any) => {
    if (next === "browse") setBrowseMeta(meta ?? {});
    setTab(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Route triple-tap / double-tap AI events to the Ask AI tab.
  useEffect(() => {
    const routeToAi = (rawQuestion: string, mcq: boolean) => {
      const q = mcq
        ? `Double-tapped: Generate 10 USMLE/NEET PG style MCQs on ${rawQuestion}`
        : rawQuestion;
      setAiInitialQuestion(q);
      setAskAiKey((k) => k + 1);
      setTab("askai");
    };
    const onTriple = (e: Event) => {
      const q = (e as CustomEvent).detail?.question;
      if (q) routeToAi(q, false);
    };
    const onDouble = (e: Event) => {
      const q = (e as CustomEvent).detail?.question;
      if (q) routeToAi(q, true);
    };
    window.addEventListener("ai-triple-tap-answer", onTriple);
    window.addEventListener("ai-double-tap-mcq", onDouble);
    return () => {
      window.removeEventListener("ai-triple-tap-answer", onTriple);
      window.removeEventListener("ai-double-tap-mcq", onDouble);
    };
  }, []);

  // Legacy sub-tab hint (progress / materials / essay / short-notes) → shell tabs
  useEffect(() => {
    const h = (e: Event) => {
      const sub = (e as CustomEvent<string>).detail;
      if (sub === "progress") setTab("progress");
      else if (sub === "materials") setTab("notes");
      else if (sub === "essay" || sub === "short-notes") setTab("browse");
    };
    window.addEventListener("orbit:set-tab", h);
    return () => window.removeEventListener("orbit:set-tab", h);
  }, []);

  return (
    <div className="bg-background min-h-screen overflow-x-hidden relative">
      <SEOHead
        title="ORBIT MBBS QBANK - Free Medical Question Bank with AI Assistant"
        description="Free comprehensive MBBS question bank covering Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, and more with an AI study assistant."
        keywords="MBBS question bank, medical MCQ, NEET PG preparation, anatomy questions, pharmacology MCQ, pathology questions"
      />
      <InstallPrompt />

      <main
        className="mx-auto max-w-2xl px-4 pt-3"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        {/* Keep Ask AI mounted to preserve chat state across tabs */}
        <div style={{ display: tab === "home" ? "block" : "none" }}>
          <HomeTab onNavigate={goTo} />
        </div>
        <div style={{ display: tab === "notes" ? "block" : "none" }}>
          {tab === "notes" && <NotesTab />}
        </div>
        <div style={{ display: tab === "timer" ? "block" : "none" }}>
          {tab === "timer" && <TimerTab />}
        </div>
        <div style={{ display: tab === "askai" ? "block" : "none" }}>
          <AskAiTab initialQuestion={aiInitialQuestion} resetKey={askAiKey} />
        </div>
        <div style={{ display: tab === "progress" ? "block" : "none" }}>
          {tab === "progress" && <ProgressTab />}
        </div>
        <div style={{ display: tab === "browse" ? "block" : "none" }}>
          {tab === "browse" && <BrowseTab meta={browseMeta} />}
        </div>
      </main>

      <BottomNav active={tab} onChange={goTo} />

      <PomodoroTimer />
      <Walkthrough />
    </div>
  );
};

export default Index;
