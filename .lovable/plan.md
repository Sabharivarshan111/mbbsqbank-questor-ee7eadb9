## Plan

1. **Fix the real cause of 0 XP in leaderboard**
   - Update the question checkbox flow so it uses the existing cloud-sync helper instead of only writing to localStorage.
   - This is why your dashboard can show 10/20 XP locally, but the leaderboard still shows 0 cloud XP.

2. **Upload existing local progress to cloud**
   - Add a safe bulk sync so any questions already marked done on the device are pushed to Supabase once the user has a profile/session.
   - Run this after onboarding/profile save and when the progress dashboard loads.
   - This fixes users who already have local XP before the bug fix.

3. **Add a bulk XP database function**
   - Create a Supabase RPC like `record_questions_done(_question_ids text[])`.
   - It will insert only new question IDs, count how many were newly added, then update:
     - profile lifetime XP
     - current week XP
     - year-scoped progress
   - Existing completed questions will not double-count.

4. **Make leaderboard refresh immediately**
   - Keep the Supabase realtime subscriptions.
   - Also listen for the local `question-progress-change` event and refetch after cloud sync, so the leaderboard updates without needing to reopen the page.
   - Add `question_progress` to the weekly leaderboard hook as an extra refresh trigger.

5. **Make rank/badge display use the correct XP**
   - Weekly tab will rank/show weekly XP, but the badge/rank tier should use the best available cloud XP for that row.
   - Lifetime tab will rank/show lifetime/year XP clearly.

## Technical details

- Main files to update:
  - `src/components/QuestionCard.tsx`
  - `src/lib/question-progress.ts`
  - `src/hooks/use-profile.ts`
  - `src/hooks/use-weekly-leaderboard.ts`
  - `src/hooks/use-leaderboard.ts`
  - `src/components/progress/Leaderboard.tsx`
- Supabase migration:
  - Add/replace an RPC for bulk local-to-cloud progress sync.
- I will not change unrelated profile, walkthrough, or study content behavior.