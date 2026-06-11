import React, { useState, useEffect, useMemo, memo } from "react";
import { Book, GraduationCap } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SubtopicAccordion from "./SubtopicAccordion";
import { Topic } from "./QuestionBank";
import CountBadge from "./question-bank/CountBadge";
import { useProgressCount } from "@/hooks/use-progress-count";

interface TopicAccordionProps {
  topicKey: string;
  topic: Topic;
  isExpanded?: boolean;
  activeTab: "essay" | "short-notes";
}

const TopicAccordion = memo(({ topicKey, topic, isExpanded = false, activeTab }: TopicAccordionProps) => {
  const subtopicKeys = useMemo(() => Object.keys(topic.subtopics), [topic.subtopics]);
  const [localExpandedItems, setLocalExpandedItems] = useState<string[]>(
    isExpanded ? subtopicKeys : []
  );

  useEffect(() => {
    if (isExpanded) {
      setLocalExpandedItems((prev) =>
        prev.length === subtopicKeys.length && prev.every((k, i) => k === subtopicKeys[i])
          ? prev
          : subtopicKeys
      );
    }
  }, [isExpanded, subtopicKeys]);

  const handleAccordionValueChange = (value: string[]) => {
    setLocalExpandedItems(value);
  };

  const isSecondYear = topicKey === "second-year";
  const IconComponent = isSecondYear ? GraduationCap : Book;
  const iconClass = isSecondYear ? "text-blue-600 dark:text-blue-400" : "text-indigo-600 dark:text-indigo-400";

  return (
    <AccordionItem 
      value={topicKey} 
      key={topicKey}
      className="animate-fade-in transition-all duration-300 text-gray-800 dark:text-gray-200"
    >
      <AccordionTrigger className="px-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200">
        <div className="flex items-center space-x-3 flex-1">
          <IconComponent className={`h-6 w-6 ${iconClass}`} />
          <h3 className="text-xl md:text-2xl font-semibold">{topic.name}</h3>
          <span className="year-count-badge">
            <TopicBadge topic={topic} activeTab={activeTab} />
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4">
          <Accordion 
            type="multiple" 
            value={localExpandedItems}
            onValueChange={handleAccordionValueChange} 
            className="w-full"
          >
            {Object.entries(topic.subtopics).map(([subtopicKey, subtopic]) => (
              <SubtopicAccordion 
                key={subtopicKey}
                subtopicKey={subtopicKey}
                subtopic={subtopic}
                isExpanded={isExpanded}
                activeTab={activeTab}
                isFirstYear={topicKey === "first-year"}
                yearKey={topicKey}
              />
            ))}
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});

TopicAccordion.displayName = "TopicAccordion";

const TopicBadge = memo(({ topic, activeTab }: { topic: Topic; activeTab: "essay" | "short-notes" }) => {
  const { done, total } = useProgressCount(topic, activeTab);
  return <CountBadge count={total} done={done} tab={activeTab} />;
});

TopicBadge.displayName = "TopicBadge";

export default TopicAccordion;
