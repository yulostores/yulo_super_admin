// The bill, rendered for the platform admin — the same receipt the restaurant issued and
// the guest paid against, not a separate admin-only summary of it. Mirrors the restaurant
// portal's src/components/BillDocument.jsx, so a bill escalated to the platform reads
// exactly as the people arguing about it are seeing it.
//
// Everything on screen comes from the API's bill payload (backend:
// services/billView.service.js). Nothing is computed or assumed here: no tax rate, no
// service charge, no table number. A field the bill doesn't carry is not drawn.

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Receipt, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime, formatTime } from "@/lib/format";
import {
  BILL_STATUS_VARIANT,
  billFacts,
  chargeLines,
  formatMoney,
  humanize,
  placedByLabel,
} from "@/lib/bill";

/* ── The restaurant that issued the bill, as the bill itself records it ── */
export function BillHeader({ bill }) {
  const r = bill?.restaurant;
  const address = [r?.address?.street, r?.address?.city, r?.address?.state, r?.address?.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex items-start gap-3">
      {r?.logo ? (
        <img
          src={r.logo}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-brand-cream/70"
        />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-cream/50 text-brand-orange">
          <Utensils className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold leading-tight">{r?.name ?? "—"}</p>
        {r?.legalName && r.legalName !== r.name ? (
          <p className="truncate text-xs text-muted-foreground">{r.legalName}</p>
        ) : null}
        {address ? (
          <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="min-w-0">{address}</span>
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {r?.phone ? <span>Ph {r.phone}</span> : null}
          {r?.gstNumber ? <span>GSTIN {r.gstNumber}</span> : null}
          {r?.fssaiNumber ? <span>FSSAI {r.fssaiNumber}</span> : null}
        </div>
      </div>
    </div>
  );
}

/* ── Every round fired against this bill, cancelled ones included ───── */
export function BillOrderHistory({ bill }) {
  const batches = bill?.batches ?? [];
  if (batches.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No orders on this bill.</p>;
  }

  return (
    <ol className="space-y-3">
      {batches.map((batch, i) => {
        const cancelled = batch.status === "cancelled";
        return (
          <li
            key={batch.orderId ?? i}
            className={cn(
              "rounded-xl border border-brand-cream/60 bg-white p-3",
              cancelled && "opacity-70",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Receipt className="h-3.5 w-3.5 shrink-0 text-brand-orange" />
                Round {batch.round ?? i + 1}
                {batch.orderCode ? (
                  <span className="font-mono text-[11px] font-normal text-muted-foreground">
                    #{batch.orderCode}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  cancelled && "text-muted-foreground line-through",
                )}
              >
                {formatMoney(batch.batchTotal)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {batch.placedAt ? <span>{formatTime(batch.placedAt)}</span> : null}
              <span>{placedByLabel(batch)}</span>
              {batch.status ? <span>{humanize(batch.status)}</span> : null}
              {batch.itemCount ? <span>{batch.itemCount} items</span> : null}
            </div>

            <ul className="mt-2 space-y-1 border-t border-brand-cream/50 pt-2 text-xs">
              {(batch.items ?? []).map((item, j) => (
                <li key={`${item.name}-${j}`} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className={cn(cancelled && "line-through")}>
                      {item.quantity} × {item.name}
                    </span>
                    {item.note ? (
                      <span className="block italic text-muted-foreground">{item.note}</span>
                    ) : null}
                  </span>
                  <span className={cn("shrink-0", cancelled && "line-through")}>
                    {formatMoney(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            {cancelled ? (
              <p className="mt-2 text-[11px] font-semibold text-brand-maroon">
                Cancelled — not charged on this bill.
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Every charge that makes up the total ───────────────────────────── */
export function BillCharges({ bill }) {
  return (
    <div className="space-y-1.5 border-t border-brand-cream/70 pt-3 text-sm">
      {chargeLines(bill).map((line) => (
        <div key={line.key} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{line.label}</span>
          <span className={cn("font-medium", line.tone === "credit" && "text-brand-green")}>
            {line.tone === "credit"
              ? `−${formatMoney(Math.abs(line.value))}`
              : formatMoney(line.value)}
          </span>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-brand-cream/70 pt-2 text-base">
        <span className="font-bold">Total payable</span>
        <span className="font-bold text-brand-red">{formatMoney(bill?.charges?.grandTotal)}</span>
      </div>
    </div>
  );
}

export default function BillDocument({ bill, defaultHistoryOpen = false }) {
  const [open, setOpen] = useState(defaultHistoryOpen);
  if (!bill) return null;

  const facts = billFacts(bill, formatDateTime);
  const payment = bill.payment ?? {};

  return (
    <div className="space-y-4">
      <BillHeader bill={bill} />

      <div className="flex flex-wrap items-center gap-2">
        {bill.tableNumber ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 text-xs font-bold text-white">
            Table {bill.tableNumber}
            {bill.guestCount ? <span className="opacity-80">· {bill.guestCount} guests</span> : null}
          </span>
        ) : null}
        <span className="rounded-full border border-brand-cream bg-white px-3 py-1 text-xs font-bold">
          {bill.billNumber ?? bill.reference}
        </span>
        <Badge variant={BILL_STATUS_VARIANT[bill.status] ?? "muted"} className="capitalize">
          {bill.status}
        </Badge>
      </div>

      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-brand-cream/25 p-3 text-xs sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.key} className="min-w-0">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="truncate font-semibold text-brand-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div>
        <h3 className="mb-1 text-sm font-bold">Items</h3>
        {(bill.items ?? []).length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">This bill has no line items.</p>
        ) : (
          <ul className="divide-y divide-brand-cream/50">
            {bill.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex gap-3 py-2 text-sm">
                <span className="w-8 shrink-0 font-semibold text-brand-orange">
                  {item.quantity}×
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatMoney(item.unitPrice)} each
                  </span>
                  {item.notes?.length ? (
                    <span className="block text-xs italic text-muted-foreground">
                      {item.notes.join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border border-brand-cream bg-white px-3 py-2.5 text-sm font-semibold transition hover:bg-brand-cream/25"
        >
          <span>
            View details
            {bill.orderCount ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {bill.orderCount} {bill.orderCount === 1 ? "round" : "rounds"}
                {bill.cancelledOrderCount ? `, ${bill.cancelledOrderCount} cancelled` : ""}
              </span>
            ) : null}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {open ? (
          <div className="mt-3">
            <h3 className="mb-2 text-sm font-bold">Order history</h3>
            <BillOrderHistory bill={bill} />
          </div>
        ) : null}
      </div>

      <BillCharges bill={bill} />

      <div
        className={cn(
          "rounded-xl px-3 py-2.5 text-center text-xs font-semibold",
          payment.isPaid
            ? "bg-status-ok-bg text-status-ok"
            : "bg-brand-cream/40 text-brand-ink2",
        )}
      >
        {payment.isPaid ? (
          <>
            Paid{payment.method ? ` by ${payment.method}` : ""}
            {payment.paidAt ? ` · ${formatDateTime(payment.paidAt)}` : ""}
            {payment.transactionId ? (
              <span className="mt-0.5 block font-mono text-[10px] font-normal opacity-80">
                Txn {payment.transactionId}
              </span>
            ) : null}
          </>
        ) : bill.status === "cancelled" ? (
          "This bill was cancelled."
        ) : (
          "Not settled yet — this bill is still open."
        )}
      </div>
    </div>
  );
}
