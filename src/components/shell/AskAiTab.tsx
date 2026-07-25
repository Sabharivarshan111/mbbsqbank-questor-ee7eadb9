import { AiChat } from "@/components/AiChat";

export default function AskAiTab({ initialQuestion, resetKey }: { initialQuestion?: string; resetKey?: number }) {
  return (
    <div className="space-y-2 pb-1">
      <header className="pt-1">
        <h1 className="text-2xl font-extrabold">Ask AI</h1>
        <p className="text-sm text-muted-foreground">Your instant medical study companion</p>
      </header>
      <div className="h-[calc(100vh-9rem)] min-h-[520px]">
        <AiChat key={resetKey ?? 0} initialQuestion={initialQuestion} />
      </div>
    </div>
  );
}
