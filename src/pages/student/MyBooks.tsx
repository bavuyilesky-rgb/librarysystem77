import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calcFine, fmtMoney } from "@/lib/format";
import { format, differenceInCalendarDays } from "date-fns";
import { BookMarked } from "lucide-react";

interface Loan {
  id: string;
  borrow_date: string;
  due_date: string;
  status: string;
  fine_amount: number;
  books: { title: string; author: string } | null;
}

interface Settings {
  daily_fine_rate: number;
  grace_period_days: number;
  max_fine: number;
}

const MyBooks = () => {
  const { memberId } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = async () => {
    if (!memberId) return;
    const [{ data: txns }, { data: s }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,borrow_date,due_date,status,fine_amount,books(title,author)")
        .eq("member_id", memberId)
        .in("status", ["borrowed", "overdue"])
        .order("due_date"),
      supabase.from("settings").select("daily_fine_rate,grace_period_days,max_fine").limit(1).maybeSingle(),
    ]);
    setLoans((txns as any) ?? []);
    setSettings(s as Settings | null);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("student-mybooks")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const today = new Date();

  return (
    <>
      <header className="border-b border-edge px-4 sm:px-8 py-5 shrink-0 bg-surface/30">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
          Active loans
        </div>
        <h1 className="text-xl font-semibold">My Books</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {loans.length === 0 ? (
          <div className="border border-edge bg-surface p-12 text-center">
            <BookMarked className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">
              You don't have any books on loan. Browse the catalogue to borrow one.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loans.map((l) => {
              const due = new Date(l.due_date);
              const days = differenceInCalendarDays(due, today);
              const overdue = days < 0;
              const projectedFine = settings && overdue ? calcFine(l.due_date, today, settings) : 0;
              return (
                <div
                  key={l.id}
                  className={`border bg-surface p-4 flex flex-col gap-3 ${
                    overdue ? "border-destructive/40" : "border-edge"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-snug line-clamp-2">
                        {l.books?.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.books?.author}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${
                        overdue
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : days <= 3
                          ? "border-warning/30 text-warning bg-warning/10"
                          : "border-info/30 text-info bg-info/10"
                      }`}
                    >
                      {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-edge text-xs">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Borrowed
                      </div>
                      <div className="font-mono tabular-nums mt-0.5">
                        {format(new Date(l.borrow_date), "dd MMM yyyy")}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Due
                      </div>
                      <div
                        className={`font-mono tabular-nums mt-0.5 ${
                          overdue ? "text-destructive font-bold" : ""
                        }`}
                      >
                        {format(due, "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                  {projectedFine > 0 && (
                    <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                        Projected fine
                      </span>
                      <span className="font-mono text-sm font-bold text-destructive tabular-nums">
                        {fmtMoney(projectedFine)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default MyBooks;
