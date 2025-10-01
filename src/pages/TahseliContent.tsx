import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, BookOpen, Calculator, Atom, Beaker, Dna, BookText, Languages, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TahseliContent = () => {
  const { loading: authLoading } = useAuth(true);
  const { data: profile, isLoading: profileLoading } = useProfile();
  
  const isLoading = authLoading || profileLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const track = profile?.track_preference || "علمي";

  // Scientific Track Content
  const scientificSections = [
    {
      name: "الرياضيات",
      icon: Calculator,
      color: "bg-blue-500/10 border-blue-500/30 text-blue-500",
      topics: [
        "الجبر والمعادلات",
        "الهندسة المستوية والفراغية",
        "حساب المثلثات",
        "التفاضل والتكامل"
      ]
    },
    {
      name: "الفيزياء",
      icon: Atom,
      color: "bg-purple-500/10 border-purple-500/30 text-purple-500",
      topics: [
        "الميكانيكا والحركة",
        "الكهرباء والمغناطيسية",
        "الموجات والصوت",
        "الطاقة والشغل"
      ]
    },
    {
      name: "الكيمياء",
      icon: Beaker,
      color: "bg-green-500/10 border-green-500/30 text-green-500",
      topics: [
        "الكيمياء العامة والذرة",
        "الكيمياء العضوية",
        "المعادلات والتفاعلات",
        "الكيمياء الفيزيائية"
      ]
    },
    {
      name: "الأحياء",
      icon: Dna,
      color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
      topics: [
        "الخلية ووظائفها",
        "الوراثة والجينات",
        "التصنيف والتطور",
        "البيئة والأنظمة البيئية"
      ]
    }
  ];

  // Literary Track Content
  const literarySections = [
    {
      name: "العلوم الشرعية",
      icon: BookText,
      color: "bg-amber-500/10 border-amber-500/30 text-amber-500",
      topics: [
        "التوحيد والعقيدة",
        "الفقه وأصوله",
        "الحديث النبوي",
        "الثقافة الإسلامية"
      ]
    },
    {
      name: "اللغة العربية",
      icon: Languages,
      color: "bg-rose-500/10 border-rose-500/30 text-rose-500",
      topics: [
        "النحو والصرف",
        "البلاغة والبيان",
        "الأدب والنصوص",
        "القراءة والفهم"
      ]
    },
    {
      name: "العلوم الاجتماعية",
      icon: Globe,
      color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-500",
      topics: [
        "التاريخ الإسلامي",
        "الجغرافيا",
        "التاريخ الحديث",
        "الدراسات الاجتماعية"
      ]
    }
  ];

  const sections = track === "علمي" ? scientificSections : literarySections;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">
              منصة شاملة لاختبار <span className="text-primary">التحصيلي</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              المسار {track === "علمي" ? "العلمي" : "النظري"}
            </p>
            <p className="text-muted-foreground">
              استعرض جميع الأقسام والمواضيع المتاحة في اختبار التحصيلي
            </p>
            <Badge variant="secondary" className="mt-4 text-base px-4 py-2">
              {sections.length} أقسام رئيسية
            </Badge>
          </div>

          {/* Content Sections */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BookOpen className="w-7 h-7 text-primary" />
                المحتوى الدراسي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-4" defaultValue={sections.map((_, i) => `section-${i}`)}>
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <AccordionItem
                      key={`section-${index}`}
                      value={`section-${index}`}
                      className="border-2 rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-4 text-right w-full">
                          <div className={`p-2 rounded-lg ${section.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-xl">{section.name}</span>
                          <Badge variant="secondary" className="mr-auto text-primary">
                            <span className="text-lg font-bold">{section.topics.length}</span>
                            <span className="mr-1">مواضيع</span>
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="grid gap-2 mt-2">
                          {section.topics.map((topic, topicIndex) => (
                            <div
                              key={topicIndex}
                              className={`p-4 mx-2 rounded-lg border-2 transition-smooth hover:border-primary/40 ${section.color}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-sm">
                                  {topicIndex + 1}
                                </div>
                                <h4 className="font-medium text-base">{topic}</h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 border-2 border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                💡 هذا المحتوى يغطي جميع المواضيع الأساسية في اختبار التحصيلي للمسار {track === "علمي" ? "العلمي" : "النظري"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TahseliContent;
