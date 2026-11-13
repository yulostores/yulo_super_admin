import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import { couponKeys } from "@/hooks/admin/useSellers";
import { sellerOptions } from "@/lib/coupons";

const newRequestId = () =>
  globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// "+91 98765 43210" / "098765…" → 10 digits.
export const toPhoneDigits = (value) => {
  let d = String(value ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
};

const REFUSALS = {
  NO_STOCK: "This seller has no coupons left to give.",
  NO_APPROVED_OFFER: "This seller has no live offer to issue.",
  SELLER_NOT_ACTIVE: "This seller isn't active.",
};

/**
 * Issue one coupon by hand — goodwill after a complaint, a promotion — to a customer (by mobile)
 * from a chosen seller, out of that seller's stock like any other. Audit-logged on the server.
 * The request id is made once per opening, so a double-click or a retried submit issues once.
 */
export default function ManualIssueDialog({ open, sellers, onClose }) {
  const titleId = useId();
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({ phone: "", sellerId: "", note: "" });
  const [requestId, setRequestId] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ phone: "", sellerId: "", note: "" });
    setRequestId(newRequestId());
    setErrors({});
    setError("");
  }, [open]);

  if (!open) return null;
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
    setError("");
  };

  async function submit(e) {
    e.preventDefault();
    const found = {};
    const phone = toPhoneDigits(f.phone);
    if (!/^[6-9]\d{9}$/.test(phone))
      found.phone = "Enter the customer's 10-digit mobile number";
    if (!f.sellerId) found.sellerId = "Choose the seller whose coupon to give";
    setErrors(found);
    if (Object.keys(found).length || busy) return;
    setBusy(true);
    setError("");
    try {
      const { coupon, duplicate } = await couponsApi.issueCoupon({
        phone,
        sellerId: f.sellerId,
        requestId,
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      toast.success(
        duplicate
          ? `Already issued: ${coupon.code}`
          : `Coupon ${coupon.code} issued to ${coupon.customerName ?? phone}`,
      );
      qc.invalidateQueries({ queryKey: couponKeys.coupons });
      onClose();
    } catch (err) {
      if (err?.code === "CUSTOMER_NOT_FOUND")
        setErrors({ phone: "No customer account uses this number" });
      else
        setError(
          REFUSALS[err?.code] ?? err?.message ?? "Could not issue the coupon.",
        );
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        noValidate
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          Issue a coupon
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Taken from the seller&apos;s stock, valid for its offer&apos;s usual
          period. It appears in the customer&apos;s app at once.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="mi-phone">Customer mobile</Label>
            <Input
              id="mi-phone"
              inputMode="tel"
              className="mt-1.5"
              value={f.phone}
              onChange={set("phone")}
              placeholder="98765 43210"
            />
            {errors.phone ? (
              <p className="mt-1 text-xs text-brand-maroon">{errors.phone}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="mi-seller">Seller</Label>
            <select
              id="mi-seller"
              className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
              value={f.sellerId}
              onChange={set("sellerId")}
            >
              <option value="">Choose a seller</option>
              {sellerOptions(sellers).map((o, i) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {sellers[i].category?.name
                    ? ` — ${sellers[i].category.name}`
                    : ""}
                </option>
              ))}
            </select>
            {errors.sellerId ? (
              <p className="mt-1 text-xs text-brand-maroon">
                {errors.sellerId}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="mi-note">Why (kept in the audit log)</Label>
            <Textarea
              id="mi-note"
              rows={2}
              className="mt-1.5"
              value={f.note}
              onChange={set("note")}
              placeholder="Goodwill after order complaint #1234"
            />
          </div>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-status-danger-bg p-3 text-sm text-brand-maroon"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Issuing…" : "Issue coupon"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
