import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

const Settings = () => {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).maybeSingle().then(({ data }) => setS(data));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("settings").update({
      daily_fine_rate: Number(s.daily_fine_rate),
      grace_period_days: Number(s.grace_period_days),
      max_fine: Number(s.max_fine),
      loan_period_days: Number(s.loan_period_days),
      updated_at: new Date().toISOString(),
    }).eq("id", s.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  if (!s) return null;

  return (
    <>
      <PageHeader crumb="Terminal" title="System Config" />
      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={save} className="max-w-xl bg-surface border border-edge p-6 flex flex-col gap-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Fine & Loan Parameters</div>
          {([
            ["loan_period_days", "Loan Period (days)"],
            ["grace_period_days", "Grace Period (days)"],
            ["daily_fine_rate", "Daily Fine Rate ($)"],
            ["max_fine", "Maximum Fine ($)"],
          ] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{l}</span>
              <input
                type="number"
                step="0.01"
                value={s[k]}
                onChange={(e) => setS({ ...s, [k]: e.target.value })}
                className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info"
              />
            </label>
          ))}
          <button type="submit" disabled={busy} className="mt-2 px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80 disabled:opacity-50">
            {busy ? "Saving…" : "Save Configuration"}
          </button>
        </form>
      </div>
    </>
  );
};

export default Settings;
