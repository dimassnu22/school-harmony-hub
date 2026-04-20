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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

interface Subject { id: string; code: string; name: string }

const schema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
});

export default function Subjects() {
  const { isAdminOrStaff } = useAuth();
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ code: "", name: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("subjects").select("*").order("name");
    if (error) toast.error(error.message);
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ code: "", name: "" }); setOpen(true); };
  const openEdit = (s: Subject) => { setEditing(s); setForm({ code: s.code, name: s.name }); setOpen(true); };
  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    const payload = { code: form.code.trim(), name: form.name.trim() };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); setOpen(false); load();
  };
  const remove = async (s: Subject) => {
    if (!confirm(`Hapus mapel "${s.name}"?`)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold">Mata Pelajaran</h2>
          <p className="text-sm text-muted-foreground">Kelola daftar mata pelajaran</p>
        </div>
        {isAdminOrStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Tambah Mapel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Mapel" : "Tambah Mapel"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Kode *</Label><Input placeholder="MTK" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Nama *</Label><Input placeholder="Matematika" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={submit}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card><CardContent className="p-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-32">Kode</TableHead><TableHead>Nama</TableHead>
              {isAdminOrStaff && <TableHead className="text-right w-24">Aksi</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                : items.length === 0 ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                : items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    {isAdminOrStaff && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
