import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, GraduationCap, Clock, Brain, CheckCircle, Calendar, Target } from "lucide-react";

const MBBSExamPreparation = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Ultimate MBBS Exam Preparation Guide 2025 | ORBIT MBBS QBANK"
        description="Complete guide to preparing for MBBS university exams and competitive medical examinations. Time management, revision strategies, and stress management tips."
        keywords="MBBS exam preparation, medical exam tips, MBBS study strategy, university exam preparation, NEET PG preparation"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study Guides
        </Link>
        
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ultimate MBBS Exam Preparation Guide
          </h1>
          
          <p className="text-muted-foreground text-lg mb-8">
            Last updated: January 2025 • 16 min read
          </p>
          
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              What This Guide Covers
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Creating an effective study schedule</li>
              <li>• Time management during exam preparation</li>
              <li>• Subject-wise revision strategies</li>
              <li>• Mock test importance and analysis</li>
              <li>• Exam day strategies</li>
              <li>• Stress management and well-being</li>
            </ul>
          </div>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              The Reality of MBBS Exams
            </h2>
            <p className="text-foreground mb-4">
              MBBS examinations are among the most challenging academic tests due to the vast syllabus, clinical integration, 
              and the need for both theoretical knowledge and practical skills. Whether you're preparing for university 
              professional exams or competitive exams like NEET PG, a structured approach is essential for success.
            </p>
            <p className="text-foreground mb-4">
              The key to success isn't just studying hard – it's studying smart. This guide will help you develop strategies 
              that maximize your preparation efficiency and minimize stress.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Creating Your Study Schedule
            </h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">Long-Term Planning (3-6 Months Before)</h3>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li>List all subjects and topics to be covered</li>
                <li>Estimate time needed for each subject (some subjects need more time)</li>
                <li>Create a monthly syllabus completion target</li>
                <li>Plan for at least 2-3 complete revisions</li>
                <li>Schedule time for solving previous year questions</li>
              </ul>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">Medium-Term Planning (1 Month Before)</h3>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li>All first reading should be complete by now</li>
                <li>Focus on revision and consolidation</li>
                <li>Identify weak areas and allocate extra time</li>
                <li>Start intensive MCQ practice</li>
                <li>Review high-yield topics and tables</li>
              </ul>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-3">Short-Term Planning (1-2 Weeks Before)</h3>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li>Quick revision of entire syllabus using notes</li>
                <li>Focus on frequently asked topics</li>
                <li>Solve mock tests under timed conditions</li>
                <li>Review weak areas identified from mock tests</li>
                <li>Maintain regular sleep and meal schedules</li>
              </ul>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              Daily Study Routine
            </h2>
            <p className="text-foreground mb-4">
              A well-structured daily routine is crucial for sustained productivity. Here's a sample schedule:
            </p>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Sample Daily Schedule (During Exam Prep)</h3>
              <div className="space-y-3 text-foreground">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>6:00 - 6:30 AM</span>
                  <span className="text-muted-foreground">Wake up, freshen up</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>6:30 - 9:30 AM</span>
                  <span className="text-muted-foreground">Study Session 1 (Most difficult subject)</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>9:30 - 10:00 AM</span>
                  <span className="text-muted-foreground">Breakfast break</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>10:00 - 1:00 PM</span>
                  <span className="text-muted-foreground">Study Session 2</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>1:00 - 2:30 PM</span>
                  <span className="text-muted-foreground">Lunch and rest</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>2:30 - 5:30 PM</span>
                  <span className="text-muted-foreground">Study Session 3</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>5:30 - 6:30 PM</span>
                  <span className="text-muted-foreground">Exercise/Walk</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>6:30 - 7:30 PM</span>
                  <span className="text-muted-foreground">Dinner and relaxation</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>7:30 - 10:00 PM</span>
                  <span className="text-muted-foreground">Study Session 4 (Revision/MCQs)</span>
                </div>
                <div className="flex justify-between">
                  <span>10:00 - 10:30 PM</span>
                  <span className="text-muted-foreground">Quick review of day's learning</span>
                </div>
              </div>
            </div>
            
            <p className="text-foreground">
              <strong>Key points:</strong> Keep your most productive hours for difficult subjects. Take short breaks 
              every 45-50 minutes. Don't sacrifice sleep – aim for 6-7 hours minimum.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Subject-Wise Strategy
            </h2>
            
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">For Theory-Heavy Subjects (Pathology, Pharmacology, Medicine)</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Create summary notes or flashcards during first reading</li>
                  <li>Use mnemonics for drug names, classifications, and lists</li>
                  <li>Focus on high-yield topics and frequently asked questions</li>
                  <li>Practice MCQs after each chapter</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">For Concept-Based Subjects (Physiology, Biochemistry)</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Focus on understanding mechanisms and pathways</li>
                  <li>Draw flowcharts and diagrams</li>
                  <li>Relate to clinical applications</li>
                  <li>Practice numerical problems if applicable</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">For Visual Subjects (Anatomy, Histology)</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Use atlases and 3D models extensively</li>
                  <li>Practice drawing and labeling diagrams</li>
                  <li>Correlate surface anatomy with clinical examination</li>
                  <li>Review histology slides regularly</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3">For Clinical Subjects (Surgery, Medicine, OBG)</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Focus on clinical presentations and case-based learning</li>
                  <li>Know examination findings and investigations</li>
                  <li>Understand treatment protocols and emergency management</li>
                  <li>Practice long cases and short cases</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              Mock Tests and Self-Assessment
            </h2>
            <p className="text-foreground mb-4">
              Mock tests are essential for exam success. Here's how to use them effectively:
            </p>
            
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Why Mock Tests Matter</h3>
              <ul className="list-disc list-inside text-foreground space-y-2">
                <li><strong>Time management:</strong> Learn to allocate time per question</li>
                <li><strong>Identify weak areas:</strong> Focus revision on topics where you score poorly</li>
                <li><strong>Reduce exam anxiety:</strong> Familiarity with exam format builds confidence</li>
                <li><strong>Track progress:</strong> See improvement over time</li>
              </ul>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-3">How to Analyze Mock Tests</h3>
              <ol className="list-decimal list-inside text-foreground space-y-2">
                <li>Review every wrong answer – understand why you got it wrong</li>
                <li>Categorize mistakes: knowledge gap, misreading, or time pressure?</li>
                <li>Make note of topics that need more revision</li>
                <li>Track your score trends over multiple tests</li>
                <li>Don't just look at the score – analyze the pattern of errors</li>
              </ol>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Exam Day Strategies
            </h2>
            
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Night Before the Exam</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Stop studying by 9-10 PM</li>
                  <li>• Prepare all required materials (ID, admit card, stationery)</li>
                  <li>• Get at least 6-7 hours of sleep</li>
                  <li>• Avoid new topics – only quick revision</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Morning of the Exam</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Wake up early, have a good breakfast</li>
                  <li>• Light revision only – don't panic read</li>
                  <li>• Reach the exam center 30-45 minutes early</li>
                  <li>• Stay calm and confident</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">During the Exam</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Read all questions carefully before starting</li>
                  <li>• Answer questions you're confident about first</li>
                  <li>• Allocate time per question and stick to it</li>
                  <li>• Don't spend too long on any single question</li>
                  <li>• Review answers if time permits</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Stress Management Tips
            </h2>
            <p className="text-foreground mb-4">
              Medical exams are stressful, but managing stress is crucial for performance:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2">
              <li><strong>Exercise regularly:</strong> Even 30 minutes of walking helps reduce stress</li>
              <li><strong>Maintain social connections:</strong> Don't isolate yourself completely</li>
              <li><strong>Practice relaxation techniques:</strong> Deep breathing, meditation, or yoga</li>
              <li><strong>Take breaks:</strong> Short breaks improve productivity</li>
              <li><strong>Eat well:</strong> Proper nutrition supports brain function</li>
              <li><strong>Sleep adequately:</strong> Sleep deprivation impairs memory and cognition</li>
              <li><strong>Stay positive:</strong> Believe in your preparation</li>
            </ul>
          </section>
          
          <section className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Start Practicing Now
            </h2>
            <p className="text-foreground mb-4">
              Access thousands of MCQs and practice questions across all MBBS subjects. Regular practice is key to exam success.
            </p>
            <Link 
              to="/"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Go to Question Bank
            </Link>
          </section>
        </article>
        
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Related Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/articles/mcq-strategies" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">MCQ Solving Strategies</h4>
              <p className="text-sm text-muted-foreground">Master the art of solving multiple choice questions</p>
            </Link>
            <Link to="/study-tips" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
              <h4 className="font-medium text-foreground">Study Tips</h4>
              <p className="text-sm text-muted-foreground">General study strategies for medical students</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MBBSExamPreparation;
