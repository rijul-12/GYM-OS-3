-- Phase 4: Biometrics Settings Schema

CREATE TABLE IF NOT EXISTS public.gym_api_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL DEFAULT 'Custom REST', -- eSSL, ZKTeco, Custom REST
    api_url TEXT,
    api_key TEXT,
    webhook_url TEXT,
    secret_key TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(gym_id)
);

-- Enable RLS
ALTER TABLE public.gym_api_settings ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own gym's settings
CREATE POLICY "Owners can manage their gym settings"
  ON public.gym_api_settings FOR ALL
  USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );

-- Super admin has absolute access natively bypassed via Service Role
