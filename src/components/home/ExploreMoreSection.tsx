import { Link } from "react-router-dom";
import { FileText, HelpCircle, Lightbulb, BookMarked } from "lucide-react";

const resources = [
  {
    icon: FileText,
    title: "Study Guides",
    description: "In-depth articles on how to study each subject effectively",
    link: "/blog"
  },
  {
    icon: Lightbulb,
    title: "Study Tips",
    description: "Proven strategies for medical exam preparation",
    link: "/study-tips"
  },
  {
    icon: HelpCircle,
    title: "FAQs",
    description: "Common questions about using ORBIT and medical studies",
    link: "/faq"
  },
  {
    icon: BookMarked,
    title: "MCQ Strategies",
    description: "Learn how to solve MCQs effectively in medical exams",
    link: "/articles/mcq-strategies"
  }
];

export const ExploreMoreSection = () => {
  return (
    <section className="w-full py-8 mt-8">
      <h2 className="text-2xl font-bold text-foreground text-center mb-6">
        Explore More Resources
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resources.map((resource, index) => (
          <Link 
            key={index}
            to={resource.link}
            className="p-5 rounded-lg bg-card border border-border hover:border-primary transition-all hover:shadow-md group"
          >
            <resource.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-semibold text-foreground mb-1">{resource.title}</h3>
            <p className="text-muted-foreground text-sm">{resource.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
