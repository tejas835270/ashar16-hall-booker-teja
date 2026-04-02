
-- Credentials table for admin/guard passwords (replaces hardcoded)
CREATE TABLE public.credentials (
  id serial PRIMARY KEY,
  role text NOT NULL UNIQUE CHECK (role IN ('admin', 'guard')),
  username text NOT NULL,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default credentials
INSERT INTO public.credentials (role, username, password) VALUES
  ('admin', 'Ashar16', 'admin123'),
  ('guard', 'Ashar_Guard', 'guard123');

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read credentials" ON public.credentials FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update credentials" ON public.credentials FOR UPDATE TO public USING (true);

-- Password change audit log
CREATE TABLE public.password_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by text NOT NULL,
  target_role text NOT NULL,
  target_username text NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read password_change_logs" ON public.password_change_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert password_change_logs" ON public.password_change_logs FOR INSERT TO public WITH CHECK (true);
