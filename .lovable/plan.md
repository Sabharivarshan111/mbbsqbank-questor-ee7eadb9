# Plan: 4 retention-boosting features for ORBIT MBBS QBank

Builds on existing year-scoped XP, IST resets, cross-device sync, and Gemini chat. All four features are year-scoped, cloud-synced, and update in realtime.

---

## 1. Spaced-Repetition Revision Queue (SM-2 lite)

**What the user sees**
- New "Revise" pill on the Progress tab: *"12 due today · 3 overdue"*.
- Tap → full-screen reviewer: shows the question, "Show answer" reveals the essay/short-note, then 4 buttons: **Again / Hard / Good / Easy**.
- Buttons schedule next review (1d / 3d / 7d / 14d, doubled on each Good, reset to 1d on Again).
- Every ticked question is auto-enrolled at "due tomorrow".

**Data**
- New table `revision_schedule(user_id, question_id, year, ease, interval_days, due_date, last_reviewed_at)` with RLS = `auth.uid() = user_id` + GRANTs.
- Trigger-equivalent: extend `record_question_done` RPC to also insert a row with `due_date = today + 1`.
- New RPC `review_question(_question_id, _grade)` to apply SM-2 update and return next due date.
- `record_question_undone` already exists → also delete the schedule row.

**UI surfaces**
- `src/components/progress/ReviseDueCard.tsx` (new) on Progress dashboard.
- `src/components/progress/ReviewSession.tsx` (new) — full-screen reviewer.
- Realtime: subscribe to `revision_schedule` so phone/tablet stay in sync.

---

## 2. Exam Countdown + Daily Target

**What the user sees**
- New "Exam date" tile in Progress (per-subject optional, plus a default "Main exam").
- Shows `D-42 days · 18 Q/day to finish syllabus`.
- Number updates live as you tick questions.
- Pomodoro pill gains a second small line under reminders: `🎯 18 left today` (only if a target exists, hides at 0).

**Data**
- New table `exam_targets(user_id, year, subject, exam_date, created_at)` — `subject` nullable means "overall". RLS = `auth.uid() = user_id` + GRANTs.
- Daily target computed client-side: `(total_questions_in_scope − ticked_in_scope) / days_remaining`, ceil.
- "Done today" read from existing `daily_activity.questions_done`.

**UI surfaces**
- `src/components/progress/ExamCountdownCard.tsx` (new).
- `src/components/PomodoroTimer.tsx` — add `🎯 N left today` line, same conditional pattern as reminders.

---

## 3. AI "Quiz Me" from ticked subtopics

**What the user sees**
- New "Quiz me" button on every subtopic header (only enabled when ≥ 3 questions are ticked in that subtopic).
- Generates 5 MCQs via Gemini grounded on the subtopic's essay/short-note text.
- Each MCQ scored; results: `4/5 · +4 XP`. Wrong questions automatically inserted into the SR queue at `due tomorrow`.
- Re-uses existing `McqCard.tsx` for rendering.

**Backend**
- New edge function `supabase/functions/quiz-from-subtopic/index.ts` using Gemini via Lovable AI Gateway (`google/gemini-3-flash-preview`) with `Output.object` schema for strict 5-MCQ JSON.
- Input: `{ year, topic, subtopic, questionType }`. Server looks up the matching content from a small JSON registry (mirrors `questionBankData`) and passes the source text to the model. No client-side prompt injection.

**UI surfaces**
- `src/components/question-bank/QuizMeButton.tsx` (new), placed in `SubtopicAccordion.tsx`.
- `src/components/question-bank/QuizSession.tsx` (new) — sheet that walks through the 5 MCQs.
- XP awarded by calling existing `record_questions_done` with synthetic IDs is wrong — instead award via a new dedicated `award_quiz_xp(_amount)` RPC that adds to `weekly_xp` + `daily_activity` only (does NOT pollute `question_progress`).

---

## 4. Weak-topic heatmap + Streak Freeze

**Heatmap**
- New section on Progress: grid of all subjects for the current year, each cell colored by coverage % (red → amber → green) with a small recency dot (gray if not opened in 14 days).
- Tap a cell → opens that subject in the QBank tab (dispatches existing `orbit:switch-tab` event with the subject pre-expanded).
- Pure client-side calc from `question-progress` local cache + `daily_activity` for recency. No new tables.

**Streak Freeze**
- Profile gains `streak_freezes_available INT DEFAULT 0` and `streak_freezes_used_week DATE`.
- Each Monday (IST), `register_open()` grants +1 freeze, capped at 2.
- If `register_open()` detects a 1-day gap AND `streak_freezes_available > 0`, it consumes 1 freeze and **keeps the streak** instead of resetting. Returns a flag so the UI can toast: *"❄️ Streak freeze used — you're safe!"*.
- New tile in `StreakXPCard.tsx`: `❄️ 1 freeze available`.

**UI surfaces**
- `src/components/progress/WeakTopicHeatmap.tsx` (new).
- `src/components/progress/StreakXPCard.tsx` — add freeze badge.
- `src/hooks/use-profile.ts` — surface the "freeze used" toast.

---

## Technical section

**Migrations (one combined)**
- `CREATE TABLE revision_schedule` + GRANTs + RLS + policies + ADD TO `supabase_realtime`.
- `CREATE TABLE exam_targets` + GRANTs + RLS + policies.
- `ALTER TABLE profiles ADD COLUMN streak_freezes_available INT NOT NULL DEFAULT 0, ADD COLUMN streak_freezes_granted_week DATE`.
- Update RPCs: `record_question_done`, `record_questions_done`, `record_question_undone` (revision schedule sync), `register_open` (freeze grant + consume), plus new `review_question`, `award_quiz_xp`.

**Cross-device sync**
- Extend `merge_into_current_user` RPC to move `revision_schedule` and `exam_targets` rows from old → new user, mirroring the existing pattern.

**Edge function**
- `quiz-from-subtopic` follows the project's existing Gemini pattern (same shape as `ask-gemini`), uses `LOVABLE_API_KEY`, no new secrets needed.

**Realtime**
- `revision_schedule` and `exam_targets` added to `supabase_realtime` publication so ticking on phone instantly updates "Due today" on tablet.

**Order of build**
1. Migration (all schema + RPC changes in one go).
2. Streak Freeze (smallest, touches existing card).
3. Exam Countdown (new card + Pomodoro line).
4. SR Queue (new table-driven UI).
5. AI Quiz Me (edge function + sheet).
6. Weak-topic heatmap (pure derived UI, last).

**Out of scope (not in this plan)**
- Push notifications, image-occlusion cards, PYQ tagger, TTS read-aloud, friends-only leaderboard, PDF export. Happy to plan any of these next.
