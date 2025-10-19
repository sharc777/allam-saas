import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { ComprehensiveStats } from "@/components/ComprehensiveStats";
import { Loader2 } from "lucide-react";

const ProgressDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch comprehensive stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["comprehensive-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_comprehensive_stats")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["student-activities", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_activities")
        .select("*")
        .eq("user_id", user?.id)
        .order("activity_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  if (authLoading || statsLoading || activitiesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">لوحة التقدم الشاملة</h1>
            <p className="text-muted-foreground">
              تتبع تقدمك وأنشطتك وإنجازاتك في مكان واحد
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <ComprehensiveStats stats={stats} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>سجل الأنشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityTimeline activities={activities || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
