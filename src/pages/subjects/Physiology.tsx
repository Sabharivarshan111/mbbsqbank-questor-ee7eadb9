import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, BookOpen, Brain, Activity } from "lucide-react";

const Physiology = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Physiology Questions & Study Guide | ORBIT MBBS QBANK" description="Comprehensive Physiology question bank covering all body systems. MCQs and study resources for MBBS students." keywords="physiology questions MBBS, human physiology MCQ, physiology study guide" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back to Question Bank</Link>
        <div className="flex items-center gap-3 mb-6"><Activity className="h-10 w-10 text-primary" /><h1 className="text-3xl md:text-4xl font-bold text-foreground">Physiology</h1></div>
        <p className="text-lg text-foreground mb-6">Physiology studies how the human body functions. Master cardiovascular, respiratory, renal, nervous, and endocrine systems with our comprehensive question bank.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-card border border-border rounded-lg"><BookOpen className="h-8 w-8 text-primary mb-3" /><h2 className="text-xl font-semibold text-foreground mb-2">Topics Covered</h2><ul className="text-muted-foreground space-y-1"><li>• General Physiology & Blood</li><li>• Cardiovascular & Respiratory</li><li>• Renal & GI Physiology</li><li>• Neurophysiology</li><li>• Endocrine Physiology</li></ul></div>
          <div className="p-6 bg-card border border-border rounded-lg"><Brain className="h-8 w-8 text-primary mb-3" /><h2 className="text-xl font-semibold text-foreground mb-2">Study Tips</h2><ul className="text-muted-foreground space-y-1"><li>• Understand mechanisms, don't memorize</li><li>• Draw flowcharts for pathways</li><li>• Relate to clinical applications</li><li>• Practice numerical problems</li></ul></div>
        </div>
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg"><h2 className="text-xl font-bold text-foreground mb-3">Practice Physiology Questions</h2><p className="text-foreground mb-4">Access our comprehensive physiology question bank.</p><Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">Go to Question Bank</Link></div>
      </div>
    </div>
  );
};
export default Physiology;
