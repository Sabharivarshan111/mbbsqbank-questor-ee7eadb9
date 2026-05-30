## Goal
Clean up the homepage so nothing appears below the footer links / creator credit (the area below the green line in your screenshot).

## Plan
In `src/pages/Index.tsx`, remove everything that currently renders below the footer credit row:
- The first `AdBanner` (between footer and hero)
- `HeroSection`
- `WhyChooseUs`
- `ExploreMoreSection`
- The bottom `AdBanner`

Also remove the now-unused imports (`AdBanner`, `HeroSection`, `WhyChooseUs`, `ExploreMoreSection`).

The footer links (Privacy Policy, Terms of Service, About, Study Guides, FAQ) already use `<Link>` from react-router and route to their own dedicated pages, so tapping them already opens a separate page — no extra change needed.

## Out of scope
- No changes to the existing pages (`/about`, `/blog`, `/faq`, etc.) themselves.
- No changes to QuestionBank, AiChat, PomodoroTimer, or theming.