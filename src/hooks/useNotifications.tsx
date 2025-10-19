import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface Notification {
  id: string;
  type: "achievement" | "trial" | "exercise" | "subscription";
  title: string;
  message: string;
  icon: string;
  createdAt: Date;
  read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: profile } = useProfile();

  // Check for trial expiration
  useEffect(() => {
    if (!profile) return;

    const trialDays = profile.trial_days || 0;
    const isSubscribed = profile.subscription_active;

    if (!isSubscribed && trialDays <= 3 && trialDays > 0) {
      const trialNotification: Notification = {
        id: `trial-${Date.now()}`,
        type: "trial",
        title: "⏰ الفترة التجريبية تنتهي قريباً",
        message: `تبقى ${trialDays} أيام من الفترة التجريبية. اشترك الآن للاستمرار!`,
        icon: "⏰",
        createdAt: new Date(),
        read: false,
      };

      setNotifications((prev) => {
        // Don't add duplicate trial notifications
        const hasTrialNotification = prev.some((n) => n.type === "trial");
        if (hasTrialNotification) return prev;
        return [trialNotification, ...prev];
      });
    }
  }, [profile]);

  // Check for daily exercise reminder
  useEffect(() => {
    if (!profile) return;

    const exerciseData = profile.daily_exercises_count as any;
    const lastExerciseDate = exerciseData?.last_reset;
    const now = new Date();
    const lastDate = lastExerciseDate ? new Date(lastExerciseDate as string) : null;

    // If no exercise today
    if (!lastDate || now.getDate() !== lastDate.getDate()) {
      const exerciseNotification: Notification = {
        id: `exercise-${Date.now()}`,
        type: "exercise",
        title: "📚 وقت التمرين اليومي!",
        message: "لم تحل تمارينك اليومية بعد. ابدأ الآن!",
        icon: "📚",
        createdAt: new Date(),
        read: false,
      };

      setNotifications((prev) => {
        const hasExerciseNotification = prev.some(
          (n) => n.type === "exercise" && 
          new Date(n.createdAt).getDate() === now.getDate()
        );
        if (hasExerciseNotification) return prev;
        return [exerciseNotification, ...prev];
      });
    }
  }, [profile]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
};
