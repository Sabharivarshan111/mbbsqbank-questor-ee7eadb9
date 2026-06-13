import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

interface StudyMaterialsCardProps {
  driveLink?: string;
}

const StudyMaterialsCard = ({
  driveLink = "https://drive.google.com/drive/folders/1FT6Tg6K4POa5jfet_twGk7iC3nH2yJdm",
}: StudyMaterialsCardProps) => {
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
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border min-h-[400px] ${
        theme === "blackpink"
          ? "bg-black border-[#FF5C8D]/30"
          : "bg-card"
      }`}
    >
      <h3
        className={`text-2xl font-bold mb-3 ${
          theme === "blackpink" ? "text-[#FF5C8D]" : ""
        }`}
      >
        Study Materials
      </h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        Lecture notes, supplementary PDFs, and extra resources curated for MBBS
        students.
      </p>
      <Button size="lg" className={getButtonClass()} onClick={handleOpenDrive}>
        <ExternalLink className="mr-2 h-5 w-5" />
        Open Google Drive
      </Button>
    </div>
  );
};

export default StudyMaterialsCard;
