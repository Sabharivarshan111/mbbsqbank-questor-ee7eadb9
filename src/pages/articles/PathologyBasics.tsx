import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Microscope, AlertCircle, BookOpen, Target, Lightbulb } from "lucide-react";

const PathologyBasics = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Understanding Pathology: Complete Guide for MBBS Students | ORBIT MBBS QBANK"
        description="Master Pathology from basics to clinical application. Learn about cell injury, inflammation, neoplasia, and systemic pathology with effective study strategies."
        keywords="pathology study guide, MBBS pathology, general pathology, systemic pathology, medical student pathology"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Guides
        </Link>
        
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Understanding Pathology: From Basics to Clinical Application
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Last updated: January 2025 • 14 min read
          </p>
          
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Topics Covered
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Introduction to pathology and its branches</li>
              <li>• Cell injury, adaptation, and death</li>
              <li>• Inflammation and tissue repair</li>
              <li>• Hemodynamic disorders</li>
              <li>• Neoplasia fundamentals</li>
              <li>• Study strategies for pathology</li>
            </ul>
          </div>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Microscope className="h-6 w-6 text-primary" />
              What is Pathology?
            </h2>
            <p className="text-foreground mb-4">
              Pathology is the study of disease – its causes, mechanisms, and effects on the body. It bridges basic sciences 
              with clinical medicine, helping doctors understand why patients develop certain signs and symptoms. As a medical 
              student, pathology helps you understand disease processes, which is essential for diagnosis and treatment.
            </p>
            <p className="text-foreground mb-4">
              Pathology is divided into two main branches:
            </p>
            <ul className="list-disc list-inside text-foreground mb-4 space-y-2">
              <li><strong>General Pathology:</strong> Basic mechanisms of disease applicable to all organs (cell injury, inflammation, neoplasia)</li>
              <li><strong>Systemic Pathology:</strong> Diseases of specific organ systems (cardiovascular, respiratory, GI pathology)</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Core Concepts in General Pathology
            </h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">1. Cell Injury and Adaptation</h3>
            <p className="text-foreground mb-4">
              Cells respond to stress through adaptation or injury. Understanding these responses is fundamental:
            </p>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-foreground mb-3">Cellular Adaptations</h4>
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li><strong>Hypertrophy:</strong> Increase in cell size (e.g., cardiac muscle in hypertension)</li>
                <li><strong>Hyperplasia:</strong> Increase in cell number (e.g., endometrial hyperplasia)</li>
                <li><strong>Atrophy:</strong> Decrease in cell size (e.g., muscle atrophy from disuse)</li>
                <li><strong>Metaplasia:</strong> Change from one cell type to another (e.g., Barrett's esophagus)</li>
                <li><strong>Dysplasia:</strong> Abnormal cell growth, often precancerous</li>
              </ul>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-foreground mb-3">Cell Death</h4>
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li><strong>Necrosis:</strong> Pathological cell death with inflammation (coagulative, liquefactive, caseous, gangrenous, fat necrosis)</li>
                <li><strong>Apoptosis:</strong> Programmed cell death without inflammation</li>
              </ul>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2. Inflammation</h3>
            <p className="text-foreground mb-4">
              Inflammation is the body's response to injury or infection. It's divided into:
            </p>
            <ul className="list-disc list-inside text-foreground mb-4 space-y-2">
              <li><strong>Acute Inflammation:</strong> Rapid response with vascular changes and neutrophil recruitment (cardinal signs: rubor, tumor, calor, dolor, functio laesa)</li>
              <li><strong>Chronic Inflammation:</strong> Prolonged response with mononuclear cells (lymphocytes, macrophages, plasma cells)</li>
              <li><strong>Granulomatous Inflammation:</strong> Special form with epithelioid cells and giant cells (TB, sarcoidosis, foreign body)</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">3. Tissue Repair and Healing</h3>
            <p className="text-foreground mb-4">
              After inflammation, tissues heal through:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li><strong>Regeneration:</strong> Replacement with same cell type (labile and stable cells)</li>
              <li><strong>Repair by scarring:</strong> Formation of fibrous tissue (permanent cells)</li>
              <li><strong>Wound healing:</strong> First intention (clean wounds) vs second intention (open wounds)</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-primary" />
              Hemodynamic Disorders
            </h2>
            <p className="text-foreground mb-4">
              These disorders involve abnormalities in blood flow and fluid balance:
            </p>
            <ul className="list-disc list-inside text-foreground mb-4 space-y-2">
              <li><strong>Edema:</strong> Accumulation of fluid in tissues (causes: increased hydrostatic pressure, decreased oncotic pressure, lymphatic obstruction, inflammation)</li>
              <li><strong>Hyperemia and Congestion:</strong> Increased blood in tissues (active vs passive)</li>
              <li><strong>Hemorrhage:</strong> Escape of blood from vessels</li>
              <li><strong>Thrombosis:</strong> Formation of blood clot in vessels (Virchow's triad)</li>
              <li><strong>Embolism:</strong> Intravascular mass traveling through blood</li>
              <li><strong>Infarction:</strong> Tissue death due to ischemia</li>
              <li><strong>Shock:</strong> Systemic hypoperfusion (cardiogenic, hypovolemic, septic, anaphylactic, neurogenic)</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Neoplasia: Understanding Tumors
            </h2>
            <p className="text-foreground mb-4">
              Neoplasia is abnormal, uncontrolled cell growth. Key concepts include:
            </p>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-foreground mb-3">Benign vs Malignant Tumors</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-foreground">Feature</th>
                      <th className="text-left py-2 text-foreground">Benign</th>
                      <th className="text-left py-2 text-foreground">Malignant</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border">
                      <td className="py-2">Growth</td>
                      <td className="py-2">Slow, expansile</td>
                      <td className="py-2">Rapid, infiltrative</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">Borders</td>
                      <td className="py-2">Well-defined, encapsulated</td>
                      <td className="py-2">Irregular, invasive</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2">Differentiation</td>
                      <td className="py-2">Well-differentiated</td>
                      <td className="py-2">Variable (anaplasia)</td>
                    </tr>
                    <tr>
                      <td className="py-2">Metastasis</td>
                      <td className="py-2">None</td>
                      <td className="py-2">Present</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">Tumor Nomenclature</h3>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li><strong>Epithelial:</strong> Benign (-oma), Malignant (carcinoma)</li>
              <li><strong>Mesenchymal:</strong> Benign (-oma), Malignant (sarcoma)</li>
              <li><strong>Examples:</strong> Adenoma → Adenocarcinoma, Fibroma → Fibrosarcoma</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Study Strategies for Pathology
            </h2>
            
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">1. Understand, Don't Memorize</h3>
                <p className="text-foreground">
                  Pathology makes sense when you understand the underlying mechanisms. For example, understanding why 
                  infarcts are pale in solid organs but hemorrhagic in loose tissues (dual blood supply) helps you 
                  remember without rote memorization.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">2. Master General Pathology First</h3>
                <p className="text-foreground">
                  General pathology concepts apply throughout systemic pathology. If you understand inflammation well, 
                  you'll understand inflammatory conditions in every organ system.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">3. Integrate with Clinical Medicine</h3>
                <p className="text-foreground">
                  Connect pathology to clinical presentations. When studying MI, think about ECG changes, cardiac markers, 
                  and treatment. This integration reinforces learning and prepares you for clinical practice.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">4. Use Pathology Slides</h3>
                <p className="text-foreground">
                  Histopathology is crucial. Learn to identify classic microscopic features: pyknosis, karyorrhexis, 
                  granulomas, malignant cells. Practice with virtual microscopy resources.
                </p>
              </div>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Recommended Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Textbooks</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Robbins Basic Pathology</li>
                  <li>• Robbins & Cotran Pathologic Basis of Disease</li>
                  <li>• Harsh Mohan Textbook of Pathology</li>
                  <li>• Goljan Rapid Review Pathology</li>
                </ul>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Visual Learning</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Pathoma (video lectures)</li>
                  <li>• WebPath (virtual slides)</li>
                  <li>• PathPresenter</li>
                  <li>• ORBIT Pathology Question Bank</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Practice Pathology Questions
            </h2>
            <p className="text-foreground mb-4">
              Test your pathology knowledge with our comprehensive question bank covering general and systemic pathology.
            </p>
            <Link 
              to="/subjects/pathology"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Go to Pathology Questions
            </Link>
          </section>
        </article>
        
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Related Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/articles/anatomy-guide" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">Anatomy Study Guide</h4>
              <p className="text-sm text-muted-foreground">Complete guide to studying human anatomy</p>
            </Link>
            <Link to="/articles/pharmacology-guide" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">Pharmacology Study Guide</h4>
              <p className="text-sm text-muted-foreground">Master drug classes and mechanisms</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathologyBasics;
