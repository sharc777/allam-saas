import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useAuth = (requireAuth = true) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Invalidate subscription cache on auth state change
        if (session) {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
          }, 0);
        }

        if (requireAuth && !session) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (requireAuth && !session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, requireAuth]);

  // Session timeout management
  useEffect(() => {
    const checkSession = setInterval(() => {
      const now = Date.now();
      if (session && now - lastActivity > SESSION_TIMEOUT) {
        signOut();
        toast.info("انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.");
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkSession);
  }, [lastActivity, session]);
  
  // Update activity on user interaction
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);
  
  // Automatic token refresh
  useEffect(() => {
    if (!session) return;
    
    const refreshInterval = setInterval(async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Failed to refresh session:", error);
      } else if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes
    
    return () => clearInterval(refreshInterval);
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return { user, session, loading, signOut };
};
