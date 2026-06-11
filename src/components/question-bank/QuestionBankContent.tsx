import React, { memo } from "react";

import { Accordion } from "@/components/ui/accordion";
import TopicAccordion from "@/components/TopicAccordion";
import { QuestionBankData } from "@/components/QuestionBank";
import NoContentMessage from "./NoContentMessage";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface QuestionBankContentProps {
  activeTab: "essay" | "short-notes";
  hasContentToDisplay: boolean;
  filteredData: QuestionBankData;
  expandedItems: string[];
  searchQuery: string;
}

const QuestionBankContent = memo(({
  activeTab,
  hasContentToDisplay,
  filteredData,
  expandedItems,
  searchQuery
}: QuestionBankContentProps) => {
  const [localExpandedItems, setLocalExpandedItems] = useState<string[]>(expandedItems);
  const { theme } = useTheme();

  // Update local state when prop changes
  useEffect(() => {
    setLocalExpandedItems(expandedItems);
  }, [expandedItems]);

  if (!hasContentToDisplay) {
    return <NoContentMessage />;
  }

  // Handle accordion item value change
  const handleAccordionValueChange = (value: string[]) => {
    setLocalExpandedItems(value);
  });

  const accordionClassName = `w-full text-gray-800 dark:text-gray-200 ${
    theme === "blackpink" ? "question-bank-content" : ""
  }`;

  return (
    <div className="grid gap-4">
      <Accordion 
        type="multiple" 
        value={localExpandedItems}
        onValueChange={handleAccordionValueChange}
        className={accordionClassName}
      >
        {Object.entries(filteredData).map(([topicKey, topic]) => (
          <TopicAccordion 
            key={topicKey}
            topicKey={topicKey}
            topic={topic}
            isExpanded={searchQuery.trim() !== ""}
            activeTab={activeTab}
          />
        ))}
      </Accordion>
    </div>
  );
});

export default QuestionBankContent;
