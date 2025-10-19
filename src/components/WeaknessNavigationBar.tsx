import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Target, 
  Brain 
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface WeaknessNavigationBarProps {
  activeSection: string;
  counts: {
    strengths: number;
    critical: number;
    moderate: number;
    repeated: number;
  };
}

export const WeaknessNavigationBar = ({ 
  activeSection, 
  counts 
}: WeaknessNavigationBarProps) => {
  const navItems: NavItem[] = [
    { id: "summary", label: "الإحصائيات", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "strengths", label: "نقاط القوة", icon: <CheckCircle2 className="w-4 h-4" />, count: counts.strengths },
    { id: "critical", label: "حرج", icon: <AlertCircle className="w-4 h-4" />, count: counts.critical },
    { id: "moderate", label: "متوسط", icon: <AlertTriangle className="w-4 h-4" />, count: counts.moderate },
    { id: "repeated", label: "متكرر", icon: <Target className="w-4 h-4" />, count: counts.repeated },
    { id: "recommendations", label: "التوصيات", icon: <Brain className="w-4 h-4" /> },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-sm border-b mb-8 -mx-4 px-4 py-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => scrollToSection(item.id)}
            className="flex-shrink-0 gap-2"
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <Badge 
                variant="secondary" 
                className="mr-1 h-5 min-w-[20px] px-1.5"
              >
                {item.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};
