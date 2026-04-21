-- Roles
CREATE TYPE public.app_role AS ENUM ('librarian', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS RR
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
RR;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Librarians manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'librarian'))
  WITH CHECK (public.has_role(auth.uid(), 'librarian'));

-- Profiles (display name for librarians)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto profile + first-user-becomes-librarian
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS RR
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles WHERE role = 'librarian';
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'librarian');
  END IF;
  RETURN NEW;
END;
RR;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Members (library patrons, not auth users)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  member_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Librarians manage members" ON public.members FOR ALL
  USING (public.has_role(auth.uid(), 'librarian'))
  WITH CHECK (public.has_role(auth.uid(), 'librarian'));

-- Books
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT,
  total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  shelf_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Librarians manage books" ON public.books FOR ALL
  USING (public.has_role(auth.uid(), 'librarian'))
  WITH CHECK (public.has_role(auth.uid(), 'librarian'));

-- Transactions
CREATE TYPE public.txn_status AS ENUM ('borrowed','returned','overdue');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status txn_status NOT NULL DEFAULT 'borrowed',
  fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Librarians manage txns" ON public.transactions FOR ALL
  USING (public.has_role(auth.uid(), 'librarian'))
  WITH CHECK (public.has_role(auth.uid(), 'librarian'));

CREATE INDEX idx_txn_status ON public.transactions(status);
CREATE INDEX idx_txn_member ON public.transactions(member_id);
CREATE INDEX idx_txn_book ON public.transactions(book_id);

-- Settings (single row)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_fine_rate NUMERIC(10,2) NOT NULL DEFAULT 0.50,
  grace_period_days INT NOT NULL DEFAULT 0,
  max_fine NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  loan_period_days INT NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Librarians update settings" ON public.settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'librarian'));
CREATE POLICY "Librarians insert settings" ON public.settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'librarian'));

INSERT INTO public.settings (daily_fine_rate, grace_period_days, max_fine, loan_period_days)
VALUES (0.50, 0, 50.00, 14);

-- Borrow: decrement available
CREATE OR REPLACE FUNCTION public.handle_borrow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS RR
BEGIN
  IF NEW.status = 'borrowed' THEN
    UPDATE public.books SET available_copies = available_copies - 1
    WHERE id = NEW.book_id AND available_copies > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No copies available';
    END IF;
  END IF;
  RETURN NEW;
END;
RR;
CREATE TRIGGER on_txn_insert AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_borrow();

-- Return: increment available when status changes to returned
CREATE OR REPLACE FUNCTION public.handle_return()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS RR
BEGIN
  IF OLD.status IN ('borrowed','overdue') AND NEW.status = 'returned' THEN
    UPDATE public.books SET available_copies = available_copies + 1
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
RR;
CREATE TRIGGER on_txn_update AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_return();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;