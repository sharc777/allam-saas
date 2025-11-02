-- ============================================
-- Phase 1 Critical Security Fixes
-- ============================================

-- 1. Fix Database Functions - Add SET search_path = public
-- This prevents schema injection attacks

CREATE OR REPLACE FUNCTION public.update_subscription_packages_private_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;

-- 2. Add explicit deny anonymous policies to sensitive tables
-- This ensures no unauthenticated access is possible

-- Deny anonymous access to user_weakness_profile
CREATE POLICY "Deny anonymous access to user_weakness_profile"
ON public.user_weakness_profile
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Deny anonymous access to support_tickets
CREATE POLICY "Deny anonymous access to support_tickets"
ON public.support_tickets
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Deny anonymous access to ticket_messages
CREATE POLICY "Deny anonymous access to ticket_messages"
ON public.ticket_messages
FOR ALL
USING (auth.uid() IS NOT NULL);

-- 3. Ensure coupon_usage table is protected
CREATE POLICY "Deny anonymous access to coupon_usage"
ON public.coupon_usage
FOR ALL
USING (auth.uid() IS NOT NULL);