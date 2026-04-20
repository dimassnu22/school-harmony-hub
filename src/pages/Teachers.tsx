import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { z } from "zod";

interface Teacher { id: string; nip: string | null; full_name: string; email: string | null; phone: string | null }

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  nip: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export default function Teachers() {
  const { isAdminOrStaff } = useAuth();
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ full_name: "", nip: "", email: "", phone: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("teachers").select("*").order("full_name");
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ full_name: "", nip: "", email: "", phone: "" }); setOpen(true); };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({ full_name: t.full_name, nip: t.nip ?? "", email: t.email ?? "", phone: t.phone ?? "" });
    setOpen(true);
  };
  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    const payload: any = {
      full_name: form.full_name.trim(),
      nip: form.nip.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("teachers").update(payload).eq("id", editing.id)
      : await supabase.from("teachers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Guru diperbarui" : "Guru ditambahkan");
    setOpen(false); load();
  };
  const remove = async (t: Teacher) => {
    if (!confirm(`Hapus guru "${t.full_name}"?`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Guru dihapus"); load();
  };

  const filtered = items.filter((t) =>
    [t.full_name, t.nip ?? "", t.email ?? ""].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Guru</h2>
          <p className="text-sm text-muted-foreground">Kelola data guru</p>
        </div>
        {isAdminOrStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Tambah Guru</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Guru" : "Tambah Guru"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Nama Lengkap *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>NIP</Label><Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>No. HP</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={submit}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama, NIP, email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nama</TableHead><TableHead>NIP</TableHead><TableHead>Email</TableHead><TableHead>No. HP</TableHead>
                {isAdminOrStaff && <TableHead className="text-right w-24">Aksi</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
                  : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                  : filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.full_name}</TableCell>
                      <TableCell>{t.nip ?? "—"}</TableCell>
                      <TableCell>{t.email ?? "—"}</TableCell>
                      <TableCell>{t.phone ?? "—"}</TableCell>
                      {isAdminOrStaff && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
