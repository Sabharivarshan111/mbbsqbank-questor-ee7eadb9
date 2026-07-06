import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUBJECTS = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Community Medicine",
  "Forensic Medicine",
  "ENT",
  "Ophthalmology",
  "Orthopaedics",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "General Medicine",
  "General Surgery",
];

export default defineTool({
  name: "list_subjects",
  title: "List subjects",
  description: "List all MBBS subjects available in the ORBIT MBBS QBANK question bank.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify({ subjects: SUBJECTS }) }],
    structuredContent: { subjects: SUBJECTS },
  }),
});
