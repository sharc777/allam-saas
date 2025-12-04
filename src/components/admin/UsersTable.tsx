import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Search, 
  Edit, 
  Loader2,
  Calendar,
  Activity,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface UsersTableProps {
  onEditUser: (user: any) => void;
}

type StatusFilter = 'all' | 'active' | 'subscribed' | 'trial' | 'inactive';
type PackageFilter = 'all' | 'free' | 'paid';

export const UsersTable = ({ onEditUser }: UsersTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch all users with their stats
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users-full'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          subscription_packages (
            name_ar,
            price_monthly
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch exercises count per user
      const { data: exerciseCounts } = await supabase
        .from('daily_exercises')
        .select('user_id')
        .not('completed_at', 'is', null);

      // Fetch quiz results for avg score
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select('user_id, percentage');

      // Fetch last activity per user
      const { data: activities } = await supabase
        .from('student_activities')
        .select('user_id, activity_date')
        .order('activity_date', { ascending: false });

      // Process data
      const exerciseCountMap: Record<string, number> = {};
      exerciseCounts?.forEach(e => {
        exerciseCountMap[e.user_id] = (exerciseCountMap[e.user_id] || 0) + 1;
      });

      const avgScoreMap: Record<string, number> = {};
      const scoreCountMap: Record<string, number> = {};
      quizResults?.forEach(q => {
        if (q.percentage !== null) {
          avgScoreMap[q.user_id] = (avgScoreMap[q.user_id] || 0) + q.percentage;
          scoreCountMap[q.user_id] = (scoreCountMap[q.user_id] || 0) + 1;
        }
      });

      const lastActivityMap: Record<string, string> = {};
      activities?.forEach(a => {
        if (!lastActivityMap[a.user_id]) {
          lastActivityMap[a.user_id] = a.activity_date;
        }
      });

      return profiles?.map(profile => ({
        ...profile,
        exercisesCount: exerciseCountMap[profile.id] || 0,
        avgScore: scoreCountMap[profile.id] 
          ? Math.round(avgScoreMap[profile.id] / scoreCountMap[profile.id]) 
          : 0,
        lastActivity: lastActivityMap[profile.id] || profile.updated_at,
        packageName: profile.subscription_packages?.name_ar || 'غير محدد',
        isPaidPackage: (profile.subscription_packages?.price_monthly || 0) > 0
      }));
    }
  });

  // Get activity status
  const getActivityStatus = (lastActivity: string) => {
    const now = new Date();
    const activityDate = new Date(lastActivity);
    const diffHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 24) return { status: 'active', label: 'نشط', color: 'bg-success' };
    if (diffHours <= 168) return { status: 'moderate', label: 'متوسط', color: 'bg-warning' };
    return { status: 'inactive', label: 'خامل', color: 'bg-destructive' };
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    
    return usersData.filter(user => {
      // Search filter
      if (searchQuery && !user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const activityStatus = getActivityStatus(user.lastActivity);
        
        if (statusFilter === 'active' && activityStatus.status !== 'active') return false;
        if (statusFilter === 'subscribed' && !user.subscription_active) return false;
        if (statusFilter === 'trial' && (user.trial_days || 0) <= 0) return false;
        if (statusFilter === 'inactive' && activityStatus.status !== 'inactive') return false;
      }

      // Package filter
      if (packageFilter !== 'all') {
        if (packageFilter === 'paid' && !user.isPaidPackage) return false;
        if (packageFilter === 'free' && user.isPaidPackage) return false;
      }

      return true;
    });
  }, [usersData, searchQuery, statusFilter, packageFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          إدارة المستخدمين ({filteredUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pr-10"
            />
          </div>
          
          <Select 
            value={statusFilter} 
            onValueChange={(v: StatusFilter) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="subscribed">مشترك</SelectItem>
              <SelectItem value="trial">تجريبي</SelectItem>
              <SelectItem value="inactive">خامل</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={packageFilter} 
            onValueChange={(v: PackageFilter) => {
              setPackageFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="الباقة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الباقات</SelectItem>
              <SelectItem value="free">مجانية</SelectItem>
              <SelectItem value="paid">مدفوعة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : paginatedUsers.length > 0 ? (
          <>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        التسجيل
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        آخر نشاط
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        التمارين
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        المعدل
                      </div>
                    </TableHead>
                    <TableHead className="text-right">الباقة</TableHead>
                    <TableHead className="text-right">التقدم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const activityStatus = getActivityStatus(user.lastActivity);
                    const progressPercent = Math.round(((user.current_day || 1) / 30) * 100);
                    
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {user.full_name?.charAt(0) || 'ط'}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.total_points || 0} نقطة
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(user.created_at), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(user.lastActivity), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{user.exercisesCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            user.avgScore >= 80 ? 'text-success' : 
                            user.avgScore >= 50 ? 'text-warning' : 
                            'text-destructive'
                          }`}>
                            {user.avgScore}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isPaidPackage ? 'default' : 'secondary'}>
                            {user.packageName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={progressPercent} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {user.current_day || 1}/30 يوم
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${activityStatus.color}`} />
                            <span className="text-sm">{activityStatus.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} من {filteredUsers.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا يوجد مستخدمين مطابقين للبحث</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
