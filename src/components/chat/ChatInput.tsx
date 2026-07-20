import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles, Paperclip } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

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
  const isBlackpink = theme === "blackpink";
  const isLiquid = theme === "liquid-glass";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  const wrapperClass = isBlackpink
    ? "flex items-center gap-2 rounded-2xl border border-pink-500/50 bg-black/60 px-3 py-2 shadow-[0_0_20px_rgba(255,92,141,0.25)]"
    : isLiquid
      ? "flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl px-3 py-2"
      : "flex items-center gap-2 rounded-2xl border border-primary/40 bg-background/60 backdrop-blur px-3 py-2 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.5)]";

  const sparkleClass = isBlackpink
    ? "h-8 w-8 rounded-full bg-black border border-pink-500/50 flex items-center justify-center text-pink-400 shrink-0"
    : "h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-500/30 border border-primary/40 flex items-center justify-center text-primary shrink-0";

  const sendClass = isBlackpink
    ? "h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white hover:opacity-90 shadow-lg shadow-pink-500/30"
    : "h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/30";

  const textareaClass = isBlackpink
    ? "bg-transparent border-0 focus-visible:ring-0 text-[#FFDEE2] placeholder:text-pink-300/50 resize-none min-h-[28px] max-h-[120px] px-1 py-1.5 text-sm shadow-none"
    : isLiquid
      ? "bg-transparent border-0 focus-visible:ring-0 text-slate-900 placeholder:text-slate-500 resize-none min-h-[28px] max-h-[120px] px-1 py-1.5 text-sm shadow-none"
      : "bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground resize-none min-h-[28px] max-h-[120px] px-1 py-1.5 text-sm shadow-none";

  return (
    <form onSubmit={onSubmit} className="w-full space-y-1.5">
      <div className={wrapperClass}>
        <div className={sparkleClass} aria-hidden>
          <Sparkles className="h-4 w-4" />
        </div>
        <Textarea
          ref={textareaRef}
          placeholder={isDisabled ? "Please wait before sending another message..." : "Ask a medical question…"}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setTimeout(() => {
              textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            }, 300);
          }}
          className={`${textareaClass} ${isDisabled ? "opacity-60" : ""}`}
          disabled={isLoading || isDisabled}
        />
        <button
          type="button"
          aria-label="Attach"
          disabled
          className="h-8 w-8 rounded-full text-muted-foreground/70 hover:text-foreground flex items-center justify-center shrink-0 cursor-not-allowed"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <Button
          type="submit"
          className={sendClass}
          disabled={isLoading || isDisabled}
          aria-label="Send"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3" /> AI-generated content
      </p>
    </form>
  );
};
