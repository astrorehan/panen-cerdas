"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Sprout, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { clearRole, getRole, type Role } from "@/lib/auth";

type AppNavItem = { href: string; label: string };

const PETANI_ITEMS: AppNavItem[] = [
  { href: "/petani/dashboard", label: "Dashboard" },
  { href: "/petani/prediksi", label: "Prediksi" },
  { href: "/petani/lahan", label: "Lahan" },
  { href: "/petani/cuaca", label: "Cuaca" },
];

const PEMERINTAH_ITEMS: AppNavItem[] = [
  { href: "/pemerintah/dashboard", label: "Dashboard" },
  { href: "/pemerintah/produksi", label: "Produksi" },
  { href: "/pemerintah/analisis", label: "Analisis" },
  { href: "/pemerintah/alert", label: "Alert" },
  { href: "/tentang", label: "Tentang" },
];

const MARKETING_ITEMS = [
  { href: "#features", label: "Fitur" },
  { href: "/tentang", label: "Tentang" },
  { href: "/hubungi-kami", label: "Hubungi Kami" },
];

function Wordmark({ href, role }: { href: string; role: Role | null }) {
  return (
    <Link href={href} className="group flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
        <Sprout className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Panen Cerdas
        </span>
        <span className="mt-0.5 hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          {role === "petani"
            ? "Petani"
            : role === "pemerintah"
              ? "Pemerintah"
              : "AI Smart Farming"}
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRoleState] = useState<Role | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setRoleState(getRole());
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/login" || pathname === "/register") return null;

  const isMarketing = pathname === "/" || pathname === "/tentang";

  async function logout() {
    await clearRole();
    setRoleState(null);
    router.push("/");
  }

  const appItems =
    role === "petani"
      ? PETANI_ITEMS
      : role === "pemerintah"
        ? PEMERINTAH_ITEMS
        : [];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65"
          : "border-b border-transparent bg-background/0",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark
          href={role ? `/${role}/dashboard` : "/"}
          role={role}
        />

        {/* Desktop menu */}
        <nav className="hidden items-center gap-1 md:flex">
          {isMarketing
            ? MARKETING_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))
            : appItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
        </nav>

        {/* Right side actions (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {isMarketing ? (
            <>
              {role ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/${role}/dashboard`}>Buka Dashboard</Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Masuk</Link>
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/register">Daftar</Link>
              </Button>
            </>
          ) : (
            role && (
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            )
          )}
        </div>

        {/* Mobile trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
            <div className="mt-6 flex flex-col gap-1">
              {(isMarketing ? MARKETING_ITEMS : appItems).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
              {isMarketing ? (
                <>
                  {role ? (
                    <Button
                      asChild
                      onClick={() => setMobileOpen(false)}
                      className="w-full"
                    >
                      <Link href={`/${role}/dashboard`}>Buka Dashboard</Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      onClick={() => setMobileOpen(false)}
                      className="w-full"
                    >
                      <Link href="/login">Masuk</Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    onClick={() => setMobileOpen(false)}
                    className="w-full"
                  >
                    <Link href="/register">Daftar</Link>
                  </Button>
                </>
              ) : (
                role && (
                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </Button>
                )
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
