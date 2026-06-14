
import { useState, useEffect, useCallback, useMemo } from "react";
import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { QuestionBankData } from "@/components/QuestionBank";

const SEARCH_DEBOUNCE_MS = 220;

export const useQuestionBank = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"progress" | "materials" | "essay" | "short-notes">("essay");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    setIsRendered(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Debounce the search query so the heavy filter walk doesn't run on every keystroke.
  useEffect(() => {
    if (searchQuery === debouncedQuery) return;
    const t = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, debouncedQuery]);

  const filterForTab = useCallback((type: "essay" | "short-notes", lowerQuery: string): QuestionBankData => {
    const result: QuestionBankData = {};
    const targetKey = type === "essay" ? "essay" : null;

    const filterQuestions = (questions: string[]): string[] | null => {
      const filtered: string[] = [];
      for (const q of questions) {
        if (q.toLowerCase().includes(lowerQuery)) filtered.push(q);
      }
      return filtered.length ? filtered : null;
    };

    const walk = (content: any): any | null => {
      if (!content || typeof content !== "object") return null;

      // Leaf bucket
      if (Array.isArray(content.questions)) {
        const f = filterQuestions(content.questions as string[]);
        return f ? { ...content, questions: f } : null;
      }

      // essay / short-notes container
      if ("essay" in content || "short-notes" in content || "short-note" in content) {
        const out: any = { ...content };
        let kept = false;

        if (type === "essay") {
          if (content.essay) {
            const r = walk(content.essay);
            if (r) { out.essay = r; kept = true; } else { delete out.essay; }
          }
          delete out["short-notes"];
          delete out["short-note"];
        } else {
          const key = "short-notes" in content ? "short-notes" : "short-note" in content ? "short-note" : null;
          if (key && content[key]) {
            const r = walk(content[key]);
            if (r) { out[key] = r; kept = true; } else { delete out[key]; }
          }
          delete out.essay;
        }

        return kept ? out : null;
      }

      if (content.subtopics && typeof content.subtopics === "object") {
        const subs: Record<string, any> = {};
        let kept = false;
        for (const [k, v] of Object.entries(content.subtopics)) {
          const r = walk(v);
          if (r) { subs[k] = r; kept = true; }
        }
        return kept ? { ...content, subtopics: subs } : null;
      }

      return null;
    };

    for (const [k, topic] of Object.entries(QUESTION_BANK_DATA)) {
      const r = walk(topic);
      if (r) result[k] = r;
    }
    return result;
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim() !== "") {
      setExpandedItems(Object.keys(QUESTION_BANK_DATA));
    } else {
      setExpandedItems([]);
    }
  }, [debouncedQuery]);

  const isSearching = debouncedQuery.trim().length > 0;
  const lowerQuery = useMemo(() => debouncedQuery.trim().toLowerCase(), [debouncedQuery]);

  // Always filter BOTH tabs while searching so we can suggest switching
  // to the other tab when the active one has no matches.
  const essayFilteredData = useMemo<QuestionBankData>(() => {
    if (!isSearching) return QUESTION_BANK_DATA as unknown as QuestionBankData;
    return filterForTab("essay", lowerQuery);
  }, [isSearching, lowerQuery, filterForTab]);

  const shortNotesFilteredData = useMemo<QuestionBankData>(() => {
    if (!isSearching) return QUESTION_BANK_DATA as unknown as QuestionBankData;
    return filterForTab("short-notes", lowerQuery);
  }, [isSearching, lowerQuery, filterForTab]);

  const essayHasResults = Object.keys(essayFilteredData).length > 0;
  const shortNotesHasResults = Object.keys(shortNotesFilteredData).length > 0;
  const activeHasResults = activeTab === "short-notes" ? shortNotesHasResults : essayHasResults;
  const otherTabHasResults =
    isSearching && !activeHasResults &&
    (activeTab === "essay" ? shortNotesHasResults : essayHasResults);
  const hasSearchResults = !isSearching || activeHasResults;
  const hasContentToDisplay = hasSearchResults;

  return {
    searchQuery,
    activeSearchQuery: debouncedQuery,
    isMobile,
    activeTab,
    expandedItems,
    hasSearchResults,
    otherTabHasResults,
    isSearching,
    isRendered,
    essayFilteredData,
    shortNotesFilteredData,
    hasContentToDisplay,
    setActiveTab,
    setExpandedItems,
    handleSearch,
  };
};
