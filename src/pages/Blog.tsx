import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, BookOpen, FileText, Lightbulb, Target, Brain } from "lucide-react";

const articles = [
  {
    title: "Complete Guide to Studying Anatomy for MBBS Students",
    description: "Learn effective strategies and techniques to master Human Anatomy. Includes study tips, mnemonics, and exam preparation guidance.",
    link: "/articles/anatomy-guide",
    icon: BookOpen,
    readTime: "12 min read"
  },
  {
    title: "Mastering Pharmacology: Tips and Strategies",
    description: "Master drug classification, memory techniques, and clinical correlations for pharmacology success.",
    link: "/articles/pharmacology-guide",
    icon: Brain,
    readTime: "15 min read"
  },
  {
    title: "Understanding Pathology: From Basics to Clinical Application",
    description: "Comprehensive guide covering cell injury, inflammation, neoplasia, and systemic pathology study strategies.",
    link: "/articles/pathology-basics",
    icon: FileText,
    readTime: "14 min read"
  },
  {
    title: "Ultimate MBBS Exam Preparation Guide",
    description: "Complete strategies for acing your medical exams. Time management, revision strategies, and stress management.",
    link: "/articles/exam-preparation",
    icon: Target,
    readTime: "16 min read"
  },
  {
    title: "How to Solve MCQs Effectively in Medical Exams",
    description: "Learn the elimination technique, time allocation strategies, and how to avoid common MCQ traps.",
    link: "/articles/mcq-strategies",
    icon: Lightbulb,
    readTime: "13 min read"
  }
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Medical Study Guides & Articles | ORBIT MBBS QBANK"
        description="Free educational articles and study guides for MBBS students. Learn effective study strategies for Anatomy, Pharmacology, Pathology, and more."
        keywords="MBBS study guides, medical education articles, anatomy study tips, pharmacology guide, pathology basics"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Study Guides & Articles
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Free educational resources to help you excel in your MBBS journey. Written by medical professionals for medical students.
        </p>
        
        <div className="space-y-6">
          {articles.map((article, index) => (
            <Link 
              key={index}
              to={article.link}
              className="block p-6 bg-card border border-border rounded-lg hover:border-primary transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-4">
                <article.icon className="h-8 w-8 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-muted-foreground mb-2">{article.description}</p>
                  <span className="text-sm text-primary">{article.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-primary/10 border border-primary/20 rounded-lg">
          <h2 className="text-xl font-bold text-foreground mb-3">Looking for Practice Questions?</h2>
          <p className="text-foreground mb-4">
            Access our comprehensive question bank with thousands of MCQs across all MBBS subjects.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Go to Question Bank
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Blog;
