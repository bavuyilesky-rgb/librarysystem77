import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldPlus } from "lucide-react";

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>({ name: "", email: "", phone: "", member_code: "" });
  const [libOpen, setLibOpen] = useState(false);
  const [libForm, setLibForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [libBusy, setLibBusy] = useState(false);

  const createLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (libForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLibBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-librarian", {
        body: libForm,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Librarian ${libForm.email} created. Share the password securely.`);
      setLibOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create librarian");
    } finally {
      setLibBusy(false);
    }
  };

  const load = async () => {
    const { data } = await supabase.from("members").select("*").order("created_at", { ascending: false });
    setMembers(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: editing.name,
      email: editing.email || null,
      phone: editing.phone || null,
      member_code: editing.member_code || null,
    };
    const { error } = editing.id
      ? await supabase.from("members").update(payload).eq("id", editing.id)
      : await supabase.from("members").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete patron? Existing transactions will block deletion.")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <>
      <PageHeader
        crumb="Terminal"
        title="Node Patrons"
        actions={
          <>
            <button onClick={() => { setLibForm({ name: "", email: "", phone: "", password: "" }); setLibOpen(true); }} className="px-4 py-1.5 border border-edge hover:bg-surface-raised hover:border-edge-lit text-xs font-mono font-medium uppercase tracking-wide flex items-center gap-1.5 transition-all hover-lift">
              <ShieldPlus className="size-3" /> Add Librarian
            </button>
            <button onClick={() => { setEditing({ name: "", email: "", phone: "", member_code: "" }); setOpen(true); }} className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wide hover:opacity-90 flex items-center gap-1.5 transition-all hover-lift">
              <Plus className="size-3" /> New Patron
            </button>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="border border-edge bg-surface">
          <div className="grid grid-cols-12 gap-4 p-3 border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Code</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-3">Phone</div>
            <div className="col-span-1" />
          </div>
          {members.length === 0 && <div className="p-8 text-center font-mono text-xs text-muted-foreground">No patrons yet.</div>}
          {members.map((m) => (
            <div key={m.id} className="grid grid-cols-12 gap-4 p-3 border-b border-edge/50 items-center hover:bg-surface-raised group">
              <div className="col-span-3 text-sm truncate">{m.name}</div>
              <div className="col-span-2 font-mono text-xs text-muted-foreground truncate">{m.member_code || "—"}</div>
              <div className="col-span-3 text-sm text-muted-foreground truncate">{m.email || "—"}</div>
              <div className="col-span-3 text-sm text-muted-foreground truncate">{m.phone || "—"}</div>
              <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => { setEditing(m); setOpen(true); }} className="p-1.5 hover:bg-edge"><Pencil className="size-3.5" /></button>
                <button onClick={() => remove(m.id)} className="p-1.5 hover:bg-edge text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-edge">
          <DialogHeader><DialogTitle className="font-mono text-xs uppercase tracking-widest">{editing.id ? "Edit Patron" : "New Patron"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="flex flex-col gap-3">
            {(["name", "member_code", "email", "phone"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{k.replace("_", " ")}</span>
                <input
                  required={k === "name"}
                  value={editing[k] || ""}
                  onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                  className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info"
                />
              </label>
            ))}
            <button type="submit" className="mt-2 px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80">
              {editing.id ? "Save" : "Create"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Members;
