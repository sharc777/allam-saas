import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LessonContent } from "@/components/LessonContent";
import { useProfile } from "@/hooks/useProfile";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import Navbar from "@/components/Navbar";
import { ChevronRight, ChevronLeft, Lock, CheckCircle2, BookOpen } from "lucide-react";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";

const DailyContentPage = () => {
  return (
    <SubscriptionGuard>
      <DailyContentPageContent />
    </SubscriptionGuard>
  );
};

const DailyContentPageContent = () => {
  const { dayNumber: urlDay } = useParams();
  const [selectedDay, setSelectedDay] = useState(parseInt(urlDay || "1"));
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: dailyContent, isLoading } = useDailyContent(
    selectedDay,
    profile?.test_type_preference,
    profile?.track_preference
  );
  const { data: progressData } = useStudentProgress(profile?.id || undefined);

  const currentDay = profile?.current_day || 1;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const isDayLocked = (day: number) => day > currentDay;
  
  const isDayCompleted = (day: number) => {
    if (!Array.isArray(progressData)) return false;
    return progressData.some(p => p.day_number === day && p.content_completed);
  };

  const handleDaySelect = (day: number) => {
    if (!isDayLocked(day)) {
      setSelectedDay(day);
      navigate(`/daily-content/${day}`);
    }
  };

  const handlePrevious = () => {
    if (selectedDay > 1 && !isDayLocked(selectedDay - 1)) {
      handleDaySelect(selectedDay - 1);
    }
  };

  const handleNext = () => {
    if (selectedDay < 30 && !isDayLocked(selectedDay + 1)) {
      handleDaySelect(selectedDay + 1);
    }
  };

  useEffect(() => {
    if (urlDay) {
      const parsedDay = parseInt(urlDay);
      if (!isNaN(parsedDay)) {
        setSelectedDay(parsedDay);
      }
    }
  }, [urlDay]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar - Days List */}
            <Card className="h-fit lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  الأيام
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1 p-4">
                    {days.map((day) => {
                      const locked = isDayLocked(day);
                      const completed = isDayCompleted(day);
                      const isSelected = day === selectedDay;

                      return (
                        <Button
                          key={day}
                          variant={isSelected ? "default" : "ghost"}
                          className={`w-full justify-start gap-3 ${
                            locked ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          onClick={() => handleDaySelect(day)}
                          disabled={locked}
                        >
                          {locked ? (
                            <Lock className="w-4 h-4" />
                          ) : completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2" />
                          )}
                          <span>اليوم {day}</span>
                          {day === currentDay && !completed && (
                            <Badge variant="secondary" className="mr-auto">جديد</Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">
                      اليوم {selectedDay} - {dailyContent?.title || "المحتوى اليومي"}
                    </CardTitle>
                    <Badge variant="outline">
                      {profile?.test_type_preference}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
                    </div>
                  ) : dailyContent ? (
                    <LessonContent
                      title={dailyContent.title}
                      description={dailyContent.description || undefined}
                      videoUrl={dailyContent.video_url || undefined}
                      keyPoints={dailyContent.key_points || undefined}
                      contentText={dailyContent.content_text || undefined}
                      quickTips={dailyContent.quick_tips || undefined}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg text-muted-foreground">
                        لا يوجد محتوى متاح لهذا اليوم حالياً
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePrevious}
                  disabled={selectedDay === 1}
                  className="flex-1"
                >
                  <ChevronRight className="w-5 h-5 ml-2" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNext}
                  disabled={selectedDay === 30 || isDayLocked(selectedDay + 1)}
                  className="flex-1"
                >
                  التالي
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyContentPage;
