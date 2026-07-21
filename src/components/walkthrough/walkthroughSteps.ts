export type WalkthroughAction =
  | 'tab-home'
  | 'tab-notes'
  | 'tab-timer'
  | 'tab-askai'
  | 'tab-progress';

export type WalkthroughComponent = 'profile-setup';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  action?: WalkthroughAction;
  interactive?: boolean;
  placement?: 'below' | 'above' | 'auto';
  component?: WalkthroughComponent;
}

/**
 * Walkthrough rebuilt for the new 5-tab bottom-nav shell:
 * Home · Notes · Timer · Ask AI · My Progress
 */
export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "profile-setup",
    title: "Welcome to ORBIT MBBS QBANK 👋",
    description:
      "First, tell us your name and year so we can personalise your feed, XP, streaks and leaderboard.",
    component: 'profile-setup',
    action: 'tab-home',
  },
  {
    id: "home-tab",
    title: "🏠 Home",
    description:
      "Your daily starting point — quick stats, subjects for your year, and shortcuts to everything Orbit offers.",
    targetSelector: '[data-tour="nav-home"]',
    action: 'tab-home',
    placement: 'above',
  },
  {
    id: "home-subjects",
    title: "Jump into a subject",
    description:
      "Tap any subject card to drill down into Papers → Topics → Essays / Short-notes. A rewarded ad plays only ONCE per day when you open essays or short-notes.",
    targetSelector: '[data-tour="home-subjects"]',
    action: 'tab-home',
  },
  {
    id: "notes-tab",
    title: "📝 Handwritten Notes",
    description:
      "AI-generated, exam-ready handwritten-style notes for every topic. Pick Year → Subject → Topic and we synthesise a study page from every essay & short note.",
    targetSelector: '[data-tour="nav-notes"]',
    action: 'tab-notes',
    placement: 'above',
  },
  {
    id: "timer-tab",
    title: "⏱️ Pomodoro Timer",
    description:
      "Full-screen focus timer. Tap the digits to set a custom minute count. See how many other students are studying with you right now.",
    targetSelector: '[data-tour="nav-timer"]',
    action: 'tab-timer',
    placement: 'above',
  },
  {
    id: "askai-tab",
    title: "🧠 Ask the Medical AI",
    description:
      "Ask any medical question or generate custom MCQs. Triple-tap any question anywhere in the app to jump here with the answer, or double-tap to generate MCQs.",
    targetSelector: '[data-tour="nav-askai"]',
    action: 'tab-askai',
    placement: 'above',
  },
  {
    id: "progress-tab",
    title: "🏆 My Progress",
    description:
      "Track XP, streaks, weak-topic heatmap, weekly & lifetime leaderboards, and revision queue. Opens with a one-time daily rewarded ad that keeps Orbit free.",
    targetSelector: '[data-tour="nav-progress"]',
    action: 'tab-progress',
    placement: 'above',
  },
  {
    id: "theme-toggle",
    title: "🎨 Themes",
    description:
      "Switch between Dark, Light, Black Pink, Liquid Glass — or design your own. Font size (A− / A+) is right beside it.",
    targetSelector: '[data-tour="theme-toggle"]',
    action: 'tab-home',
  },
];
