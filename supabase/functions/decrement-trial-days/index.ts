import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DECREMENT-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_days, subscription_active, last_quiz_date")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("Profile fetched", { trialDays: profile.trial_days, subscribed: profile.subscription_active });

    // Don't decrement if user has active subscription
    if (profile.subscription_active) {
      logStep("User has active subscription, skipping decrement");
      return new Response(JSON.stringify({ 
        message: "User has active subscription",
        trial_days: profile.trial_days 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Don't decrement if trial_days is already 0
    if (profile.trial_days <= 0) {
      logStep("Trial already expired");
      return new Response(JSON.stringify({ 
        message: "Trial already expired",
        trial_days: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if we already decremented today
    const today = new Date().toISOString().split('T')[0];
    const lastQuizDate = profile.last_quiz_date;
    
    if (lastQuizDate === today) {
      logStep("Already decremented today", { lastQuizDate });
      return new Response(JSON.stringify({ 
        message: "Already decremented today",
        trial_days: profile.trial_days 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Decrement trial days
    const newTrialDays = Math.max(0, profile.trial_days - 1);
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ 
        trial_days: newTrialDays,
        last_quiz_date: today 
      })
      .eq("id", user.id);

    if (updateError) throw new Error(`Update error: ${updateError.message}`);
    logStep("Trial days decremented", { oldValue: profile.trial_days, newValue: newTrialDays });

    return new Response(JSON.stringify({ 
      message: "Trial days decremented successfully",
      trial_days: newTrialDays,
      previous_trial_days: profile.trial_days
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
