import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, FlaskConical } from "lucide-react";

const Biochemistry = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Biochemistry Questions & Study Guide | ORBIT MBBS QBANK" description="Comprehensive Biochemistry question bank covering metabolism, enzymes, and molecular biology for MBBS students." keywords="biochemistry questions MBBS, biochemistry MCQ, metabolism questions, molecular biology" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Question Bank</Link>
        <div className="flex items-center gap-3 mb-6"><FlaskConical className="h-10 w-10 text-primary" /><h1 className="text-3xl md:text-4xl font-bold text-foreground">Biochemistry</h1></div>
        <p className="text-lg text-foreground mb-6">Understand the chemical processes of life. Our question bank covers carbohydrate, lipid, protein metabolism, enzymology, molecular biology, and clinical biochemistry.</p>
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg"><h2 className="text-xl font-bold text-foreground mb-3">Practice Biochemistry Questions</h2><p className="text-foreground mb-4">Access MCQs on metabolic pathways, enzymes, and clinical correlations.</p><Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">Go to Question Bank</Link></div>
      </div>
    </div>
  );
};
export default Biochemistry;
