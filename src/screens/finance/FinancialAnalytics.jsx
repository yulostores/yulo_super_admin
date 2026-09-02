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
  CreditCard,
  Download,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  useFinanceOverview,
  useRevenueTrend,
  useEarningsVsSpending,
  useFinanceRestaurants,
} from "@/hooks/admin/useFinance";
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
    "Commission",
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

  const platformEarningsDonut = useMemo(() => {
    if (!overview) return [];
    return [
      {
        name: "Commission",
        value: overview.commissionRevenue,
        color: CHART.commission,
      },
      {
        name: "Partner cost",
        value: overview.deliveryPartnerPayout,
        color: CHART.spend,
      },
      {
        name: "Net profit",
        value: overview.netPlatformProfit,
        color: CHART.profit,
      },
    ].filter((d) => d.value > 0);
  }, [overview]);

  return (
    <AdminLayout
      title="Financial Analytics"
      subtitle="Monitor platform revenue, restaurant earnings, commissions, and operational spending."
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
            label="Total Gross Revenue"
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
            label="Delivery Partner Payout"
            value={formatPrice(overview?.deliveryPartnerPayout)}
            sub="Operational spending"
            action={
              <button
                type="button"
                onClick={() => navigate("/delivery-partners")}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-cream px-3 py-2 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10"
              >
                View delivery partner <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <StatCard
            icon={Percent}
            iconClass="bg-brand-teal text-white"
            label="Yulo Commission Revenue"
            value={formatPrice(overview?.commissionRevenue)}
            sub="Platform earnings"
          />
          <StatCard
            icon={TrendingUp}
            iconClass="bg-brand-indigo text-white"
            label="Net Platform Profit"
            value={formatPrice(overview?.netPlatformProfit)}
            sub="Net earnings after deducting delivery partner payouts."
          />
        </section>
      )}

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
          onClick={() => downloadCsv(restaurantData?.rows ?? [])}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Export report
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
              <LegendDot color={CHART.commission} label="Commission revenue" />
              <LegendDot color={CHART.spend} label="Delivery partner spend" />
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
                    name="Commission revenue"
                    stroke={CHART.dineIn}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    name="Delivery partner spend"
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
                centerLabel: "Net profit",
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
                <TableHead>Commission</TableHead>
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
