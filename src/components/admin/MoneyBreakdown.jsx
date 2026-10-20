// The admin's money picture of one order or bill — GET /api/admin/finance/{orders|bills}/:id/
// breakdown. What the customer paid, where each rupee went (Yulo's charges, Razorpay's actual
// fee, the 3.5% settlement charge and Yulo's margin on it, the rider), the GST each side owes,
// and what the restaurant nets — then the ledger rows it produced.
//
// Every amount is the server's (integer paise): `financials` once frozen (the order was
// delivered / the bill paid), else `projected`, a preview from today's settings, labelled so.
// Nothing is computed here. Razorpay's fee, Yulo's margin and rider pay are admin-only — this
// component never ships to the restaurant portal.

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { humanize } from "@/lib/bill";
import { rupees } from "@/lib/financeSettings";

function Row({
  label,
  sub,
  amount,
  sign = "",
  strong = false,
  bold = false,
  muted = false,
  noAmount = false,
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-1.5 text-sm",
        strong && "border-t border-brand-cream/70 pt-2.5 font-bold",
        bold && "font-bold",
        muted && "text-muted-foreground",
      )}
    >
      <div>
        <p className={strong || bold ? "font-bold" : "font-medium"}>{label}</p>
        {sub ? (
          <p className="text-[11px] font-normal text-muted-foreground">{sub}</p>
        ) : null}
      </div>
      {noAmount ? null : (
        <span className="shrink-0 tabular-nums">
          {sign}
          {rupees(amount)}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

const splitSub = (part) =>
  part && part.gst != null
    ? `${rupees(part.base)} + ${rupees(part.gst)} GST`
    : null;

export default function MoneyBreakdown({ data, isLoading, error }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Loading the money breakdown…
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-brand-maroon">
          {error.message ?? "Could not load the money breakdown."}
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const { charges, financials, projected, ledgerEntries = [] } = data;
  const line = financials ?? projected;
  const isProjected = !financials && Boolean(projected);
  const counter = line?.paymentChannel === "counter";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin only
          </p>
          <h2 className="text-base font-bold">Where the money went</h2>
        </div>
        {line ? (
          isProjected ? (
            <Badge variant="warn">Projected</Badge>
          ) : (
            <Badge variant="ok">Frozen</Badge>
          )
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        {!line ? (
          <p className="text-sm text-muted-foreground">
            No settlement figures yet — they are frozen when the order is
            delivered or the bill is paid, and this one has no priced charges to
            preview.
          </p>
        ) : (
          <>
            {isProjected ? (
              <p className="mb-3 rounded-lg bg-status-warn-bg px-3 py-2 text-xs text-brand-orange">
                Projected from today&apos;s Finance Settings — the real figures
                are frozen when the order is delivered or the bill is paid.
              </p>
            ) : null}

            <Section title="Customer">
              {counter ? (
                <Row
                  label="Customer paid"
                  sub="Paid at the counter — the money never passed through Yulo"
                  amount={0}
                />
              ) : (
                <Row label="Customer paid" amount={line.customerPaid} bold />
              )}
              {charges?.food ? (
                <Row
                  label={`Food incl. GST${charges.food.gstPercent ? ` (${charges.food.gstPercent}%)` : ""}`}
                  sub={splitSub(charges.food)}
                  amount={charges.food.total}
                  muted
                />
              ) : null}
              <Row
                label="Platform fee — Yulo money"
                sub={splitSub(charges?.platformFee)}
                amount={line.yuloMoney?.platformFee}
                muted
              />
              {line.yuloMoney?.deliveryCharge ? (
                <Row
                  label="Delivery charge — Yulo money"
                  sub={splitSub(charges?.delivery)}
                  amount={line.yuloMoney.deliveryCharge}
                  muted
                />
              ) : null}
              {line.tip ? (
                <Row
                  label="Tip — passed to the rider in full"
                  amount={line.tip}
                  muted
                />
              ) : null}
            </Section>

            <Section title="Payment & Yulo's settlement charge">
              <Row
                label="Razorpay fee (actual)"
                sub={
                  line.gateway
                    ? `${rupees(line.gateway.fee)} + ${rupees(line.gateway.tax)} GST`
                    : null
                }
                amount={line.gateway?.total}
                sign="−"
              />
              <Row
                label={`Settlement charge (${line.settlementCharge?.percent ?? "—"}%)`}
                sub={splitSub(line.settlementCharge)}
                amount={line.settlementCharge?.total}
              />
              <Row
                label="Yulo margin on settlement"
                sub="Settlement charge less Razorpay's actual fee"
                amount={line.yuloSettlementMargin}
                strong
              />
            </Section>

            <Section title="Rider">
              <Row
                label="Rider pay"
                sub={line.tip ? "Excludes the tip, shown above" : null}
                amount={line.riderPay}
              />
            </Section>

            <Section title="GST">
              {charges?.food ? (
                <Row
                  label="Food GST — the restaurant's liability"
                  amount={charges.food.gst}
                  muted
                />
              ) : null}
              <Row
                label="GST on Yulo's services (18%)"
                sub={[
                  charges?.platformFee?.gst != null
                    ? `platform fee ${rupees(charges.platformFee.gst)}`
                    : null,
                  line.yuloMoney?.deliveryCharge &&
                  charges?.delivery?.gst != null
                    ? `delivery ${rupees(charges.delivery.gst)}`
                    : null,
                  line.settlementCharge?.gst != null
                    ? `settlement charge ${rupees(line.settlementCharge.gst)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                noAmount
                muted
              />
            </Section>

            <Section title="Restaurant">
              {line.restaurantBorneDelivery ? (
                <Row
                  label="Free delivery — borne by the restaurant"
                  amount={line.restaurantBorneDelivery}
                  sign="−"
                  muted
                />
              ) : null}
              {["planCharge", "adCharge", "penalty"].map((k) =>
                line[k] ? (
                  <Row
                    key={k}
                    label={humanize(k)}
                    amount={line[k]}
                    sign="−"
                    muted
                  />
                ) : null,
              )}
              <Row label="Restaurant net" amount={line.restaurantNet} strong />
            </Section>
          </>
        )}

        <Section title={`Ledger entries (${ledgerEntries.length})`}>
          {ledgerEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ledger rows yet.</p>
          ) : (
            <div className="divide-y divide-brand-cream/60 rounded-lg border border-brand-cream/70">
              {ledgerEntries.map((e) => (
                <div
                  key={e._id}
                  className="flex items-start justify-between gap-3 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold">{humanize(e.type)}</p>
                    <p className="text-muted-foreground">
                      Eligible {formatDateTime(e.eligibleAt)}
                      {e.settlementId
                        ? " · in a statement"
                        : " · not settled yet"}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      e.direction === "debit"
                        ? "text-brand-maroon"
                        : "text-brand-green",
                    )}
                  >
                    {e.direction === "debit" ? "−" : "+"}
                    {rupees(e.amountPaise)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
