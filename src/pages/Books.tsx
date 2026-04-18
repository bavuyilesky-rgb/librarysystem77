import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
}

const empty: Partial<Book> = {
  title: "", author: "", isbn: "", category: "", total_copies: 1, available_copies: 1, shelf_location: "",
};

const Books = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "low" | "out">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Book>>(empty);

  const load = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("books").on("postgres_changes", { event: "*", schema: "public", table: "books" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = books.filter((b) => {
    const m = `${b.title} ${b.author} ${b.isbn ?? ""} ${b.category ?? ""}`.toLowerCase().includes(q.toLowerCase());
    if (!m) return false;
    if (filter === "available") return b.available_copies > 0;
    if (filter === "low") return b.available_copies > 0 && b.available_copies <= 1;
    if (filter === "out") return b.available_copies === 0;
    return true;
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: editing.title!,
      author: editing.author!,
      isbn: editing.isbn || null,
      category: editing.category || null,
      total_copies: Number(editing.total_copies) || 1,
      available_copies: Number(editing.available_copies ?? editing.total_copies) || 0,
      shelf_location: editing.shelf_location || null,
    };
    const { error } = editing.id
      ? await supabase.from("books").update(payload).eq("id", editing.id)
      : await supabase.from("books").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editing.id ? "Asset updated" : "Asset added");
      setOpen(false);
      setEditing(empty);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Deleted");
  };

  return (
    <>
      <PageHeader
        crumb="Terminal"
        title="Asset Registry"
        actions={
          <button
            onClick={() => { setEditing({ ...empty }); setOpen(true); }}
            className="px-4 py-1.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80 flex items-center gap-1.5"
          >
            <Plus className="size-3" /> New Asset
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <input
            placeholder="SEARCH TITLE / AUTHOR / ISBN…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-surface border border-edge px-3 py-2 text-xs font-mono focus:outline-none focus:border-info placeholder:text-muted-foreground/60"
          />
          <div className="flex border border-edge">
            {(["all", "available", "low", "out"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest border-l border-edge first:border-l-0 ${
                  filter === f ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-edge bg-surface">
          <div className="grid grid-cols-12 gap-4 p-3 border-b border-edge font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Author</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Shelf</div>
            <div className="col-span-2 text-right">Available</div>
            <div className="col-span-1" />
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center font-mono text-xs text-muted-foreground">No assets match.</div>
          )}
          {filtered.map((b) => {
            const tone =
              b.available_copies === 0 ? "text-destructive" :
              b.available_copies <= 1 ? "text-warning" : "text-success";
            return (
              <div key={b.id} className="grid grid-cols-12 gap-4 p-3 border-b border-edge/50 items-center hover:bg-surface-raised group">
                <div className="col-span-4 min-w-0">
                  <div className="text-sm truncate">{b.title}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">ISBN {b.isbn || "—"}</div>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground truncate">{b.author}</div>
                <div className="col-span-2 text-sm text-muted-foreground truncate">{b.category || "—"}</div>
                <div className="col-span-1 font-mono text-xs text-muted-foreground">{b.shelf_location || "—"}</div>
                <div className={`col-span-2 text-right font-mono text-sm tabular-nums font-bold ${tone}`}>
                  {b.available_copies} / {b.total_copies}
                </div>
                <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(b); setOpen(true); }} className="p-1.5 hover:bg-edge"><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove(b.id)} className="p-1.5 hover:bg-edge text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-edge max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs uppercase tracking-widest">
              {editing.id ? "Edit Asset" : "New Asset"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col gap-3">
            <Field label="Title" value={editing.title || ""} onChange={(v) => setEditing({ ...editing, title: v })} required />
            <Field label="Author" value={editing.author || ""} onChange={(v) => setEditing({ ...editing, author: v })} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ISBN" value={editing.isbn || ""} onChange={(v) => setEditing({ ...editing, isbn: v })} />
              <Field label="Category" value={editing.category || ""} onChange={(v) => setEditing({ ...editing, category: v })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Total" type="number" value={String(editing.total_copies ?? 1)} onChange={(v) => setEditing({ ...editing, total_copies: Number(v) })} />
              <Field label="Available" type="number" value={String(editing.available_copies ?? editing.total_copies ?? 1)} onChange={(v) => setEditing({ ...editing, available_copies: Number(v) })} />
              <Field label="Shelf" value={editing.shelf_location || ""} onChange={(v) => setEditing({ ...editing, shelf_location: v })} />
            </div>
            <button type="submit" className="mt-2 px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80">
              {editing.id ? "Save" : "Create"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Field = ({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) => (
  <label className="flex flex-col gap-1">
    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info"
    />
  </label>
);

export default Books;
