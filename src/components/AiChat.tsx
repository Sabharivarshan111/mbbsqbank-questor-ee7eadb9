
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RotateCcw, AlertCircle, Clock, WifiOff, Maximize2, Minimize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessageItem } from "./chat/ChatMessageItem";
import { EmptyChatState } from "./chat/EmptyChatState";
import { ChatInput } from "./chat/ChatInput";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useTheme } from "@/components/theme/ThemeProvider";

interface AiChatProps {
  initialQuestion?: string;
}

export const AiChat = ({ initialQuestion }: AiChatProps = {}) => {
  const { theme } = useTheme();
  const { 
    prompt, 
    setPrompt, 
    isLoading, 
    messages, 
    setMessages,
    isRateLimited,
    queueStats,
    handleSubmit, 
    handleClearChat, 
    handleCopyResponse,
    handleSubmitQuestion
  } = useAiChat({ initialQuestion });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isFullscreen]);

  // Scroll to bottom when messages change, but not on first load
  useEffect(() => {
    if (!isFirstLoad && messages.length > 0) {
      // Use block: 'nearest' to only scroll within the chat container, not the page
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, isFirstLoad]);
  
  // Mark first load as complete after a delay to prevent scroll on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLoad(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      setConnectionError(!navigator.onLine);
    };
    
    // Add event listeners for online/offline status
    window.addEventListener('online', () => setConnectionError(false));
    window.addEventListener('offline', () => setConnectionError(true));
    
    // Check initially
    checkConnection();
    
    // Clean up
    return () => {
      window.removeEventListener('online', () => setConnectionError(false));
      window.removeEventListener('offline', () => setConnectionError(true));
    };
  }, []);
  
  // Listen for triple tap and double tap events
  useEffect(() => {
    const handleTripleTapAnswer = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.question) {
        const question = customEvent.detail.question;
        
        // Don't set the question text in the input field, just submit directly
        handleSubmitQuestion(question);
      }
    };
    
    // Add new handler for double tap MCQ events
    const handleDoubleTapMcq = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.question) {
        const question = customEvent.detail.question;
        
        // Format the question to generate MCQs
        const formattedQuestion = `Double-tapped: Generate 10 USMLE/NEET PG style MCQs on ${question}`;
        
        // Submit the MCQ request
        handleSubmitQuestion(formattedQuestion);
      }
    };
    
    window.addEventListener('ai-triple-tap-answer', handleTripleTapAnswer);
    window.addEventListener('ai-double-tap-mcq', handleDoubleTapMcq);
    
    // Clean up
    return () => {
      window.removeEventListener('ai-triple-tap-answer', handleTripleTapAnswer);
      window.removeEventListener('ai-double-tap-mcq', handleDoubleTapMcq);
    };
  }, [handleSubmitQuestion]);

  const baseHeight = isFullscreen ? 'h-full' : 'h-[390px]';
  const isLiquid = theme === "liquid-glass";
  const cardClassName = theme === "blackpink"
    ? `backdrop-blur-sm bg-black/90 border-pink-500/30 flex flex-col ${baseHeight} shadow-xl`
    : isLiquid
      ? `backdrop-blur-2xl bg-white/60 border-white/60 flex flex-col ${baseHeight} shadow-[0_8px_32px_rgba(31,38,135,0.15)]`
      : `backdrop-blur-sm bg-gray-950/70 border-gray-800 flex flex-col ${baseHeight} shadow-xl`;

  const headerClassName = theme === "blackpink"
    ? "px-4 py-2 border-b border-pink-500/30"
    : isLiquid
      ? "px-4 py-2 border-b border-white/50"
      : "px-4 py-2 border-b border-gray-800";

  const titleClassName = theme === "blackpink"
    ? "text-lg flex items-center justify-between text-pink-400"
    : isLiquid
      ? "text-lg flex items-center justify-between text-slate-900"
      : "text-lg flex items-center justify-between text-white";

  const clearButtonClassName = theme === "blackpink"
    ? "h-8 px-2 text-pink-400 hover:text-pink-300 border-pink-500/50"
    : isLiquid
      ? "h-8 px-2 text-slate-700 hover:text-slate-900"
      : "h-8 px-2 text-gray-400 hover:text-white";

  const content = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${isFullscreen ? 'flex-1 min-h-0' : 'h-full'} flex flex-col ai-chat-section`}
    >
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle className={titleClassName}>
            <span>Medical Assistant</span>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearChat}
                  className={clearButtonClassName}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen(v => !v)}
                      className={`h-8 w-8 ${theme === "blackpink" ? "text-pink-400 hover:text-pink-300" : isLiquid ? "text-slate-700 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
                      aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isFullscreen ? "Exit fullscreen" : "Open fullscreen"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardTitle>
        </CardHeader>
        
        
        <CardContent className="p-0 flex-grow overflow-hidden flex flex-col">
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {connectionError && (
              <div className={theme === "blackpink" 
                ? "bg-red-900/30 border border-red-800 rounded-md p-3 flex items-start"
                : "bg-red-900/30 border border-red-800 rounded-md p-3 flex items-start"
              }>
                <WifiOff className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-300">
                    You appear to be offline. Please check your internet connection.
                  </p>
                  <p className="text-xs text-red-400/70 mt-1">
                    The AI chat requires an internet connection to function.
                  </p>
                </div>
              </div>
            )}
            
            {isRateLimited && (
              <div className={theme === "blackpink" 
                ? "bg-pink-900/30 border border-pink-800 rounded-md p-3 flex items-start"
                : "bg-amber-900/30 border border-amber-800 rounded-md p-3 flex items-start"
              }>
                <AlertCircle className={`h-5 w-5 ${theme === "blackpink" ? "text-pink-500" : "text-amber-500"} mr-2 mt-0.5 flex-shrink-0`} />
                <div>
                  <p className={`text-sm ${theme === "blackpink" ? "text-pink-300" : "text-amber-300"}`}>
                    Too many requests. Please wait a moment before trying again.
                  </p>
                  <p className={`text-xs ${theme === "blackpink" ? "text-pink-400/70" : "text-amber-400/70"} mt-1`}>
                    The AI service is currently experiencing high demand.
                  </p>
                </div>
              </div>
            )}
            
            {/* Display queue status if items are queued */}
            {queueStats.isQueueActive && !isRateLimited && (
              <div className={theme === "blackpink"
                ? "bg-pink-900/30 border border-pink-800 rounded-md p-3 flex items-start animate-pulse"
                : "bg-blue-900/30 border border-blue-800 rounded-md p-3 flex items-start animate-pulse"
              }>
                <Clock className={`h-5 w-5 ${theme === "blackpink" ? "text-pink-500" : "text-blue-500"} mr-2 mt-0.5 flex-shrink-0`} />
                <div>
                  <p className={`text-sm ${theme === "blackpink" ? "text-pink-300" : "text-blue-300"}`}>
                    Request{queueStats.queueLength > 1 ? 's' : ''} queued ({queueStats.queueLength})
                  </p>
                  <p className={`text-xs ${theme === "blackpink" ? "text-pink-400/70" : "text-blue-400/70"} mt-1`}>
                    Estimated wait: ~{queueStats.estimatedWaitTime} seconds
                  </p>
                </div>
              </div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <EmptyChatState />
              ) : (
                messages.map((message) => (
                  <ChatMessageItem 
                    key={message.id}
                    message={message}
                    onCopy={handleCopyResponse}
                  />
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        
        <CardFooter className={theme === "blackpink" ? "p-3 pt-2 border-t border-pink-500/30" : isLiquid ? "p-3 pt-2 border-t border-white/50" : "p-3 pt-2 border-t border-gray-800"}>
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isDisabled={(isRateLimited && queueStats.queueLength >= 10) || connectionError} // Disable if rate limited AND queue is full or offline
          />
        </CardFooter>
      </Card>
    </motion.div>
  );

  if (isFullscreen) {
    return (
      <div
        style={{ height: '100dvh' }}
        className={`fixed inset-0 z-[9999] flex flex-col p-2 pb-[env(safe-area-inset-bottom)] ${isLiquid ? "bg-gradient-to-br from-background via-background to-secondary/60 backdrop-blur-2xl" : "bg-background/95 backdrop-blur-sm"}`}
      >
        {content}
      </div>
    );
  }

  return content;
};

