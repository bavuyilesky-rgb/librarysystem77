-- Link members to auth users
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_key ON public.members(user_id) WHERE user_id IS NOT NULL;

-- Borrowing limit setting
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS max_books_per_student integer NOT NULL DEFAULT 5;

-- Updated signup handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  librarian_count INT;
  display_name TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, display_name, NEW.email);

  SELECT COUNT(*) INTO librarian_count FROM public.user_roles WHERE role = 'librarian';
  IF librarian_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'librarian');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    INSERT INTO public.members (user_id, name, email)
    VALUES (NEW.id, display_name, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

-- RLS: Students can view their own member record
DROP POLICY IF EXISTS "Students view own member" ON public.members;
CREATE POLICY "Students view own member"
ON public.members FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'librarian'::app_role));

-- RLS: Students can view their own transactions
DROP POLICY IF EXISTS "Students view own txns" ON public.transactions;
CREATE POLICY "Students view own txns"
ON public.transactions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'librarian'::app_role)
  OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
);

-- RLS: Students can create their own borrow records (instant borrow)
DROP POLICY IF EXISTS "Students create own txns" ON public.transactions;
CREATE POLICY "Students create own txns"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'librarian'::app_role)
  OR (
    has_role(auth.uid(), 'student'::app_role)
    AND member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    AND status = 'borrowed'
  )
);