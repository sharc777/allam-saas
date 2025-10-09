import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Lightbulb, CheckCircle2 } from "lucide-react";

interface Example {
  title: string;
  problem: string;
  solution: string;
  explanation: string;
}

interface SectionContentProps {
  title: string;
  content: string;
  examples?: Example[];
  key_points?: string[];
  quick_tips?: string[];
  onPractice?: () => void;
}

export const SectionContent = ({
  title,
  content,
  examples = [],
  key_points = [],
  quick_tips = [],
  onPractice
}: SectionContentProps) => {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* الشرح المفصل */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-start gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-primary mt-1" />
          <div>
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <div className="prose prose-sm max-w-none text-right">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* النقاط الرئيسية */}
      {key_points.length > 0 && (
        <Card className="p-6 border-r-4 border-primary">
          <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            النقاط الرئيسية
          </h4>
          <div className="grid gap-3">
            {key_points.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">{idx + 1}</Badge>
                <p className="text-sm text-muted-foreground flex-1">{point}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* الأمثلة المحلولة */}
      {examples.length > 0 && (
        <Card className="p-6">
          <h4 className="font-bold text-foreground mb-4">أمثلة محلولة</h4>
          <Accordion type="single" collapsible className="space-y-3">
            {examples.map((example, idx) => (
              <AccordionItem key={idx} value={`example-${idx}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="font-medium">{example.title}</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">المشكلة:</p>
                    <p className="text-sm text-muted-foreground">{example.problem}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-2">الحل:</p>
                    <p className="text-sm text-foreground">{example.solution}</p>
                  </div>
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">التوضيح:</p>
                    <p className="text-sm text-muted-foreground">{example.explanation}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

      {/* نصائح سريعة */}
      {quick_tips.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-yellow-50/50 to-background dark:from-yellow-950/20 dark:to-background">
          <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            نصائح سريعة
          </h4>
          <ul className="space-y-2">
            {quick_tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* زر التدريب */}
      {onPractice && (
        <Button 
          onClick={onPractice}
          className="w-full"
          size="lg"
        >
          تمرن على هذا القسم
        </Button>
      )}
    </div>
  );
};
