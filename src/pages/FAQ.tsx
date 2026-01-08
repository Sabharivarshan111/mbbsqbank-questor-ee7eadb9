import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is ORBIT MBBS QBANK?",
    answer: "ORBIT MBBS QBANK is a free, comprehensive question bank designed for MBBS students. It covers all major subjects from first year to final year, including Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology, and clinical subjects. Our platform also features an AI-powered assistant to help with explanations and generate custom MCQs."
  },
  {
    question: "Is ORBIT completely free to use?",
    answer: "Yes! ORBIT MBBS QBANK is completely free. We believe quality medical education resources should be accessible to all students regardless of their financial situation."
  },
  {
    question: "How do I use the AI assistant?",
    answer: "The AI assistant is available on the right side of the main page. You can ask it any medical question, request explanations for difficult concepts, or ask it to generate MCQs on specific topics. Simply type your question and press enter or click send."
  },
  {
    question: "What subjects are covered?",
    answer: "We cover all MBBS subjects organized by year: First Year (Anatomy, Physiology, Biochemistry), Second Year (Pathology, Pharmacology, Microbiology), Third Year (Community Medicine, Forensic Medicine), and Final Year (General Medicine, Surgery, Obstetrics & Gynecology, Pediatrics, Orthopedics)."
  },
  {
    question: "Can I use ORBIT on my mobile phone?",
    answer: "Yes! ORBIT is a Progressive Web App (PWA), which means you can install it on your phone like a regular app. On the homepage, you'll see a prompt to 'Add to Home Screen' or you can do this through your browser settings."
  },
  {
    question: "How are the questions organized?",
    answer: "Questions are organized hierarchically: by Year → Subject → Topic → Subtopic. You can expand each section to find specific questions. We also have a search feature to quickly find questions on any topic."
  },
  {
    question: "What types of questions are available?",
    answer: "We offer Multiple Choice Questions (MCQs), Short Answer Questions, Long Essay Questions, and Extras (mnemonics, important points, etc.). You can filter by question type using the tabs at the top of the question bank."
  },
  {
    question: "How do I prepare for NEET PG using ORBIT?",
    answer: "ORBIT's question bank follows NEET PG patterns and difficulty levels. We recommend using the AI assistant to generate topic-specific MCQs, practicing with our question bank regularly, and reviewing the study guides in our articles section."
  },
  {
    question: "Can the AI generate MCQs for me?",
    answer: "Yes! Simply ask the AI assistant to 'Generate MCQs on [topic]' and it will create case-based and knowledge-based questions following NEET PG/USMLE patterns with explanations for each answer."
  },
  {
    question: "How often is the question bank updated?",
    answer: "We regularly add new questions and update existing content based on the latest medical curriculum and exam patterns. Check back frequently for new additions."
  }
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Frequently Asked Questions | ORBIT MBBS QBANK"
        description="Find answers to common questions about ORBIT MBBS QBANK. Learn how to use the question bank, AI assistant, and study resources for MBBS exam preparation."
        keywords="ORBIT FAQ, MBBS question bank help, medical study app questions, NEET PG preparation FAQ"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Frequently Asked Questions
          </h1>
        </div>
        
        <p className="text-muted-foreground text-lg mb-8">
          Find answers to common questions about using ORBIT MBBS QBANK.
        </p>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="p-6 bg-card border border-border rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {faq.question}
              </h2>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-primary/10 border border-primary/20 rounded-lg text-center">
          <h2 className="text-xl font-bold text-foreground mb-3">Still Have Questions?</h2>
          <p className="text-foreground mb-4">
            Ask our AI assistant! It can help answer any questions about medical topics or using ORBIT.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Go to AI Assistant
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
