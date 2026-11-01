// Payouts → Live (GET /api/admin/finance/payouts/live) — the week's orders per restaurant AS THEY
// HAPPEN, before Monday's statements exist. Each restaurant shows what customers paid, what it has
// earned so far (delivered / paid bills) plus what orders still in progress would add, and where
// that money is on its way to a payout: clearing → cleared (next statement) → in a statement → paid.
// Refreshes every 30 seconds and whenever the window regains focus.

import { useNavigate } from "react-router-dom";
import { Activity, Bike, Clock, CreditCard, Store } from "lucide-react";

import { Badge, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui";
import { useLivePayouts } from "@/hooks/admin/usePayouts";
import { rupees } from "@/lib/payouts";
import { IconTile, KpiCard } from "./parts";

const TYPE = { delivery: "Delivery", takeaway: "Takeaway", dine_in: "Dine-in" };
const STATE_VARIANT = { paid: "ok", in_statement: "info", ready: "warn", clearing: "muted", not_due: "muted", none: "muted" };

const timeAgo = (at) => {
  if (!at) return "—";
  const mins = Math.round((Date.now() - new Date(at).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// One amount with its share of the restaurant's money — only the stages that have something.
function Stage({ label, paise, tone }) {
  if (!paise) return null;
  return (
    <span className="whitespace-nowrap">
      <span className={tone}>{rupees(paise)}</span> <span className="text-pay-ink3">{label}</span>
    </span>
  );
}

export default function LiveTab({ weekStart }) {
  const navigate = useNavigate();
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useLivePayouts(weekStart);
  const t = data?.totals;
  const rows = data?.restaurants ?? [];

  return (
    <>
      {error ? <p className="text-sm text-pay-danger">{error.message}</p> : null}
      <p className="-mt-2 flex items-center gap-2 text-sm text-pay-ink2">
        <Activity className={`h-4 w-4 ${isFetching ? "animate-pulse text-pay-accent" : ""}`} />
        Orders appear here as they are paid and delivered — updated every 30 seconds
        {dataUpdatedAt ? ` · last update ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}.
        Weekly statements are made from them on Monday.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CreditCard}
          label="Customers paid this week"
          value={rupees(t?.customerPaidPaise ?? 0)}
          sub={`${t?.orders ?? 0} orders & bills · ${rupees(t?.yuloReceivedPaise ?? 0)} received online`}
        />
        <KpiCard
          icon={Store}
          label="Restaurants earned so far"
          value={rupees(t?.earnedPaise ?? 0)}
          sub={t?.inProgress ? `+ about ${rupees(t.projectedPaise)} from ${t.inProgress} order${t.inProgress === 1 ? "" : "s"} in progress` : "nothing in progress"}
        />
        <KpiCard
          icon={Clock}
          label="Clearing → next statement"
          value={rupees((t?.clearingPaise ?? 0) + (t?.readyPaise ?? 0))}
          sub={`${rupees(t?.clearingPaise ?? 0)} clearing · ${rupees(t?.readyPaise ?? 0)} cleared`}
          actionLabel="View clearance queue"
          onAction={() => navigate("/payouts?tab=clearance")}
        />
        <KpiCard
          icon={Bike}
          label="Riders earned so far"
          value={rupees(t?.ridersPaise ?? 0)}
          sub={`Yulo keeps ${rupees(t?.yuloKeepsPaise ?? 0)} on completed orders`}
        />
      </section>

      <Card>
        <CardContent className="p-0">
          <div className="px-6 pb-4 pt-6">
            <h2 className="text-xl font-bold">Restaurants this week</h2>
            <p className="mt-1 text-sm text-pay-ink2">
              Clearing: paid less than 2 working days ago · Cleared: joins the next statement · then the statement is
              scheduled and paid from the Weekly batch.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Customers paid</TableHead>
                <TableHead className="text-right">Earned so far</TableHead>
                <TableHead>Where the money is</TableHead>
                <TableHead>Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.restaurant?._id)} className="cursor-pointer" onClick={() => navigate(`/money?restaurantId=${r.restaurant?._id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <IconTile icon={Store} />
                      <p className="text-base font-medium">{r.restaurant?.name ?? "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.orders}
                    {r.inProgress ? <span className="block text-xs text-pay-ink3">{r.inProgress} in progress</span> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{rupees(r.customerPaidPaise)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {rupees(r.earnedPaise)}
                    {r.projectedPaise ? <span className="block text-xs font-normal text-pay-ink3">+ {rupees(r.projectedPaise)} est.</span> : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <Stage label="clearing" paise={r.clearingPaise} />
                      <Stage label="cleared" paise={r.readyPaise} />
                      <Stage label="in statement" paise={r.inStatementPaise} />
                      <Stage label="paid" paise={r.paidPaise} tone="text-pay-pos" />
                      {!r.clearingPaise && !r.readyPaise && !r.inStatementPaise && !r.paidPaise ? <span className="text-pay-ink3">—</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-pay-ink2">{timeAgo(r.lastOrderAt)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center font-normal text-pay-ink2">
                    No orders yet this week.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pb-4 pt-6">
            <h2 className="text-xl font-bold">Latest orders</h2>
            <button type="button" className="text-sm font-semibold text-pay-accent" onClick={() => navigate("/money")}>
              All orders →
            </button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead className="text-right">Customer paid</TableHead>
                <TableHead className="text-right">Restaurant gets</TableHead>
                <TableHead className="text-right">Rider gets</TableHead>
                <TableHead>Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.latest ?? []).map((o) => (
                <TableRow key={`${o.kind}-${o.id}`}>
                  <TableCell>
                    <p className="text-base font-medium">{o.ref}</p>
                    <p className="text-xs text-pay-ink3">
                      {TYPE[o.type] ?? o.type} · {timeAgo(o.placedAt)} · <span className="capitalize">{String(o.status).replace(/_/g, " ")}</span>
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{o.restaurant?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupees(o.customerPaidPaise)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.restaurantSharePaise < 0 ? `owes ${rupees(-o.restaurantSharePaise)}` : rupees(o.restaurantSharePaise)}
                    {o.final ? null : <span className="block text-xs text-pay-ink3">est.</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.riderPayPaise ? rupees(o.riderPayPaise) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATE_VARIANT[o.restaurantPayout?.state] ?? "muted"}>{o.restaurantPayout?.label ?? "—"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.latest ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center font-normal text-pay-ink2">
                    No orders yet this week.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
