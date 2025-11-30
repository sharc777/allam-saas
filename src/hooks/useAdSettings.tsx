import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdSettings {
  id: string;
  is_enabled: boolean;
  adsense_client_id: string | null;
  ad_slots: {
    hero: string;
    between_sections: string;
    footer: string;
    sidebar: string;
  };
  placement_settings: {
    hero: boolean;
    between_sections: boolean;
    footer: boolean;
    sidebar: boolean;
  };
}

export const useAdSettings = () => {
  return useQuery({
    queryKey: ['ad-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_settings')
        .select('*')
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        is_enabled: data.is_enabled,
        adsense_client_id: data.adsense_client_id,
        ad_slots: data.ad_slots as AdSettings['ad_slots'],
        placement_settings: data.placement_settings as AdSettings['placement_settings'],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
