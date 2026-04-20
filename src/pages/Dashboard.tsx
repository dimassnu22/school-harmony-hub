import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Users, School, BookOpen, ClipboardCheck, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
}

export default function Dashboard() {
  const { user, roles, isAdminOrStaff, hasRole } = useAuth();
  const [stats, setStats] = useState<Stats>({ students: 0, teachers: 0, classes: 0, subjects: 0 });
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? ""));

    Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
    ]).then(([s, t, c, sub]) => {
      setStats({
        students: s.count ?? 0,
        teachers: t.count ?? 0,
        classes: c.count ?? 0,
        subjects: sub.count ?? 0,
      });
    });
  }, [user]);

  const cards = [
    { label: "Siswa", value: stats.students, icon: GraduationCap, color: "from-blue-500 to-cyan-500", to: "/students" },
    { label: "Guru", value: stats.teachers, icon: Users, color: "from-purple-500 to-pink-500", to: "/teachers" },
    { label: "Kelas", value: stats.classes, icon: School, color: "from-emerald-500 to-teal-500", to: "/classes" },
    { label: "Mata Pelajaran", value: stats.subjects, icon: BookOpen, color: "from-amber-500 to-orange-500", to: "/subjects" },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 lg:p-8 text-primary-foreground"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
      >
        <p className="text-sm opacity-90">Selamat datang kembali,</p>
        <h2 className="text-2xl lg:text-3xl font-bold mt-1">{fullName || user?.email}</h2>
        <p className="mt-2 opacity-90 text-sm">
          Peran Anda: <span className="font-medium capitalize">{roles.join(", ").replace("orang_tua", "orang tua") || "—"}</span>
        </p>
      </div>

      {(isAdminOrStaff || hasRole("guru")) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.to}>
              <Card className="hover:shadow-md transition-shadow border-0" style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="p-4 lg:p-5">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                    <c.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Absensi
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Modul absensi siswa & guru akan tersedia di tahap berikutnya.</p>
            <Link to="/attendance/students" className="text-primary hover:underline">Buka modul absen →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-secondary" /> Kalender Pendidikan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Lihat agenda sekolah & hari penting.</p>
            <Link to="/calendar" className="text-primary hover:underline">Buka kalender →</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
