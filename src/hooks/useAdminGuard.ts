import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAdminGuard = () => {
  const { user, loading: authLoading } = useAuth(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_admin', {
          user_id: user.id
        });

        if (error) throw error;

        setIsAdmin(data);
        
        if (!data) {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading, navigate]);

  return { isAdmin, loading: loading || authLoading };
};
