
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface QuestionCardEnhancedProps {
  question: string;
  index: number;
}

const QuestionCardEnhanced: React.FC<QuestionCardEnhancedProps> = ({ question, index }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [tapStatus, setTapStatus] = useState<'idle' | 'processing-answer' | 'processing-mcq'>('idle');
  const asteriskCount = countAsterisks(question);
  
  // Generate a unique ID for the question for localStorage
  const questionId = `question-enhanced-${index}`;
  
  // Create refs to track tap counts and timing
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const tapTimeoutRef = useRef<number | null>(null);
  
  // Load completion status from localStorage on mount
  useEffect(() => {
    const savedStatus = localStorage.getItem(questionId);
    if (savedStatus) {
      setIsCompleted(savedStatus === 'true');
    }
  }, [questionId]);
  
  // Save completion status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(questionId, isCompleted.toString());
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
  
  // Triple tap handler for getting answers
  const handleTripleTapAction = () => {
    // Show processing animation
    setTapStatus('processing-answer');
    
    // Create a custom event to notify the AiChat component
    const event = new CustomEvent('ai-triple-tap-answer', {
      detail: { 
        question,
        isTripleTap: true // Add flag to indicate this is from a triple tap
      }
    });
    
    // Dispatch the event
    window.dispatchEvent(event);
    
    // Add a small delay to ensure the chat section is in view
    setTimeout(() => {
      const chatSection = document.querySelector('.ai-chat-section');
      chatSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Reset status after showing animation
      setTimeout(() => {
        setTapStatus('idle');
      }, 3000);
    }, 100);
  };
  
  // Double tap handler for MCQs
  const handleDoubleTapAction = () => {
    // Show processing animation
    setTapStatus('processing-mcq');
    
    // Create a custom event to notify the AiChat component
    const event = new CustomEvent('ai-double-tap-mcq', {
      detail: { 
        question,
        isDoubleTap: true, // Add flag to indicate this is from a double tap
        forMcq: true // Add flag to indicate this is for MCQs
      }
    });
    
    // Dispatch the event
    window.dispatchEvent(event);
    
    // Add a small delay to ensure the chat section is in view
    setTimeout(() => {
      const chatSection = document.querySelector('.ai-chat-section');
      chatSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Reset status after showing animation
      setTimeout(() => {
        setTapStatus('idle');
      }, 3000);
    }, 100);
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setIsCompleted(checked);
  };

  return (
    <div id={`question-enhanced-${index}`}>
      <Card 
        className="mb-2 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer question-card" 
        onClick={handleTap}
      >
        <CardContent className="p-3 text-left text-sm flex items-start justify-between">
          <div className="flex items-start gap-2">
            <Checkbox 
              id={`checkbox-enhanced-${index}`}
              checked={isCompleted}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()} // Prevent tap events when clicking the checkbox
              className="mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] text-blue-500">
                  {tapStatus === 'idle' && "Triple tap to ask AI"}
                  {tapStatus === 'processing-answer' && (
                    <span className="animate-pulse">Getting answer...</span>
                  )}
                </span>
                <span className="text-[10px] text-blue-500 font-semibold">
                  {tapStatus === 'idle' && "DOUBLE TAP FOR MCQS"}
                  {tapStatus === 'processing-mcq' && (
                    <span className="animate-pulse">Generating MCQs...</span>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{index + 1}. {question}</p>
            </div>
          </div>
          
          {asteriskCount > 0 && (
            <Badge 
              variant="outline" 
              className="rounded-full h-6 w-6 flex-shrink-0 p-0 flex items-center justify-center bg-gray-800 text-white text-xs border-gray-700 ml-2"
              onClick={(e) => e.stopPropagation()} // Prevent tap events when clicking the badge
            >
              {asteriskCount}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function countAsterisks(question: string): number {
  const starMatches = question.match(/[\*★☆⭐]/g);
  if (starMatches && starMatches.length > 0) {
    return starMatches.length;
  }

  const datePattern = /\(((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2,4}[,;]?\s*)+)\)/i;
  const dateMatch = question.match(datePattern);
  if (dateMatch && dateMatch[1]) {
    const dates = dateMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean);
    return dates.length;
  }

  return 0;
}

export default QuestionCardEnhanced;
