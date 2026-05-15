"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, Suspense } from "react";
import { ArrowLeft, Building2, Loader2, Sprout, Wheat } from "lucide-react";
import { signUp, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ROLES: Array<{
  role: Role;
  title: string;
  description: string;
  icon: typeof Wheat;
}> = [
  {
    role: "petani",
    title: "Petani",
    description: "Catat lahan, prediksi panen, asisten AI.",
    icon: Wheat,
  },
  {
    role: "pemerintah",
    title: "Pemerintah",
    description: "Peta produksi, alert defisit, analitik wilayah.",
    icon: Building2,
  },
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("petani");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "petani" || r === "pemerintah") setRole(r);
  }, [searchParams]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      router.push(`/${role}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh">
      <div className="absolute inset-0 bg-grid-dot opacity-40" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Panen Cerdas
            </span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="rounded-3xl border border-border bg-surface p-7 shadow-card md:p-9">
            <div className="text-center">
              <div className="eyebrow mx-auto">Daftar</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance">
                Buat akun Panen Cerdas
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pilih peran Anda lalu isi data singkat.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                {ROLES.map(({ role: r, title, description, icon: Icon }) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      disabled={loading}
                      className={cn(
                        "flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all",
                        active
                          ? "border-primary bg-primary-soft shadow-sm"
                          : "border-border bg-surface hover:border-primary/30",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{title}</div>
                        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anda@email.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Buat akun"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
