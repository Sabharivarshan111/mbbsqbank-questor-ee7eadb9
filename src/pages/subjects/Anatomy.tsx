import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, BookOpen, Brain, Stethoscope } from "lucide-react";

const Anatomy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Anatomy Questions & Study Guide | ORBIT MBBS QBANK"
        description="Comprehensive Anatomy question bank for MBBS students. Covers gross anatomy, histology, embryology with MCQs and study tips."
        keywords="anatomy questions MBBS, human anatomy MCQ, anatomy study guide, gross anatomy questions"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Question Bank
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <Stethoscope className="h-10 w-10 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Anatomy</h1>
        </div>
        
        <p className="text-lg text-foreground mb-6">
          Human Anatomy is the foundation of medical education, covering the structure and organization of the human body. 
          Our question bank covers all major topics including Upper Limb, Lower Limb, Thorax, Abdomen, Head & Neck, 
          Neuroanatomy, and Histology.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-card border border-border rounded-lg">
            <BookOpen className="h-8 w-8 text-primary mb-3" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Topics Covered</h2>
            <ul className="text-muted-foreground space-y-1">
              <li>• Upper Limb & Lower Limb</li>
              <li>• Thorax & Abdomen</li>
              <li>• Head, Neck & Brain</li>
              <li>• Neuroanatomy</li>
              <li>• Histology & Embryology</li>
            </ul>
          </div>
          <div className="p-6 bg-card border border-border rounded-lg">
            <Brain className="h-8 w-8 text-primary mb-3" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Study Tips</h2>
            <ul className="text-muted-foreground space-y-1">
              <li>• Use 3D models and atlases</li>
              <li>• Learn region by region</li>
              <li>• Practice diagram labeling</li>
              <li>• Use mnemonics for lists</li>
            </ul>
          </div>
        </div>
        
        <div className="p-6 bg-primary/10 border border-primary/20 rounded-lg">
          <h2 className="text-xl font-bold text-foreground mb-3">Practice Anatomy Questions</h2>
          <p className="text-foreground mb-4">Access our comprehensive anatomy question bank with MCQs, short answers, and more.</p>
          <Link to="/" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            Go to Question Bank
          </Link>
        </div>
        
        <div className="mt-8">
          <Link to="/articles/anatomy-guide" className="text-primary hover:underline">
            → Read our complete Anatomy Study Guide
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Anatomy;
