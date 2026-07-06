import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ask_medical_ai",
  title: "Ask medical AI",
  description:
    "Ask the ORBIT MBBS QBANK medical AI assistant a question. Returns an educational answer suitable for MBBS study. Not medical advice.",
  inputSchema: {
    prompt: z
      .string()
      .min(1)
      .max(4000)
      .describe("The medical/study question to ask (max 4000 chars)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ prompt }) => {
    const url = "https://pmtgeydtqypwrypshhsx.supabase.co/functions/v1/ask-ai";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) {
        return { content: [{ type: "text", text: data.error }], isError: true };
      }
      return {
        content: [{ type: "text", text: data.response ?? "No response" }],
        structuredContent: { response: data.response },
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to reach AI: ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
});
