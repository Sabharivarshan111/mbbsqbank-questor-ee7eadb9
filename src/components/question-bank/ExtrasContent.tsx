import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import ProgressDashboard from "@/components/progress/ProgressDashboard";

interface ExtrasContentProps {
  driveLink?: string;
}

const ExtrasContent = ({ driveLink = "https://drive.google.com/drive/folders/1FT6Tg6K4POa5jfet_twGk7iC3nH2yJdm" }: ExtrasContentProps) => {
  const { theme } = useTheme();

  const handleOpenDrive = () => {
    window.open(driveLink, "_blank", "noopener,noreferrer");
  };

  const getButtonClass = () => {
    if (theme === "blackpink") {
      return "bg-transparent hover:bg-black/80 text-[#FF5C8D] border border-[#FF5C8D] shadow-[0_0_10px_rgba(255,92,141,0.3)]";
    }
    return "bg-blue-600 hover:bg-blue-700 text-white";
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg ${theme === "blackpink" ? "bg-black border border-[#FF5C8D]/30" : "bg-gray-50 dark:bg-gray-900"}`}>
      {/* Left: Your Progress */}
      <div className="min-w-0">
        <ProgressDashboard />
      </div>

      {/* Right: Study Materials */}
      <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-card border min-h-[300px]">
        <h3 className={`text-xl font-bold mb-2 ${theme === "blackpink" ? "text-[#FF5C8D]" : ""}`}>
          Study Materials
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Lecture notes, supplementary PDFs, and extra resources curated for MBBS students.
        </p>
        <Button size="lg" className={getButtonClass()} onClick={handleOpenDrive}>
          <ExternalLink className="mr-2 h-5 w-5" />
          Open Google Drive
        </Button>
      </div>
    </div>
  );
};

export default ExtrasContent;
