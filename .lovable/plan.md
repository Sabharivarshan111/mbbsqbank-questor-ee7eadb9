
The user wants the "No essays found" warning (currently shown for 1st/2nd/3rd year subtopics when essays are absent but short notes exist) to also apply to Final Year subtopics.

Looking at `src/components/QuestionSection.tsx`:
```ts
const isNonFinalYear = yearKey && yearKey !== "final-year";
...
if (activeTab === "essay" && !hasEssays && hasShortNotes && isNonFinalYear) {
  // show warning
}
```

The warning is explicitly disabled for `final-year`. To enable it for Final Year too, I just need to remove the `isNonFinalYear` restriction so the warning shows for ALL years when:
- on the Essay tab
- no essays exist
- short notes exist

## Plan

**File to edit:** `src/components/QuestionSection.tsx`

**Change:** Remove the `isNonFinalYear` check so the "No essays found" message renders for Final Year subtopics (e.g., Ophthalmology > Diseases of vitreous, Ocular motility, etc.) just like it does for 1st/2nd/3rd year.

Specifically:
- Drop the `const isNonFinalYear = ...` line.
- Update the condition to: `if (activeTab === "essay" && !hasEssays && hasShortNotes)`.

All other features (essay/short-notes rendering, search, swipe tabs, theme styles) remain untouched.

No other files need changes — `yearKey` is already passed through from the parent components, but the gating is purely inside `QuestionSection.tsx`.

## Memory update

I'll also update `mem://features/navigation` to reflect that the "No essays found" fallback now applies to ALL years, including Final Year.
