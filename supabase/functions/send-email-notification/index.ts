import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { to, subject, html, userId, notificationType } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check user email preferences if userId is provided
    if (userId) {
      const { data: prefs } = await supabaseClient
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (prefs) {
        const typeMap: Record<string, string> = {
          achievement: 'achievement_notifications',
          subscription: 'subscription_updates',
          support: 'support_updates',
        };

        const prefKey = typeMap[notificationType];
        if (prefKey && !prefs[prefKey]) {
          return new Response(
            JSON.stringify({ message: "User has disabled this type of email", sent: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }
    }

    // Send email using Resend API (placeholder - requires RESEND_API_KEY secret)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email send");
      return new Response(
        JSON.stringify({ message: "Email service not configured", sent: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "دربني <notifications@yourdomain.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, sent: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Email notification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
