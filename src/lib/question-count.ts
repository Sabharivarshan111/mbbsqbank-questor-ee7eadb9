type Tab = "essay" | "short-notes";

export function countQuestions(node: any, tab: Tab): number {
  if (!node || typeof node !== "object") return 0;

  // Leaf with questions array
  if (Array.isArray(node.questions)) return node.questions.length;

  // Container with .subtopics
  if (node.subtopics && typeof node.subtopics === "object") {
    return countQuestions(node.subtopics, tab);
  }

  // Object map of children
  let total = 0;
  for (const [key, value] of Object.entries(node)) {
    if (key === "name") continue;
    if (tab === "essay") {
      if (key === "essay") total += countQuestions(value, tab);
      else if (key !== "short-note" && key !== "short-notes")
        total += countQuestions(value, tab);
    } else {
      if (key === "short-note" || key === "short-notes")
        total += countQuestions(value, tab);
      else if (key !== "essay") total += countQuestions(value, tab);
    }
  }
  return total;
}
