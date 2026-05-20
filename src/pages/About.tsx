import { ArrowLeft, BookOpen, Brain, Clock, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        
        <h1 className="text-4xl font-bold text-foreground mb-4">About ORBIT MBBS QBANK</h1>
        <p className="text-xl text-muted-foreground mb-8">Your AI-Powered Medical Study Companion</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
            <p className="text-foreground/80 text-lg leading-relaxed">
              ORBIT MBBS QBANK WITH AI is designed to help medical students excel in their examinations. 
              We combine a comprehensive question bank with cutting-edge AI technology to provide 
              personalized learning assistance, making medical education more accessible and effective.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Features</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Comprehensive Question Bank
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-foreground/70">
                    Thousands of questions covering all MBBS subjects including Anatomy, Physiology, 
                    Biochemistry, Pathology, Pharmacology, and more.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI-Powered Assistance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-foreground/70">
                    Get instant explanations and answers to your medical questions using our 
                    advanced AI assistant powered by Google Gemini.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Pomodoro Timer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-foreground/70">
                    Stay focused with our built-in Pomodoro timer to manage your study sessions 
                    and maintain productivity.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📱 PWA Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-foreground/70">
                    Install the app on your device for offline access and a native app-like 
                    experience on mobile and desktop.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Subjects Covered</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology",
                "Microbiology", "Community Medicine", "Forensic Medicine", "General Medicine",
                "General Surgery", "Obstetrics & Gynaecology", "Paediatrics", "Orthopaedics"
              ].map((subject) => (
                <span 
                  key={subject}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {subject}
                </span>
              ))}
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact</h2>
            <p className="text-foreground/80 mb-4">
              Created and maintained by <strong>Sabharivarshan S</strong>
            </p>
            <a 
              href="https://www.instagram.com/_varshann_s?igsh=MW9wdXozOW5yeDRydA==" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="gap-2">
                <Instagram className="h-4 w-4" />
                Follow on Instagram
              </Button>
            </a>
          </section>
          
          <section className="pt-8 border-t border-border">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
