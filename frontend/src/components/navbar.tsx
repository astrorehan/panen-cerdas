"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", numeral: "I" },
  { href: "/peta", label: "Peta Prediksi", numeral: "II" },
  { href: "/detail", label: "Detail Kecamatan", numeral: "III" },
  { href: "/tentang", label: "Tentang", numeral: "IV" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-ink/20 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="container flex h-20 items-end justify-between pb-4">
        {/* Wordmark */}
        <Link href="/" className="group block leading-none">
          <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
            № 01 — Buletin Prediksi
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-3xl italic leading-none text-ink" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 0' }}>
              PanenCerdas
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint sm:inline">
              · Sentinel-2 + BMKG + BPS
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-stretch gap-0 border-l border-rule">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
      </div>
    </header>
  );
}
