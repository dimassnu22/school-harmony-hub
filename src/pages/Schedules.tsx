import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Klass = { id: string; name: string };
type Subject = { id: string; name: string; code: string };
type Teacher = { id: string; full_name: string };
type Schedule = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  subject?: Subject;
  teacher?: Teacher;
};

const DAYS = [
  { v: 1, label: "Senin" },
  { v: 2, label: "Selasa" },
  { v: 3, label: "Rabu" },
  { v: 4, label: "Kamis" },
  { v: 5, label: "Jumat" },
  { v: 6, label: "Sabtu" },
];

const HOURS = Array.from({ length: 11 }, (_, i) => 7 + i); // 07:00 .. 17:00

const fmt = (t: string) => t?.slice(0, 5) ?? "";

export default function Schedules() {
  const { isAdminOrStaff } = useAuth();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: "07:00",
    end_time: "08:30",
    subject_id: "",
    teacher_id: "",
    room: "",
  });
  const [delTarget, setDelTarget] = useState<Schedule | null>(null);

  const loadMaster = async () => {
    const [c, s, t] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("subjects").select("id, name, code").order("name"),
      supabase.from("teachers").select("id, full_name").order("full_name"),
    ]);
    setClasses(c.data ?? []);
    setSubjects(s.data ?? []);
    setTeachers(t.data ?? []);
    if (!classId && c.data?.length) setClassId(c.data[0].id);
  };

  const loadSchedules = async () => {
    if (!classId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("schedules")
      .select("*, subject:subjects(id, name, code), teacher:teachers(id, full_name)")
      .eq("class_id", classId)
      .order("day_of_week")
      .order("start_time");
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadMaster();
  }, []);
  useEffect(() => {
    loadSchedules();
  }, [classId]);

  const byDay = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    DAYS.forEach((d) => map.set(d.v, []));
    items.forEach((it) => map.get(it.day_of_week)?.push(it));
    return map;
  }, [items]);

  const openAdd = (day?: number) => {
    setEditing(null);
    setForm({
      day_of_week: day ?? 1,
      start_time: "07:00",
      end_time: "08:30",
      subject_id: subjects[0]?.id ?? "",
      teacher_id: teachers[0]?.id ?? "",
      room: "",
    });
    setOpen(true);
  };

  const openEdit = (it: Schedule) => {
    setEditing(it);
    setForm({
      day_of_week: it.day_of_week,
      start_time: fmt(it.start_time),
      end_time: fmt(it.end_time),
      subject_id: it.subject_id,
      teacher_id: it.teacher_id,
      room: it.room ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) return toast.error("Pilih kelas dulu");
    if (!form.subject_id || !form.teacher_id) return toast.error("Mapel & guru wajib");
    const payload = {
      class_id: classId,
      subject_id: form.subject_id,
      teacher_id: form.teacher_id,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      room: form.room || null,
    };
    const { error } = editing
      ? await supabase.from("schedules").update(payload).eq("id", editing.id)
      : await supabase.from("schedules").insert(payload);
    if (error) {
      // map common DB errors to friendlier message
      const m = error.message || "";
      if (m.includes("Bentrok") || m.includes("Jam selesai")) toast.error(m);
      else toast.error(m);
      return;
    }
    toast.success(editing ? "Jadwal diperbarui" : "Jadwal ditambahkan");
    setOpen(false);
    loadSchedules();
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    const { error } = await supabase.from("schedules").delete().eq("id", delTarget.id);
    if (error) toast.error(error.message);
    else toast.success("Jadwal dihapus");
    setDelTarget(null);
    loadSchedules();
  };

  const currentClass = classes.find((c) => c.id === classId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Jadwal Pelajaran</h2>
          <p className="text-muted-foreground text-sm">Grid mingguan per kelas</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="min-w-[180px]">
            <Label className="text-xs">Kelas</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdminOrStaff && (
            <Button onClick={() => openAdd()} disabled={!classId || !subjects.length || !teachers.length}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          )}
        </div>
      </div>

      {!classes.length ? (
        <Card className="p-10 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Belum ada kelas. Tambahkan kelas dulu di menu Kelas.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Desktop grid */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: "80px repeat(6, minmax(0, 1fr))" }}>
            <div className="bg-muted/50 border-b border-r p-2 text-xs font-medium text-muted-foreground">Jam</div>
            {DAYS.map((d) => (
              <div key={d.v} className="bg-muted/50 border-b p-2 text-xs font-medium text-center">{d.label}</div>
            ))}
            {HOURS.map((h, idx) => (
              <div key={h} className="contents">
                <div className={`border-r p-2 text-xs text-muted-foreground text-right ${idx < HOURS.length - 1 ? "border-b" : ""}`}>
                  {String(h).padStart(2, "0")}:00
                </div>
                {DAYS.map((d) => {
                  const cellStart = h * 60;
                  const cellEnd = (h + 1) * 60;
                  const dayItems = byDay.get(d.v) ?? [];
                  const inCell = dayItems.filter((it) => {
                    const [sh, sm] = fmt(it.start_time).split(":").map(Number);
                    const startMin = sh * 60 + sm;
                    return startMin >= cellStart && startMin < cellEnd;
                  });
                  return (
                    <div key={d.v} className={`border-r last:border-r-0 p-1 min-h-[64px] ${idx < HOURS.length - 1 ? "border-b" : ""}`}>
                      {inCell.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => isAdminOrStaff && openEdit(it)}
                          className="w-full text-left bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md p-1.5 mb-1 transition-colors"
                          title={`${fmt(it.start_time)}–${fmt(it.end_time)} • ${it.teacher?.full_name ?? ""}${it.room ? " • " + it.room : ""}`}
                        >
                          <div className="text-[11px] font-semibold text-primary truncate">{it.subject?.name ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {fmt(it.start_time)}–{fmt(it.end_time)}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{it.teacher?.full_name}</div>
                          {it.room && <div className="text-[10px] text-muted-foreground truncate">📍 {it.room}</div>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile list per day */}
          <div className="md:hidden divide-y">
            {DAYS.map((d) => {
              const dayItems = byDay.get(d.v) ?? [];
              return (
                <div key={d.v} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{d.label}</h3>
                    {isAdminOrStaff && (
                      <Button size="sm" variant="ghost" onClick={() => openAdd(d.v)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada jadwal</p>
                  ) : (
                    <div className="space-y-2">
                      {dayItems.map((it) => (
                        <div key={it.id} className="bg-primary/5 border border-primary/20 rounded-md p-2 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-primary">{it.subject?.name}</p>
                            <p className="text-xs text-muted-foreground">{fmt(it.start_time)}–{fmt(it.end_time)} • {it.teacher?.full_name}</p>
                            {it.room && <p className="text-xs text-muted-foreground">📍 {it.room}</p>}
                          </div>
                          {isAdminOrStaff && (
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDelTarget(it)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {currentClass && (
        <p className="text-xs text-muted-foreground">
          Menampilkan jadwal kelas <strong>{currentClass.name}</strong>. Validasi konflik guru &amp; kelas otomatis dijalankan saat menyimpan.
        </p>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hari</Label>
                <Select value={String(form.day_of_week)} onValueChange={(v) => setForm((f) => ({ ...f, day_of_week: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ruang</Label>
                <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="Misal: R.101" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jam Mulai</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div>
                <Label>Jam Selesai</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Mata Pelajaran</Label>
              <Select value={form.subject_id} onValueChange={(v) => setForm((f) => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guru</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm((f) => ({ ...f, teacher_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2">
              {editing && (
                <Button type="button" variant="ghost" className="text-destructive mr-auto" onClick={() => { setOpen(false); setDelTarget(editing); }}>
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading && <p className="text-xs text-muted-foreground text-center">Memuat…</p>}
    </div>
  );
}
