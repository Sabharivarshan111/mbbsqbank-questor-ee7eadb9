import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "app_info",
  title: "App info",
  description: "Get information about the ORBIT MBBS QBANK app, its features, and available study content.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          name: "ORBIT MBBS QBANK",
          description:
            "Medical education platform for MBBS students with question bank, MCQs, AI medical assistant, spaced-repetition revision, Pomodoro timer, streaks & XP.",
          url: "https://mbbsqbank-questor.lovable.app",
          features: [
            "Subject-wise question bank across MBBS subjects (Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology, Community Medicine, Forensic Medicine, ENT, Ophthalmology, Orthopaedics, Paediatrics, OBG, General Medicine, General Surgery)",
            "AI Medical Assistant chat",
            "Auto-generated MCQs from subtopics",
            "Progress tracking, streaks, XP, and leaderboard",
            "Pomodoro study timer",
            "Spaced-repetition revision queue",
          ],
        }),
      },
    ],
  }),
});
