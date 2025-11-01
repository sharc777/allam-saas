import Navbar from "@/components/Navbar";
import { PerformanceAnalyticsDashboard } from "@/components/PerformanceAnalyticsDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";

const PerformanceAnalytics = () => {
  const { loading: authLoading } = useAuth(true);
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <PerformanceAnalyticsDashboard userId={profile?.id} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
