import { defineMcp } from "@lovable.dev/mcp-js";
import appInfoTool from "./tools/app-info";
import listSubjectsTool from "./tools/list-subjects";
import askMedicalAiTool from "./tools/ask-medical-ai";

export default defineMcp({
  name: "orbit-mbbs-qbank-mcp",
  title: "ORBIT MBBS QBANK",
  version: "0.1.0",
  instructions:
    "Tools for the ORBIT MBBS QBANK medical study app. Use `app_info` to describe the app, `list_subjects` to see MBBS subjects, and `ask_medical_ai` to query the app's medical AI assistant.",
  tools: [appInfoTool, listSubjectsTool, askMedicalAiTool],
});
