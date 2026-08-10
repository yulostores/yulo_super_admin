// Minimal modal for destructive/reason-required admin actions (no radix Dialog
// dependency in this project yet — kept intentionally small).

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ConfirmDialog({
  open,
  title,
  description,
  requireReason = false,
  reasonLabel = "Reason",
  confirmLabel = "Confirm",
  confirmVariant = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-cream/60 bg-white p-5 shadow-lg">
        <h2 className="text-base font-bold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}

        {requireReason ? (
          <div className="mt-4 space-y-1.5">
            <Label>{reasonLabel}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why…"
              autoFocus
            />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={!canConfirm || loading}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
            className={
              confirmVariant === "default"
                ? "bg-[#D9480F] text-white hover:brightness-105"
                : undefined
            }
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
