import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default limits if no package is found
const DEFAULT_LIMITS = {
  daily_exercises_quantitative: 10,
  daily_exercises_verbal: 10,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'لم يتم تسجيل الدخول' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'المصادقة فشلت' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Fetch user profile with package data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trial_days, subscription_active, daily_exercises_count, package_id, package_end_date')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ error: 'خطأ في جلب بيانات المستخدم' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If profile doesn't exist yet, return trial defaults
    if (!profile) {
      console.log('Profile not found for user, returning trial defaults');
      return new Response(JSON.stringify({
        can_exercise: true,
        remaining_quantitative: 999,
        remaining_verbal: 999,
        reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        trial_days_remaining: 3,
        is_subscribed: false,
        message: 'أنت في الفترة التجريبية - تمارين غير محدودة',
        current_counts: {
          quantitative: 0,
          verbal: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch package limits if user has a package
    let packageLimits = DEFAULT_LIMITS;
    if (profile.package_id) {
      const { data: packageData, error: packageError } = await supabase
        .from('subscription_packages')
        .select('limits')
        .eq('id', profile.package_id)
        .maybeSingle();

      if (!packageError && packageData?.limits) {
        const limits = packageData.limits as any;
        packageLimits = {
          daily_exercises_quantitative: limits.daily_exercises_quantitative || DEFAULT_LIMITS.daily_exercises_quantitative,
          daily_exercises_verbal: limits.daily_exercises_verbal || DEFAULT_LIMITS.daily_exercises_verbal,
        };
      }
    }

    const now = new Date();
    const counts = profile.daily_exercises_count || { 'كمي': 0, 'لفظي': 0, last_reset: null };
    const lastReset = counts.last_reset ? new Date(counts.last_reset) : null;

    // Check if 24 hours passed - reset counters
    let currentCounts = { ...counts };
    if (!lastReset || (now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000)) {
      currentCounts = {
        'كمي': 0,
        'لفظي': 0,
        last_reset: now.toISOString()
      };
      
      // Update profile with reset counts
      await supabase
        .from('profiles')
        .update({ daily_exercises_count: currentCounts })
        .eq('id', user.id);
    }

    const quantitativeCount = currentCounts['كمي'] || 0;
    const verbalCount = currentCounts['لفظي'] || 0;
    
    // Check trial or subscription status
    // Check if user has a valid package that hasn't expired
    const hasValidPackage = profile.package_id && 
      profile.package_end_date && 
      new Date(profile.package_end_date) > new Date();
    
    const isTrial = profile.trial_days > 0;
    const isSubscribed = profile.subscription_active || hasValidPackage;
    
    let canExercise = true;
    let message = '';
    
    if (isTrial) {
      // During trial - unlimited exercises
      message = `أنت في الفترة التجريبية (${profile.trial_days} أيام متبقية) - تمارين غير محدودة`;
    } else if (!isSubscribed) {
      // Not subscribed and trial ended
      canExercise = false;
      message = 'انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة';
    } else {
      // Subscribed - apply limits from package
      const maxQuantitative = packageLimits.daily_exercises_quantitative;
      const maxVerbal = packageLimits.daily_exercises_verbal;
      
      const remainingQuantitative = Math.max(0, maxQuantitative - quantitativeCount);
      const remainingVerbal = Math.max(0, maxVerbal - verbalCount);
      
      if (quantitativeCount >= maxQuantitative && verbalCount >= maxVerbal) {
        canExercise = false;
        message = `وصلت للحد الأقصى اليومي (${maxQuantitative} كمي + ${maxVerbal} لفظي). حاول غداً`;
      } else {
        message = `لديك ${remainingQuantitative} تمارين كمي و ${remainingVerbal} لفظي متبقية اليوم`;
      }
    }

    // Calculate reset time (24 hours from last_reset)
    const resetAt = lastReset 
      ? new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const maxQuantitative = isTrial ? 999 : packageLimits.daily_exercises_quantitative;
    const maxVerbal = isTrial ? 999 : packageLimits.daily_exercises_verbal;

    return new Response(JSON.stringify({
      can_exercise: canExercise,
      remaining_quantitative: isTrial ? 999 : Math.max(0, maxQuantitative - quantitativeCount),
      remaining_verbal: isTrial ? 999 : Math.max(0, maxVerbal - verbalCount),
      max_quantitative: maxQuantitative,
      max_verbal: maxVerbal,
      reset_at: resetAt,
      trial_days_remaining: profile.trial_days,
      is_subscribed: isSubscribed,
      message: message,
      current_counts: {
        quantitative: quantitativeCount,
        verbal: verbalCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Check limits error:', error);
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});