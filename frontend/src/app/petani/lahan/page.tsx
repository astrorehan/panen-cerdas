"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Layers,
  MapPin,
  Pencil,
  Sprout,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { api, apiPath } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { getPetaniId } from "@/lib/auth";
import type { LahanItem } from "@/types";

const STATUS_STYLE: Record<
  LahanItem["status"],
  { label: string; chip: string }
> = {
  tumbuh:         { label: "Sedang Tumbuh", chip: "bg-primary-soft text-primary" },
  "panen-segera": { label: "Panen Segera",  chip: "bg-amber/15 text-amber" },
  kosong:         { label: "Kosong",        chip: "bg-muted text-muted-foreground" },
};

const RISK_LABEL: Record<string, { label: string; tone: string }> = {
  low:    { label: "Rendah",  tone: "text-primary" },
  medium: { label: "Sedang",  tone: "text-amber" },
  high:   { label: "Tinggi",  tone: "text-destructive" },
};

function formatCrop(c: string | null): string {
  if (!c) return "-";
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      day:   "2-digit",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return iso;
  }
}

export default function LahanPage() {
  const petaniId = useMemo(() => getPetaniId(), []);
  const { data, loading, error, refresh } = useApi(
    apiPath.lahanList(petaniId),
    () => api.lahan.list(petaniId),
  );

  return (
    <div className="container space-y-8 py-8 md:py-12">
      <header>
        <div className="eyebrow">
          <Layers className="h-3 w-3" />
          Lahan Saya
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Catatan lahan yang Anda kelola
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Lahan tercatat otomatis setiap kali Anda kirim formulir prediksi
          dengan nama lahan terisi. Data ini dibaca langsung dari log prediksi
          di server, bukan mock.
        </p>
      </header>

      {loading && !data && <SkeletonLoader label="Memuat lahan..." />}

      {error && !data && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Total Lahan"
              value={`${data.total}`}
              unit="petak"
            />
            <StatCard
              label="Total Luas"
              value={data.total_ha.toFixed(2)}
              unit="hektar"
            />
            <StatCard
              label="Aktif Bertanam"
              value={`${data.aktif}`}
              unit="petak"
              accent
            />
          </section>

          {data.items.length === 0 ? (
            <EmptyState />
          ) : (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Daftar petak
                </h2>
                <span className="text-xs text-muted-foreground">
                  {data.total} lahan
                </span>
              </div>
              <div className="grid gap-3">
                {data.items.map((l) => (
                  <LahanCard
                    key={l.lahan_id}
                    item={l}
                    petaniId={petaniId}
                    onChanged={refresh}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-5">
            <p className="max-w-md text-sm text-muted-foreground">
              Lahan baru otomatis tercatat saat Anda kirim simulasi prediksi
              dengan nama lahan terisi.
            </p>
            <Button asChild>
              <Link href="/petani/prediksi">
                Simulasi lahan baru
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
        </>
      )}
    </div>
  );
}

function LahanCard({
  item,
  petaniId,
  onChanged,
}: {
  item: LahanItem;
  petaniId: string;
  onChanged: () => void;
}) {
  const s = STATUS_STYLE[item.status];
  const risk = item.last_risk_level
    ? RISK_LABEL[item.last_risk_level]
    : undefined;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Lahan #{item.lahan_id}
          </div>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight">
            {item.lahan_id}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Prediksi terakhir {formatDate(item.last_predicted_at)} -{" "}
            {item.total_predictions}x prediksi
            {item.total_feedback > 0
              ? ` - ${item.total_feedback} feedback`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.chip}`}
          >
            <Sprout className="h-3 w-3" />
            {s.label}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Edit lahan"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Hapus lahan"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
        <Cell label="Komoditas" value={formatCrop(item.last_crop_type)} />
        <Cell
          label="Luas"
          value={
            item.last_land_area_ha != null
              ? `${item.last_land_area_ha.toFixed(2)} ha`
              : "-"
          }
        />
        <Cell
          label="Yield prediksi"
          value={
            item.last_yield_ton_per_ha != null
              ? `${item.last_yield_ton_per_ha.toFixed(2)} t/ha`
              : "-"
          }
        />
        <Cell
          label="Risiko"
          value={risk ? risk.label : "-"}
          tone={risk?.tone}
        />
      </div>

      <EditLahanDialog
        item={item}
        petaniId={petaniId}
        open={editing}
        onOpenChange={setEditing}
        onSaved={onChanged}
      />
      <DeleteLahanDialog
        item={item}
        petaniId={petaniId}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={onChanged}
      />
    </article>
  );
}

function EditLahanDialog({
  item,
  petaniId,
  open,
  onOpenChange,
  onSaved,
}: {
  item: LahanItem;
  petaniId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.lahan_id);
  const [luas, setLuas] = useState(
    item.last_land_area_ha != null ? String(item.last_land_area_ha) : "",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sinkron ke nilai terbaru tiap dialog dibuka (item bisa berubah antar render).
  function handleOpenChange(v: boolean) {
    if (v) {
      setName(item.lahan_id);
      setLuas(item.last_land_area_ha != null ? String(item.last_land_area_ha) : "");
      setErr(null);
    }
    onOpenChange(v);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErr("Nama lahan tidak boleh kosong.");
      return;
    }
    const luasNum = luas === "" ? undefined : Number(luas);
    if (luasNum !== undefined && (!Number.isFinite(luasNum) || luasNum <= 0)) {
      setErr("Luas lahan harus lebih dari 0.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.lahan.update(
        item.lahan_id,
        {
          new_lahan_id: cleanName !== item.lahan_id ? cleanName : undefined,
          land_area_ha: luasNum,
        },
        petaniId,
      );
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan perubahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit lahan</DialogTitle>
          <DialogDescription>
            Ubah nama lahan dan luasnya. Mengganti nama akan ikut memperbarui
            seluruh riwayat prediksi & feedback lahan ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lahan-name">Nama lahan</Label>
            <Input
              id="lahan-name"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lahan-luas">
              Luas <span className="text-muted-foreground">(hektar)</span>
            </Label>
            <Input
              id="lahan-luas"
              type="number"
              min={0}
              step={0.01}
              value={luas}
              onChange={(e) => setLuas(e.target.value)}
              placeholder="Misal 0.5"
            />
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {err}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLahanDialog({
  item,
  petaniId,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: LahanItem;
  petaniId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api.lahan.remove(item.lahan_id, petaniId);
      onOpenChange(false);
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus lahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus lahan &quot;{item.lahan_id}&quot;?</DialogTitle>
          <DialogDescription>
            Tindakan ini menghapus lahan beserta {item.total_predictions} riwayat
            prediksi
            {item.total_feedback > 0
              ? ` dan ${item.total_feedback} feedback panen`
              : ""}{" "}
            secara permanen. Tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {err}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={remove}
            disabled={busy}
          >
            {busy ? "Menghapus..." : "Hapus lahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Layers className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">
        Belum ada lahan terdaftar
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Setiap kali Anda kirim formulir prediksi dengan kolom &quot;Nama
        lahan&quot; terisi, lahan tersebut akan otomatis muncul di sini.
      </p>
      <Button asChild className="mt-5">
        <Link href="/petani/prediksi">
          Buka formulir prediksi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${accent ? "border-primary/25 bg-gradient-to-br from-primary to-primary-deep text-primary-foreground" : ""}`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span
          className={`text-sm ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {unit}
        </span>
      </div>
    </Card>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold tracking-tight ${tone || ""}`}>
        {value}
      </div>
    </div>
  );
}
