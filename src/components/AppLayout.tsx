import { ReactNode, useState } from "react";
import { Link, NavLink, useLocation, Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School, CalendarDays,
  ClipboardCheck, UserCheck, BarChart3, LogOut, Menu, X, ShieldCheck
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles?: AppRole[]; // if undefined, all
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Siswa", icon: GraduationCap, roles: ["admin", "staff", "guru"] },
  { to: "/teachers", label: "Guru", icon: Users, roles: ["admin", "staff"] },
  { to: "/classes", label: "Kelas", icon: School, roles: ["admin", "staff", "guru"] },
  { to: "/subjects", label: "Mata Pelajaran", icon: BookOpen, roles: ["admin", "staff"] },
  { to: "/schedules", label: "Jadwal", icon: CalendarDays },
  { to: "/attendance/students", label: "Absen Siswa", icon: ClipboardCheck, roles: ["admin", "staff", "guru", "orang_tua"] },
  { to: "/attendance/teachers", label: "Absen Guru", icon: UserCheck, roles: ["admin", "staff", "guru"] },
  { to: "/calendar", label: "Kalender Pendidikan", icon: CalendarDays },
  { to: "/reports", label: "Laporan", icon: BarChart3, roles: ["admin", "staff"] },
  { to: "/admin/users", label: "Manajemen Pengguna", icon: ShieldCheck, roles: ["admin"] },
];

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: loc }} />;
  return <>{children}</>;
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));

  const roleLabel = roles[0]
    ? { admin: "Admin", guru: "Guru", staff: "Staff", orang_tua: "Orang Tua" }[roles[0]]
    : "—";

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">Sistem Sekolah</p>
            <p className="text-xs text-muted-foreground truncate">Manajemen Kegiatan</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem-5rem)]">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-semibold shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-base lg:text-lg truncate">Dashboard Sekolah</h1>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
