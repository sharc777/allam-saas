import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Users, 
  CreditCard, 
  Activity, 
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export const UsersStats = () => {
  // New users today
  const { data: newUsersToday } = useQuery({
    queryKey: ['users-stats-new-today'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      return count || 0;
    }
  });

  // New users this week
  const { data: newUsersWeek } = useQuery({
    queryKey: ['users-stats-new-week'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());
      return count || 0;
    }
  });

  // Active users (last 7 days based on activities)
  const { data: activeUsers } = useQuery({
    queryKey: ['users-stats-active'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data } = await supabase
        .from('student_activities')
        .select('user_id')
        .gte('activity_date', weekAgo.toISOString());
      
      const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
      return uniqueUsers.size;
    }
  });

  // Subscribed users (subscription_active = true)
  const { data: subscribedUsers } = useQuery({
    queryKey: ['users-stats-subscribed'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_active', true);
      return count || 0;
    }
  });

  // Engagement rate (users who completed at least 1 exercise)
  const { data: engagementRate } = useQuery({
    queryKey: ['users-stats-engagement'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { data: activeUserIds } = await supabase
        .from('daily_exercises')
        .select('user_id')
        .not('completed_at', 'is', null);
      
      const uniqueActive = new Set(activeUserIds?.map(d => d.user_id) || []);
      
      if (!totalUsers || totalUsers === 0) return 0;
      return Math.round((uniqueActive.size / totalUsers) * 100);
    }
  });

  // Average exercise time
  const { data: avgTime } = useQuery({
    queryKey: ['users-stats-avg-time'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_exercises')
        .select('time_taken_minutes')
        .not('time_taken_minutes', 'is', null);
      
      if (!data || data.length === 0) return 0;
      const total = data.reduce((sum, d) => sum + (d.time_taken_minutes || 0), 0);
      return Math.round(total / data.length);
    }
  });

  const stats = [
    {
      label: 'جدد اليوم',
      value: newUsersToday,
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: newUsersToday && newUsersToday > 0 ? 'up' : null
    },
    {
      label: 'جدد هذا الأسبوع',
      value: newUsersWeek,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: null
    },
    {
      label: 'نشطين (7 أيام)',
      value: activeUsers,
      icon: Activity,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      trend: null
    },
    {
      label: 'مشتركين فعليين',
      value: subscribedUsers,
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: null
    },
    {
      label: 'معدل التفاعل',
      value: engagementRate !== undefined ? `${engagementRate}%` : undefined,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
      trend: engagementRate && engagementRate >= 50 ? 'up' : engagementRate && engagementRate < 30 ? 'down' : null
    },
    {
      label: 'متوسط وقت التمرين',
      value: avgTime !== undefined ? `${avgTime} دقيقة` : undefined,
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      trend: null
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border hover:border-primary/30 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
              {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
            </div>
            <p className="text-2xl font-bold">
              {stat.value !== undefined ? stat.value : <Loader2 className="w-5 h-5 animate-spin" />}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
