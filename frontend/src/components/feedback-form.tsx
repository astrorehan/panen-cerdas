"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface FeedbackFormProps {
  predictionLogId: number;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "ok"; feedbackId: number }
  | { kind: "error"; message: string };

export function FeedbackForm({ predictionLogId }: FeedbackFormProps) {
  const [actualHarvestDays, setActualHarvestDays] = useState("");
  const [actualYield, setActualYield] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await api.ml.feedback({
        prediction_log_id: predictionLogId,
        actual_harvest_days: Number(actualHarvestDays),
        actual_yield_ton_per_ha: Number(actualYield),
        notes: notes.trim() || undefined,
      });
      setStatus({ kind: "ok", feedbackId: res.feedback_id });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Gagal mengirim umpan balik.",
      });
    }
  }

  if (status.kind === "ok") {
    return (
      <div className="border border-ink/20 bg-paper-deep/40 px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          Umpan balik tercatat
        </div>
        <p className="mt-2 font-display text-lg italic leading-snug text-ink">
          Terima kasih — data realisasi № {status.feedbackId} masuk ke
          data/feedback.jsonl dan akan dipakai untuk retrain model di Phase 7.
        </p>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 border border-ink/20 bg-paper-deep/40 px-6 py-5"
    >
      <div className="meta-row">
        <span>§ Umpan Balik — Realisasi Panen</span>
      </div>
      <p className="max-w-prose font-display text-[14px] leading-relaxed text-ink-soft">
        Setelah panen aktual, isi data sebenarnya untuk membantu kami
        mengkalibrasi model. Mengacu pada prediksi № {predictionLogId}.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Hari ke panen (aktual)"
          unit="hari"
          required
          inputProps={{
            type: "number",
            min: 1,
            step: 1,
            value: actualHarvestDays,
            onChange: (e) => setActualHarvestDays(e.target.value),
          }}
        />
        <Field
          label="Hasil per ha (aktual)"
          unit="ton / ha"
          required
          inputProps={{
            type: "number",
            min: 0,
            step: 0.01,
            value: actualYield,
            onChange: (e) => setActualYield(e.target.value),
          }}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
          Catatan (opsional)
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hama yang muncul, kondisi cuaca tak terduga, dsb."
          className="border border-ink/20 bg-paper px-3 py-2 font-sans text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </label>

      {status.kind === "error" && (
        <p className="border-l-2 border-[#A8442C] bg-[#A8442C]/10 px-3 py-2 font-mono text-[11px] text-[#A8442C]">
          {status.message}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Mengirim..." : "Kirim Umpan Balik"}
      </Button>
    </form>
  );
}

function Field({
  label,
  unit,
  required,
  inputProps,
}: {
  label: string;
  unit?: string;
  required?: boolean;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-smallcaps text-ink-faint">
        <span>{label}</span>
        {unit && <span>{unit}</span>}
      </span>
      <input
        {...inputProps}
        required={required}
        className="border border-ink/20 bg-paper px-3 py-2 font-sans text-[14px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
      />
    </label>
  );
}
