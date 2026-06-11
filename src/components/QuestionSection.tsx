import { memo } from "react";

import { QuestionType } from "./QuestionBank";
import QuestionCard from "./QuestionCard";
import { Info } from "lucide-react";

interface QuestionSectionProps {
  subtopics: {
    [key: string]: QuestionType | { name: string; questions: any[] };
  };
  activeTab: "essay" | "short-notes";
  isFirstYear?: boolean;
  yearKey?: string;
}

const QuestionSection = memo(({ subtopics, activeTab, isFirstYear, yearKey }: QuestionSectionProps) => {
  if (!subtopics || typeof subtopics !== 'object') return null;

  // Check if we should show "No essays found" message
  const essayData = subtopics.essay as QuestionType | undefined;
  const shortNotesData = (subtopics["short-notes"] || subtopics["short-note"]) as QuestionType | undefined;
  
  const hasEssays = essayData && 'questions' in essayData && essayData.questions.length > 0;
  const hasShortNotes = shortNotesData && 'questions' in shortNotesData && shortNotesData.questions.length > 0;
  
  // Show message if: on essay tab, no essays, and has short notes (applies to all years)
  if (activeTab === "essay" && !hasEssays && hasShortNotes) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">No essays found for this subtopic.</p>
          <p className="mt-1 text-blue-600 dark:text-blue-400">Please check the Short Notes tab for available questions.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {Object.entries(subtopics).map(([questionTypeKey, questionType]) => {
        // Check if we should render this question type based on the active tab
        const shouldRender = 
          (activeTab === "essay" && questionTypeKey === "essay") || 
          (activeTab === "short-notes" && (questionTypeKey === "short-note" || questionTypeKey === "short-notes"));
        
        if (!shouldRender) return null;
        
        // For essay and short notes questions
        if (questionType && typeof questionType === 'object' && 'questions' in questionType) {
          const typedQuestionType = questionType as QuestionType;
          
          return (
            <div key={questionTypeKey} className="w-full">
              <h6 className="text-base font-medium text-gray-600 dark:text-gray-400 mb-3">
                {typedQuestionType.name}
              </h6>
              <div className="space-y-4 max-w-full">
                {typedQuestionType.questions.map((question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    isFirstYear={isFirstYear}
                  />
                ))}
              </div>
            </div>
          );
        }
        
        return null;
      })}
    </>
  );
});

export default QuestionSection;
