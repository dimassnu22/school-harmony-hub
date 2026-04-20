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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { z } from "zod";

interface Student {
  id: string;
  nis: string | null;
  full_name: string;
  birth_date: string | null;
  gender: "L" | "P" | null;
  class_id: string | null;
  classes?: { name: string } | null;
}
interface ClassRow { id: string; name: string }

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  nis: z.string().trim().max(30).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(["L", "P"]).optional().or(z.literal("" as any)),
  class_id: z.string().optional().or(z.literal("")),
});

export default function Students() {
  const { isAdminOrStaff } = useAuth();
  const [items, setItems] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ full_name: "", nis: "", birth_date: "", gender: "" as "L" | "P" | "", class_id: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*, classes(name)")
      .order("full_name");
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data ?? []));
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ full_name: "", nis: "", birth_date: "", gender: "", class_id: "" });
    setOpen(true);
  };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      full_name: s.full_name,
      nis: s.nis ?? "",
      birth_date: s.birth_date ?? "",
      gender: (s.gender ?? "") as any,
      class_id: s.class_id ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const payload: any = {
      full_name: form.full_name.trim(),
      nis: form.nis.trim() || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      class_id: form.class_id || null,
    };
    const { error } = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Siswa diperbarui" : "Siswa ditambahkan");
    setOpen(false);
    load();
  };

  const remove = async (s: Student) => {
    if (!confirm(`Hapus siswa "${s.full_name}"?`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Siswa dihapus");
    load();
  };

  const filtered = items.filter((s) =>
    [s.full_name, s.nis ?? "", s.classes?.name ?? ""].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Siswa</h2>
          <p className="text-sm text-muted-foreground">Kelola data siswa</p>
        </div>
        {isAdminOrStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4" /> Tambah Siswa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nama Lengkap *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>NIS</Label>
                    <Input value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Lahir</Label>
                    <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Jenis Kelamin</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kelas</Label>
                    <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama, NIS, kelas…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>JK</TableHead>
                  {isAdminOrStaff && <TableHead className="w-24 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
                ) : filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.nis ?? "—"}</TableCell>
                    <TableCell>{s.classes?.name ?? "—"}</TableCell>
                    <TableCell>{s.gender ?? "—"}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
