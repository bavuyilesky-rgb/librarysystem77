import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { fmtMoney, fmtNum } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { usePreferences } from "@/hooks/usePreferences";

interface Stats {
  totalBooks: number;
  borrowed: number;
  overdue: number;
  fines: number;
}

const Dashboard = () => {
  const { prefs } = usePreferences();
  const show = (k: string) => prefs.dashboard_widgets.includes(k as any);
  const [stats, setStats] = useState<Stats>({ totalBooks: 0, borrowed: 0, overdue: 0, fines: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: books }, { count: borrowedC }, { count: overdueC }, { data: fineRows }, { data: rec }, { data: low }] =
      await Promise.all([
        supabase.from("books").select("total_copies"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "borrowed"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).in("status", ["borrowed", "overdue"]).lt("due_date", today),
        supabase.from("transactions").select("fine_amount"),
        supabase.from("transactions").select("*, books(title), members(name)").order("created_at", { ascending: false }).limit(8),
        supabase.from("books").select("*").lte("available_copies", 1).order("available_copies").limit(5),
      ]);

    setStats({
      totalBooks: (books ?? []).reduce((s, b: any) => s + (b.total_copies || 0), 0),
      borrowed: borrowedC ?? 0,
      overdue: overdueC ?? 0,
      fines: (fineRows ?? []).reduce((s: number, r: any) => s + Number(r.fine_amount || 0), 0),
    });
    setRecent(rec ?? []);
    setLowStock(low ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <>
      <PageHeader
        crumb="System"
        title="Matrix Overview"
        actions={
          <>
            <Link to="/books" className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wide hover:opacity-90">
              Add Asset
            </Link>
            <Link to="/transactions" className="px-4 py-1.5 border border-edge text-foreground text-xs font-mono font-medium uppercase tracking-wide hover:bg-surface-raised">
              Issue Loan
            </Link>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
        {show("stats") && (
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-edge gap-px border border-edge">
            <StatCard label="Total Volumes" value={fmtNum(stats.totalBooks)} sub="Across all titles" />
            <StatCard label="Active Transit" value={fmtNum(stats.borrowed)} tone="info" sub="Currently borrowed" />
            <StatCard label="Critical Overdue" value={fmtNum(stats.overdue)} tone="danger" sub={stats.overdue ? "Action required" : "All clear"} />
            <StatCard label="Total Fines" value={fmtMoney(stats.fines)} sub="Lifetime accrued" />
          </div>
        )}

        {(show("recent") || show("overdue")) && (
        <div className={`grid grid-cols-1 gap-8 ${show("recent") && show("overdue") ? "lg:grid-cols-3" : ""}`}>
          {show("recent") && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Live Transit Stream</h2>
              <span className="font-mono text-[10px] text-muted-foreground/60">AUTO-REFRESH: ON</span>
            </div>
            <div className="border border-edge bg-surface">
              <div className="grid grid-cols-12 gap-4 p-3 border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                <div className="col-span-3">Time</div>
                <div className="col-span-5">Asset</div>
                <div className="col-span-2">Patron</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              {recent.length === 0 && (
                <div className="p-6 text-center font-mono text-xs text-muted-foreground">No activity yet.</div>
              )}
              {recent.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-4 p-3 border-b border-edge/50 items-center hover:bg-surface-raised transition-colors">
                  <div className="col-span-3 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                  <div className="col-span-5 text-sm truncate">{r.books?.title}</div>
                  <div className="col-span-2 text-sm text-muted-foreground truncate">{r.members?.name}</div>
                  <div className="col-span-2 text-right">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {show("overdue") && (
          <div className="flex flex-col gap-4">
            <h2 className="font-mono text-xs text-warning uppercase tracking-widest flex items-center gap-2">
              <span className="size-1.5 bg-warning rounded-full" />
              Depletion Warning
            </h2>
            <div className="border border-warning/30 bg-warning/10 p-4 flex flex-col gap-3">
              {lowStock.length === 0 && (
                <div className="font-mono text-xs text-muted-foreground">All assets in stock.</div>
              )}
              {lowStock.map((b, i) => (
                <div key={b.id}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">ISBN {b.isbn || "—"}</div>
                    </div>
                    <span className={`font-mono text-xs font-bold tabular-nums ${b.available_copies === 0 ? "text-destructive" : "text-warning"}`}>
                      {String(b.available_copies).padStart(2, "0")} LEFT
                    </span>
                  </div>
                  {i < lowStock.length - 1 && <div className="w-full h-px bg-warning/10 mt-3" />}
                </div>
              ))}
            </div>
          </div>
          )}
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
  };
  return (
    <span className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase ${map[status] ?? ""}`}>
      {status}
    </span>
  );
};

export default Dashboard;
