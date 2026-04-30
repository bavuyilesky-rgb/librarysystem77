-- Generate a member_code automatically for new student members.
-- Format: M-YYYY-XXXXXX (random 6 hex chars)
ALTER TABLE public.members
  ALTER COLUMN member_code SET DEFAULT ('M-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)));

-- Backfill any null member_codes
UPDATE public.members
SET member_code = 'M-' || to_char(created_at, 'YYYY') || '-' || upper(substr(md5(id::text), 1, 6))
WHERE member_code IS NULL;

-- Update handle_new_user so the auto-created student member also gets a code
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  librarian_count INT;
  display_name TEXT;
  user_phone TEXT;
  signup_role TEXT;
  new_code TEXT;
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
    new_code := 'M-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(NEW.id::text || clock_timestamp()::text), 1, 6));
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    INSERT INTO public.members (user_id, name, email, phone, member_code)
    VALUES (NEW.id, display_name, NEW.email, user_phone, new_code);
  END IF;
  RETURN NEW;
END;
$function$;