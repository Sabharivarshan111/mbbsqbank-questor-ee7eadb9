import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Pill, Brain, Target, BookOpen, AlertTriangle } from "lucide-react";

const PharmacologyStudyGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Mastering Pharmacology: Complete Study Guide for MBBS | ORBIT MBBS QBANK"
        description="Learn effective strategies to master Pharmacology in MBBS. Covers drug classification, memory techniques, clinical correlations, and exam preparation tips."
        keywords="pharmacology study guide, MBBS pharmacology, drug classification, medical pharmacology tips, pharmacology mnemonics"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Guides
        </Link>
        
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mastering Pharmacology: Tips and Strategies for MBBS Students
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Last updated: January 2025 • 15 min read
          </p>
          
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              What You'll Learn
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• The drug classification approach to learning pharmacology</li>
              <li>• Memory techniques for drug names and mechanisms</li>
              <li>• Understanding pharmacokinetics and pharmacodynamics</li>
              <li>• Clinical correlation strategies</li>
              <li>• Common exam patterns and preparation tips</li>
            </ul>
          </div>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Pill className="h-6 w-6 text-primary" />
              Why Pharmacology Matters
            </h2>
            <p className="text-foreground mb-4">
              Pharmacology is the bridge between basic sciences and clinical medicine. Every prescription you write as a doctor 
              requires a solid understanding of how drugs work, their side effects, drug interactions, and contraindications. 
              This subject is heavily tested in professional exams and is crucial for NEET PG and other competitive examinations.
            </p>
            <p className="text-foreground mb-4">
              The challenge with pharmacology is the massive number of drugs to learn, each with its mechanism of action, 
              adverse effects, and clinical uses. However, with a systematic approach, you can conquer this subject effectively.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              The Drug Classification Approach
            </h2>
            <p className="text-foreground mb-4">
              Instead of memorizing individual drugs, learn them by their drug classes. Drugs in the same class often share 
              similar mechanisms, side effects, and clinical applications. This approach dramatically reduces your memory load.
            </p>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Example: Beta Blockers</h3>
              <p className="text-foreground mb-3">
                Once you understand that beta blockers work by blocking beta-adrenergic receptors, you can predict their effects:
              </p>
              <ul className="list-disc list-inside text-foreground space-y-1">
                <li>Decreased heart rate (β1 blockade)</li>
                <li>Decreased blood pressure</li>
                <li>Bronchoconstriction (β2 blockade)</li>
                <li>Potential for masking hypoglycemia symptoms</li>
              </ul>
              <p className="text-foreground mt-3">
                Then, learn the specific differences: Metoprolol is cardioselective (β1), while Propranolol is non-selective.
              </p>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Essential Pharmacology Concepts
            </h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">1. Pharmacokinetics (ADME)</h3>
            <p className="text-foreground mb-4">
              Understanding how the body handles drugs is crucial:
            </p>
            <ul className="list-disc list-inside text-foreground mb-6 space-y-2">
              <li><strong>Absorption:</strong> How drugs enter the body (oral bioavailability, first-pass metabolism)</li>
              <li><strong>Distribution:</strong> How drugs spread through tissues (volume of distribution, protein binding)</li>
              <li><strong>Metabolism:</strong> How drugs are broken down (CYP450 enzymes, drug interactions)</li>
              <li><strong>Excretion:</strong> How drugs leave the body (renal clearance, half-life)</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">2. Pharmacodynamics</h3>
            <p className="text-foreground mb-4">
              This covers what drugs do to the body:
            </p>
            <ul className="list-disc list-inside text-foreground mb-6 space-y-2">
              <li>Receptor types (G-protein coupled, ion channels, enzyme-linked, nuclear)</li>
              <li>Agonists vs antagonists</li>
              <li>Dose-response relationships</li>
              <li>Therapeutic index and safety margins</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">3. Receptor Pharmacology</h3>
            <p className="text-foreground mb-4">
              Master the major receptor systems:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li>Adrenergic receptors (α1, α2, β1, β2, β3)</li>
              <li>Cholinergic receptors (muscarinic M1-M5, nicotinic)</li>
              <li>Dopamine receptors (D1-D5)</li>
              <li>Serotonin receptors</li>
              <li>Histamine receptors (H1, H2, H3)</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Memory Techniques for Pharmacology
            </h2>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Drug Name Patterns</h3>
              <p className="text-foreground">
                Many drugs follow naming conventions that hint at their class:
              </p>
              <ul className="list-disc list-inside text-foreground mt-3 space-y-1">
                <li><strong>-olol:</strong> Beta blockers (Propranolol, Atenolol)</li>
                <li><strong>-pril:</strong> ACE inhibitors (Captopril, Enalapril)</li>
                <li><strong>-sartan:</strong> ARBs (Losartan, Valsartan)</li>
                <li><strong>-pine:</strong> Calcium channel blockers (Amlodipine, Nifedipine)</li>
                <li><strong>-statin:</strong> HMG-CoA reductase inhibitors (Atorvastatin, Simvastatin)</li>
                <li><strong>-azole:</strong> Antifungals (Fluconazole, Ketoconazole)</li>
                <li><strong>-cillin:</strong> Penicillins (Amoxicillin, Ampicillin)</li>
              </ul>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Mnemonics for Side Effects</h3>
              <p className="text-foreground mb-3">
                <strong>Atropine side effects:</strong> "Hot as a Hare, Blind as a Bat, Dry as a Bone, Red as a Beet, Mad as a Hatter"
              </p>
              <p className="text-foreground">
                <strong>Thiazide effects on electrolytes:</strong> "Hyper GLUC" (Hyperglycemia, Hyperlipidemia, Hyperuricemia, Hypercalcemia) 
                and hypokalemia, hyponatremia
              </p>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              High-Yield Topics for Exams
            </h2>
            <p className="text-foreground mb-4">
              Focus extra attention on these frequently tested areas:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li>Autonomic nervous system drugs (cholinergics, anticholinergics, adrenergics)</li>
              <li>Cardiovascular pharmacology (antihypertensives, antiarrhythmics, antianginals)</li>
              <li>Antimicrobial agents (spectrum, mechanism, resistance patterns)</li>
              <li>CNS pharmacology (antiepileptics, antidepressants, antipsychotics)</li>
              <li>Drug interactions and contraindications</li>
              <li>Drugs in pregnancy and lactation</li>
              <li>Poisoning and antidotes</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Study Strategy Timeline
            </h2>
            
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Daily Study (2-3 hours)</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Review lecture notes within 24 hours</li>
                  <li>• Learn 5-10 new drugs with their key details</li>
                  <li>• Revise previously learned drug classes</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Weekly Review</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Comprehensive review of the week's drug classes</li>
                  <li>• Solve MCQs on covered topics</li>
                  <li>• Create summary charts for drug comparisons</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Before Exams</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Focus on high-yield topics and drug interactions</li>
                  <li>• Practice previous year questions</li>
                  <li>• Review emergency drugs and antidotes</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Recommended Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Textbooks</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Katzung's Basic & Clinical Pharmacology</li>
                  <li>• Goodman & Gilman's Pharmacological Basis</li>
                  <li>• Lippincott Illustrated Reviews: Pharmacology</li>
                  <li>• KD Tripathi's Essentials of Medical Pharmacology</li>
                </ul>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Quick Revision</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Sketchy Pharmacology (visual mnemonics)</li>
                  <li>• First Aid for USMLE</li>
                  <li>• Pharmacology flash cards</li>
                  <li>• ORBIT Pharmacology Question Bank</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Practice Pharmacology Questions
            </h2>
            <p className="text-foreground mb-4">
              Test your pharmacology knowledge with our comprehensive question bank covering all drug classes from 
              autonomic pharmacology to chemotherapy.
            </p>
            <Link 
              to="/subjects/pharmacology"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Go to Pharmacology Questions
            </Link>
          </section>
        </article>
        
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Related Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/articles/pathology-basics" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">Understanding Pathology</h4>
              <p className="text-sm text-muted-foreground">From basics to clinical application</p>
            </Link>
            <Link to="/articles/mcq-strategies" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">MCQ Solving Strategies</h4>
              <p className="text-sm text-muted-foreground">Ace your pharmacology MCQs</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacologyStudyGuide;
