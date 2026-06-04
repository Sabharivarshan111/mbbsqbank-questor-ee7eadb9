## Goal

Cross-verify the uploaded `PSM_QbankV4_MedicosZoneOfficial.txt` against `src/data/topics/communityMedicine.ts` and **enrich** the existing bank:

- Keep ALL existing subtopics in Paper 1 & Paper 2 exactly as-is (names, keys, order).
- Keep ALL existing questions exactly as-is — nothing gets removed or reworded.
- For each text-file question that already exists in the bank: update the year list + asterisk count to reflect new repeat-year tags from the text file (only additions, never reductions).
- For each genuinely new text-file question: append it to the most appropriate existing subtopic under the matching tab (Essay or Short Notes).
- Skip all MCQs entirely.

## Approach

1. **Parse the text file** with a Python script:
   - Split by chapter headers ("1. EVOLUTION OF…", etc.) for Paper I and Paper II.
   - Within each chapter, extract only `ESSAYS` and `SHORT NOTES` sections (stop at `MULTIPLE CHOICE QUESTIONS`/`MCQ ANSWERS`/next chapter).
   - Strip page headers/footers (`PRE FINAL YEAR MBBS`, page numbers, decorative `☬ ... ⚚` lines).
   - Stitch wrapped lines so each numbered item becomes one string, preserving year list + ★ count.

2. **Map text-file chapters → existing subtopic keys.** Fixed mapping (no new subtopics created):

   Paper I:
   - Ch 1 Evolution / Concepts of health and disease → `man-and-medicine` + `concepts-in-health-disease` (questions routed by topic keyword)
   - Ch 2 Environment and health → `environment-and-health`
   - Ch 3 Health education and communication → `communication-for-health-education`
   - Ch 4 Nutrition and health → `nutrition-and-health`
   - Ch 5 Occupational health → `occupational-health`
   - Ch 6 Medical sociology → `medicine-social-science`
   - Ch 7 Mental health → `mental-health`
   - Ch 8 Biostatistics and health information → `health-information-medical-statistics`
   - Ch 9 Basic epidemiology / infectious disease epidemiology → `principles-methods-of-epidemiology`
   - Ch 10 Screening for diseases → `screening-for-disease`
   - Ch 11 Tribal health in India → `medicine-social-science` (no dedicated subtopic; closest existing fit)
   - Ch 12 Hospital waste management → `hospital-waste-management`

   Paper II:
   - Ch 1 Epidemiology of specific diseases → split between `epidemiology-of-communicable-diseases` and `epidemiology-of-non-communicable-diseases` based on the disease named in each question.
   - Ch 2 Demography and family planning → `demography-family-planning`
   - Ch 3 Reproductive and child health, Ch 4 Preventive geriatrics, Ch 5 School health → `obstetrics-pediatrics-geriatrics`
   - Ch 6 Health system; Health care of the community → `health-care-of-community`
   - Ch 7 Health planning / disaster management → `disaster-management` (planning items folded into same subtopic — no new subtopic)
   - Ch 8 International health → `international-health`
   - Ch 9 National health programmes → `health-programmes-sdg-mdg`
   - Ch 10 Essential medicines and counterfeit medicines → `health-programmes-sdg-mdg` (closest existing fit; no new subtopic)
   - Ch 11 Genetics and health → `genetics-health`

3. **De-duplicate against existing questions.** For each text-file question:
   - Normalize (lowercase, strip numbering/years/★/punctuation) and compare against every existing question's normalized form within the target subtopic + tab.
   - If a match is found → keep the existing question text, but merge in any new year tags from the text file and recompute the trailing `*` count to equal total distinct year tags (existing dates union new dates). Pg references preserved.
   - If no match → append the new question at the end of the same subtopic+tab `questions` array, formatted to match existing style: `"N. <text> (Years) ***"` with `N` continuing the existing numbering. No `[Pg.no.X]` is added (the new text file does not provide page numbers consistently).

4. **Write back `src/data/topics/communityMedicine.ts`** preserving the existing file's structure, indentation, and all unchanged content. Only `questions` arrays inside matched subtopics are modified (additions + asterisk-count updates).

5. **Verify** with `bunx tsc --noEmit` and a small diff summary (count of new questions added per subtopic, count of asterisk-count updates) printed to console.

## Guarantees

- No existing question removed, reworded, or reordered.
- No subtopic added, renamed, or removed.
- No MCQs added.
- Essay/Short Notes counts only ever grow or stay the same.
- Asterisk counts only ever grow or stay the same.

## Technical details

- Parser: Python script in `/tmp/parse_psm.py` reading `/mnt/user-uploads/PSM_QbankV4_MedicosZoneOfficial.txt`.
- Generator: Python script reads the current `communityMedicine.ts`, parses each `questions: [ ... ]` array, applies the merge, and rewrites only those array blocks (string-replace by exact match), leaving every other byte of the file untouched.
- Asterisk char used in additions: `*` (ASCII) to match the existing file's convention (existing bank uses `*`, not `★`).
- Routing for Ch 1 Paper I and Ch 1 Paper II uses keyword rules (e.g. "public health" / "concepts" → `man-and-medicine`/`concepts-in-health-disease`; disease names → communicable vs non-communicable).
