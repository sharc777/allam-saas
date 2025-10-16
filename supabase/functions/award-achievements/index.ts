import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, event_type, event_data } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log(`[AWARD] Checking achievements for user ${user_id}, event: ${event_type}`);

    // Fetch all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*');

    if (achievementsError) throw achievementsError;

    // Fetch user's current achievements
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('student_achievements')
      .select('achievement_id')
      .eq('user_id', user_id);

    if (userAchievementsError) throw userAchievementsError;

    const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || []);
    const newlyUnlocked = [];

    // Check each achievement
    for (const achievement of allAchievements || []) {
      if (unlockedIds.has(achievement.id)) continue;

      let qualified = false;

      switch (achievement.requirement_type) {
        case 'exercises_completed': {
          const { count } = await supabase
            .from('daily_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id);
          qualified = (count || 0) >= achievement.requirement_value;
          break;
        }
        case 'perfect_score': {
          const { count } = await supabase
            .from('daily_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .eq('score', 100);
          qualified = (count || 0) >= achievement.requirement_value;
          break;
        }
        case 'streak_days': {
          const { data: profile } = await supabase
            .from('profiles')
            .select('streak_days')
            .eq('id', user_id)
            .single();
          qualified = (profile?.streak_days || 0) >= achievement.requirement_value;
          break;
        }
        case 'total_points': {
          const { data: profile } = await supabase
            .from('profiles')
            .select('total_points')
            .eq('id', user_id)
            .single();
          qualified = (profile?.total_points || 0) >= achievement.requirement_value;
          break;
        }
      }

      if (qualified) {
        // Award achievement
        const { error: insertError } = await supabase
          .from('student_achievements')
          .insert({
            user_id,
            achievement_id: achievement.id
          });

        if (!insertError) {
          // Update user points
          const { data: profileData } = await supabase
            .from('profiles')
            .select('total_points')
            .eq('id', user_id)
            .single();

          const newPoints = (profileData?.total_points || 0) + (achievement.points || 10);
          
          await supabase
            .from('profiles')
            .update({ total_points: newPoints })
            .eq('id', user_id);

          newlyUnlocked.push(achievement);
          console.log(`[AWARD] ✓ Unlocked: ${achievement.name} (+${achievement.points} points)`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        unlocked_count: newlyUnlocked.length,
        achievements: newlyUnlocked
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AWARD] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
