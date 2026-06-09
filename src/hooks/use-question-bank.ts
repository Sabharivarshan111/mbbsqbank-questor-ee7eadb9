
import { useState, useEffect, useCallback, useMemo } from "react";
import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { QuestionBankData } from "@/components/QuestionBank";

const SEARCH_DEBOUNCE_MS = 180;

export const useQuestionBank = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"extras" | "essay" | "short-notes">("essay");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    setIsRendered(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
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

  const searchInQuestions = useCallback((questions: string[], lowerQuery: string): string[] | null => {
    let allMatch = true;
    const filtered: string[] = [];
    for (const q of questions) {
      if (q.toLowerCase().includes(lowerQuery)) {
        filtered.push(q);
      } else {
        allMatch = false;
      }
    }
    if (filtered.length === 0) return null;
    // Return original reference if nothing was pruned, to avoid needless allocations.
    return allMatch ? questions : filtered;
  }, []);

  const filterNestedContent = useCallback((content: any, type: "essay" | "short-notes", lowerQuery: string): any | null => {
    if (!content || typeof content !== "object") return null;

    if ("questions" in content) {
      const questions = content.questions as string[];
      const filteredQuestions = searchInQuestions(questions, lowerQuery);
      if (!filteredQuestions) return null;
      if (filteredQuestions === questions) return content;
      return { ...content, questions: filteredQuestions };
    }

    // Direct essay / short-notes keys on a node.
    if ("essay" in content || "short-notes" in content || "short-note" in content) {
      let changed = false;
      let hasAny = false;
      const result: any = { ...content };

      if (type === "essay" && content.essay) {
        const filteredEssay = filterNestedContent(content.essay, type, lowerQuery);
        if (filteredEssay) {
          if (filteredEssay !== content.essay) changed = true;
          result.essay = filteredEssay;
          hasAny = true;
        } else {
          delete result.essay;
          changed = true;
        }
      }

      if (type === "short-notes") {
        const key = "short-notes" in content ? "short-notes" : ("short-note" in content ? "short-note" : null);
        if (key && content[key]) {
          const filteredSN = filterNestedContent(content[key], type, lowerQuery);
          if (filteredSN) {
            if (filteredSN !== content[key]) changed = true;
            result[key] = filteredSN;
            hasAny = true;
          } else {
            delete result[key];
            changed = true;
          }
        }
      }

      if (!hasAny) return null;
      return changed ? result : content;
    }

    if ("subtopics" in content) {
      const filteredSubtopics: { [key: string]: any } = {};
      let hasContent = false;
      let changed = false;

      for (const [key, subtopic] of Object.entries(content.subtopics || {})) {
        const filteredSubtopic = filterNestedContent(subtopic, type, lowerQuery);
        if (filteredSubtopic) {
          if (filteredSubtopic !== subtopic) changed = true;
          filteredSubtopics[key] = filteredSubtopic;
          hasContent = true;
        } else {
          changed = true;
        }
      }

      if (!hasContent) return null;
      return changed ? { ...content, subtopics: filteredSubtopics } : content;
    }

    return null;
  }, [searchInQuestions]);

  const getFilteredData = useCallback((type: "essay" | "short-notes", query: string): QuestionBankData => {
    const trimmed = query.trim();
    if (!trimmed) {
      return QUESTION_BANK_DATA as unknown as QuestionBankData;
    }

    const lowerQuery = trimmed.toLowerCase();
    const filteredData: QuestionBankData = {};

    for (const [key, topic] of Object.entries(QUESTION_BANK_DATA)) {
      const filteredTopic = filterNestedContent(topic, type, lowerQuery);
      if (filteredTopic) {
        filteredData[key] = filteredTopic;
      }
    }

    return filteredData;
  }, [filterNestedContent]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim() !== "") {
      const topicKeys = Object.keys(QUESTION_BANK_DATA);
      setExpandedItems(topicKeys);
    } else {
      setExpandedItems([]);
    }
  }, [debouncedQuery]);

  const essayFilteredData = useMemo(
    () => getFilteredData("essay", debouncedQuery),
    [getFilteredData, debouncedQuery]
  );

  const shortNotesFilteredData = useMemo(
    () => getFilteredData("short-notes", debouncedQuery),
    [getFilteredData, debouncedQuery]
  );

  const isSearching = debouncedQuery.trim().length > 0;
  const hasSearchResults = !isSearching ||
    Object.keys(essayFilteredData).length > 0 ||
    Object.keys(shortNotesFilteredData).length > 0;

  const hasContentToDisplay = !isSearching ||
    Object.keys(essayFilteredData).length > 0 ||
    Object.keys(shortNotesFilteredData).length > 0;

  return {
    searchQuery,
    isMobile,
    activeTab,
    expandedItems,
    hasSearchResults,
    isSearching,
    isRendered,
    essayFilteredData,
    shortNotesFilteredData,
    hasContentToDisplay,
    setActiveTab,
    setExpandedItems,
    handleSearch
  };
};
