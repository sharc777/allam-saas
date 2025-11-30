-- Create ad_settings table
CREATE TABLE IF NOT EXISTS public.ad_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT false,
  adsense_client_id TEXT,
  ad_slots JSONB DEFAULT '{
    "hero": "",
    "between_sections": "",
    "footer": "",
    "sidebar": ""
  }'::jsonb,
  placement_settings JSONB DEFAULT '{
    "hero": true,
    "between_sections": true,
    "footer": true,
    "sidebar": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view ad settings (to display ads)
CREATE POLICY "Anyone can view ad settings"
ON public.ad_settings
FOR SELECT
USING (true);

-- Policy: Only admins can manage ad settings
CREATE POLICY "Admins can manage ad settings"
ON public.ad_settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ad_settings_updated_at
BEFORE UPDATE ON public.ad_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.ad_settings (is_enabled, adsense_client_id)
VALUES (false, null)
ON CONFLICT DO NOTHING;