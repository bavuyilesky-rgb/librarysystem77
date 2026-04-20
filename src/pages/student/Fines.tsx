import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { calcFine, fmtMoney } from "@/lib/format";
import { format, differenceInCalendarDays } from "date-fns";
import { Receipt } from "lucide-react";

interface Txn {
  id: string;
  due_date: string;
  return_date: string | null;
  status: string;
  fine_amount: number;
  books: { title: string } | null;
}

interface Settings {
  daily_fine_rate: number;
  grace_period_days: number;
  max_fine: number;
}

interface FineRow {
  id: string;
  title: string;
  due_date: string;
  overdueDays: number;
  amount: number;
  status: "outstanding" | "paid";
}

const Fines = () => {
  const { memberId } = useAuth();
  const [rows, setRows] = useState<FineRow[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [paid, setPaid] = useState(0);

  const load = async () => {
    if (!memberId) return;
    const [{ data: txns }, { data: s }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,due_date,return_date,status,fine_amount,books(title)")
        .eq("member_id", memberId)
        .order("due_date", { ascending: false }),
      supabase.from("settings").select("daily_fine_rate,grace_period_days,max_fine").limit(1).maybeSingle(),
    ]);

    const settings = s as Settings | null;
    const today = new Date();
    const list: FineRow[] = [];
    let out = 0;
    let pd = 0;

    ((txns as Txn[]) ?? []).forEach((t) => {
      const due = new Date(t.due_date);
      if (t.status === "returned") {
        const amt = Number(t.fine_amount || 0);
        if (amt > 0) {
          pd += amt;
          list.push({
            id: t.id,
            title: t.books?.title ?? "—",
            due_date: t.due_date,
            overdueDays: t.return_date
              ? Math.max(0, differenceInCalendarDays(new Date(t.return_date), due))
              : 0,
            amount: amt,
            status: "paid",
          });
        }
      } else if (settings) {
        const projected = calcFine(t.due_date, today, settings);
        if (projected > 0) {
          out += projected;
          list.push({
            id: t.id,
            title: t.books?.title ?? "—",
            due_date: t.due_date,
            overdueDays: differenceInCalendarDays(today, due),
            amount: projected,
            status: "outstanding",
          });
        }
      }
    });

    setRows(list);
    setOutstanding(out);
    setPaid(pd);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("student-fines")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return (
    <>
      <header className="border-b border-edge px-4 sm:px-8 py-5 shrink-0 bg-surface/30">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
          Account
        </div>
        <h1 className="text-xl font-semibold">Fines</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-edge bg-surface p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Outstanding balance
            </div>
            <div
              className={`font-mono text-3xl font-bold tabular-nums ${
                outstanding > 0 ? "text-destructive" : "text-success"
              }`}
            >
              {fmtMoney(outstanding)}
            </div>
            <button
              disabled
              className="mt-4 w-full px-3 py-2 border border-edge bg-background text-xs font-mono uppercase tracking-wide text-muted-foreground cursor-not-allowed"
              title="Online payment coming soon"
            >
              Pay Fine (coming soon)
            </button>
          </div>
          <div className="border border-edge bg-surface p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Lifetime paid
            </div>
            <div className="font-mono text-3xl font-bold tabular-nums">{fmtMoney(paid)}</div>
            <div className="mt-4 text-xs text-muted-foreground">
              Settled fines from returned books.
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="border border-edge bg-surface p-12 text-center">
            <Receipt className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No fines on your account. 🎉</div>
          </div>
        ) : (
          <div className="border border-edge bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-left">
                  <th className="p-3 font-medium">Book</th>
                  <th className="p-3 font-medium">Due date</th>
                  <th className="p-3 font-medium text-right">Overdue days</th>
                  <th className="p-3 font-medium text-right">Amount</th>
                  <th className="p-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-edge/50 hover:bg-surface-raised">
                    <td className="p-3 truncate max-w-[260px]">{r.title}</td>
                    <td className="p-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {format(new Date(r.due_date), "dd MMM yyyy")}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums">
                      {r.overdueDays}
                    </td>
                    <td className="p-3 text-right font-mono text-sm font-bold tabular-nums">
                      {fmtMoney(r.amount)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase ${
                          r.status === "paid"
                            ? "border-success/30 text-success bg-success/10"
                            : "border-destructive/30 text-destructive bg-destructive/10"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default Fines;
