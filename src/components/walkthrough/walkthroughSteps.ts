export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  action?: 'open-custom-theme';
  interactive?: boolean;
  placement?: 'below' | 'above' | 'auto';
}

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to ORBIT MBBS QBANK 👋",
    description:
      "Let's take a quick 60-second tour so you don't miss any of the features built for you.",
  },
  {
    id: "qbank",
    title: "Question Bank",
    description:
      "Browse thousands of MCQs and short answers across every MBBS subject — organized by year, subject and topic.",
    targetSelector: '[data-tour="question-bank"]',
  },
  {
    id: "ai-chat",
    title: "AI Medical Assistant",
    description:
      "Ask any medical question or generate custom MCQs. Tap the expand icon at the top-right of the chat to open it in fullscreen.",
    targetSelector: '[data-tour="ai-chat"]',
  },
  {
    id: "theme-toggle",
    title: "Themes — Light, Dark & More",
    description:
      "Tap here to switch between Dark, Light, Black Pink and Liquid Glass themes.",
    targetSelector: '[data-tour="theme-toggle"]',
  },
  {
    id: "custom-theme",
    title: "Create Your Own Theme 🎨",
    description:
      "This is the Create-Your-Own-Theme panel. Tap any swatch to pick your background, text, accent and card colors — your theme applies instantly. Tap Next when you're done exploring.",
    targetSelector: '[data-tour="custom-theme-dialog"]',
    action: 'open-custom-theme',
  },
  {
    id: "font-size",
    title: "Change Font Size",
    description:
      "Tap A− / A+ to change font size (small, medium, large) everywhere in the app.",
    targetSelector: '[data-tour="font-size"]',
  },
  {
    id: "pomodoro-pill",
    title: "Pomodoro Study Timer",
    description:
      "This floating pill is your study timer. Tap the play button to start a focus session.",
    targetSelector: '[data-tour="pomodoro-pill"]',
  },
  {
    id: "pomodoro-drag",
    title: "Drag the Timer Anywhere",
    description:
      "Touch and hold the pill for a moment, then drag it wherever you like — top, bottom, corners, anywhere. Try it now, then tap Next.",
    targetSelector: '[data-tour="pomodoro-pill"]',
    interactive: true,
  },
  {
    id: "pomodoro-settings",
    title: "Pomodoro Settings ⚙️",
    description:
      "Tap the gear icon to change focus & break durations, sound and vibration. Use 'Set this configuration' to apply your custom timings, or 'Reset pomodoro cycle' to restore the defaults.",
    targetSelector: '[data-tour="pomodoro-settings"]',
  },
  {
    id: "pomodoro-close",
    title: "Hide the Timer",
    description:
      "Tap × to hide the timer pill. A small floating button appears so you can bring it back anytime.",
    targetSelector: '[data-tour="pomodoro-close"]',
  },
  {
    id: "report-issue",
    title: "Report an Issue 💬",
    description:
      "Found a bug or have feedback? Tap the creator's name in the footer to report any issue directly.",
    targetSelector: '[data-tour="report-issue"]',
    placement: 'below',
  },
];
