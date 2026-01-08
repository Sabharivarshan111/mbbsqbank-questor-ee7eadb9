import { Link } from "react-router-dom";
import { BookOpen, Brain, Stethoscope, GraduationCap } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="w-full py-8 mb-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Your Complete MBBS Question Bank & AI Study Companion
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
          ORBIT MBBS QBANK is a comprehensive, free medical education platform designed specifically for MBBS students 
          preparing for university exams, NEET PG, and other competitive medical examinations. Our extensive question bank 
          covers all major subjects including Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology, 
          and clinical subjects with thousands of carefully curated MCQs and short answer questions.
        </p>
        <p className="text-muted-foreground text-base leading-relaxed mb-8">
          What sets ORBIT apart is our integrated AI assistant that helps you understand complex medical concepts, 
          generates practice MCQs on any topic, and provides detailed explanations. Whether you're revising for your 
          first-year anatomy exam or preparing for NEET PG, ORBIT provides the tools you need to succeed in your medical journey.
        </p>
        
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link 
            to="/subjects/anatomy" 
            className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:border-primary transition-colors"
          >
            <Stethoscope className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Anatomy</span>
          </Link>
          <Link 
            to="/subjects/physiology" 
            className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:border-primary transition-colors"
          >
            <Brain className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Physiology</span>
          </Link>
          <Link 
            to="/subjects/pathology" 
            className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:border-primary transition-colors"
          >
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Pathology</span>
          </Link>
          <Link 
            to="/subjects/pharmacology" 
            className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:border-primary transition-colors"
          >
            <GraduationCap className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Pharmacology</span>
          </Link>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            to="/blog" 
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Study Guides
          </Link>
          <Link 
            to="/faq" 
            className="px-6 py-2 rounded-lg border border-border hover:border-primary text-foreground transition-colors font-medium"
          >
            FAQs
          </Link>
        </div>
      </div>
    </section>
  );
};
