import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email("Email tidak valid").max(255);
const passwordSchema = z.string().min(6, "Password minimal 6 karakter").max(72);
const nameSchema = z.string().trim().min(2, "Nama minimal 2 karakter").max(100);

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [signEmail, setSignEmail] = useState("");
  const [signPass, setSignPass] = useState("");
  const [signName, setSignName] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPass);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Input tidak valid");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
      return;
    }
    toast.success("Berhasil masuk");
    navigate("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signName);
      emailSchema.parse(signEmail);
      passwordSchema.parse(signPass);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Input tidak valid");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signEmail,
      password: signPass,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: signName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("already") ? "Email sudah terdaftar" : error.message);
      return;
    }
    toast.success("Akun dibuat. Hubungi admin untuk penetapan peran.");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sistem Sekolah</h1>
          <p className="text-muted-foreground text-sm">Kelola absensi, jadwal & kalender pendidikan</p>
        </div>
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Masuk ke akun Anda</CardTitle>
            <CardDescription>Admin, guru, staff & orang tua</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="le">Email</Label>
                    <Input id="le" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="email@sekolah.id" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lp">Password</Label>
                    <Input id="lp" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Masuk
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sn">Nama Lengkap</Label>
                    <Input id="sn" value={signName} onChange={(e) => setSignName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="se">Email</Label>
                    <Input id="se" type="email" value={signEmail} onChange={(e) => setSignEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sp">Password</Label>
                    <Input id="sp" type="password" value={signPass} onChange={(e) => setSignPass(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Daftar
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Akun baru otomatis sebagai Orang Tua. Admin akan menyesuaikan peran.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
            <p className="text-xs text-center text-muted-foreground mt-4">
              <Link to="/" className="hover:underline">Kembali ke beranda</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
