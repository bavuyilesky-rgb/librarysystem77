import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fmtMoney } from "@/lib/format";
import { format } from "date-fns";
import { History as HistoryIcon } from "lucide-react";

interface Txn {
  id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  fine_amount: number;
  books: { title: string; author: string } | null;
}

type Filter = "all" | "borrowed" | "returned" | "overdue";

const History = () => {
  const { memberId } = useAuth();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    if (!memberId) return;
    const { data } = await supabase
      .from("transactions")
      .select("id,borrow_date,due_date,return_date,status,fine_amount,books(title,author)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    setTxns((data as any) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("student-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const filtered = useMemo(() => {
    if (filter === "all") return txns;
    if (filter === "borrowed") return txns.filter((t) => t.status === "borrowed");
    if (filter === "returned") return txns.filter((t) => t.status === "returned");
    return txns.filter((t) => t.status === "overdue");
  }, [txns, filter]);

  return (
    <>
      <header className="border-b border-edge px-4 sm:px-8 py-5 shrink-0 bg-surface/30">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
          Activity
        </div>
        <h1 className="text-xl font-semibold">Borrowing History</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-4">
        <div className="flex border border-edge w-fit">
          {(["all", "borrowed", "returned", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border-l border-edge first:border-l-0 ${
                filter === f
                  ? "bg-surface-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border border-edge bg-surface p-12 text-center">
            <HistoryIcon className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No transactions to show.</div>
          </div>
        ) : (
          <div className="border border-edge bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-left">
                  <th className="p-3 font-medium">Book</th>
                  <th className="p-3 font-medium">Borrowed</th>
                  <th className="p-3 font-medium">Due</th>
                  <th className="p-3 font-medium">Returned</th>
                  <th className="p-3 font-medium text-right">Fine</th>
                  <th className="p-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-edge/50 hover:bg-surface-raised">
                    <td className="p-3 min-w-[200px]">
                      <div className="font-medium truncate">{t.books?.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.books?.author}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {format(new Date(t.borrow_date), "dd MMM yyyy")}
                    </td>
                    <td className="p-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      {format(new Date(t.due_date), "dd MMM yyyy")}
                    </td>
                    <td className="p-3 font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                      {t.return_date ? format(new Date(t.return_date), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {Number(t.fine_amount) > 0 ? (
                        <span className="text-destructive font-bold">{fmtMoney(Number(t.fine_amount))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <StatusBadge status={t.status} />
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

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    borrowed: "border-info/30 text-info bg-info/10",
    returned: "border-success/30 text-success bg-success/10",
    overdue: "border-destructive/30 text-destructive bg-destructive/10",
    pending: "border-warning/30 text-warning bg-warning/10",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase ${map[status] ?? ""}`}
    >
      {status}
    </span>
  );
};

export default History;
