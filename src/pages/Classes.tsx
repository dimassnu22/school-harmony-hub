import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

interface Klass { id: string; name: string; grade_level: string | null; homeroom_teacher_id: string | null; teachers?: { full_name: string } | null }
interface T { id: string; full_name: string }

const schema = z.object({
  name: z.string().trim().min(1).max(50),
  grade_level: z.string().trim().max(20).optional().or(z.literal("")),
  homeroom_teacher_id: z.string().optional().or(z.literal("")),
});

export default function Classes() {
  const { isAdminOrStaff } = useAuth();
  const [items, setItems] = useState<Klass[]>([]);
  const [teachers, setTeachers] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Klass | null>(null);
  const [form, setForm] = useState({ name: "", grade_level: "", homeroom_teacher_id: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("classes").select("*, teachers:homeroom_teacher_id(full_name)").order("name");
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    supabase.from("teachers").select("id,full_name").order("full_name").then(({ data }) => setTeachers(data ?? []));
  }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", grade_level: "", homeroom_teacher_id: "" }); setOpen(true); };
  const openEdit = (k: Klass) => {
    setEditing(k);
    setForm({ name: k.name, grade_level: k.grade_level ?? "", homeroom_teacher_id: k.homeroom_teacher_id ?? "" });
    setOpen(true);
  };
  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    const payload: any = {
      name: form.name.trim(),
      grade_level: form.grade_level.trim() || null,
      homeroom_teacher_id: form.homeroom_teacher_id || null,
    };
    const { error } = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); setOpen(false); load();
  };
  const remove = async (k: Klass) => {
    if (!confirm(`Hapus kelas "${k.name}"?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", k.id);
    if (error) return toast.error(error.message);
    toast.success("Kelas dihapus"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold">Kelas</h2>
          <p className="text-sm text-muted-foreground">Kelola daftar kelas (rombel)</p>
        </div>
        {isAdminOrStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4" /> Tambah Kelas</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Nama Kelas *</Label><Input placeholder="X-IPA-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Tingkat</Label><Input placeholder="X / XI / XII" value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Wali Kelas</Label>
                  <Select value={form.homeroom_teacher_id} onValueChange={(v) => setForm({ ...form, homeroom_teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih wali kelas" /></SelectTrigger>
                    <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
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
              <TableHead>Nama</TableHead><TableHead>Tingkat</TableHead><TableHead>Wali Kelas</TableHead>
              {isAdminOrStaff && <TableHead className="text-right w-24">Aksi</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                : items.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada kelas</TableCell></TableRow>
                : items.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>{k.grade_level ?? "—"}</TableCell>
                    <TableCell>{k.teachers?.full_name ?? "—"}</TableCell>
                    {isAdminOrStaff && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
