import { BookOpen, Brain, Smartphone, Sparkles } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Comprehensive Question Bank",
    description: "Thousands of MCQs and short answer questions covering all MBBS subjects from first year to final year."
  },
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Get instant explanations, generate custom MCQs, and ask any medical question to our intelligent AI assistant."
  },
  {
    icon: Sparkles,
    title: "Free & Always Updated",
    description: "Access all features completely free. Our question bank is regularly updated with new questions and topics."
  },
  {
    icon: Smartphone,
    title: "Mobile-Friendly PWA",
    description: "Install as an app on your phone. Study anytime, anywhere with our progressive web app experience."
  }
];

export const WhyChooseUs = () => {
  return (
    <section className="w-full py-8 mb-8">
      <h2 className="text-2xl font-bold text-foreground text-center mb-6">
        Why Choose ORBIT MBBS QBANK?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="p-6 rounded-lg bg-card border border-border hover:shadow-lg transition-shadow"
          >
            <feature.icon className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
