import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { couponsApi } from "@/api/coupons.api";
import { PAYMENT_MODES, paiseToRupees, todayYmd, withGst } from "@/lib/coupons";
import { formatRupees } from "@/lib/format";

/**
 * "Amount Received": money a seller paid Yulo directly (bank transfer, UPI, cash, cheque),
 * recorded here — the plan activates (or the SMS credits are added) at once.
 *
 *   kind="plan"     choose the plan; amount prefilled with its total incl. GST
 *   kind="credits"  enter a number of SMS; amount prefilled with credits × the SMS price + GST
 *
 * An amount that differs from the price needs a reason (a negotiated price, a part-payment the
 * business accepted) — the server refuses it without one (422 AMOUNT_MISMATCH). One entry per
 * payment reference: a repeat is 409 DUPLICATE_PAYMENT.
 */
export default function AmountReceivedDialog({
  open,
  kind = "plan",
  seller,
  plans = [],
  smsPrice,
  onClose,
  onRecorded,
}) {
  const titleId = useId();
  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // A fresh form on every open.
  useEffect(() => {
    if (!open) return;
    setF({
      planKey: activePlans[0]?.key ?? "",
      credits: "100",
      amount: "",
      amountEdited: false,
      mode: "neft",
      reference: "",
      receivedOn: todayYmd(),
      note: "",
      overrideReason: "",
    });
    setErrors({});
    setError("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const expectedPaise = useMemo(() => {
    if (!f) return null;
    if (kind === "plan") {
      const plan = activePlans.find((p) => p.key === f.planKey);
      return plan ? plan.totalPaise : null;
    }
    const n = Number(f.credits);
    if (!smsPrice || !Number.isInteger(n) || n < 1) return null;
    return withGst(n * smsPrice.smsPricePaise, smsPrice.smsGstPercent)
      .totalPaise;
  }, [f, kind, activePlans, smsPrice]);

  // Keep the amount in step with the price until the admin types their own.
  useEffect(() => {
    if (f && !f.amountEdited && expectedPaise != null)
      setF((x) => ({ ...x, amount: String(paiseToRupees(expectedPaise)) }));
  }, [expectedPaise]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !f) return null;

  const amountPaise = Math.round(Number(f.amount) * 100);
  const differs =
    expectedPaise != null &&
    Number.isFinite(amountPaise) &&
    f.amount !== "" &&
    amountPaise !== expectedPaise;
  const set = (k) => (e) => {
    const value = e.target.value;
    setF((x) => ({
      ...x,
      [k]: value,
      ...(k === "amount" ? { amountEdited: true } : {}),
    }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  function validate() {
    const e = {};
    if (kind === "plan" && !f.planKey)
      e.planKey = "Choose the plan that was paid for";
    if (kind === "credits") {
      const n = Number(f.credits);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000)
        e.credits = "A whole number of SMS, 1 or more";
    }
    if (!(Number(f.amount) > 0)) e.amount = "Enter the amount received";
    if (f.reference.trim().length < 3)
      e.reference =
        "Enter the payment reference (UTR, UPI reference, cheque or receipt number)";
    if (!f.receivedOn) e.receivedOn = "Enter the date it was received";
    else if (f.receivedOn > todayYmd())
      e.receivedOn = "The date can't be in the future";
    if (differs && f.overrideReason.trim().length < 3)
      e.overrideReason = "Say why the amount differs from the price";
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError("");
    const body = {
      ...(kind === "plan"
        ? { planKey: f.planKey }
        : { credits: Number(f.credits) }),
      amountRupees: Number(f.amount),
      mode: f.mode,
      reference: f.reference.trim(),
      receivedOn: f.receivedOn,
      ...(f.note.trim() ? { note: f.note.trim() } : {}),
      ...(differs ? { overrideReason: f.overrideReason.trim() } : {}),
    };
    try {
      const result =
        kind === "plan"
          ? await couponsApi.recordPlanPayment(seller._id, body)
          : await couponsApi.recordCreditsPayment(seller._id, body);
      onRecorded?.(result);
    } catch (err) {
      if (err?.code === "DUPLICATE_PAYMENT")
        setErrors({
          reference: "This reference is already recorded for this seller",
        });
      else if (err?.code === "AMOUNT_MISMATCH") {
        setErrors({
          overrideReason: `The price is ${formatRupees(paiseToRupees(err.details?.expectedPaise ?? expectedPaise ?? 0))} — give a reason for the difference`,
        });
      } else setError(err?.message ?? "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  }

  const field = (id, label, input, err, hint) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{input}</div>
      {err ? (
        <p className="mt-1 text-xs text-brand-maroon">{err}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
  const selectClass =
    "flex h-10 w-full rounded-lg border border-input bg-white px-3 text-sm";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        noValidate
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-bold">
          Amount Received — {kind === "plan" ? "plan" : "SMS credits"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {seller.business?.businessName ?? seller.businessName} paid Yulo
          directly. Recording it{" "}
          {kind === "plan" ? "activates the plan" : "adds the credits"} at once.
        </p>
        <div className="mt-5 space-y-4">
          {kind === "plan"
            ? field(
                "ar-plan",
                "Plan",
                <select
                  id="ar-plan"
                  className={selectClass}
                  value={f.planKey}
                  onChange={set("planKey")}
                >
                  {activePlans.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} — {p.couponAllocation.toLocaleString("en-IN")}{" "}
                      coupons — {formatRupees(paiseToRupees(p.totalPaise))}
                    </option>
                  ))}
                </select>,
                errors.planKey,
              )
            : field(
                "ar-credits",
                "SMS credits",
                <Input
                  id="ar-credits"
                  type="number"
                  min={1}
                  value={f.credits}
                  onChange={set("credits")}
                />,
                errors.credits,
                smsPrice
                  ? `${formatRupees(paiseToRupees(withGst(smsPrice.smsPricePaise, smsPrice.smsGstPercent).totalPaise))} per SMS incl. GST`
                  : undefined,
              )}
          {field(
            "ar-amount",
            "Amount received (₹)",
            <Input
              id="ar-amount"
              type="number"
              min={0}
              step="0.01"
              value={f.amount}
              onChange={set("amount")}
            />,
            errors.amount,
            expectedPaise != null
              ? `Price incl. GST: ${formatRupees(paiseToRupees(expectedPaise))}`
              : undefined,
          )}
          {differs
            ? field(
                "ar-override",
                "Why is the amount different?",
                <Textarea
                  id="ar-override"
                  rows={2}
                  value={f.overrideReason}
                  onChange={set("overrideReason")}
                  placeholder="Negotiated price, part-payment accepted…"
                />,
                errors.overrideReason,
              )
            : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "ar-mode",
              "Paid by",
              <select
                id="ar-mode"
                className={selectClass}
                value={f.mode}
                onChange={set("mode")}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "ar-date",
              "Received on",
              <Input
                id="ar-date"
                type="date"
                max={todayYmd()}
                value={f.receivedOn}
                onChange={set("receivedOn")}
              />,
              errors.receivedOn,
            )}
          </div>
          {field(
            "ar-reference",
            "Payment reference",
            <Input
              id="ar-reference"
              value={f.reference}
              onChange={set("reference")}
              placeholder="UTR / UPI ref / cheque no."
            />,
            errors.reference,
          )}
          {field(
            "ar-note",
            "Note (optional)",
            <Textarea
              id="ar-note"
              rows={2}
              value={f.note}
              onChange={set("note")}
            />,
          )}
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
            {busy
              ? "Recording…"
              : kind === "plan"
                ? "Record and activate plan"
                : "Record and add credits"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
