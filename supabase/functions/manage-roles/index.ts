import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[MANAGE-ROLES] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log('Request received');
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('Missing authorization header');
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Get operator (caller)
    log('Getting user from token');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      log('Unauthorized user', { error: userErr });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const operatorId = userData.user.id;
    log('Operator identified', { operatorId });

    const body = await req.json().catch(() => ({}));
    const { target_user_id, desired_role } = body as {
      target_user_id: string;
      desired_role: 'admin' | 'student';
    };

    if (!target_user_id || !desired_role) {
      return new Response(JSON.stringify({ error: "Missing target_user_id or desired_role" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check current admins count
    const { count: adminsCount, error: countErr } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (countErr) throw countErr;

    // Check if operator is admin
    const { count: operatorAdminCount, error: opErr } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', operatorId)
      .eq('role', 'admin');
    if (opErr) throw opErr;

    const operatorIsAdmin = (operatorAdminCount ?? 0) > 0;

    // Bootstrap rule: if no admins at all, allow the caller to promote (self or others)
    if ((adminsCount ?? 0) === 0) {
      log('Bootstrap mode: no admins found');
    } else if (!operatorIsAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (desired_role === 'admin') {
      // Upsert admin role
      const { error: upErr } = await supabase
        .from('user_roles')
        .upsert({ user_id: target_user_id, role: 'admin' }, { onConflict: 'user_id,role' });
      if (upErr) throw upErr;

      // Update profile mirror for UI convenience
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', target_user_id);
      if (profErr) throw profErr;

      return new Response(JSON.stringify({ success: true, role: 'admin' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Remove admin role (demote to student)
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', target_user_id)
        .eq('role', 'admin');
      if (delErr) throw delErr;

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', target_user_id);
      if (profErr) throw profErr;

      return new Response(JSON.stringify({ success: true, role: 'student' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('ERROR', { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
