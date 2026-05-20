import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        
        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-foreground/80">
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to ORBIT MBBS QBANK WITH AI ("we," "our," or "us"). We are committed to protecting 
              your privacy and ensuring you have a positive experience on our website. This policy outlines 
              our data collection and use practices.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited, time spent, and features used.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device type.</li>
              <li><strong>Cookies:</strong> We use cookies to improve your experience and for analytics purposes.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our educational services</li>
              <li>Analyze website usage and optimize user experience</li>
              <li>Display relevant advertisements through Google AdSense</li>
              <li>Communicate with you about updates and improvements</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              We use third-party services that may collect information about you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google AdSense:</strong> Displays advertisements and may use cookies to personalize ads based on your browsing history.</li>
              <li><strong>Google Analytics:</strong> Helps us understand how visitors interact with our website.</li>
              <li><strong>Supabase:</strong> Powers our AI chat functionality.</li>
            </ul>
            <p className="mt-4">
              For more information about how Google uses data, visit:{' '}
              <a href="https://policies.google.com/technologies/partner-sites" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                https://policies.google.com/technologies/partner-sites
              </a>
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Your Choices</h2>
            <p>You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Disable cookies in your browser settings</li>
              <li>Opt out of personalized advertising through Google Ad Settings</li>
              <li>Use browser extensions to block ads</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your information. However, no method 
              of transmission over the Internet is 100% secure.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Children's Privacy</h2>
            <p>
              Our service is intended for medical students and professionals. We do not knowingly collect 
              information from children under 13 years of age.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us through our{' '}
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

export default PrivacyPolicy;
