
-- Create bookings table
CREATE TABLE public.bookings (
  id text PRIMARY KEY,
  flat_number text NOT NULL,
  name text NOT NULL,
  phone text,
  event_type text NOT NULL,
  date date NOT NULL,
  time_slot text NOT NULL,
  custom_start_hour integer,
  custom_end_hour integer,
  hall text NOT NULL,
  user_type text NOT NULL,
  member_count integer NOT NULL,
  rent integer NOT NULL,
  deposit integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  booking_type text NOT NULL DEFAULT 'online',
  payment_screenshot_url text,
  penalty_amount integer DEFAULT 0,
  penalty_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create settings table (single row)
CREATE TABLE public.settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules_pdf_url text,
  rules_pdf_name text,
  hall_open_time integer NOT NULL DEFAULT 8,
  hall_close_time integer NOT NULL DEFAULT 22,
  max_custom_hours integer NOT NULL DEFAULT 6,
  pricing jsonb NOT NULL DEFAULT '{"resident":{"full":7000,"half":4000},"tenant":{"full":8000,"half":5000}}'::jsonb,
  deposit integer NOT NULL DEFAULT 2000,
  halls jsonb NOT NULL DEFAULT '[{"key":"b-wing","label":"B-Wing Hall"},{"key":"c-wing","label":"C-Wing Hall"},{"key":"both","label":"Both (B & C Wing)"}]'::jsonb,
  payment_mode text NOT NULL DEFAULT 'both',
  upi_id text,
  payment_qr_url text,
  penalty_notice text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.settings (id, rules) VALUES (1, '[
  "The community hall must be vacated by 10:00 PM sharp. Any extension requires prior written approval from the committee.",
  "The person booking the hall is responsible for any damages to property. The security deposit will be forfeited in case of damages.",
  "Loud music/DJ is not permitted after 10:00 PM as per local municipal guidelines.",
  "Decorations must not damage walls, ceilings, or fixtures. Use of nails, screws, or adhesive tape on walls is prohibited.",
  "The hall must be left in a clean condition. The booking party is responsible for cleanup or must arrange for professional cleaning.",
  "Outside caterers are permitted but must follow the society hygiene standards. Cooking inside the hall is not allowed.",
  "Parking for guests must be arranged within the designated visitor parking area only. Blocking resident parking is not permitted.",
  "Alcohol consumption is permitted only for private events and must comply with all local laws and regulations.",
  "The society committee reserves the right to cancel any booking with prior notice in case of emergency maintenance or society events.",
  "All bookings are non-transferable. The registered flat member must be present during the event."
]'::jsonb);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (app uses hardcoded credentials, not Supabase auth)
CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete bookings" ON public.bookings FOR DELETE USING (true);

CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Public insert uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Public update uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads');
CREATE POLICY "Public delete uploads" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');

-- Index for faster date queries
CREATE INDEX idx_bookings_date ON public.bookings (date);
CREATE INDEX idx_bookings_status ON public.bookings (status);
