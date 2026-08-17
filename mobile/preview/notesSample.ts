import type { NotesContent } from '@/lib/handwrittenNotes';

/**
 * A fixture for reviewing the handwritten-notes renderer.
 *
 * PREVIEW ONLY. Nothing in `preview/` is bundled into the APK — Metro never
 * sees this file. It exists because the real notes come from the
 * generate-handwritten-notes edge function, which costs AI quota, takes minutes
 * for a large topic (batches of 10 with 25-second pauses), and is unreachable
 * from a sandbox. Reviewing a layout change should not require any of that.
 *
 * It deliberately exercises every branch in NotesContentView — definition,
 * text, bullets, steps, morphology, comparison, table, flowchart, outcome,
 * revision — plus the high-yield banner and the PYQ badges, so a regression in
 * any one of them shows up.
 *
 * The content is standard textbook material on myocardial infarction, matching
 * the first essay in Final Year → General Medicine → Cardiology. It is a
 * rendering fixture, not teaching material, and is never shown to a user.
 */
export const SAMPLE_NOTES: NotesContent = {
  highYieldTip:
    'Troponin is the most sensitive and specific marker. It rises at 3–4 hours, peaks at 24 hours and stays elevated for up to 10 days — so it is the marker of choice for late presentation.',
  pyqYears: ['2023', '2021', '2019', '2017'],
  sections: [
    {
      type: 'definition',
      title: 'Definition',
      payload: {
        text: 'Myocardial infarction is irreversible necrosis of heart muscle resulting from prolonged ischaemia, usually caused by acute thrombotic occlusion of a coronary artery following atherosclerotic plaque rupture.',
      },
    },
    {
      type: 'bullets',
      title: 'Risk factors',
      payload: {
        items: [
          'Modifiable — smoking, hypertension, diabetes mellitus, dyslipidaemia, obesity, sedentary lifestyle',
          'Non-modifiable — age, male sex, family history of premature coronary artery disease',
          'Smoking and diabetes carry the strongest attributable risk in the Indian population',
        ],
      },
    },
    {
      type: 'flowchart',
      title: 'Pathogenesis',
      payload: {
        steps: [
          'Atherosclerotic plaque forms in a coronary artery',
          'Plaque becomes unstable and its fibrous cap ruptures',
          'Platelet adhesion and aggregation over the exposed core',
          'Occlusive thrombus forms',
          'Ischaemia → myocyte necrosis within 20–40 minutes',
        ],
      },
    },
    {
      type: 'comparison',
      title: 'STEMI vs NSTEMI',
      payload: {
        left: 'STEMI',
        right: 'NSTEMI',
        rows: [
          { left: 'Complete occlusion', right: 'Partial occlusion' },
          { left: 'ST elevation, later Q waves', right: 'ST depression or T inversion' },
          { left: 'Transmural necrosis', right: 'Subendocardial necrosis' },
          { left: 'Immediate reperfusion', right: 'Risk-stratify, then angiography' },
        ],
      },
    },
    {
      type: 'table',
      title: 'Cardiac markers',
      payload: {
        columns: ['Marker', 'Rises', 'Peaks', 'Returns'],
        rows: [
          ['Troponin I/T', '3–4 h', '24 h', '7–10 days'],
          ['CK-MB', '4–6 h', '24 h', '48–72 h'],
          ['Myoglobin', '1–2 h', '6–8 h', '24 h'],
          ['LDH', '12–24 h', '3 days', '10–14 days'],
        ],
      },
    },
    {
      type: 'morphology',
      title: 'Morphology',
      payload: {
        subtitle: 'Gross and microscopic changes with time',
        items: [
          '0–12 h — no gross change; wavy fibres microscopically',
          '12–24 h — pallor; contraction band necrosis, early neutrophils',
          '1–3 days — yellow centre; dense neutrophilic infiltrate',
          '3–7 days — hyperaemic border; macrophages clear necrotic myocytes',
          '1–2 weeks — granulation tissue at the margins',
          '>2 months — dense collagenous scar',
        ],
      },
    },
    {
      type: 'steps',
      title: 'Immediate management',
      payload: {
        items: [
          'Airway, breathing, circulation; continuous ECG monitoring and IV access',
          'Aspirin 300 mg chewed, plus a second antiplatelet (clopidogrel or ticagrelor)',
          'Sublingual nitrate for pain, morphine if pain persists',
          'Oxygen only if saturation is below 90 per cent',
          'Reperfusion — primary PCI within 90 minutes, or thrombolysis if PCI is unavailable',
          'Start a beta blocker, statin and ACE inhibitor once stable',
        ],
      },
    },
    {
      type: 'bullets',
      title: 'Complications',
      payload: {
        items: [
          'Arrhythmias — ventricular fibrillation is the commonest cause of early death',
          'Cardiogenic shock, acute left ventricular failure',
          'Mechanical — papillary muscle rupture, ventricular septal rupture, free wall rupture',
          'Dressler syndrome — autoimmune pericarditis weeks after the event',
          'Ventricular aneurysm and mural thrombus',
        ],
      },
    },
    {
      type: 'outcome',
      title: 'Prognosis',
      payload: {
        text: 'Early reperfusion is the single strongest determinant of outcome. Mortality falls sharply when the artery is opened within the first two hours — hence "time is muscle".',
      },
    },
    {
      type: 'revision',
      title: 'Last-minute revision',
      payload: {
        items: [
          'Troponin — most sensitive and specific; CK-MB is best for re-infarction',
          'VF is the commonest cause of death in the first hour',
          'Door-to-balloon target is 90 minutes',
          'Free wall rupture occurs 3–7 days in, when the infarct is softest',
        ],
      },
    },
  ],
};
