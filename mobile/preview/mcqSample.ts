/**
 * A fixture for reviewing the MCQ cards.
 *
 * PREVIEW ONLY — nothing in `preview/` reaches the APK; Metro never sees this
 * file.
 *
 * It is deliberately stored as the **raw string** a model returns rather than as
 * a typed array, wrapped in a markdown fence with a line of preamble in front.
 * That is what ask-gemini actually sends back however firmly the prompt says
 * "JSON only", so the preview exercises `parseMcqs` on realistic input instead
 * of handing the renderer pre-cleaned data and proving nothing.
 *
 * Content is standard cardiology material, matching the notes fixture.
 */
export const SAMPLE_MCQ_RESPONSE = `Here are 10 high-yield MCQs:

\`\`\`json
[
  {
    "topic": "Cardiac markers",
    "question": "A patient presents 8 days after chest pain. Which marker is most likely still elevated?",
    "options": { "A": "CK-MB", "B": "Myoglobin", "C": "Troponin T", "D": "LDH-5" },
    "correct": "C",
    "explanation": "Troponin stays elevated for 7-10 days, making it the marker of choice in late presentation. CK-MB and myoglobin normalise within 2-3 days."
  },
  {
    "topic": "Arrhythmia",
    "question": "What is the commonest cause of death in the first hour after myocardial infarction?",
    "options": { "A": "Cardiogenic shock", "B": "Ventricular fibrillation", "C": "Free wall rupture", "D": "Complete heart block" },
    "correct": "B",
    "explanation": "VF accounts for most pre-hospital deaths. Mechanical complications occur days later, not in the first hour."
  },
  {
    "topic": "Reperfusion",
    "question": "A STEMI patient reaches a PCI-capable centre. What is the target door-to-balloon time?",
    "options": { "A": "30 minutes", "B": "60 minutes", "C": "90 minutes", "D": "120 minutes" },
    "correct": "C",
    "explanation": "Guidelines set 90 minutes for primary PCI. Beyond that, thrombolysis should be considered if transfer is delayed."
  },
  {
    "topic": "Complications",
    "question": "Free wall rupture after myocardial infarction is most likely on which day?",
    "options": { "A": "Day 1", "B": "Day 3 to 7", "C": "Day 14", "D": "Day 30" },
    "correct": "B",
    "explanation": "The infarct is softest at 3-7 days, when macrophages have cleared necrotic myocytes but collagen has not yet formed."
  },
  {
    "topic": "ECG",
    "question": "ST depression with T wave inversion and raised troponin indicates which diagnosis?",
    "options": { "A": "STEMI", "B": "NSTEMI", "C": "Unstable angina", "D": "Pericarditis" },
    "correct": "B",
    "explanation": "Raised troponin plus ST depression is NSTEMI. Unstable angina has the same ECG but normal troponin."
  },
  {
    "topic": "Pathology",
    "question": "Which histological finding appears earliest after coronary occlusion?",
    "options": { "A": "Neutrophil infiltrate", "B": "Wavy myocardial fibres", "C": "Granulation tissue", "D": "Collagenous scar" },
    "correct": "B",
    "explanation": "Wavy fibres appear within the first hours, before any inflammatory infiltrate. Neutrophils arrive at 12-24 hours."
  },
  {
    "topic": "Management",
    "question": "When should supplemental oxygen be given in acute coronary syndrome?",
    "options": { "A": "Always", "B": "Only if saturation is below 90 percent", "C": "Only if the patient is breathless", "D": "Never" },
    "correct": "B",
    "explanation": "Routine oxygen offers no benefit and may cause coronary vasoconstriction. Give it only for documented hypoxaemia."
  },
  {
    "topic": "Dressler syndrome",
    "question": "A patient develops fever and pericarditis three weeks after myocardial infarction. What is the diagnosis?",
    "options": { "A": "Re-infarction", "B": "Dressler syndrome", "C": "Infective endocarditis", "D": "Pulmonary embolism" },
    "correct": "B",
    "explanation": "Dressler syndrome is an autoimmune pericarditis occurring weeks after infarction, presenting with fever, pleuritic pain and a friction rub."
  },
  {
    "topic": "Re-infarction",
    "question": "Which marker is best for detecting re-infarction four days after the initial event?",
    "options": { "A": "Troponin I", "B": "CK-MB", "C": "LDH", "D": "AST" },
    "correct": "B",
    "explanation": "CK-MB has already normalised by day 3, so a fresh rise is interpretable. Troponin is still elevated from the first event."
  },
  {
    "topic": "Risk factors",
    "question": "Which risk factor carries the highest attributable risk for coronary disease in the Indian population?",
    "options": { "A": "Obesity", "B": "Smoking and diabetes", "C": "Family history", "D": "Male sex" },
    "correct": "B",
    "explanation": "Smoking and diabetes dominate attributable risk and are both modifiable, which is why they are the first targets of prevention."
  }
]
\`\`\`

Good luck with your revision!`;
