
## Goal

Reorganize topics in **Community Medicine → Paper 1 / Paper 2** so they match the official syllabus in your reference image. Right now several topics sit under the wrong paper, which confuses users about what's testable where.

## What's misplaced (current vs. correct)

**Currently in Paper 1, should move to Paper 2:**
| Topic | Reason (per image) |
|---|---|
| EPIDEMIOLOGY OF COMMUNICABLE DISEASES | Paper II #1 — "Epidemiology of specific diseases communicable and non communicable" |
| EPIDEMIOLOGY OF NON-COMMUNICABLE DISEASES | Paper II #1 |
| HEALTH PROGRAMMES [SDG & MDG] | Paper II #9 — "National health programmes" |

**Currently in Paper 2, should move to Paper 1:**
| Topic | Reason (per image) |
|---|---|
| NUTRITION AND HEALTH | Paper I #4 |
| MEDICINE & SOCIAL SCIENCE | Paper I #6 — Medical sociology |
| COMMUNICATION FOR HEALTH EDUCATION | Paper I #3 — Health education and communication |
| MENTAL HEALTH | Paper I #7 |
| HOSPITAL WASTE MANAGEMENT | Paper I #12 |

**Already correct (no change):**
- Paper 1: MAN & MEDICINE, CONCEPTS IN HEALTH & DISEASE, PRINCIPLES & METHODS OF EPIDEMIOLOGY (basic epi), SCREENING FOR DISEASE, ENVIRONMENT & HEALTH, OCCUPATIONAL HEALTH, HEALTH INFORMATION & MEDICAL STATISTICS
- Paper 2: GENETICS & HEALTH, DEMOGRAPHY & FAMILY PLANNING, OBSTETRICS PEDIATRICS & GERIATRICS (RCH + preventive geriatrics + school health), DISASTER MANAGEMENT, HEALTH CARE OF COMMUNITY, INTERNATIONAL HEALTH

## Final layout after fix

```text
Community Medicine
├── Paper 1
│   ├── Man & Medicine
│   ├── Concepts in Health & Disease
│   ├── Environment & Health
│   ├── Health Education & Communication      ← moved from P2
│   ├── Nutrition and Health                  ← moved from P2
│   ├── Occupational Health
│   ├── Medicine & Social Science (Medical Sociology)  ← moved from P2
│   ├── Mental Health                         ← moved from P2
│   ├── Health Information & Medical Statistics
│   ├── Principles & Methods of Epidemiology
│   ├── Screening for Disease
│   ├── Hospital Waste Management             ← moved from P2
│   └── 2nd Paper Questions Asked in 1st Paper Univ Exam (meta — kept)
└── Paper 2
    ├── Epidemiology of Communicable Diseases     ← moved from P1
    ├── Epidemiology of Non-Communicable Diseases ← moved from P1
    ├── Demography & Family Planning
    ├── Obstetrics, Pediatrics & Geriatrics (RCH, school health, preventive geriatrics)
    ├── Health Care of Community
    ├── Health Programmes / National Health Programmes  ← moved from P1
    ├── Disaster Management
    ├── International Health
    ├── Genetics & Health
    └── 1st Paper Questions Asked in 2nd Paper (meta — kept)
```

I'll also reorder each paper's topics roughly to follow the image's numbering so navigation feels intuitive.

## Technical details

- **One file edited:** `src/data/topics/communityMedicine.ts`
- Pure data move: cut 8 topic blocks and paste them into the other paper. No schema/shape changes — every block keeps its `name`, `essay`, `short-notes`, and full questions array intact.
- No component changes. `QuestionBank`, `TopicAccordion`, `SubtopicAccordion`, `TypeAccordion`, `QuestionSection`, search, swipe tabs, theme, "No essays found" fallback, AI chat, MCQ generation — all continue working since they're agnostic to which paper a subtopic lives under.
- Keys stay unique within each paper (no collisions after the move).
- Footer "meta" sections (`2ND PAPER QUESTIONS ASKED IN 1ST PAPER...` etc.) stay in their original paper since they're historical exam-pattern notes, not syllabus topics.

## Risks / verification

- **Risk:** Question count per paper changes — expected and desired.
- **Verify after change:** Open Community Medicine → Paper 1 and Paper 2 in the preview, confirm topics appear under the right paper, expand a few subtopics to ensure essay + short-notes questions still render, run a search like "nutrition" to confirm it now surfaces under Paper 1.
