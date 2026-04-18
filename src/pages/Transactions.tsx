import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { calcFine, fmtMoney } from "@/lib/format";
import { format, addDays } from "date-fns";
import { Plus } from "lucide-react";

const Transactions = () => {
  const [txns, setTxns] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "borrowed" | "returned" | "overdue">("all");
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnTxn, setReturnTxn] = useState<any | null>(null);

  const [memberId, setMemberId] = useState("");
  const [bookId, setBookId] = useState("");

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    // mark overdue
    await supabase
      .from("transactions")
      .update({ status: "overdue" })
      .eq("status", "borrowed")
      .lt("due_date", today);

    const [{ data: t }, { data: m }, { data: b }, { data: s }] = await Promise.all([
      supabase.from("transactions").select("*, books(title, author), members(name, member_code)").order("created_at", { ascending: false }),
      supabase.from("members").select("*").order("name"),
      supabase.from("books").select("*").gt("available_copies", 0).order("title"),
      supabase.from("settings").select("*").limit(1).maybeSingle(),
    ]);
    setTxns(t ?? []);
    setMembers(m ?? []);
    setBooks(b ?? []);
    setSettings(s);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("txn").on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = txns.filter((t) => filter === "all" || t.status === filter);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !bookId || !settings) return;
    const due = format(addDays(new Date(), settings.loan_period_days), "yyyy-MM-dd");
    const { error } = await supabase.from("transactions").insert({
      member_id: memberId, book_id: bookId, due_date: due, status: "borrowed",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Loan issued");
      setIssueOpen(false);
      setMemberId(""); setBookId("");
    }
  };

  const doReturn = async () => {
    if (!returnTxn || !settings) return;
    const today = new Date();
    const fine = calcFine(returnTxn.due_date, today, settings);
    const { error } = await supabase.from("transactions").update({
      status: "returned",
      return_date: format(today, "yyyy-MM-dd"),
      fine_amount: fine,
    }).eq("id", returnTxn.id);
    if (error) toast.error(error.message);
    else {
      toast.success(fine > 0 ? `Returned. Fine: ${fmtMoney(fine)}` : "Returned");
      setReturnTxn(null);
    }
  };

  const previewFine = returnTxn && settings ? calcFine(returnTxn.due_date, new Date(), settings) : 0;

  return (
    <>
      <PageHeader
        crumb="Terminal"
        title="Transit Logs"
        actions={
          <button onClick={() => setIssueOpen(true)} className="px-4 py-1.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80 flex items-center gap-1.5">
            <Plus className="size-3" /> Issue Loan
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        <div className="flex border border-edge w-fit">
          {(["all", "borrowed", "returned", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border-l border-edge first:border-l-0 ${
                filter === f ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="border border-edge bg-surface">
          <div className="grid grid-cols-12 gap-4 p-3 border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <div className="col-span-4">Asset</div>
            <div className="col-span-2">Patron</div>
            <div className="col-span-1">Borrow</div>
            <div className="col-span-1">Due</div>
            <div className="col-span-1">Returned</div>
            <div className="col-span-1 text-right">Fine</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {filtered.length === 0 && <div className="p-8 text-center font-mono text-xs text-muted-foreground">No transactions.</div>}
          {filtered.map((t) => (
            <div key={t.id} className="grid grid-cols-12 gap-4 p-3 border-b border-edge/50 items-center hover:bg-surface-raised">
              <div className="col-span-4 min-w-0">
                <div className="text-sm truncate">{t.books?.title}</div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">{t.books?.author}</div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground truncate">{t.members?.name}</div>
              <div className="col-span-1 font-mono text-xs text-muted-foreground tabular-nums">{t.borrow_date}</div>
              <div className="col-span-1 font-mono text-xs text-muted-foreground tabular-nums">{t.due_date}</div>
              <div className="col-span-1 font-mono text-xs text-muted-foreground tabular-nums">{t.return_date || "—"}</div>
              <div className="col-span-1 text-right font-mono text-xs tabular-nums">{Number(t.fine_amount) > 0 ? fmtMoney(Number(t.fine_amount)) : "—"}</div>
              <div className="col-span-1 text-center"><StatusBadge status={t.status} /></div>
              <div className="col-span-1 text-right">
                {t.status !== "returned" && (
                  <button onClick={() => setReturnTxn(t)} className="px-2 py-1 border border-edge text-[10px] font-mono uppercase hover:bg-edge">
                    Return
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="bg-surface border-edge">
          <DialogHeader><DialogTitle className="font-mono text-xs uppercase tracking-widest">Issue Loan</DialogTitle></DialogHeader>
          <form onSubmit={issue} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Patron</span>
              <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info">
                <option value="">— select —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.member_code ? ` (${m.member_code})` : ""}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Asset (available)</span>
              <select required value={bookId} onChange={(e) => setBookId(e.target.value)} className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info">
                <option value="">— select —</option>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.available_copies} avail</option>)}
              </select>
            </label>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Due in {settings?.loan_period_days ?? 14} days
            </div>
            <button type="submit" className="mt-2 px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80">
              Confirm Loan
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnTxn} onOpenChange={(o) => !o && setReturnTxn(null)}>
        <DialogContent className="bg-surface border-edge">
          <DialogHeader><DialogTitle className="font-mono text-xs uppercase tracking-widest">Process Return</DialogTitle></DialogHeader>
          {returnTxn && (
            <div className="flex flex-col gap-4">
              <div className="text-sm">{returnTxn.books?.title}</div>
              <div className="text-xs text-muted-foreground">Patron: {returnTxn.members?.name}</div>
              <div className="border border-edge p-4 bg-background flex justify-between items-center">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Calculated Fine</div>
                <div className={`font-mono text-2xl font-bold tabular-nums ${previewFine > 0 ? "text-warning" : "text-success"}`}>
                  {fmtMoney(previewFine)}
                </div>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Due {returnTxn.due_date} • Today {format(new Date(), "yyyy-MM-dd")}
              </div>
              <button onClick={doReturn} className="px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80">
                Confirm Return
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    borrowed: "border-info/30 text-info bg-info/10",
    returned: "border-success/30 text-success bg-success/10",
    overdue: "border-destructive/30 text-destructive bg-destructive/10",
  };
  return <span className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase ${map[status] ?? ""}`}>{status}</span>;
};

export default Transactions;
