import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BookOpen, Search } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  available_copies: number;
  total_copies: number;
  shelf_location: string | null;
}

interface Settings {
  loan_period_days: number;
  max_books_per_student: number;
}

const StudentBrowse = () => {
  const { memberId } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [borrowing, setBorrowing] = useState<string | null>(null);

  const load = async () => {
    const [{ data: bookData }, { data: settingData }, activeRes] = await Promise.all([
      supabase.from("books").select("*").order("title"),
      supabase.from("settings").select("loan_period_days,max_books_per_student").limit(1).maybeSingle(),
      memberId
        ? supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("member_id", memberId)
            .in("status", ["borrowed", "overdue"])
        : Promise.resolve({ count: 0 } as any),
    ]);
    setBooks(bookData ?? []);
    setSettings(settingData as Settings | null);
    setActiveCount((activeRes as any).count ?? 0);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("student-browse")
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const categories = Array.from(
    new Set(books.map((b) => b.category).filter(Boolean) as string[])
  ).sort();

  const filtered = books.filter((b) => {
    if (onlyAvailable && b.available_copies <= 0) return false;
    if (category !== "all" && b.category !== category) return false;
    if (!q) return true;
    const hay = `${b.title} ${b.author} ${b.isbn ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const borrow = async (book: Book) => {
    if (!memberId) {
      toast.error("Your member record isn't linked yet. Contact a librarian.");
      return;
    }
    if (!settings) return;
    if (activeCount >= settings.max_books_per_student) {
      toast.error(
        `Borrowing limit reached (${settings.max_books_per_student} books). Return one to borrow more.`
      );
      return;
    }
    if (book.available_copies <= 0) {
      toast.error("No copies available.");
      return;
    }
    setBorrowing(book.id);
    const today = new Date();
    const due = new Date(today.getTime() + settings.loan_period_days * 86400000);
    const { error } = await supabase.from("transactions").insert({
      book_id: book.id,
      member_id: memberId,
      borrow_date: today.toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      status: "borrowed",
    });
    setBorrowing(null);
    if (error) toast.error(error.message);
    else toast.success(`"${book.title}" borrowed. Due ${due.toLocaleDateString("en-ZA")}.`);
  };

  const remaining = settings ? Math.max(0, settings.max_books_per_student - activeCount) : 0;

  return (
    <>
      <header className="border-b border-edge px-4 sm:px-8 py-5 shrink-0 bg-surface/30">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
              Catalogue
            </div>
            <h1 className="text-xl font-semibold">Browse Books</h1>
          </div>
          {settings && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-edge bg-surface">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Slots
              </span>
              <span className="font-mono text-sm font-bold tabular-nums">
                {remaining}/{settings.max_books_per_student}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search title, author, ISBN…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-surface border border-edge pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-info"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-surface border border-edge px-3 py-2 text-sm focus:outline-none focus:border-info"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border border-edge bg-surface text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="accent-info"
            />
            Available only
          </label>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="border border-edge bg-surface p-12 text-center">
            <BookOpen className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No books match your search.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((b) => {
              const available = b.available_copies > 0;
              return (
                <div
                  key={b.id}
                  className="border border-edge bg-surface p-4 flex flex-col gap-3 hover:border-edge-lit transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-snug line-clamp-2">
                        {b.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {b.author}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${
                        available
                          ? "border-success/30 text-success bg-success/10"
                          : "border-destructive/30 text-destructive bg-destructive/10"
                      }`}
                    >
                      {available ? "Available" : "Out"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    <span>{b.category || "—"}</span>
                    <span className="tabular-nums">
                      {b.available_copies}/{b.total_copies} copies
                    </span>
                  </div>
                  <button
                    onClick={() => borrow(b)}
                    disabled={!available || borrowing === b.id || (settings && activeCount >= settings.max_books_per_student)}
                    className="w-full mt-auto px-3 py-2 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {borrowing === b.id ? "Borrowing…" : "Borrow"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default StudentBrowse;
