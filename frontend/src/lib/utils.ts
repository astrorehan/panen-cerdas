import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { StatusPangan } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_COLOR: Record<StatusPangan, string> = {
  surplus: "#2E7D32",
  cukup: "#A5D6A7",
  waspada: "#FFB74D",
  defisit: "#C62828",
};

export const STATUS_LABEL: Record<StatusPangan, string> = {
  surplus: "Surplus",
  cukup: "Cukup",
  waspada: "Waspada",
  defisit: "Defisit",
};

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("id-ID", opts).format(n);
}

export function formatTon(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} jt ton`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} rb ton`;
  return `${formatNumber(n)} ton`;
}
