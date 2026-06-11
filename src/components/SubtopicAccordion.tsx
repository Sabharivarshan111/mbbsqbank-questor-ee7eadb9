import React, { useState, useEffect, useMemo, memo } from "react";
import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TypeAccordion from "./TypeAccordion";
import { SubTopic } from "./QuestionBank";
import CountBadge from "./question-bank/CountBadge";
import { useProgressCount } from "@/hooks/use-progress-count";

interface SubtopicAccordionProps {
  subtopicKey: string;
  subtopic: SubTopic;
  isExpanded?: boolean;
  activeTab: "essay" | "short-notes";
  isFirstYear?: boolean;
  yearKey?: string;
}

const SubtopicAccordion = memo(({ subtopicKey, subtopic, isExpanded = false, activeTab, isFirstYear, yearKey }: SubtopicAccordionProps) => {
  const typeKeys = useMemo(() => Object.keys(subtopic.subtopics), [subtopic.subtopics]);
  const [localExpandedItems, setLocalExpandedItems] = useState<string[]>(
    isExpanded ? typeKeys : []
  );

  useEffect(() => {
    if (isExpanded) {
      setLocalExpandedItems((prev) =>
        prev.length === typeKeys.length && prev.every((k, i) => k === typeKeys[i])
          ? prev
          : typeKeys
      );
    }
  }, [isExpanded, typeKeys]);

  const handleAccordionValueChange = (value: string[]) => {
    setLocalExpandedItems(value);
  };

  const isPaper = subtopicKey === "paper-1" || subtopicKey === "paper-2";

  return (
    <AccordionItem 
      value={subtopicKey}
      className="animate-fade-in transition-all duration-300 text-gray-800 dark:text-gray-200"
    >
      <AccordionTrigger className="hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg px-4">
        <div className="flex items-center space-x-3 flex-1">
          <BookOpen className={`h-5 w-5 ${isPaper ? "text-blue-600 dark:text-blue-400" : "text-indigo-600 dark:text-indigo-400"}`} />
          <h4 className="text-lg md:text-xl font-medium">{subtopic.name}</h4>
          <SubtopicBadge subtopic={subtopic} activeTab={activeTab} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ScrollArea className="h-full px-4">
          <Accordion 
            type="multiple" 
            value={localExpandedItems}
            onValueChange={handleAccordionValueChange}
            className="w-full"
          >
            {Object.entries(subtopic.subtopics).map(([typeKey, type]) => {
              if (type && typeof type === 'object' && 'subtopics' in type && 
                  !('questions' in type.subtopics) && 
                  !(type.subtopics.essay || type.subtopics["short-note"] || type.subtopics["short-notes"])) {
                return (
                  <SubtopicAccordion
                    key={typeKey}
                    subtopicKey={typeKey}
                    subtopic={type as SubTopic}
                    isExpanded={isExpanded}
                    activeTab={activeTab}
                    isFirstYear={isFirstYear}
                    yearKey={yearKey}
                  />
                );
              } else {
                return (
                  <TypeAccordion 
                    key={typeKey}
                    typeKey={typeKey}
                    type={type}
                    isExpanded={isExpanded}
                    activeTab={activeTab}
                    isFirstYear={isFirstYear}
                    yearKey={yearKey}
                  />
                );
              }
            })}
          </Accordion>
        </ScrollArea>
      </AccordionContent>
    </AccordionItem>
  );
});

SubtopicAccordion.displayName = "SubtopicAccordion";

const SubtopicBadge = memo(({ subtopic, activeTab }: { subtopic: SubTopic; activeTab: "essay" | "short-notes" }) => {
  const { done, total } = useProgressCount(subtopic, activeTab);
  return <CountBadge count={total} done={done} tab={activeTab} />;
});

SubtopicBadge.displayName = "SubtopicBadge";

export default SubtopicAccordion;
