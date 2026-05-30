
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

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
    <div className={`extras-panel flex flex-col items-center justify-center min-h-[400px] p-6 ${theme === "blackpink" ? "bg-black border border-[#FF5C8D]/30" : "bg-gray-50 dark:bg-gray-900"} rounded-lg`}>
      <div className="text-center max-w-md space-y-6">
        <h3 className={`text-2xl font-bold ${theme === "blackpink" ? "text-[#FF5C8D]" : "text-gray-900 dark:text-white"} mb-2`}>
          MEDICOS ZONE study material
        </h3>
        <p className={`${theme === "blackpink" ? "text-[#FF5C8D]/80" : "text-gray-600 dark:text-gray-300"} mb-6`}>
          Access supplementary materials, lecture notes, and additional study resources in our Google Drive folder.
        </p>
        <Button 
          size="lg" 
          className={`w-full sm:w-auto ${getButtonClass()}`}
          onClick={handleOpenDrive}
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Open Google Drive
        </Button>
      </div>
    </div>
  );
};

export default ExtrasContent;
