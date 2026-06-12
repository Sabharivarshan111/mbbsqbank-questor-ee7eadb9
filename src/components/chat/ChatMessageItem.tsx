
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, isValidMedicalSourceUrl } from "@/lib/utils";
import { ChatMessage } from "@/models/ChatMessage";
import { ReferencesSection } from "./ReferencesSection";
import { McqMessage } from "./McqMessage";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageItemProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
}

export const ChatMessageItem = ({ message, onCopy }: ChatMessageItemProps) => {
  // Secure link renderer with validation
  const linkRenderer = ({ href, children }: { href?: string; children: React.ReactNode }) => {
    if (!href || !isValidMedicalSourceUrl(href)) {
      return <span className="text-gray-400">{children}</span>;
    }
    
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 underline hover:text-blue-300 transition-colors"
      >
        {children}
      </a>
    );
  };

  // Remove the "References:" section from the content if it exists
  const cleanContent = message.role === 'assistant' && message.content.includes('References:') 
    ? message.content.split('References:')[0].trim() 
    : message.content;

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-lg p-3",
        message.role === 'user' 
          ? "bg-gray-800/50 text-white ml-4" 
          : "bg-gray-900/50 text-gray-100 mr-4 border-l-2 border-white/20"
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="text-xs font-medium text-gray-400">
          {message.role === 'user' ? 'You' : 'ACEV'}
        </p>
        {message.role === 'assistant' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={() => onCopy(message.content)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="text-sm">
        {message.role === 'assistant' && message.kind === 'mcq' ? (
          <McqMessage content={cleanContent} messageId={message.id} />

        ) : message.role === 'assistant' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: linkRenderer,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-gray-700 px-1 py-0.5 rounded text-xs text-gray-100">
                    {children}
                  </code>
                ) : (
                  <code className="text-gray-100 text-xs">{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-gray-800 p-3 rounded-md my-2 overflow-x-auto">
                  {children}
                </pre>
              ),
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-4 mb-2 text-blue-200">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mt-3 mb-1 text-blue-300">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold mt-2 mb-1 text-blue-400">{children}</h3>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside pl-2 my-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside pl-2 my-2 space-y-1">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="ml-2">{children}</li>
              ),
              p: ({ children }) => {
                // Convert children to string to check for answer patterns
                const childText = String(children);
                
                // Check if this paragraph contains the correct answer indicator
                if (childText.includes('✓ Correct Answer') || childText.includes('Correct Answer:') || /^\*?\*?Answer:/i.test(childText)) {
                  return (
                    <p className="my-2 p-2 rounded-md bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-medium border-l-4 border-green-500">
                      {children}
                    </p>
                  );
                }
                
                // Check if this is an MCQ option line (A), B), C), D))
                if (/^\*?\*?[A-D]\)/.test(childText)) {
                  return (
                    <p className="my-1 pl-2 py-0.5">{children}</p>
                  );
                }
                
                return <p className="my-1">{children}</p>;
              },
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        ) : (
          <div className="whitespace-pre-wrap">{cleanContent}</div>
        )}
      </div>
      {message.role === 'user' && message.content.includes("Triple-tapped:") && (
        <div className="mt-1 text-xs text-blue-400">
          Question from triple-tap interaction
        </div>
      )}
      
      {/* Display references section if available and not triple-tapped */}
      {message.role === 'assistant' && 
       message.references && 
       message.references.length > 0 && 
       !message.content.includes("Triple-tapped:") && (
        <ReferencesSection references={message.references} />
      )}
    </motion.div>
  );
};
