
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, Square } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { toast } from "sonner";

interface ChatInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isDisabled?: boolean;
}

export const ChatInput = ({ prompt, setPrompt, onSubmit, isLoading, isDisabled }: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();
  const { state: recState, start, stopAndTranscribe, cancel } = useVoiceRecorder();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleMicClick = async () => {
    if (recState === "idle") {
      try {
        await start();
      } catch (err) {
        toast.error((err as Error).message || "Could not start recording");
      }
    } else if (recState === "recording") {
      try {
        const text = await stopAndTranscribe();
        if (text) {
          setPrompt(prompt ? `${prompt} ${text}` : text);
          setTimeout(adjustTextareaHeight, 0);
        } else {
          toast.error("No speech detected — please try again.");
        }
      } catch (err) {
        const msg = (err as Error).message || "Transcription failed";
        if (msg.includes("402")) {
          toast.error("Out of AI credits. Add credits in Settings.");
        } else if (msg.includes("429")) {
          toast.error("Rate limited — please try again in a moment.");
        } else {
          toast.error(msg);
        }
      }
    }
  };

  // Get textarea styling based on theme
  const getTextareaClass = () => {
    if (theme === "blackpink") {
      return "bg-black border-[#FFDEE2] focus:ring-[#FFDEE2] text-[#FFDEE2] placeholder-[#FFDEE2]/50 shadow-[0_0_5px_rgba(255,222,226,0.3)]";
    } else if (theme === "dark") {
      return "bg-gray-900 border-gray-700 focus:ring-gray-600 text-white";
    } else {
      return "bg-gray-100 border-gray-300 focus:ring-gray-400 text-gray-900";
    }
  };

  // Get button styling based on theme
  const getButtonClass = () => {
    if (theme === "blackpink") {
      return "bg-black border border-[#FFDEE2] text-[#FFDEE2] hover:bg-black/70 shadow-[0_0_5px_rgba(255,222,226,0.3)]";
    } else if (theme === "dark") {
      return "bg-white text-black hover:bg-gray-200";
    } else {
      return "bg-gray-900 text-white hover:bg-gray-800";
    }
  };

  const getMicButtonClass = () => {
    if (recState === "recording") {
      return "bg-red-500 text-white hover:bg-red-600 animate-pulse";
    }
    return getButtonClass();
  };

  const micDisabled = isLoading || isDisabled || recState === "transcribing";

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          placeholder={
            recState === "recording"
              ? "Listening… tap the stop button when done"
              : recState === "transcribing"
                ? "Transcribing…"
                : isDisabled
                  ? "Please wait before sending another message..."
                  : "Ask a medical question..."
          }
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setTimeout(() => {
              textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 300);
          }}
          className={`min-h-[36px] max-h-[80px] resize-none text-sm flex-grow ${getTextareaClass()} ${isDisabled ? 'opacity-60' : ''}`}
          disabled={isLoading || isDisabled || recState !== "idle"}
        />
        <Button
          type="button"
          onClick={handleMicClick}
          aria-label={recState === "recording" ? "Stop recording" : "Start voice input"}
          className={`${getMicButtonClass()} transition-colors duration-200 h-9 w-9 p-0 flex items-center justify-center`}
          disabled={micDisabled}
        >
          {recState === "transcribing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recState === "recording" ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className={`h-4 w-4 ${theme === "blackpink" ? "text-[#FFDEE2]" : ""}`} />
          )}
        </Button>
        <Button
          type="submit"
          className={`${getButtonClass()} transition-colors duration-200 h-9 w-9 p-0 flex items-center justify-center`}
          disabled={isLoading || isDisabled || recState !== "idle"}
        >
          {isLoading ? (
            <Loader2 className={`h-4 w-4 animate-spin ${theme === "blackpink" ? "text-[#FFDEE2]" : ""}`} />
          ) : (
            <Send className={`h-4 w-4 ${theme === "blackpink" ? "text-[#FFDEE2]" : ""}`} />
          )}
        </Button>
      </div>
    </form>
  );
};
