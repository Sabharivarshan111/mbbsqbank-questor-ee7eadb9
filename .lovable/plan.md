

## Plan: Add "Ageing, Onco & Others" subtopic to General Medicine

### What
Add a new subtopic "Ageing, Onco & Others" under Final Year > General Medicine with a "Short Notes" section containing 10 questions (no Essay section for this subtopic).

### How
Edit `src/data/topics/generalMedicine.ts`:
- Before the closing `}` of the `subtopics` object (line 914), add a new `"ageing-onco-and-others"` entry
- Structure: `name` → `subtopics` → `short-notes` → `questions[]`
- 10 short note questions with page references, matching existing format

### Questions to add (Short Notes)
1. Sheehan syndrome (Page 989)
2. Delirium (Page 1359)
3. Emergency complications of cancer (Page NA)
4. Psychogeriatrics (Page NA)
5. Causes of falls in the elderly (Page NA)
6. Tumour marker (Page 1058)
7. Superior vena cava obstruction (Page NA)
8. Tumour lysis syndrome (Page 1072)
9. Anti-Phospholipid Syndrome (Page 0719)
10. HELLP syndrome (Page NA)

No existing code will be modified -- only appending a new subtopic block.

