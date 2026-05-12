"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clearRole, getRole, type Role } from "@/lib/auth";

type NavItem = { href: string; label: string; numeral: string };

const PETANI_ITEMS: NavItem[] = [
  { href: "/petani/dashboard", label: "Dasbor", numeral: "I" },
  { href: "/petani/prediksi", label: "Prediksi", numeral: "II" },
  { href: "/petani/lahan", label: "Lahan", numeral: "III" },
  { href: "/petani/harga", label: "Harga", numeral: "IV" },
  { href: "/petani/cuaca", label: "Cuaca", numeral: "V" },
];

const PEMERINTAH_ITEMS: NavItem[] = [
  { href: "/pemerintah/dashboard", label: "Dashboard", numeral: "I" },
  { href: "/pemerintah/produksi", label: "Produksi", numeral: "II" },
  { href: "/pemerintah/analisis", label: "Analisis", numeral: "III" },
  { href: "/tentang", label: "Tentang", numeral: "IV" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRoleState] = useState<Role | null>(null);

  // Re-read role on every pathname change so login/logout transitions
  // refresh the nav without a full reload.
  useEffect(() => {
    setRoleState(getRole());
  }, [pathname]);

  // /login renders its own bare hero; suppress the nav strip there.
  if (pathname === "/login") return null;

  const items =
    role === "petani"
      ? PETANI_ITEMS
      : role === "pemerintah"
        ? PEMERINTAH_ITEMS
        : [];

  function logout() {
    clearRole();
    setRoleState(null);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/20 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="container flex h-20 items-end justify-between pb-4">
        {/* Wordmark */}
        <Link
          href={role ? `/${role}/dashboard` : "/login"}
          className="group block leading-none"
        >
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            № 01 — Buletin Prediksi
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className="font-display text-3xl italic leading-none text-ink"
              style={{
                fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 0',
              }}
            >
              PanenCerdas
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint sm:inline">
              {role === "petani"
                ? "· Petani · Prediksi per Lahan"
                : role === "pemerintah"
                  ? "· Pemerintah · Sentinel-2 + BMKG + BPS"
                  : "· Belum masuk"}
            </span>
          </div>
        </Link>

        {/* Nav + logout */}
        <div className="flex items-stretch">
          {items.length > 0 && (
            <nav className="flex items-stretch gap-0 border-l border-rule">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex flex-col justify-end gap-1 border-r border-rule px-4 py-2 transition-colors",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink hover:bg-paper-deep",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-smallcaps",
                        active ? "text-paper/60" : "text-ink-faint",
                      )}
                    >
                      Pasal {item.numeral}
                    </span>
                    <span
                      className={cn(
                        "font-display text-[15px] italic leading-none",
                        active ? "text-paper" : "text-ink",
                      )}
                      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 50' }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          )}

          {role && (
            <button
              type="button"
              onClick={logout}
              className="ml-0 flex flex-col justify-end gap-1 border-y-0 border-r border-rule px-4 py-2 text-ink transition-colors hover:bg-paper-deep focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
              aria-label="Keluar"
            >
              <span className="font-mono text-[9px] uppercase tracking-smallcaps text-ink-faint">
                Sesi
              </span>
              <span
                className="font-display text-[15px] italic leading-none"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 50' }}
              >
                Keluar
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
