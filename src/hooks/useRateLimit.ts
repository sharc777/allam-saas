import { useState, useCallback } from "react";
import { toast } from "sonner";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export const useRateLimit = (config: RateLimitConfig) => {
  const [requests, setRequests] = useState<number[]>([]);
  
  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Filter requests within window
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= config.maxRequests) {
      toast.error(config.message || "تجاوزت الحد المسموح. يرجى الانتظار قليلاً.");
      return false;
    }
    
    // Add new request
    setRequests([...recentRequests, now]);
    return true;
  }, [requests, config]);
  
  const resetLimit = useCallback(() => {
    setRequests([]);
  }, []);
  
  return { checkLimit, resetLimit };
};
