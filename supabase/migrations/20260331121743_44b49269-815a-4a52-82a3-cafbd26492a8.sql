
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS society_name text DEFAULT 'Ashar 16 CHSL';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;
