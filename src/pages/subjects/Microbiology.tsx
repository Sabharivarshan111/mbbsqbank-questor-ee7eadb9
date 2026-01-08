import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Bug } from "lucide-react";

const Microbiology = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Microbiology Questions & Study Guide | ORBIT MBBS QBANK" description="Comprehensive Microbiology question bank covering bacteriology, virology, mycology, and parasitology for MBBS students." keywords="microbiology questions MBBS, microbiology MCQ, bacteriology questions, virology" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Question Bank</Link>
        <div className="flex items-center gap-3 mb-6"><Bug className="h-10 w-10 text-primary" /><h1 className="text-3xl md:text-4xl font-bold text-foreground">Microbiology</h1></div>
        <p className="text-lg text-foreground mb-6">Study microorganisms and infectious diseases. Our question bank covers general microbiology, bacteriology, virology, mycology, parasitology, and immunology.</p>
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg"><h2 className="text-xl font-bold text-foreground mb-3">Practice Microbiology Questions</h2><p className="text-foreground mb-4">Access MCQs on all microorganisms and infectious diseases.</p><Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">Go to Question Bank</Link></div>
      </div>
    </div>
  );
};
export default Microbiology;
