import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CacheStats {
  total: number;
  used: number;
  reserved: number;
  available: number;
  usage_rate: number;
  by_section: Record<string, number>;
  by_difficulty: Record<string, number>;
}

interface CacheItem {
  id: string;
  section: string;
  difficulty: string;
  test_type: string;
  is_used: boolean;
  reserved_by: string | null;
  created_at: string;
  question_data: any;
}

export function useEnhancedCache() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cache statistics
  const { data: cacheStats, isLoading: statsLoading } = useQuery({
    queryKey: ['cache-statistics'],
    queryFn: async (): Promise<CacheStats> => {
      const { data, error } = await supabase
        .from('questions_cache' as any)
        .select('section, difficulty, is_used, reserved_by');

      if (error) throw error;

      const total = data.length;
      const used = data.filter((item: any) => item.is_used).length;
      const reserved = data.filter((item: any) => item.reserved_by && !item.is_used).length;
      const available = total - used - reserved;

      const bySection: Record<string, number> = {};
      const byDifficulty: Record<string, number> = {};

      data.forEach((item: any) => {
        if (!item.is_used) {
          bySection[item.section] = (bySection[item.section] || 0) + 1;
          byDifficulty[item.difficulty] = (byDifficulty[item.difficulty] || 0) + 1;
        }
      });

      return {
        total,
        used,
        reserved,
        available,
        usage_rate: (used / total) * 100,
        by_section: bySection,
        by_difficulty: byDifficulty
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Clean expired reservations
  const cleanExpiredMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clean_expired_cache_reservations' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-statistics'] });
      toast({
        title: '✅ تم تنظيف الحجوزات المنتهية',
        description: 'تم تحرير الأسئلة المحجوزة منذ أكثر من 5 دقائق'
      });
    }
  });

  // Prefill cache for specific criteria
  const prefillCacheMutation = useMutation({
    mutationFn: async (params: {
      section: string;
      difficulty: string;
      test_type: string;
      count: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('pre-generate-questions', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cache-statistics'] });
      toast({
        title: '✅ تم ملء الذاكرة المؤقتة',
        description: `تم إضافة ${data.generated} سؤال جديد`
      });
    }
  });

  // Fetch cache items with filters
  const fetchCacheItems = async (filters: {
    section?: string;
    difficulty?: string;
    is_used?: boolean;
    limit?: number;
  }): Promise<CacheItem[]> => {
    let query = supabase
      .from('questions_cache' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.section) {
      query = query.eq('section', filters.section);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.is_used !== undefined) {
      query = query.eq('is_used', filters.is_used);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as any as CacheItem[];
  };

  // Delete old used cache items
  const cleanOldCacheMutation = useMutation({
    mutationFn: async (daysOld: number = 7) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('questions_cache' as any)
        .delete()
        .eq('is_used', true)
        .lt('used_at', cutoffDate.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cache-statistics'] });
      toast({
        title: '✅ تم تنظيف الذاكرة المؤقتة',
        description: 'تم حذف الأسئلة المستخدمة القديمة'
      });
    }
  });

  return {
    cacheStats,
    statsLoading,
    cleanExpired: cleanExpiredMutation.mutate,
    prefillCache: prefillCacheMutation.mutate,
    cleanOldCache: cleanOldCacheMutation.mutate,
    fetchCacheItems,
    isCleaningExpired: cleanExpiredMutation.isPending,
    isPrefillingCache: prefillCacheMutation.isPending,
    isCleaningOld: cleanOldCacheMutation.isPending
  };
}
