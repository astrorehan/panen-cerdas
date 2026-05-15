"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeedbackFormProps {
  predictionLogId: number;
  landAreaHa: number;
  onSuccess?: (feedbackId: number) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; feedbackId: number }
  | { kind: "error"; message: string };

export function FeedbackForm({ predictionLogId, landAreaHa, onSuccess }: FeedbackFormProps) {
  const [actualHarvestDays, setActualHarvestDays] = useState("");
  const [actualTotalYield, setActualTotalYield] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const totalNum = Number(actualTotalYield);
  const perHaPreview =
    actualTotalYield && landAreaHa > 0 && Number.isFinite(totalNum)
      ? totalNum / landAreaHa
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(totalNum) || totalNum <= 0 || landAreaHa <= 0) {
      setStatus({
        kind: "error",
        message: "Total hasil panen dan luas lahan harus lebih dari 0.",
      });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await api.ml.feedback({
        prediction_log_id: predictionLogId,
        actual_harvest_days: Number(actualHarvestDays),
        actual_yield_ton_per_ha: Number((totalNum / landAreaHa).toFixed(4)),
        notes: notes.trim() || undefined,
      });
      setStatus({ kind: "ok", feedbackId: res.feedback_id });
      onSuccess?.(res.feedback_id);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal mengirim umpan balik.",
      });
    }
  }

  if (status.kind === "ok") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-primary">Terima kasih!</div>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground">
            Data realisasi panen #{status.feedbackId} sudah tercatat dan akan
            kami gunakan untuk mengkalibrasi model.
          </p>
        </div>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <header className="mb-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            Umpan balik realisasi panen
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Setelah panen aktual, isi data sebenarnya supaya kami bisa
            menyempurnakan model. Mengacu pada prediksi #{predictionLogId}{" "}
            (luas lahan {landAreaHa} ha).
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fb-days">
            Hari ke panen aktual <span className="text-muted-foreground">(hari)</span>
          </Label>
          <Input
            id="fb-days"
            type="number"
            min={1}
            step={1}
            value={actualHarvestDays}
            onChange={(e) => setActualHarvestDays(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-total-yield">
            Total hasil panen <span className="text-muted-foreground">(ton)</span>
          </Label>
          <Input
            id="fb-total-yield"
            type="number"
            min={0}
            step={0.01}
            value={actualTotalYield}
            onChange={(e) => setActualTotalYield(e.target.value)}
            placeholder="Misal 5.4"
            required
          />
          <p className="text-xs text-muted-foreground">
            {perHaPreview != null
              ? `Setara ${perHaPreview.toFixed(2)} ton/ha (otomatis dihitung dari luas lahan ${landAreaHa} ha).`
              : "Isi jumlah total panen Anda. Sistem akan menghitung sendiri ton/ha-nya."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="fb-notes">
          Catatan <span className="text-muted-foreground">(opsional)</span>
        </Label>
        <textarea
          id="fb-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hama yang muncul, kondisi cuaca tak terduga, dsb."
          className="flex w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
      </div>

      {status.kind === "error" && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {status.message}
        </div>
      )}

      <div className="mt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Mengirim..." : "Kirim umpan balik"}
        </Button>
      </div>
    </form>
  );
}
