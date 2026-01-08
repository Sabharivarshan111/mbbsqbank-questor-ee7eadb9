import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Pill } from "lucide-react";

const Pharmacology = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Pharmacology Questions & Study Guide | ORBIT MBBS QBANK" description="Comprehensive Pharmacology question bank covering all drug classes for MBBS students and NEET PG preparation." keywords="pharmacology questions MBBS, pharmacology MCQ, drug classification, NEET PG pharmacology" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Question Bank</Link>
        <div className="flex items-center gap-3 mb-6"><Pill className="h-10 w-10 text-primary" /><h1 className="text-3xl md:text-4xl font-bold text-foreground">Pharmacology</h1></div>
        <p className="text-lg text-foreground mb-6">Master drug mechanisms, classifications, and clinical applications. Our question bank covers autonomic pharmacology, cardiovascular drugs, CNS drugs, antimicrobials, and more.</p>
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg mb-8"><h2 className="text-xl font-bold text-foreground mb-3">Practice Pharmacology Questions</h2><p className="text-foreground mb-4">Access MCQs on all drug classes with detailed explanations.</p><Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">Go to Question Bank</Link></div>
        <Link to="/articles/pharmacology-guide" className="text-primary hover:underline">→ Read our Pharmacology Study Guide</Link>
      </div>
    </div>
  );
};
export default Pharmacology;
