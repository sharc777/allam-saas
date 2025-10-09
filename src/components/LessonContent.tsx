import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpen, Video } from "lucide-react";

interface LessonContentProps {
  title: string;
  description?: string;
  videoUrl?: string;
  keyPoints?: string[];
  contentText?: string;
  quickTips?: string[];
}

export const LessonContent = ({
  title,
  description,
  videoUrl,
  keyPoints,
  contentText,
  quickTips,
}: LessonContentProps) => {
  return (
    <div className="space-y-6">
      {/* TL;DR Summary Card */}
      {description && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <BookOpen className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">ملخص سريع</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="grid gap-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            النقاط الرئيسية
          </h3>
          <div className="grid gap-3">
            {keyPoints.map((point, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-1 flex-shrink-0">
                    {index + 1}
                  </Badge>
                  <p className="text-sm leading-relaxed flex-1">{point}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Content in Accordion */}
      <Accordion type="single" collapsible className="space-y-3">
        {/* Video Section */}
        {videoUrl && (
          <AccordionItem value="video" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <span className="font-semibold">الفيديو التعليمي</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="aspect-video rounded-lg overflow-hidden mt-4">
                <iframe
                  src={videoUrl}
                  title={title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Detailed Explanation */}
        {contentText && (
          <AccordionItem value="content" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-semibold">الشرح المفصل</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="prose prose-sm max-w-none mt-4 text-foreground">
                {contentText.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Quick Tips */}
      {quickTips && quickTips.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            نصائح سريعة
          </h3>
          <ul className="space-y-2">
            {quickTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-accent mt-1">•</span>
                <span className="text-sm leading-relaxed flex-1">{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
