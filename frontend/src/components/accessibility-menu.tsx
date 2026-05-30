"use client";

// Floating accessibility control — high-contrast theme + adjustable text size,
// persisted in localStorage. Classes are toggled on <html> so the rem-based UI
// scales and the contrast palette (defined in globals.css) takes over.
// Fully keyboard operable; every control exposes aria-pressed / aria-label.

import { useEffect, useRef, useState } from "react";
import { Accessibility, Contrast, Minus, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTRAST_KEY = "panen.a11y.contrast";
const FONT_KEY = "panen.a11y.font"; // "sm" | "base" | "lg"

type FontSize = "sm" | "base" | "lg";
const FONT_ORDER: FontSize[] = ["sm", "base", "lg"];

function applyContrast(on: boolean) {
  document.documentElement.classList.toggle("a11y-contrast", on);
}

function applyFont(size: FontSize) {
  const el = document.documentElement;
  el.classList.toggle("a11y-small-text", size === "sm");
  el.classList.toggle("a11y-large-text", size === "lg");
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [font, setFont] = useState<FontSize>("base");
  const panelRef = useRef<HTMLDivElement>(null);

  // Hydrate from saved prefs on mount (runs before paint of the panel).
  useEffect(() => {
    const savedContrast = localStorage.getItem(CONTRAST_KEY) === "1";
    const savedFont = (localStorage.getItem(FONT_KEY) as FontSize) || "base";
    setContrast(savedContrast);
    setFont(FONT_ORDER.includes(savedFont) ? savedFont : "base");
    applyContrast(savedContrast);
    applyFont(FONT_ORDER.includes(savedFont) ? savedFont : "base");
  }, []);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggleContrast() {
    const next = !contrast;
    setContrast(next);
    applyContrast(next);
    localStorage.setItem(CONTRAST_KEY, next ? "1" : "0");
  }

  function setFontSize(size: FontSize) {
    setFont(size);
    applyFont(size);
    localStorage.setItem(FONT_KEY, size);
  }

  function stepFont(dir: 1 | -1) {
    const idx = FONT_ORDER.indexOf(font);
    const next = FONT_ORDER[Math.min(FONT_ORDER.length - 1, Math.max(0, idx + dir))];
    setFontSize(next);
  }

  function reset() {
    setContrast(false);
    applyContrast(false);
    setFontSize("base");
    localStorage.setItem(CONTRAST_KEY, "0");
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1000] print:hidden">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pengaturan aksesibilitas"
          className="mb-3 w-64 rounded-2xl border border-border bg-surface p-4 shadow-elevated"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Aksesibilitas</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu aksesibilitas"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* High contrast */}
          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className={cn(
              "mb-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              contrast
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2">
              <Contrast className="h-4 w-4" />
              Kontras tinggi
            </span>
            <span className="text-xs font-medium">{contrast ? "Aktif" : "Mati"}</span>
          </button>

          {/* Font size */}
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Ukuran teks</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepFont(-1)}
                disabled={font === "sm"}
                aria-label="Perkecil ukuran teks"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-sm font-medium" aria-live="polite">
                {font === "sm" ? "Kecil" : font === "lg" ? "Besar" : "Normal"}
              </span>
              <button
                type="button"
                onClick={() => stepFont(1)}
                disabled={font === "lg"}
                aria-label="Perbesar ukuran teks"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Buka menu aksesibilitas"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Accessibility className="h-6 w-6" />
      </button>
    </div>
  );
}
