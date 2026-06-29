export type WalkthroughAction =
  | 'open-custom-theme'
  | 'open-theme-menu'
  | 'open-pomodoro-settings'
  | 'open-progress-tab'
  | 'open-qbank-tab'
  | 'open-materials-tab';

export type WalkthroughComponent = 'profile-setup';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  action?: WalkthroughAction;
  interactive?: boolean;
  placement?: 'below' | 'above' | 'auto';
  pomodoro?: 'show' | 'minimize' | 'hide';
  component?: WalkthroughComponent;
}

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "profile-setup",
    title: "Welcome to ORBIT MBBS QBANK 👋",
    description:
      "First, tell us your name and year so we can track your XP, streaks, and rank you on the leaderboard.",
    component: 'profile-setup',
    pomodoro: 'hide',
  },
  {
    id: "progress-tab",
    title: "Your Progress Tab",
    description:
      "This tab is your command center — track XP, build streaks, unlock badges, and climb the leaderboard.",
    targetSelector: '[data-tour="progress-tab"]',
    action: 'open-progress-tab',
    placement: 'below',
    pomodoro: 'hide',
  },
  {
    id: "xp-streaks",
    title: "XP & Streaks 🔥",
    description:
      "Earn +1 XP for every unique question you solve. Open the app daily to keep your streak alive — miss a day and it resets!",
    targetSelector: '[data-tour="streak-xp-card"]',
    action: 'open-progress-tab',
    pomodoro: 'hide',
  },
  {
    id: "streak-freeze",
    title: "Streak Freeze ❄️",
    description:
      "You earn 1 freeze every week (max 2). If you miss a day, a freeze is used automatically so your streak survives. The badge shows freezes available.",
    targetSelector: '[data-tour="streak-freeze"]',
    action: 'open-progress-tab',
    pomodoro: 'hide',
  },
  {
    id: "weak-topic-heatmap",
    title: "Weak-topic Heatmap 🟥🟩",
    description:
      "Red = weak, green = strong. Tap any subject tile to expand it and see exactly which subtopics need more work.",
    targetSelector: '[data-tour="weak-topic-heatmap"]',
    action: 'open-progress-tab',
    pomodoro: 'hide',
  },
  {
    id: "ranking-stats",
    title: "Badges & Ranks 🏆",
    description:
      "Unlock Bronze, Silver, Gold, Platinum, Diamond and Legendary badges as your XP grows. Streak badges too — Spark, Blaze, Inferno and more.",
    targetSelector: '[data-tour="rewards-shelf"]',
    action: 'open-progress-tab',
    pomodoro: 'hide',
  },
  {
    id: "leaderboard",
    title: "Leaderboard — Weekly & Lifetime",
    description:
      "See how you rank this week and all-time. Tap any name to view their stats and exactly how many questions you need to overtake them.",
    targetSelector: '[data-tour="leaderboard"]',
    action: 'open-progress-tab',
    pomodoro: 'hide',
  },
  {
    id: "qbank",
    title: "Question Bank",
    description:
      "Browse thousands of MCQs and short answers across every MBBS subject — organized by year, subject and topic.",
    targetSelector: '[data-tour="question-bank"] [data-tour="qbank-header"]',
    action: 'open-qbank-tab',
    placement: 'below',
    pomodoro: 'hide',
  },
  {
    id: "study-materials",
    title: "Study Materials 📚",
    description:
      "Tap here for curated notes, PDFs and reference material for every subject — all in one place.",
    targetSelector: '[data-tour="study-materials-tab"]',
    action: 'open-materials-tab',
    placement: 'below',
    pomodoro: 'hide',
  },
  {
    id: "ai-chat",
    title: "AI Medical Assistant",
    description:
      "Ask any medical question or generate custom MCQs right here.",
    targetSelector: '[data-tour="ai-chat"]',
    pomodoro: 'hide',
  },
  {
    id: "ai-chat-expand",
    title: "Expand the Chat to Fullscreen",
    description:
      "Tap this expand icon to open the AI chat in fullscreen for distraction-free conversations. Tap it again to shrink it back.",
    targetSelector: '[data-tour="ai-chat-expand"]',
    pomodoro: 'hide',
    placement: 'below',
  },
  {
    id: "theme-toggle",
    title: "Themes — Light, Dark & More",
    description:
      "Tap here to switch between Dark, Light, Black Pink and Liquid Glass themes.",
    targetSelector: '[data-tour="theme-toggle"]',
    pomodoro: 'hide',
  },
  {
    id: "theme-create-own",
    title: "Create Your Own Theme",
    description:
      "Inside the theme menu, tap 'Create Your Own…' to design your own colors. We've opened it for you — this is the option you'll use.",
    targetSelector: '[data-tour="theme-create-own"]',
    action: 'open-theme-menu',
    pomodoro: 'hide',
  },
  {
    id: "custom-theme",
    title: "Pick Your Own Colors 🎨",
    description:
      "Tap any swatch to pick your background, text, accent and card colors — your theme applies instantly. Tap Next when you're done exploring.",
    targetSelector: '[data-tour="custom-theme-dialog"]',
    action: 'open-custom-theme',
    pomodoro: 'hide',
  },
  {
    id: "custom-theme-apply",
    title: "Apply Your Theme ✅",
    description:
      "Once you've picked your colors, tap 'Apply Theme' to save and use your custom look across the whole app.",
    targetSelector: '[data-tour="custom-theme-apply"]',
    action: 'open-custom-theme',
    pomodoro: 'hide',
  },
  {
    id: "font-size",
    title: "Change Font Size",
    description:
      "Tap A− / A+ to change font size (small, medium, large) everywhere in the app.",
    targetSelector: '[data-tour="font-size"]',
    pomodoro: 'hide',
  },
  {
    id: "pomodoro-pill",
    title: "Pomodoro Study Timer",
    description:
      "This floating pill is your study timer. It always stays at the bottom so you can keep track of your focus session from anywhere in the app.",
    targetSelector: '[data-tour="pomodoro-pill"]',
    pomodoro: 'show',
  },
  {
    id: "pomodoro-start",
    title: "Start a Focus Session ▶️",
    description:
      "Tap the round ▶ Play button to begin a 25-minute focus session. The timer counts down and rings when time is up. Tap it again (now ⏸) to pause, and tap ↺ next to it to reset.",
    targetSelector: '[data-tour="pomodoro-start"]',
    pomodoro: 'show',
  },
  {
    id: "pomodoro-drag",
    title: "Drag the Timer Anywhere",
    description:
      "Touch and hold the pill for a moment, then drag it wherever you like — top, bottom, corners, anywhere. Try it now, then tap Next.",
    targetSelector: '[data-tour="pomodoro-pill"]',
    interactive: true,
    pomodoro: 'show',
  },
  {
    id: "pomodoro-settings",
    title: "Pomodoro Settings ⚙️",
    description:
      "We've opened the settings sheet for you. Here you can change focus & break durations, the alert sound, volume and vibration.",
    targetSelector: '[data-tour="pomodoro-settings-sheet"]',
    action: 'open-pomodoro-settings',
    pomodoro: 'show',
  },
  {
    id: "pomodoro-apply",
    title: "Set This Configuration",
    description:
      "After choosing your durations, tap 'Set this configuration' to apply your custom timings immediately.",
    targetSelector: '[data-tour="pomodoro-apply-config"]',
    action: 'open-pomodoro-settings',
    pomodoro: 'show',
  },
  {
    id: "pomodoro-close",
    title: "Hide the Timer",
    description:
      "Tap × to hide the timer pill. A small floating button appears so you can bring it back anytime.",
    targetSelector: '[data-tour="pomodoro-close"]',
    pomodoro: 'show',
  },
  {
    id: "report-issue",
    title: "Report an Issue 💬",
    description:
      "Found a bug or have feedback? Tap the creator's name in the footer to report any issue directly.",
    targetSelector: '[data-tour="report-issue"]',
    placement: 'below',
    pomodoro: 'hide',
  },
];
