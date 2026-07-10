import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Index from "./pages/Index";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import About from "./pages/About";
import Blog from "./pages/Blog";
import FAQ from "./pages/FAQ";
import StudyTips from "./pages/StudyTips";
import HowToStudyAnatomy from "./pages/articles/HowToStudyAnatomy";
import PharmacologyStudyGuide from "./pages/articles/PharmacologyStudyGuide";
import PathologyBasics from "./pages/articles/PathologyBasics";
import MBBSExamPreparation from "./pages/articles/MBBSExamPreparation";
import MCQSolvingStrategies from "./pages/articles/MCQSolvingStrategies";
import Anatomy from "./pages/subjects/Anatomy";
import Physiology from "./pages/subjects/Physiology";
import Pathology from "./pages/subjects/Pathology";
import Pharmacology from "./pages/subjects/Pharmacology";
import Biochemistry from "./pages/subjects/Biochemistry";
import Microbiology from "./pages/subjects/Microbiology";
import GlobalCelebrations from "./components/GlobalCelebrations";
import ExamReminderPopup from "./components/ExamReminderPopup";
import { useScreenTime } from "./hooks/use-screen-time";
import { useNotificationSync } from "./hooks/use-notification-sync";
import { useEffect } from "react";
import { AdService } from "@/lib/ad-service";

const queryClient = new QueryClient();

const ScreenTimeTracker = () => { useScreenTime(); return null; };
const NotificationSync = () => { useNotificationSync(); return null; };
const AdPreloader = () => {
  // Native wrapper handles rewarded-ad preloading internally; nothing to do here.
  return null;
};


const App = () => (

  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <GlobalCelebrations />
        <ExamReminderPopup />
        <ScreenTimeTracker />
        <NotificationSync />
        <AdPreloader />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/study-tips" element={<StudyTips />} />
            <Route path="/articles/anatomy-guide" element={<HowToStudyAnatomy />} />
            <Route path="/articles/pharmacology-guide" element={<PharmacologyStudyGuide />} />
            <Route path="/articles/pathology-basics" element={<PathologyBasics />} />
            <Route path="/articles/exam-preparation" element={<MBBSExamPreparation />} />
            <Route path="/articles/mcq-strategies" element={<MCQSolvingStrategies />} />
            <Route path="/subjects/anatomy" element={<Anatomy />} />
            <Route path="/subjects/physiology" element={<Physiology />} />
            <Route path="/subjects/pathology" element={<Pathology />} />
            <Route path="/subjects/pharmacology" element={<Pharmacology />} />
            <Route path="/subjects/biochemistry" element={<Biochemistry />} />
            <Route path="/subjects/microbiology" element={<Microbiology />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
