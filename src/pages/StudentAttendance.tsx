import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardCheck, Save, Loader2 } from "lucide-react";

type Klass = { id: string; name: string };
type Subject = { id: string; name: string };
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
type Student = { id: string; full_name: string; nis: string | null };
type Status = "hadir" | "izin" | "sakit" | "alpha";
type RecordRow = {
  student_id: string;
  status: Status;
  note: string;
};

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const STATUS: { v: Status; label: string; cls: string }[] = [
  { v: "hadir", label: "Hadir", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
  { v: "izin", label: "Izin", cls: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
  { v: "sakit", label: "Sakit", cls: "bg-sky-500/10 text-sky-700 border-sky-300 dark:text-sky-400" },
  { v: "alpha", label: "Alpha", cls: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-400" },
];

const fmt = (t: string) => t?.slice(0, 5) ?? "";

export default function StudentAttendance() {
  const { user, roles } = useAuth();
  const canManage = roles.some((r) => ["admin", "staff", "guru"].includes(r));

  const [classes, setClasses] = useState<Klass[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState<string>("");

  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [records, setRecords] = useState<Record<string, RecordRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const dow = useMemo(() => new Date(date + "T00:00:00").getDay(), [date]);

  // Load classes
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      setClasses(data ?? []);
      if (data?.length && !classId) setClassId(data[0].id);
    })();
  }, []);

  // Load schedules for class+day
  useEffect(() => {
    if (!classId) return;
    (async () => {
      const { data } = await supabase
        .from("schedules")
        .select("*, subject:subjects(id,name), teacher:teachers(id,full_name)")
        .eq("class_id", classId)
        .eq("day_of_week", dow)
        .order("start_time");
      setSchedules((data as any) ?? []);
      setScheduleId("");
      setSessionId(null);
      setRecords({});
    })();
  }, [classId, dow]);

  // Load session + records when schedule selected
  useEffect(() => {
    if (!scheduleId || !classId) return;
    (async () => {
      setLoading(true);
      const [studRes, sessRes] = await Promise.all([
        supabase.from("students").select("id, full_name, nis").eq("class_id", classId).order("full_name"),
        supabase
          .from("attendance_sessions")
          .select("*")
          .eq("schedule_id", scheduleId)
          .eq("date", date)
          .maybeSingle(),
      ]);

      const studentList = (studRes.data ?? []) as Student[];
      setStudents(studentList);

      let recMap: Record<string, RecordRow> = {};
      let sid: string | null = null;
      let notes = "";

      if (sessRes.data) {
        sid = sessRes.data.id;
        notes = sessRes.data.notes ?? "";
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("student_id, status, note")
          .eq("session_id", sid);
        (recs ?? []).forEach((r: any) => {
          recMap[r.student_id] = { student_id: r.student_id, status: r.status, note: r.note ?? "" };
        });
      }

      // Initialize default 'hadir' for missing
      studentList.forEach((s) => {
        if (!recMap[s.id]) recMap[s.id] = { student_id: s.id, status: "hadir", note: "" };
      });

      setSessionId(sid);
      setSessionNotes(notes);
      setRecords(recMap);
      setLoading(false);
    })();
  }, [scheduleId, date, classId]);

  const updateRec = (id: string, patch: Partial<RecordRow>) =>
    setRecords((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const counts = useMemo(() => {
    const c = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
    Object.values(records).forEach((r) => (c[r.status] += 1));
    return c;
  }, [records]);

  const save = async () => {
    if (!scheduleId) return;
    setSaving(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const { data, error } = await supabase
          .from("attendance_sessions")
          .insert({ schedule_id: scheduleId, date, notes: sessionNotes, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        sid = data.id;
        setSessionId(sid);
      } else {
        const { error } = await supabase
          .from("attendance_sessions")
          .update({ notes: sessionNotes })
          .eq("id", sid);
        if (error) throw error;
      }

      const rows = Object.values(records).map((r) => ({
        session_id: sid!,
        student_id: r.student_id,
        status: r.status,
        note: r.note || null,
      }));
      const { error: upErr } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,student_id" });
      if (upErr) throw upErr;

      toast.success("Absensi tersimpan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 text-center text-muted-foreground">
          Halaman ini khusus untuk Guru / Staff / Admin.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Absensi Siswa</h1>
          <p className="text-sm text-muted-foreground">Catat kehadiran siswa per jam pelajaran</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Kelas</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">{DAY_LABELS[dow]}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Jam Pelajaran</Label>
            <Select value={scheduleId} onValueChange={setScheduleId} disabled={!schedules.length}>
              <SelectTrigger>
                <SelectValue placeholder={schedules.length ? "Pilih jadwal" : "Tidak ada jadwal"} />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {fmt(s.start_time)}–{fmt(s.end_time)} · {s.subject?.name} · {s.teacher?.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {scheduleId && (
        <Card className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat…
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Belum ada siswa di kelas ini.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {STATUS.map((s) => (
                  <Badge key={s.v} variant="outline" className={s.cls}>
                    {s.label}: {counts[s.v]}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">
                  Total: {students.length} siswa
                </span>
              </div>

              <div className="space-y-2">
                {students.map((st, idx) => {
                  const r = records[st.id];
                  return (
                    <div
                      key={st.id}
                      className="rounded-lg border bg-card p-3 flex flex-col md:flex-row md:items-center gap-3"
                    >
                      <div className="flex items-center gap-3 md:w-64 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-muted text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{st.full_name}</p>
                          {st.nis && <p className="text-xs text-muted-foreground">NIS: {st.nis}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {STATUS.map((s) => (
                          <button
                            key={s.v}
                            type="button"
                            onClick={() => updateRec(st.id, { status: s.v })}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                              r?.status === s.v
                                ? s.cls
                                : "bg-background text-muted-foreground hover:bg-muted border-border"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      <Input
                        placeholder="Catatan…"
                        value={r?.note ?? ""}
                        onChange={(e) => updateRec(st.id, { note: e.target.value })}
                        className="md:flex-1"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                <Label>Catatan Sesi (opsional)</Label>
                <Textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Catatan umum untuk sesi ini…"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {sessionId ? "Perbarui Absensi" : "Simpan Absensi"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
