import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme/ThemeProvider';
import { QUESTION_PROGRESS_EVENT } from '@/lib/question-progress';

interface QuestionCardProps {
  question: string;
  index: number;
  isFirstYear?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, index, isFirstYear }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [tapStatus, setTapStatus] = useState<'idle' | 'processing-answer' | 'processing-mcq'>('idle');
  const asteriskCount = countAsterisks(question);
  const displayCount = isFirstYear ? (asteriskCount === 0 ? 1 : asteriskCount) : asteriskCount;
  const { theme } = useTheme();
  
  // Create refs to track tap counts and timing
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const tapTimeoutRef = useRef<number | null>(null);
  
  const questionId = `question-${question.slice(0, 50).replace(/\s+/g, '-')}`;
  const pageNumber = extractPageNumber(question);
  
  useEffect(() => {
    const savedStatus = localStorage.getItem(questionId);
    if (savedStatus) {
      setIsCompleted(savedStatus === 'true');
    }
  }, [questionId]);
  
  useEffect(() => {
    localStorage.setItem(questionId, isCompleted.toString());
    window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
  }, [isCompleted, questionId]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current !== null) {
        window.clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);
  
  const resetTapCount = () => {
    tapCount.current = 0;
  };
  
  // Single tap handler that determines whether to trigger double or triple tap
  const handleTap = () => {
    const now = Date.now();
    const tapDelay = 500; // Using the same delay as in triple tap hook
    const timeSinceLastTap = now - lastTapTime.current;
    
    // Clear any existing timeout
    if (tapTimeoutRef.current !== null) {
      window.clearTimeout(tapTimeoutRef.current);
    }
    
    if (timeSinceLastTap > tapDelay) {
      // Too much time has passed, reset counter
      tapCount.current = 1;
    } else {
      // Increment tap count
      tapCount.current += 1;
    }
    
    lastTapTime.current = now;
    
    // Set a timeout to process the tap sequence after the delay
    tapTimeoutRef.current = window.setTimeout(() => {
      if (tapCount.current === 2) {
        // Double tap detected - trigger MCQ generation
        handleDoubleTapAction();
      } else if (tapCount.current === 3) {
        // Triple tap detected - trigger answer request
        handleTripleTapAction();
      }
      // Reset for next sequence
      resetTapCount();
    }, tapDelay);
  };
  
  // The action to perform on triple tap
  const handleTripleTapAction = () => {
    const cleanedQuestion = getCleanQuestionText(question);
    setTapStatus('processing-answer');
    const event = new CustomEvent('ai-triple-tap-answer', {
      detail: { question: cleanedQuestion }
    });
    window.dispatchEvent(event);
    setTimeout(() => {
      const chatSection = document.querySelector('.ai-chat-section');
      chatSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setTapStatus('idle');
      }, 3000);
    }, 100);
  };
  
  // The action to perform on double tap
  const handleDoubleTapAction = () => {
    const cleanedQuestion = getCleanQuestionText(question);
    setTapStatus('processing-mcq');
    
    // Create a custom event for MCQ generation
    const event = new CustomEvent('ai-double-tap-mcq', {
      detail: { 
        question: cleanedQuestion,
        isDoubleTap: true,
        forMcq: true
      }
    });
    
    window.dispatchEvent(event);
    
    setTimeout(() => {
      const chatSection = document.querySelector('.ai-chat-section');
      chatSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setTapStatus('idle');
      }, 3000);
    }, 100);
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setIsCompleted(checked);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const getCardBgClass = () => {
    if (theme === "blackpink") {
      return "bg-black border-[#FFDEE2] border-2 shadow-[0_0_10px_rgba(255,222,226,0.2)]"; 
    }
    return "bg-background border-gray-800 hover:border-gray-700";
  };

  const getTextClass = () => {
    if (theme === "blackpink") {
      return "text-[#FFDEE2]";
    }
    return "";
  };

  const getCheckboxClass = () => {
    if (theme === "blackpink") {
      return "!bg-transparent !border-[#FFDEE2] shadow-[0_0_5px_rgba(255,222,226,0.5)] relative z-40";
    }
    return "";
  };

  const getBadgeClass = () => {
    if (theme === "blackpink") {
      return "!bg-transparent !border-[#FFDEE2] !text-[#FFDEE2] shadow-[0_0_5px_rgba(255,222,226,0.5)] relative z-40";
    }
    return "bg-gray-800 text-white border-gray-700";
  };

  const getPageNumberClass = () => {
    if (theme === "blackpink") {
      return "text-[#B3DEFF] ml-2";
    }
    return "text-blue-300 ml-2";
  };

  const getMcqTextClass = () => {
    if (theme === "blackpink") {
      return "text-[#FFDEE2] text-[10px] italic font-semibold mt-2";
    }
    return "text-blue-500 text-[10px] italic font-semibold mt-2";
  };

  return (
    <div id={`question-${index}`}>
      <Card 
        className={`mb-2 ${getCardBgClass()} transition-colors cursor-pointer question-card relative`}
        onClick={handleTap}
      >
        <CardContent className="p-3 text-left text-sm flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div 
              className="mt-0.5 flex-shrink-0 relative cursor-pointer"
              onClick={handleCheckboxClick}
            >
              <Checkbox 
                id={`checkbox-${index}`}
                checked={isCompleted}
                onCheckedChange={handleCheckboxChange}
                className={getCheckboxClass()}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className={`text-[10px] ${theme === "blackpink" ? "text-[#FFDEE2]" : "text-blue-500"}`}>
                  {tapStatus === 'idle' && (
                    <span className="flex items-center">
                      Triple tap to ask AI
                      {pageNumber && (
                        <span className={getPageNumberClass()}>
                          Pg. {pageNumber}
                        </span>
                      )}
                    </span>
                  )}
                  {tapStatus === 'processing-answer' && (
                    <span className="animate-pulse">Getting answer...</span>
                  )}
                  {tapStatus === 'processing-mcq' && (
                    <span className="animate-pulse">Generating MCQs...</span>
                  )}
                </span>
              </div>
              <p className={`whitespace-pre-wrap ${getTextClass()} ${isCompleted ? 'line-through opacity-60' : ''}`}>
                {getCleanQuestionText(question)}
              </p>
              
              {/* Added the "DOUBLE TAP FOR MCQS" text at the bottom */}
              {tapStatus === 'idle' && (
                <div className={getMcqTextClass()}>
                  DOUBLE TAP FOR MCQS
                </div>
              )}
            </div>
          </div>
          
          {displayCount > 0 && (
            <Badge 
              variant="outline" 
              className={`rounded-full h-6 w-6 flex-shrink-0 p-0 flex items-center justify-center ${getBadgeClass()} ml-2 text-xs badge`}
              onClick={(e) => e.stopPropagation()}
            >
              {displayCount}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function countAsterisks(question: string): number {
  // Count explicit asterisks in the format "****" at the beginning or middle of the text
  const explicitAsterisks = question.match(/\*+/);
  if (explicitAsterisks) {
    return explicitAsterisks[0].length;
  }
  
  // Count the number of exam dates in parentheses
  const datePattern = /\(((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jul|Sep|Nov)\s\d{2}(?:;)?)+)\)/;
  const dateMatch = question.match(datePattern);
  
  if (dateMatch && dateMatch[1]) {
    // Count the number of dates by counting the semicolons and adding 1
    const dates = dateMatch[1].split(';');
    return dates.length;
  }
  
  // If no asterisks or dates found, return 0
  return 0;
}

function extractPageNumber(question: string): string | null {
  // Extract page number from the format "Pg.No: X" or "Pg.No: X;AP3-Pg.No: Y"
  const pageMatch = question.match(/\(Pg\.No:\s*(\d+)(?:;AP3-Pg\.No:\s*\d+)?\)/);
  if (pageMatch && pageMatch[1]) {
    return pageMatch[1];
  }
  return null;
}

function getCleanQuestionText(question: string): string {
  // Don't remove any of the important details
  // Just remove the numbering at the beginning if present
  let cleaned = question.replace(/^\d+\.\s/, '');
  return cleaned;
}

export default QuestionCard;
