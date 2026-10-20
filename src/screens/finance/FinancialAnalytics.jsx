import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Download,
  Percent,
  RotateCcw,
  Settings2,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationBar from "@/components/admin/PaginationBar";
import { usePagination } from "@/hooks/admin/usePagination";
import { useToast } from "@/components/admin/Toaster";
import {
  fetchAllFinanceRestaurants,
  useFinanceOverview,
  useFinanceSettings,
  usePayoutTotals,
  useRevenueTrend,
  useEarningsVsSpending,
  useFinanceRestaurants,
} from "@/hooks/admin/useFinance";
import { rupees } from "@/lib/financeSettings";
import { STORE_STATUS_VARIANT } from "@/lib/constants";
import { CHART } from "@/lib/palette";
import { initials } from "@/lib/format";
import AdminLayout, { formatNumber, formatPrice } from "../AdminLayout";

// How far back the trend charts and the overview totals look.
const RANGES = [
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
];

function monthLabel(date) {
  return new Date(date).toLocaleDateString("en-IN", { month: "short" });
}

const plural = (n, word) => `${n ?? 0} ${word}${(n ?? 0) === 1 ? "" : "s"}`;

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, iconClass, label, value, sub, action }) {
  return (
    <Card>
      <CardContent className="p-4">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${iconClass}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">
          {label}
        </p>
        <strong className="mt-0.5 block text-2xl font-bold leading-none">
          {value}
        </strong>
        {sub ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
        ) : null}
        {action}
      </CardContent>
    </Card>
  );
}

// RFC 4180 quoting — restaurant names routinely contain commas, which
// previously shifted every column after the name in the exported file.
function csvCell(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

function downloadCsv(rows) {
  const header = [
    "Restaurant",
    "City",
    "Orders",
    "Online Revenue",
    "Dine-in Revenue",
    "Total Revenue",
    "Settlement charge",
    "Growth %",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.name,
      r.city,
      r.orders,
      r.onlineRevenue,
      r.dineInRevenue,
      r.totalRevenue,
      r.commission?.toFixed(2),
      r.growthPercent == null ? "New" : r.growthPercent.toFixed(1),
      r.status,
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel opens the export as UTF-8.
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `restaurant-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancialAnalytics() {
  const navigate = useNavigate();
  const [months, setMonths] = useState(12);

  // The overview and the restaurant table accept an explicit from/to window;
  // the trend endpoints take a month count. Both are driven by one control.
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [months]);

  const { data: overview, isLoading: overviewLoading } = useFinanceOverview({
    from,
    to,
  });
  const { data: trend } = useRevenueTrend(months);
  const { data: earningsVsSpending } = useEarningsVsSpending(months);
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  // The settlement charge replaced the old flat commission; its rate is a Finance Setting.
  const { data: financeSettings } = useFinanceSettings();
  const chargePercent = financeSettings?.active?.settlementChargePercent;
  const { data: payoutTotals } = usePayoutTotals({ from, to });
  const { page, limit, setPage, setLimit } = usePagination(10);
  const { data: restaurantData } = useFinanceRestaurants({
    page,
    limit,
    from,
    to,
  });

  const revenueSourceDonut = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "Online", value: overview.onlineRevenue, color: CHART.online },
      { name: "Dine-in", value: overview.dineInRevenue, color: CHART.dineIn },
    ].filter((d) => d.value > 0);
  }, [overview]);

  // The export covers every restaurant in the range, not only the page on screen.
  async function exportReport() {
    setExporting(true);
    try {
      downloadCsv(await fetchAllFinanceRestaurants({ from, to }));
    } catch (err) {
      toast.error(err, "Could not export the report.");
    } finally {
      setExporting(false);
    }
  }

  const platformEarningsDonut = useMemo(() => {
    if (!overview) return [];
    return [
      {
        name: "Settlement charge",
        value: overview.commissionRevenue,
        color: CHART.commission,
      },
      {
        name: "Rider pay",
        value: overview.deliveryPartnerPayout,
        color: CHART.spend,
      },
      {
        name: "Net",
        value: overview.netPlatformProfit,
        color: CHART.profit,
      },
    ].filter((d) => d.value > 0);
  }, [overview]);

  return (
    <AdminLayout
      title="Financial Analytics"
      subtitle="Platform revenue, the settlement charge Yulo earns, rider pay and restaurant payouts. Money is what the server reports — nothing is recomputed here."
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/finance/refunds")}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" /> Refunds
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/finance/settings")}
            className="gap-1.5"
          >
            <Settings2 className="h-4 w-4" /> Finance settings
          </Button>
        </div>
      }
    >
      {overviewLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading finance overview…
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CreditCard}
            iconClass="bg-brand-orange2 text-white"
            label="Gross merchandise value"
            value={formatPrice(overview?.grossRevenue)}
            sub={`Online ${formatPrice(overview?.onlineRevenue)} · Dine-in ${formatPrice(overview?.dineInRevenue)}`}
            action={
              <button
                type="button"
                onClick={() => navigate("/stores")}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-cream bg-white py-2 text-xs font-semibold text-brand-orange hover:bg-brand-cream/30"
              >
                View all stores <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <StatCard
            icon={Wallet}
            iconClass="bg-brand-blue2 text-white"
            label="Rider pay"
            value={formatPrice(overview?.deliveryPartnerPayout)}
            sub={`Base + distance pay. Tips passed through to riders: ${formatPrice(overview?.riderTipsPassedThrough)}`}
            action={
              <button
                type="button"
                onClick={() => navigate("/delivery-partners")}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-cream px-3 py-2 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10"
              >
                View delivery partners <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <StatCard
            icon={Percent}
            iconClass="bg-brand-teal text-white"
            label={`Settlement charge${chargePercent != null ? ` (${chargePercent}%)` : ""}`}
            value={formatPrice(overview?.commissionRevenue)}
            sub="Charged to restaurants on what customers paid, incl. GST"
          />
          <StatCard
            icon={TrendingUp}
            iconClass="bg-brand-indigo text-white"
            label="Settlement charge less rider pay"
            value={formatPrice(overview?.netPlatformProfit)}
            sub="Before Razorpay's fees; excludes platform fees and delivery charges (Yulo money)."
          />
        </section>
      )}

      {/* Yulo's own money for the range, from the ledger's settled figures (overview.yulo). */}
      {overview?.yulo ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            iconClass="bg-brand-green text-white"
            label="Yulo revenue"
            value={formatPrice(overview.yulo.yuloRevenue)}
            sub={`Platform fees ${formatPrice(overview.yulo.platformFees)} · Delivery ${formatPrice(overview.yulo.deliveryCharges)} · Settlement margin ${formatPrice(overview.yulo.settlementMargin)}`}
          />
          <StatCard
            icon={CreditCard}
            iconClass="bg-brand-orange2 text-white"
            label="Razorpay fees"
            value={formatPrice(overview.yulo.gatewayFees)}
            sub={`Actual fees on online payments, incl. ${formatPrice(overview.yulo.gatewayGst)} GST`}
          />
          <StatCard
            icon={Percent}
            iconClass="bg-brand-indigo text-white"
            label="GST — Yulo's liability (18%)"
            value={formatPrice(overview.yulo.gst.yuloLiability)}
            sub={`Platform fees ${formatPrice(overview.yulo.gst.yuloOnPlatformFees)} · Delivery ${formatPrice(overview.yulo.gst.yuloOnDelivery)} · Settlement charge ${formatPrice(overview.yulo.gst.yuloOnSettlementCharges)}`}
          />
          <StatCard
            icon={Percent}
            iconClass="bg-brand-teal text-white"
            label="Food GST — restaurants' liability"
            value={formatPrice(overview.yulo.gst.foodRestaurantLiability)}
            sub="Collected on online orders for GST-registered restaurants"
          />
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Paid to restaurants",
            kpi: payoutTotals?.paid,
            sub: (k) =>
              `${plural(k?.count, "transfer")} recorded in this range`,
          },
          {
            label: "Scheduled payouts",
            kpi: payoutTotals?.scheduled,
            sub: (k) =>
              k?.nextDate
                ? `${plural(k.count, "payout")} · next ${new Date(k.nextDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                : `${plural(k?.count, "payout")}`,
          },
          {
            label: "Not yet scheduled",
            kpi: payoutTotals?.notYetScheduled,
            sub: (k) =>
              `${plural(k?.count, "eligible payout")} waiting for a date`,
          },
        ].map(({ label, kpi, sub }) => (
          <StatCard
            key={label}
            icon={Banknote}
            iconClass="bg-brand-green text-white"
            label={label}
            value={payoutTotals ? rupees(kpi?.amountPaise) : "—"}
            sub={payoutTotals ? sub(kpi) : "Loading…"}
          />
        ))}
      </section>

      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-1 rounded-lg border border-brand-cream/70 p-1">
          {RANGES.map((r) => (
            <button
              key={r.months}
              type="button"
              onClick={() => {
                setMonths(r.months);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                months === r.months
                  ? "bg-brand-orange text-white"
                  : "text-muted-foreground hover:bg-brand-cream/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportReport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Exporting…" : "Export report"}
        </button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue breakdown
            </p>
            <h2 className="text-base font-bold">Revenue trend</h2>
          </div>
          <div className="flex items-center gap-3">
            <LegendDot color={CHART.online} label="Online delivery" />
            <LegendDot color={CHART.dineIn} label="Dine-in" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 11, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={monthLabel}
                  formatter={(value, name) => [formatPrice(value), name]}
                />
                <Line
                  type="monotone"
                  dataKey="online"
                  name="Online delivery"
                  stroke={CHART.online}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dineIn"
                  name="Dine-in"
                  stroke={CHART.dineIn}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Platform earnings vs spending
            </p>
            <h2 className="text-base font-bold">Platform profitability</h2>
            <div className="flex items-center gap-3 pt-1">
              <LegendDot color={CHART.dineIn} label="Settlement charge" />
              <LegendDot color={CHART.spend} label="Rider pay" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsVsSpending ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={monthLabel}
                    tick={{ fontSize: 11, fill: CHART.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={monthLabel}
                    formatter={(value, name) => [formatPrice(value), name]}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    name="Settlement charge"
                    stroke={CHART.dineIn}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    name="Rider pay"
                    stroke={CHART.spend}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue distribution
            </p>
            <h2 className="text-base font-bold">Where the money moves</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              {
                title: "Revenue source",
                data: revenueSourceDonut,
                centerValue: overview?.grossRevenue,
                centerLabel: "total",
              },
              {
                title: "Platform earnings",
                data: platformEarningsDonut,
                centerValue: overview?.netPlatformProfit,
                centerLabel: "Net",
              },
            ].map(({ title, data, centerValue, centerLabel }) => (
              <div key={title}>
                <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                  {title}
                </p>
                <div className="relative h-36 w-full">
                  {data.length ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={2}
                          >
                            {data.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatPrice(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-sm font-bold leading-none">
                            {formatPrice(centerValue)}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {centerLabel}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="grid h-full place-items-center text-xs text-muted-foreground">
                      No data yet
                    </p>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {data.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: d.color }}
                        />
                        {d.name}
                      </span>
                      <span className="font-semibold">
                        {formatPrice(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <h2 className="text-base font-bold">Restaurant Revenue</h2>
          <p className="text-xs text-muted-foreground">
            {restaurantData?.total ?? 0} restaurants
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-cream/60">
                <TableHead className="pl-6">Restaurant</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Online revenue</TableHead>
                <TableHead>Dine-in revenue</TableHead>
                <TableHead>Total revenue</TableHead>
                <TableHead>Settlement charge</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(restaurantData?.rows ?? []).map((r) => (
                <TableRow key={r.restaurantId}>
                  <TableCell className="pl-6 font-semibold">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand-orange text-[11px] font-semibold text-white">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      {r.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.city}
                  </TableCell>
                  <TableCell>{formatNumber(r.orders)}</TableCell>
                  <TableCell>{formatPrice(r.onlineRevenue)}</TableCell>
                  <TableCell>{formatPrice(r.dineInRevenue)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(r.totalRevenue)}
                  </TableCell>
                  <TableCell>{formatPrice(r.commission)}</TableCell>
                  <TableCell className="pr-6">
                    <Badge
                      variant={STORE_STATUS_VARIANT[r.status] ?? "muted"}
                      className="capitalize"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {restaurantData?.rows?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No revenue data yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationBar
        page={restaurantData?.page ?? page}
        pages={restaurantData?.pages}
        total={restaurantData?.total}
        onPageChange={setPage}
        itemLabel="restaurants"
        pageSize={limit}
        onPageSizeChange={setLimit}
      />
    </AdminLayout>
  );
}
