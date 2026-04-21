-- Add phone to profiles for student-supplied data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update handle_new_user to consume name + phone from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  librarian_count INT;
  display_name TEXT;
  user_phone TEXT;
  signup_role TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  user_phone := NEW.raw_user_meta_data->>'phone';
  signup_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (NEW.id, display_name, NEW.email, user_phone);

  SELECT COUNT(*) INTO librarian_count FROM public.user_roles WHERE role = 'librarian';

  IF librarian_count = 0 OR signup_role = 'librarian' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'librarian');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    INSERT INTO public.members (user_id, name, email, phone)
    VALUES (NEW.id, display_name, NEW.email, user_phone);
  END IF;
  RETURN NEW;
END;
$$;

-- Per-user UI preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  accent TEXT NOT NULL DEFAULT 'sky',
  density TEXT NOT NULL DEFAULT 'comfortable',
  dashboard_widgets JSONB NOT NULL DEFAULT '["stats","recent","overdue","quick"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own prefs" ON public.user_preferences;
CREATE POLICY "Users read own prefs" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users upsert own prefs" ON public.user_preferences;
CREATE POLICY "Users upsert own prefs" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own prefs" ON public.user_preferences;
CREATE POLICY "Users update own prefs" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
