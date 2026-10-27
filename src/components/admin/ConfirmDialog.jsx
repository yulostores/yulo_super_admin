// Minimal modal for destructive/reason-required admin actions (no radix Dialog
// dependency in this project yet — kept intentionally small).
//
// Every irreversible or money-moving action in the portal goes through this (or through
// a PayoutModal, which is itself a confirmation step). Behaviour:
//   • role="alertdialog", labelled by the title and described by the description;
//   • Cancel is focused on open (the reason box instead, when one is required), so a stray
//     Enter never confirms; focus returns to whatever was focused before on close;
//   • Escape and a backdrop click cancel — except while the action is running;
//   • Escape is caught in the capture phase and stopped there, so a dialog stacked on top
//     of another modal (a PayoutModal, the document viewer) closes only itself.

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ConfirmDialog({
  open,
  title,
  description,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why…",
  minReasonLength = 1,
  children,
  confirmLabel = "Confirm",
  // "danger" paints the confirm button red; confirmVariant="destructive" (the older
  // spelling) still works and means the same thing.
  tone,
  confirmVariant = "default",
  confirmDisabled = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState("");
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();

  // A fresh field every time it opens — reopening used to show the reason typed for the
  // previous decision, which is how one store's rejection text ended up on another's.
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  // Focus Cancel on open (the textarea takes focus itself via autoFocus when a reason is
  // required) and give focus back to the trigger on close.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    if (!requireReason) cancelRef.current?.focus();
    return () => {
      if (
        previous &&
        typeof previous.focus === "function" &&
        previous.isConnected
      ) {
        previous.focus();
      }
    };
  }, [open, requireReason]);

  // Latest values for the key handler without re-binding it on every keystroke.
  const latest = useRef({ loading, onCancel });
  latest.current = { loading, onCancel };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // Ours, whatever happens next: an underlying modal must not close with it.
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      if (!latest.current.loading) latest.current.onCancel?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const danger = tone === "danger" || confirmVariant === "destructive";
  const canConfirm =
    !confirmDisabled &&
    (!requireReason || reason.trim().length >= minReasonLength);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4"
      // Backdrop click cancels, but not a click (or text selection) that started inside.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={loading || undefined}
        className="w-full max-w-md rounded-2xl border border-brand-cream/60 bg-white p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-base font-bold">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}

        {children}

        {requireReason ? (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor={reasonId}>{reasonLabel}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              disabled={loading}
              autoFocus
            />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            disabled={!canConfirm || loading}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
            className={
              danger
                ? undefined
                : "bg-brand-orange text-white hover:brightness-105"
            }
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
