import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Microscope } from "lucide-react";

const Pathology = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Pathology Questions & Study Guide | ORBIT MBBS QBANK" description="Comprehensive Pathology question bank covering general and systemic pathology for MBBS students." keywords="pathology questions MBBS, pathology MCQ, general pathology, systemic pathology" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Question Bank</Link>
        <div className="flex items-center gap-3 mb-6"><Microscope className="h-10 w-10 text-primary" /><h1 className="text-3xl md:text-4xl font-bold text-foreground">Pathology</h1></div>
        <p className="text-lg text-foreground mb-6">Pathology studies disease processes and their effects on the body. Our question bank covers cell injury, inflammation, neoplasia, hematology, and systemic pathology of all organ systems.</p>
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg mb-8"><h2 className="text-xl font-bold text-foreground mb-3">Practice Pathology Questions</h2><p className="text-foreground mb-4">Access MCQs on general pathology, systemic pathology, and clinical pathology.</p><Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">Go to Question Bank</Link></div>
        <Link to="/articles/pathology-basics" className="text-primary hover:underline">→ Read our Pathology Study Guide</Link>
      </div>
    </div>
  );
};
export default Pathology;
