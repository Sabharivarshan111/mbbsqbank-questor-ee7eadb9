## Fix leaderboard ranking — XP first, streak only as tiebreaker

### Problem
When a user switches year (e.g. Final → First), their lifetime XP and streak travel with them. The current year leaderboard ranks by `year_xp DESC, lifetime xp DESC`, so a high‑lifetime user with **0 XP in the new year** still jumps above other 0‑XP users in that year. Streak is also visually prominent, reinforcing the unfairness.

The correct rule (per your description):
1. Rank by **questions solved in that year** (year_xp) — or weekly_xp on the weekly tab.
2. Only when year_xp ties, use **streak** as a tiebreaker.
3. Never let lifetime XP from another year boost rank inside a year leaderboard.

### Changes

**1. `get_year_leaderboard` (SQL function)**
- Change `ORDER BY COALESCE(yc.year_xp, 0) DESC, p.xp DESC`
- To `ORDER BY COALESCE(yc.year_xp, 0) DESC, p.streak DESC, p.display_name ASC`
- Lifetime xp no longer affects in‑year position.

**2. `get_weekly_leaderboard` (SQL function)**
- Change `ORDER BY COALESCE(wk.weekly_xp, 0) DESC, p.xp DESC`
- To `ORDER BY COALESCE(wk.weekly_xp, 0) DESC, p.streak DESC, p.display_name ASC`

**3. Global lifetime tab (`use-leaderboard.ts`, `all` branch)**
- Current: `.order("xp", { ascending: false })`
- Change to order by `xp DESC, streak DESC` (chain a second `.order("streak", { ascending: false })`).

**4. Client sort in `Leaderboard.tsx`**
- `rows.sort((a, b) => b.primary - a.primary)` → also tiebreak by streak: `b.primary - a.primary || b.streak - a.streak`.
- Keeps dedupe behavior unchanged.

### Files
- `supabase/migrations/<new>.sql` — `CREATE OR REPLACE FUNCTION` for both `get_year_leaderboard` and `get_weekly_leaderboard` with the new ORDER BY.
- `src/hooks/use-leaderboard.ts` — add streak as secondary order on the global query.
- `src/components/progress/Leaderboard.tsx` — tiebreak client sort by streak.

### Out of scope (kept as-is)
- Streak/XP/badges still display next to each row — only the ranking math changes.
- Year switching itself (already merges progress via `claim_or_merge_profile`); year_xp is computed from `question_progress.year`, so a Final‑year user who switches to First with no first‑year questions correctly has `year_xp = 0` and will now sit at the bottom of the First‑year board until they solve questions there.
