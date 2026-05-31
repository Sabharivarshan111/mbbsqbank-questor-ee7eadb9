import { useEffect } from "react";
import { Link } from "react-router-dom";
import QuestionBank from "@/components/QuestionBank";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AiChat } from "@/components/AiChat";
import PomodoroTimer from "@/components/PomodoroTimer";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Eye, ArrowUp } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Walkthrough } from "@/components/walkthrough/Walkthrough";

const Index = () => {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Delayed scroll to ensure it runs after all components mount
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <SEOHead 
        title="ORBIT MBBS QBANK - Free Medical Question Bank with AI Assistant"
        description="Free comprehensive MBBS question bank covering Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, and more. Features AI-powered study assistant for medical students preparing for university exams and NEET PG."
        keywords="MBBS question bank, medical MCQ, NEET PG preparation, anatomy questions, pharmacology MCQ, pathology questions, medical education, free medical questions"
      />
      <InstallPrompt />
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center animate-fade-in">
          <div className="w-full mb-8">
            <div className="flex justify-between items-center">
              <div className="group">
                <h1 className="text-4xl font-bold mb-2 text-foreground tracking-tight flex items-center gap-2">
                  <Eye className="h-8 w-8" />
                  ORBIT
                  <span className="text-muted-foreground ml-2 text-lg">MBBS QBANK WITH AI</span>
                </h1>
              </div>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Question Bank - FIRST */}
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-[1fr,1fr] w-full mb-8">
            <div className="space-y-8" data-tour="question-bank">
              <QuestionBank />
            </div>
            
            <div className="lg:h-[calc(100vh-12rem)] overflow-hidden flex flex-col" data-tour="ai-chat">
              <AiChat />
            </div>
          </div>
          
          {/* Footer with Creator Name */}
          <div className="w-full mb-8 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-1">
              <Link to="/privacy-policy" className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors">Terms of Service</Link>
              <Link to="/about" className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors">About</Link>
              <Link to="/blog" className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors">Study Guides</Link>
              <Link to="/faq" className="inline-flex items-center justify-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-accent active:bg-accent/70 transition-colors">FAQ</Link>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Created by</span>
              <a
                href="https://sabharivarshanprofile.lovable.app/"
                target="_blank"
                rel="noopener noreferrer"
                data-tour="report-issue"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Sabharivarshan S
              </a>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUp className="h-3 w-3" />
                Tap name to report any issues
              </span>
            </div>
          </div>
          
        </div>
      </div>
      <PomodoroTimer />
    </div>
  );
};

export default Index;
