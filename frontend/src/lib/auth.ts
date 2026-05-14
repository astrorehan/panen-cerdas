import { supabase } from "./supabase";

export type Role = "petani" | "pemerintah";

const ROLE_KEY = "panen.role";
const USER_ID_KEY = "panen.user_id";
const USER_NAME_KEY = "panen.user_name";
const PETANI_ID_KEY = "panen.petani_id";

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(ROLE_KEY);
  return v === "petani" || v === "pemerintah" ? v : null;
}

export function setRole(role: Role): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_NAME_KEY);
}

export function getPetaniId(): string {
  if (typeof window === "undefined") return "demo";
  const uid = window.localStorage.getItem(USER_ID_KEY);
  if (uid) return uid;
  let legacy = window.localStorage.getItem(PETANI_ID_KEY);
  if (!legacy) {
    legacy = `petani_${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(PETANI_ID_KEY, legacy);
  }
  return legacy;
}

function persistSession(userId: string, role: Role, name: string) {
  window.localStorage.setItem(USER_ID_KEY, userId);
  window.localStorage.setItem(ROLE_KEY, role);
  window.localStorage.setItem(USER_NAME_KEY, name);
  window.localStorage.setItem(PETANI_ID_KEY, userId);
}

function clearSession() {
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(PETANI_ID_KEY);
}

async function fetchProfile(userId: string): Promise<{ role: Role; name: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`Profil tidak ditemukan: ${error.message}`);
  if (data.role !== "petani" && data.role !== "pemerintah") {
    throw new Error("Role pada profil tidak valid");
  }
  return { role: data.role, name: data.name };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ role: Role; name: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) throw new Error("Login gagal: user kosong");
  const profile = await fetchProfile(data.user.id);
  persistSession(data.user.id, profile.role, profile.name);
  return profile;
}

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<{ role: Role; name: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) {
    throw new Error("Pendaftaran gagal: cek konfirmasi email atau coba lagi");
  }
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    name: input.name,
    role: input.role,
  });
  if (profileError) {
    throw new Error(`Gagal menyimpan profil: ${profileError.message}`);
  }
  persistSession(data.user.id, input.role, input.name);
  return { role: input.role, name: input.name };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}

export async function clearRole(): Promise<void> {
  await signOut();
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email atau kata sandi salah";
  if (m.includes("already registered") || m.includes("user already"))
    return "Email sudah terdaftar";
  if (m.includes("password")) return "Kata sandi minimal 6 karakter";
  if (m.includes("email")) return "Format email tidak valid";
  return message;
}

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
