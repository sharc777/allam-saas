-- ============================================
-- Phase 1: Critical Security Fixes
-- ============================================

-- 1. Protect questions_cache - Hide answers from students
-- ============================================
DROP POLICY IF EXISTS "Anyone can view unreserved cache" ON questions_cache;
DROP POLICY IF EXISTS "System can update cache" ON questions_cache;

-- Students can only see questions they reserved (without answers)
CREATE POLICY "Students can view their reserved questions" ON questions_cache
FOR SELECT
TO authenticated
USING (
  reserved_by = auth.uid() 
  AND reserved_at > NOW() - INTERVAL '5 minutes'
);

-- System can mark questions as used (for authenticated users only)
CREATE POLICY "System can update reserved cache" ON questions_cache
FOR UPDATE
TO authenticated
USING (
  reserved_by = auth.uid()
  OR is_admin(auth.uid())
)
WITH CHECK (
  reserved_by = auth.uid()
  OR is_admin(auth.uid())
);

-- Only authenticated users can reserve questions
CREATE POLICY "System can reserve questions" ON questions_cache
FOR UPDATE
TO authenticated
USING (
  (reserved_by IS NULL OR reserved_at < NOW() - INTERVAL '5 minutes')
  OR is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 2. Protect daily_content - Require active subscription
-- ============================================
DROP POLICY IF EXISTS "Published content is viewable by everyone" ON daily_content;

-- Create function to check if user has active access (subscription or trial)
CREATE OR REPLACE FUNCTION public.has_active_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = p_user_id 
    AND (
      subscription_active = true 
      OR trial_days > 0
    )
  )
$$;

-- Only users with active subscription/trial can view published content
CREATE POLICY "Active users can view published content" ON daily_content
FOR SELECT
TO authenticated
USING (
  is_published = true 
  AND (
    has_active_access(auth.uid())
    OR is_admin(auth.uid())
  )
);

-- Admins can view all content including unpublished
CREATE POLICY "Admins can view all content" ON daily_content
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Protect subscription_packages - Hide Stripe IDs
-- ============================================
-- Create private table for sensitive subscription data
CREATE TABLE IF NOT EXISTS subscription_packages_private (
  id UUID PRIMARY KEY REFERENCES subscription_packages(id) ON DELETE CASCADE,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on private table
ALTER TABLE subscription_packages_private ENABLE ROW LEVEL SECURITY;

-- Only admins can access private subscription data
CREATE POLICY "Only admins can view private package data" ON subscription_packages_private
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can manage private package data" ON subscription_packages_private
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Migrate existing Stripe IDs to private table
INSERT INTO subscription_packages_private (id, stripe_price_id_monthly, stripe_price_id_yearly)
SELECT id, stripe_price_id_monthly, stripe_price_id_yearly
FROM subscription_packages
WHERE stripe_price_id_monthly IS NOT NULL OR stripe_price_id_yearly IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Remove Stripe IDs from public table (keep columns for backward compatibility but null them)
UPDATE subscription_packages SET 
  stripe_price_id_monthly = NULL,
  stripe_price_id_yearly = NULL
WHERE stripe_price_id_monthly IS NOT NULL OR stripe_price_id_yearly IS NOT NULL;

-- 4. Protect skills_taxonomy and knowledge_base
-- ============================================
DROP POLICY IF EXISTS "Everyone can view skills taxonomy" ON skills_taxonomy;
DROP POLICY IF EXISTS "Everyone can view active knowledge base" ON knowledge_base;

-- Require authentication for skills_taxonomy
CREATE POLICY "Authenticated users can view skills taxonomy" ON skills_taxonomy
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));

-- Require authentication for knowledge_base
CREATE POLICY "Authenticated users can view knowledge base" ON knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));

-- 5. Add security indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_active, trial_days) 
WHERE subscription_active = true OR trial_days > 0;

CREATE INDEX IF NOT EXISTS idx_questions_cache_reservation 
ON questions_cache(reserved_by, reserved_at) 
WHERE reserved_by IS NOT NULL;

-- 6. Add trigger to auto-update subscription_packages_private
-- ============================================
CREATE OR REPLACE FUNCTION update_subscription_packages_private_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_packages_private_updated_at
BEFORE UPDATE ON subscription_packages_private
FOR EACH ROW
EXECUTE FUNCTION update_subscription_packages_private_timestamp();

-- Add comments for documentation
COMMENT ON TABLE subscription_packages_private IS 'Private subscription data including Stripe IDs - Admin access only';
COMMENT ON FUNCTION has_active_access IS 'Security definer function to check if user has active subscription or trial days';
COMMENT ON POLICY "Students can view their reserved questions" ON questions_cache IS 'Students can only see questions they have reserved in the last 5 minutes';
COMMENT ON POLICY "Active users can view published content" ON daily_content IS 'Only users with active subscription or trial can access educational content';