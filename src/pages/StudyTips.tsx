import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, Clock, Brain, Target, BookOpen, Lightbulb, CheckCircle } from "lucide-react";

const StudyTips = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Study Tips for Medical Students | ORBIT MBBS QBANK"
        description="Proven study strategies and tips for MBBS students. Time management, memory techniques, and exam preparation strategies for medical success."
        keywords="medical student study tips, MBBS study strategies, memory techniques medical, time management medical students"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Study Tips for Medical Students
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Proven strategies to help you study smarter, not harder.
        </p>
        
        <div className="space-y-8">
          <section className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Time Management</h2>
            </div>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create a realistic study schedule and stick to it</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use the Pomodoro technique: 25 min study, 5 min break</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Study difficult subjects during your peak energy hours</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Review notes within 24 hours of lectures</span>
              </li>
            </ul>
          </section>
          
          <section className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Memory Techniques</h2>
            </div>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use mnemonics for lists and classifications</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Practice active recall instead of passive reading</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use spaced repetition for long-term retention</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Draw diagrams and flowcharts for visual learning</span>
              </li>
            </ul>
          </section>
          
          <section className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Exam Preparation</h2>
            </div>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Solve previous year questions regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Take mock tests under timed conditions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Analyze mistakes and focus on weak areas</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Start revision at least 2 weeks before exams</span>
              </li>
            </ul>
          </section>
          
          <section className="p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Staying Healthy</h2>
            </div>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Get 6-8 hours of sleep every night</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Exercise regularly to reduce stress</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Eat nutritious meals and stay hydrated</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Take breaks and maintain social connections</span>
              </li>
            </ul>
          </section>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/articles/exam-preparation" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
            <BookOpen className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">Exam Preparation Guide</h3>
            <p className="text-sm text-muted-foreground">Detailed strategies for MBBS exams</p>
          </Link>
          <Link to="/articles/mcq-strategies" className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors">
            <Target className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">MCQ Strategies</h3>
            <p className="text-sm text-muted-foreground">Master multiple choice questions</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudyTips;
