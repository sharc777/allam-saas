import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Brain, BookOpen, LineChart, Target, Trophy, Sparkles, Users, Calendar, CheckCircle2, MessageCircle } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "مساعد ذكي AI",
      description: "مدرس افتراضي متاح 24/7 يجيب على أسئلتك، يشرح المفاهيم الصعبة، ويقدم أمثلة مخصصة حسب مستواك"
    },
    {
      icon: BookOpen,
      title: "محتوى 30 يوم",
      description: "برنامج تدريبي متكامل يغطي جميع أقسام اختبار القدرات من الأساسيات إلى المستوى المتقدم"
    },
    {
      icon: LineChart,
      title: "تتبع التقدم",
      description: "إحصائيات تفصيلية لأدائك، تحليل نقاط القوة والضعف، ومتابعة تطورك اليومي"
    },
    {
      icon: Target,
      title: "اختبارات مخصصة",
      description: "أسئلة مولدة بالذكاء الاصطناعي تناسب مستواك وتركز على نقاط ضعفك"
    },
    {
      icon: Trophy,
      title: "نظام التحفيز",
      description: "شارات وإنجازات ونقاط تشجعك على الاستمرار وتحقيق أهدافك"
    },
    {
      icon: Sparkles,
      title: "توصيات ذكية",
      description: "اقتراحات مخصصة للمواضيع التي تحتاج للتركيز عليها بناءً على أدائك"
    }
  ];

  const timeline = [
    {
      week: "الأسبوع الأول",
      title: "الأساسيات",
      topics: ["الأرقام والعمليات الحسابية", "المفردات والمعاني", "القراءة السريعة"]
    },
    {
      week: "الأسبوع الثاني",
      title: "المفاهيم المتوسطة",
      topics: ["النسب والتناسب", "التناظر اللفظي", "استكمال الجمل"]
    },
    {
      week: "الأسبوع الثالث",
      title: "المفاهيم المتقدمة",
      topics: ["الهندسة والقياس", "الإحصاء والاحتمالات", "الخطأ السياقي"]
    },
    {
      week: "الأسبوع الرابع",
      title: "المراجعة والتدريب المكثف",
      topics: ["اختبارات تجريبية كاملة", "مراجعة شاملة", "استراتيجيات الاختبار"]
    }
  ];

  const stats = [
    { icon: Users, value: "+1000", label: "طالب متميز" },
    { icon: Calendar, value: "+30", label: "يوم محتوى" },
    { icon: Brain, value: "+1000", label: "سؤال مولد بـ AI" },
    { icon: CheckCircle2, value: "95%", label: "نسبة رضا الطلاب" }
  ];

  const faqs = [
    {
      question: "هل المنصة مجانية؟",
      answer: "نعم، نوفر خطة مجانية تتيح لك الوصول إلى المحتوى الأساسي والتدريبات اليومية. كما نوفر خطط مدفوعة بمميزات إضافية مثل الاختبارات المخصصة غير المحدودة والمساعد الذكي المتقدم."
    },
    {
      question: "كم ساعة أحتاج يومياً؟",
      answer: "نوصي بساعة إلى ساعتين يومياً للحصول على أفضل النتائج. البرنامج مرن ويمكنك التدريب حسب وقتك المتاح."
    },
    {
      question: "هل يمكنني إعادة الاختبارات؟",
      answer: "نعم بالتأكيد! يمكنك إعادة أي اختبار لتحسين درجتك ومراجعة المفاهيم. كما يمكنك الوصول إلى سجل اختباراتك السابقة في أي وقت."
    },
    {
      question: "كيف يعمل المساعد الذكي؟",
      answer: "المساعد الذكي مدعوم بتقنية الذكاء الاصطناعي المتقدمة ومدرب على محتوى اختبار القدرات. يمكنه شرح المفاهيم، حل الأسئلة، وتقديم أمثلة مخصصة حسب احتياجك."
    },
    {
      question: "ما هي مدة البرنامج؟",
      answer: "البرنامج مصمم لمدة 30 يوماً، لكن يمكنك التدريب بالوتيرة التي تناسبك. يمكنك أيضاً إعادة البرنامج أو التركيز على أقسام معينة."
    },
    {
      question: "هل المحتوى محدث؟",
      answer: "نعم، المحتوى محدث باستمرار ليطابق أحدث نماذج اختبار القدرات من المركز الوطني للقياس. نستخدم الذكاء الاصطناعي لتوليد أسئلة جديدة يومياً."
    },
    {
      question: "كيف أتواصل مع الدعم؟",
      answer: "يمكنك التواصل معنا عبر صفحة الدعم أو البريد الإلكتروني. فريق الدعم متاح لمساعدتك في أي استفسار أو مشكلة تقنية."
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container max-w-6xl mx-auto relative">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="text-lg px-6 py-2">
              تعرف على دربني
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              منصتك المثالية للتفوق في اختبار القدرات
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              نساعدك على تحقيق أعلى الدرجات في اختبار القدرات من خلال برنامج تدريبي شامل مدعوم بالذكاء الاصطناعي
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* What is Qudurat Test Section */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">ما هو اختبار القدرات؟</h2>
              <p className="text-muted-foreground leading-relaxed">
                اختبار القدرات العامة هو اختبار تقدمه هيئة تقويم التعليم والتدريب في المملكة العربية السعودية، 
                ويهدف إلى قياس القدرات التحليلية والاستدلالية لدى خريجي الثانوية العامة.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">القسم الكمي</h3>
                    <p className="text-sm text-muted-foreground">يقيس القدرة على حل المسائل الرياضية والتفكير المنطقي</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">القسم اللفظي</h3>
                    <p className="text-sm text-muted-foreground">يقيس القدرة على فهم النصوص والتعامل مع اللغة العربية</p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="border-2">
              <CardHeader>
                <CardTitle>معلومات هامة عن الاختبار</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">مدة الاختبار</span>
                  <span className="font-semibold">3 ساعات</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">عدد الأسئلة</span>
                  <span className="font-semibold">120 سؤال</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">نوع الأسئلة</span>
                  <span className="font-semibold">اختيار من متعدد</span>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-center">
                    <strong>الدرجة مهمة جداً</strong> للقبول في الجامعات السعودية وتشكل جزءاً أساسياً من المعدل الموزون
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      {/* Why Darrebni Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">لماذا دربني؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              نقدم لك أدوات وتقنيات متقدمة لضمان تحقيق أفضل النتائج في اختبار القدرات
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* How It Works Section */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">كيف يعمل البرنامج؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              برنامج تدريبي متدرج على مدار 30 يوماً يأخذك من الأساسيات إلى المستوى المتقدم
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {timeline.map((item, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">{item.week}</Badge>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.topics.map((topic, topicIndex) => (
                      <li key={topicIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">إنجازات المنصة</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-2">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">الأسئلة الشائعة</h2>
            <p className="text-muted-foreground">
              إجابات على أكثر الأسئلة شيوعاً حول منصة دربني
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
                <AccordionTrigger className="text-right hover:no-underline">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Separator />

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-primary">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            هل أنت مستعد لبدء رحلتك؟
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            انضم إلى آلاف الطلاب الذين حققوا نتائج متميزة في اختبار القدرات مع دربني
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              ابدأ التدريب الآن
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/support")}
              className="text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <MessageCircle className="ml-2" />
              تواصل معنا
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
