import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-foreground/80">
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using ORBIT MBBS QBANK WITH AI ("the Service"), you accept and agree to be 
              bound by the terms and provisions of this agreement. If you do not agree to these terms, 
              please do not use our Service.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Description of Service</h2>
            <p>
              ORBIT MBBS QBANK WITH AI is an educational platform designed to help medical students 
              prepare for their examinations. The Service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>A comprehensive question bank covering various medical subjects</li>
              <li>AI-powered assistance for answering medical questions</li>
              <li>Study tools including a Pomodoro timer</li>
              <li>Access to study materials and resources</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Educational Purpose</h2>
            <p>
              The content provided on this platform is for educational purposes only. It should not be 
              used as a substitute for professional medical advice, diagnosis, or treatment. Always seek 
              the advice of qualified health providers with questions you may have regarding medical conditions.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Intellectual Property</h2>
            <p>
              All content on this website, including but not limited to text, graphics, logos, and software, 
              is the property of ORBIT MBBS QBANK WITH AI or its content suppliers and is protected by 
              intellectual property laws.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Reproduce, duplicate, or copy any content without permission</li>
              <li>Use automated systems to access the Service</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. AI Disclaimer</h2>
            <p>
              The AI-powered features of this Service are designed to assist with learning. However:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI responses may not always be accurate or complete</li>
              <li>Users should verify information from authoritative medical sources</li>
              <li>AI is not a replacement for textbooks or qualified instructors</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Advertisements</h2>
            <p>
              This Service may display advertisements through Google AdSense. By using the Service, you 
              acknowledge that advertisements are part of the user experience and help support the 
              continued operation of this free educational platform.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              ORBIT MBBS QBANK WITH AI shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages resulting from your use of or inability to use the Service.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Service after 
              any changes constitutes acceptance of the new terms.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us through our{' '}
              <a href="https://www.instagram.com/_varshann_s?igsh=MW9wdXozOW5yeDRydA==" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
