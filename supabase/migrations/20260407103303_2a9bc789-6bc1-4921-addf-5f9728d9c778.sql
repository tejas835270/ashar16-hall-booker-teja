ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS management_whatsapp text DEFAULT NULL;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS support_contact_name text DEFAULT NULL;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS support_contact_number text DEFAULT NULL;