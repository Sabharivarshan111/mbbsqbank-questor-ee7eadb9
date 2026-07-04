import { Lock } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface StudyMaterialsCardProps {
  driveLink?: string;
}

const StudyMaterialsCard = (_props: StudyMaterialsCardProps) => {
  const { theme } = useTheme();

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border min-h-[400px] ${
        theme === "blackpink"
          ? "bg-black border-[#FF5C8D]/30"
          : "bg-card"
      }`}
    >
      <div
        className={`mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
          theme === "blackpink"
            ? "bg-[#FF5C8D]/10 text-[#FF5C8D] border border-[#FF5C8D]/40"
            : "bg-muted text-muted-foreground border"
        }`}
        aria-label="Locked"
      >
        <Lock className="h-8 w-8" />
      </div>

      <h3
        className={`text-2xl font-bold mb-3 ${
          theme === "blackpink" ? "text-[#FF5C8D]" : ""
        }`}
      >
        Study Materials
      </h3>

      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        Currently locked while we sort out copyright clearances.
      </p>

      <span
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold animate-pulse ${
          theme === "blackpink"
            ? "bg-[#FF5C8D]/15 text-[#FF5C8D] border border-[#FF5C8D]/40"
            : "bg-primary/10 text-primary border border-primary/30"
        }`}
      >
        New study material coming soon
      </span>
    </div>
  );
};

export default StudyMaterialsCard;
