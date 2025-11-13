import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    return new Response(JSON.stringify({ 
      error: "Server configuration error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🧹 Starting cache cleanup...");

    // 1. Delete expired questions
    const { data: expiredData, error: expiredError } = await supabase
      .from('questions_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (expiredError) {
      console.error("Error deleting expired questions:", expiredError);
      throw expiredError;
    }

    const expiredCount = expiredData?.length || 0;
    console.log(`🗑️ Deleted ${expiredCount} expired questions`);

    // 2. Clean up old reserved questions (older than 10 minutes)
    const { data: staleCacheData, error: staleError } = await supabase
      .from('questions_cache')
      .update({ 
        reserved_by: null, 
        reserved_at: null 
      })
      .lt('reserved_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .not('reserved_by', 'is', null)
      .select('id');

    if (staleError) {
      console.error("Error cleaning stale reservations:", staleError);
      throw staleError;
    }

    const staleCount = staleCacheData?.length || 0;
    console.log(`🔓 Released ${staleCount} stale reservations`);

    // 3. Get cache statistics
    const { data: stats, error: statsError } = await supabase
      .from('questions_cache')
      .select('test_type, section, difficulty, is_used', { count: 'exact' });

    if (statsError) {
      console.error("Error fetching stats:", statsError);
      throw statsError;
    }

    const totalCache = stats?.length || 0;
    const usedCache = stats?.filter(q => q.is_used).length || 0;
    const availableCache = totalCache - usedCache;

    console.log(`📊 Cache Stats: Total=${totalCache}, Used=${usedCache}, Available=${availableCache}`);

    // 4. Trigger pre-generation if cache is low
    let pregenTriggered = false;
    if (availableCache < 50) {
      console.log("⚠️ Cache running low, triggering pre-generation...");
      
      const { error: pregenError } = await supabase.functions.invoke('pre-generate-questions', {
        body: {
          test_type: 'قدرات',
          section: 'كمي',
          difficulty: 'medium',
          count: 20
        }
      });

      if (pregenError) {
        console.error("Pre-generation warning:", pregenError);
      } else {
        pregenTriggered = true;
        console.log("✅ Pre-generation triggered");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      expiredDeleted: expiredCount,
      staleReleased: staleCount,
      cacheStats: {
        total: totalCache,
        used: usedCache,
        available: availableCache
      },
      pregenTriggered,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Cache cleanup failed"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
