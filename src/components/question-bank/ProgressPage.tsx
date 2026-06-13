import { useTheme } from "@/components/theme/ThemeProvider";
import ProgressDashboard from "@/components/progress/ProgressDashboard";

const ProgressPage = () => {
  const { theme } = useTheme();
  return (
    <div className={`p-4 rounded-lg ${theme === "blackpink" ? "bg-black border border-[#FF5C8D]/30" : "bg-gray-50 dark:bg-gray-900"}`}>
      <ProgressDashboard />
    </div>
  );
};

export default ProgressPage;
