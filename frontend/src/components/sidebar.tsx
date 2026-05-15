"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Sprout, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { clearRole, type Role } from "@/lib/auth";

type AppNavItem = { href: string; label: string };

const PETANI_ITEMS: AppNavItem[] = [
  { href: "/petani/dashboard", label: "Dashboard" },
  { href: "/petani/prediksi", label: "Prediksi" },
  { href: "/petani/riwayat", label: "Riwayat" },
  { href: "/petani/lahan", label: "Lahan" },
  { href: "/petani/cuaca", label: "Cuaca" },
];

const PEMERINTAH_ITEMS: AppNavItem[] = [
  { href: "/pemerintah/dashboard", label: "Dashboard" },
  { href: "/pemerintah/produksi", label: "Produksi" },
  { href: "/pemerintah/analisis", label: "Analisis" },
  { href: "/pemerintah/alert", label: "Alert" },
];

function Wordmark({ href, role }: { href: string; role: Role }) {
  return (
    <Link href={href} className="group flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
        <Sprout className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Panen Cerdas
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {role === "petani" ? "Petani" : "Pemerintah"}
        </span>
      </span>
    </Link>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = role === "petani" ? PETANI_ITEMS : PEMERINTAH_ITEMS;

  async function logout() {
    await clearRole();
    router.push("/");
  }

  const navLinks = (onClick?: () => void) =>
    items.map((item) => {
      const active = pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={cn(
            "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-background/50 backdrop-blur-xl md:flex">
        <div className="p-6">
          <Wordmark href={`/${role}/dashboard`} role={role} />
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-4">{navLinks()}</nav>

        <div className="border-t border-border p-4">
          <Button onClick={logout} variant="outline" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Wordmark href={`/${role}/dashboard`} role={role} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
            <nav className="mt-6 flex flex-col gap-1.5">
              {navLinks(() => setMobileOpen(false))}
            </nav>
            <div className="mt-6 border-t border-border pt-6">
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
