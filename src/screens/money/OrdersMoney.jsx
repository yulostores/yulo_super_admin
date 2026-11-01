// Orders & Money (/money) — GET /api/admin/finance/money.
//
// Every delivery/takeaway order and dine-in bill of a week, with where its money goes: what the
// customer paid, what reached Yulo, what the restaurant gets (or owes, for a counter-paid bill),
// what the rider gets, Razorpay's fee and what Yulo keeps — and whether the restaurant's and the
// rider's share has been paid out yet. Fetched fresh every time the page opens.
//
// Figures are final once the money is booked (delivered / bill paid) and marked "est." before.

import { useSearchParams } from "react-router-dom";
import { Banknote, Bike, Landmark, Store, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PaginationBar from "@/components/admin/PaginationBar";
import { usePagination } from "@/hooks/admin/usePagination";
import { useMoney } from "@/hooks/admin/useMoney";
import { useStores } from "@/hooks/admin/useStores";
import { formatDateTime, formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";
import WeekNav, { weekParam } from "./WeekNav";

export const paise = (p) => formatRupees((p ?? 0) / 100);

const TYPE_LABEL = { delivery: "Delivery", takeaway: "Takeaway", dine_in: "Dine-in" };
const CHANNEL_LABEL = { online: "Paid online", counter: "Paid at counter", cod: "Cash on delivery" };
const PAYOUT_VARIANT = { paid: "ok", in_statement: "info", ready: "warn", clearing: "muted", pending: "warn", not_due: "muted", none: "muted" };

function Kpi({ icon: Icon, label, value, sub, tone = "text-brand-ink" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </p>
        <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function PayoutBadge({ payout, who }) {
  if (!payout) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="w-14 shrink-0 text-muted-foreground">{who}</span>
      <Badge variant={PAYOUT_VARIANT[payout.state] ?? "muted"} className="whitespace-nowrap">
        {payout.label}
      </Badge>
      {payout.reference ? <span className="font-mono text-muted-foreground">{payout.reference}</span> : null}
    </div>
  );
}

export default function OrdersMoney() {
  const [params, setParams] = useSearchParams();
  const week = params.get("week") ?? undefined;
  const type = params.get("type") ?? "all";
  const restaurantId = params.get("restaurantId") ?? "all";
  const { page, limit, setPage, setLimit } = usePagination(20);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value == null || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
    setPage(1);
  };

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useMoney({
    weekStart: week,
    type: type === "all" ? undefined : type,
    restaurantId: restaurantId === "all" ? undefined : restaurantId,
    page,
    limit,
  });
  const { data: stores } = useStores({ limit: 100 });
  const t = data?.totals;

  return (
    <AdminLayout
      title="Orders & Money"
      subtitle="Every order and dine-in bill, and where its money goes — refreshed each time you open this page."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          periodStart={data?.from}
          periodEnd={data?.to}
          onChange={(w) => set("week", w)}
          onThisWeek={() => set("week", weekParam(new Date()))}
          onRefresh={() => refetch()}
          refreshing={isFetching}
          updatedAt={dataUpdatedAt}
        />
        <div className="flex gap-2">
          <Select value={type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="dine_in">Dine-in</SelectItem>
            </SelectContent>
          </Select>
          <Select value={restaurantId} onValueChange={(v) => set("restaurantId", v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All restaurants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All restaurants</SelectItem>
              {(stores?.stores ?? []).map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? <p className="text-sm text-brand-maroon">Couldn&apos;t load: {error.message}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Banknote} label="Customers paid" value={paise(t?.customerPaidPaise)} sub={`${t?.count ?? 0} orders & bills`} />
        <Kpi
          icon={Wallet}
          label="Received by Yulo (online)"
          value={paise(t?.yuloReceivedPaise)}
          sub={t?.refundedPaise ? `after ${paise(t.refundedPaise)} refunded` : "counter payments go to the restaurant"}
        />
        <Kpi icon={Store} label="Restaurants get" value={paise(t?.restaurantsPaise)} sub="net of counter dues · completed orders" tone="text-brand-orange" />
        <Kpi icon={Bike} label="Riders get" value={paise(t?.ridersPaise)} sub="pay + tips · delivered orders" tone="text-blue-700" />
        <Kpi icon={Landmark} label="Yulo keeps" value={paise(t?.yuloKeepsPaise)} sub={`after ${paise(t?.gatewayFeesPaise)} Razorpay fees`} tone="text-brand-green" />
      </div>
      {t?.inProgress?.count ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          + {t.inProgress.count} order{t.inProgress.count === 1 ? "" : "s"} still in progress (not delivered / bill open): about{" "}
          {paise(t.inProgress.restaurantsPaise)} more for restaurants once completed — marked “est.” below.
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Customer paid</TableHead>
                <TableHead className="text-right">Restaurant gets</TableHead>
                <TableHead className="text-right">Rider gets</TableHead>
                <TableHead className="text-right">Yulo keeps</TableHead>
                <TableHead>Paid out?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((r) => (
                <TableRow key={`${r.kind}-${r.id}`} className={r.final ? undefined : "text-muted-foreground"}>
                  <TableCell>
                    <p className="font-semibold">{r.ref}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[r.type] ?? r.type}
                      {r.tableNumber ? ` · Table ${r.tableNumber}` : ""} · {formatDateTime(r.placedAt)}
                    </p>
                    <p className="text-[11px] capitalize text-muted-foreground">{String(r.status).replace(/_/g, " ")}</p>
                  </TableCell>
                  <TableCell className="text-sm">{r.restaurant?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {r.paymentChannel ? CHANNEL_LABEL[r.paymentChannel] ?? r.paymentChannel : "Not paid yet"}
                    {r.refundedPaise ? <span className="block text-brand-maroon">Refunded {paise(r.refundedPaise)}</span> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{paise(r.customerPaidPaise)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${r.restaurantSharePaise < 0 ? "text-brand-maroon" : ""}`}>
                    {r.restaurantSharePaise < 0 ? `owes ${paise(-r.restaurantSharePaise)}` : paise(r.restaurantSharePaise)}
                    {r.final ? null : <span className="block text-[10px]">est.</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.riderPayPaise ? paise(r.riderPayPaise) : "—"}
                    {r.rider?.name ? <span className="block text-[11px] text-muted-foreground">{r.rider.name}</span> : null}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{r.final ? paise(r.yuloKeepsPaise) : "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <PayoutBadge who="Restaurant" payout={r.restaurantPayout} />
                      <PayoutBadge who="Rider" payout={r.riderPayout} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.rows ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No orders in this week.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationBar
        page={page}
        pages={Math.max(1, Math.ceil((data?.total ?? 0) / limit))}
        total={data?.total ?? 0}
        onPageChange={setPage}
        itemLabel="orders"
        pageSize={limit}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />
    </AdminLayout>
  );
}
