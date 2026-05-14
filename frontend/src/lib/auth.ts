export type Role = "petani" | "pemerintah";

const STORAGE_KEY = "panen.role";

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "petani" || v === "pemerintah" ? v : null;
}

export function setRole(role: Role): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
}

export function clearRole(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ── Petani identity (stable per-browser, tanpa login asli) ─────────────
// MVP: tiap browser punya satu petani_id auto-generate.
// Saat ada login asli, ganti dengan ID dari backend.
const PETANI_ID_KEY = "panen.petani_id";

export function getPetaniId(): string {
  if (typeof window === "undefined") return "demo";
  let id = window.localStorage.getItem(PETANI_ID_KEY);
  if (!id) {
    id = `petani_${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(PETANI_ID_KEY, id);
  }
  return id;
}

// ── Lahan name history (auto-suggest input prediksi) ───────────────────
const LAHAN_NAMES_KEY = "panen.lahan_names";

export function getLahanNames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LAHAN_NAMES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addLahanName(name: string): void {
  if (typeof window === "undefined") return;
  const clean = name.trim();
  if (!clean) return;
  const existing = getLahanNames();
  if (existing.includes(clean)) return;
  const next = [clean, ...existing].slice(0, 20);
  window.localStorage.setItem(LAHAN_NAMES_KEY, JSON.stringify(next));
}
