import { useState, useEffect } from "react";
import { Accordion } from "@/components/ui/accordion";
import TopicAccordion from "@/components/TopicAccordion";
import { QuestionBankData } from "@/components/QuestionBank";
import NoContentMessage from "./NoContentMessage";
import SearchResults from "./SearchResults";
import { useTheme } from "@/components/theme/ThemeProvider";

interface QuestionBankContentProps {
  activeTab: "essay" | "short-notes";
  hasContentToDisplay: boolean;
  filteredData: QuestionBankData;
  expandedItems: string[];
  searchQuery: string;
}

const QuestionBankContent = ({
  activeTab,
  hasContentToDisplay,
  filteredData,
  expandedItems,
  searchQuery,
}: QuestionBankContentProps) => {
  const [localExpandedItems, setLocalExpandedItems] = useState<string[]>(expandedItems);
  const { theme } = useTheme();

  useEffect(() => {
    setLocalExpandedItems(expandedItems);
  }, [expandedItems]);

  if (!hasContentToDisplay) {
    return <NoContentMessage />;
  }

  const isSearching = searchQuery.trim() !== "";

  // Fast path during search: flat batched list, no nested accordions / progress badges.
  if (isSearching) {
    return (
      <div className="grid gap-4">
        <SearchResults data={filteredData} activeTab={activeTab} />
      </div>
    );
  }

  const accordionClassName = `w-full text-gray-800 dark:text-gray-200 ${
    theme === "blackpink" ? "question-bank-content" : ""
  }`;

  return (
    <div className="grid gap-4">
      <Accordion
        type="multiple"
        value={localExpandedItems}
        onValueChange={(next) => {
          if (next.length > localExpandedItems.length) {
            window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
          }
          setLocalExpandedItems(next);
        }}
        className={accordionClassName}
      >
        {Object.entries(filteredData).map(([topicKey, topic]) => (
          <TopicAccordion
            key={topicKey}
            topicKey={topicKey}
            topic={topic}
            isExpanded={false}
            activeTab={activeTab}
          />
        ))}
      </Accordion>
    </div>
  );
};

export default QuestionBankContent;
