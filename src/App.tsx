import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout, { RequireAuth } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Subjects from "./pages/Subjects";
import AdminUsers from "./pages/AdminUsers";
import Schedules from "./pages/Schedules";
import Placeholder from "./components/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <AppLayout>{children}</AppLayout>
  </RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/students" element={<Protected><Students /></Protected>} />
            <Route path="/teachers" element={<Protected><Teachers /></Protected>} />
            <Route path="/classes" element={<Protected><Classes /></Protected>} />
            <Route path="/subjects" element={<Protected><Subjects /></Protected>} />
            <Route path="/admin/users" element={<Protected><AdminUsers /></Protected>} />
            <Route path="/schedules" element={<Protected><Schedules /></Protected>} />
            <Route path="/attendance/students" element={<Protected><Placeholder title="Absen Siswa" /></Protected>} />
            <Route path="/attendance/teachers" element={<Protected><Placeholder title="Absen Guru" /></Protected>} />
            <Route path="/calendar" element={<Protected><Placeholder title="Kalender Pendidikan" /></Protected>} />
            <Route path="/reports" element={<Protected><Placeholder title="Laporan & Rekap" /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
