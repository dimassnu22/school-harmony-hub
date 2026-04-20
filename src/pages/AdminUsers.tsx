import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

interface UserRow { id: string; full_name: string; phone: string | null; created_at: string; roles: AppRole[] }

const ALL_ROLES: AppRole[] = ["admin", "guru", "staff", "orang_tua"];
const COLORS: Record<AppRole, string> = {
  admin: "bg-secondary text-secondary-foreground",
  guru: "bg-primary text-primary-foreground",
  staff: "bg-info text-info-foreground",
  orang_tua: "bg-muted text-muted-foreground",
};

export default function AdminUsers() {
  const { hasRole, loading } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    const [{ data: profiles }, { data: ur }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, AppRole[]>();
    (ur ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: byUser.get(p.id) ?? [] })));
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!hasRole("admin")) return <Navigate to="/" replace />;

  const toggle = async (uid: string, role: AppRole, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Peran diperbarui");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
          <p className="text-sm text-muted-foreground">Tetapkan peran untuk setiap pengguna</p>
        </div>
      </div>
      <Card><CardContent className="p-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Peran Saat Ini</TableHead>
              <TableHead>Atur Peran</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {busy ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Tidak ada pengguna</TableCell></TableRow>
                : rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "(tanpa nama)"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map((r) => (
                          <Badge key={r} className={COLORS[r]}>{r === "orang_tua" ? "orang tua" : r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_ROLES.map((r) => {
                          const has = u.roles.includes(r);
                          return (
                            <Button key={r} size="sm" variant={has ? "default" : "outline"} onClick={() => toggle(u.id, r, has)}>
                              {has ? "✓ " : "+ "}{r === "orang_tua" ? "orang tua" : r}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">
        Catatan: pengguna baru otomatis mendapat peran <em>orang tua</em>. Tambahkan peran admin/guru/staff sesuai kebutuhan.
      </p>
    </div>
  );
}
