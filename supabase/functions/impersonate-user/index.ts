import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for elevated operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user with anon key client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !callingUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling user:", callingUser.id);

    // Check if calling user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.error("User is not admin:", callingUser.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target user ID from the request body
    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Target user ID:", target_user_id);

    // Prevent admin from impersonating another admin (security measure)
    const { data: targetIsAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: target_user_id,
      _role: "admin",
    });

    if (targetIsAdmin) {
      console.error("Cannot impersonate another admin");
      return new Response(
        JSON.stringify({ error: "Cannot impersonate another admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's email from auth.users
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);

    if (userError || !targetUser?.user?.email) {
      console.error("Failed to get target user:", userError);
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetEmail = targetUser.user.email;
    console.log("Target user email:", targetEmail);

    // Generate magic link for the target user
    const { data: magicLinkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (linkError || !magicLinkData?.properties?.hashed_token) {
      console.error("Failed to generate magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate impersonation link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's profile info for display
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", target_user_id)
      .single();

    console.log("Successfully generated impersonation link for:", targetEmail);

    return new Response(
      JSON.stringify({
        success: true,
        hashed_token: magicLinkData.properties.hashed_token,
        target_user: {
          id: target_user_id,
          email: targetEmail,
          full_name: targetProfile?.full_name || "Unknown",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
