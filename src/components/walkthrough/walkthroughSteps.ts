export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  action?: 'open-custom-theme' | 'open-theme-menu' | 'open-pomodoro-settings';
  interactive?: boolean;
  placement?: 'below' | 'above' | 'auto';
  pomodoro?: 'show' | 'minimize' | 'hide';
}

export const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to ORBIT MBBS QBANK 👋",
    description:
      "Let's take a quick 60-second tour so you don't miss any of the features built for you.",
    pomodoro: 'hide',
  },
  {
    id: "qbank",
    title: "Question Bank",
    description:
      "Browse thousands of MCQs and short answers across every MBBS subject — organized by year, subject and topic.",
    targetSelector: '[data-tour="question-bank"]',
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
