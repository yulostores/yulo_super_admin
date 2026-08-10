import { useMemo } from "react";
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
  CalendarDays,
  CreditCard,
  Download,
  Percent,
  TrendingDown,
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
import AdminLayout, { formatNumber, formatPrice } from "../AdminLayout";

const STATUS_VARIANT = {
  pending: "warn",
  active: "ok",
  suspended: "danger",
  rejected: "danger",
  expired: "muted",
};

function monthLabel(date) {
  return new Date(date).toLocaleDateString("en-IN", { month: "short" });
}

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
      />
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
      r.commission.toFixed(2),
      r.growthPercent == null ? "New" : r.growthPercent.toFixed(1),
      r.status,
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "restaurant-revenue.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancialAnalytics() {
  const navigate = useNavigate();
  const { data: overview, isLoading: overviewLoading } = useFinanceOverview();
  const { data: trend } = useRevenueTrend(12);
  const { data: earningsVsSpending } = useEarningsVsSpending(12);
  const { page, limit, setPage } = usePagination(10);
  const { data: restaurantData } = useFinanceRestaurants({ page, limit });

  const revenueSourceDonut = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "Online", value: overview.onlineRevenue, color: "#1565C0" },
      { name: "Dine-in", value: overview.dineInRevenue, color: "#2E7D32" },
    ].filter((d) => d.value > 0);
  }, [overview]);

  const platformEarningsDonut = useMemo(() => {
    if (!overview) return [];
    return [
      {
        name: "Commission",
        value: overview.commissionRevenue,
        color: "#2E7D32",
      },
      {
        name: "Partner cost",
        value: overview.deliveryPartnerPayout,
        color: "#D9480F",
      },
      { name: "Net profit", value: overview.netPlatformProfit, color: "#1565C0" },
    ].filter((d) => d.value > 0);
  }, [overview]);

  return (
    <AdminLayout
      title="Financial Analytics"
      subtitle="Monitor platform revenue, restaurant earnings, commissions, and operational spending."
    >
      {overviewLoading ? (
        <p className="text-sm text-muted-foreground">Loading finance overview…</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CreditCard}
            iconClass="bg-[#F0592A] text-white"
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
            iconClass="bg-[#1E88E5] text-[#ffffff]"
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
            iconClass="bg-[#0E7C7B] text-[#ffffff]"
            label="Yulo Commission Revenue"
            value={formatPrice(overview?.commissionRevenue)}
            sub="Platform earnings"
          />
          <StatCard
            icon={TrendingUp}
            iconClass="bg-[#3B73D4] text-[#ffffff]"
            label="Net Platform Profit"
            value={formatPrice(overview?.netPlatformProfit)}
            sub="Net earnings after deducting delivery partner payouts."
          />
        </section>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-brand-cream bg-white px-3 py-1.5 text-xs font-semibold text-[#5a453a] hover:bg-brand-cream/30"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Last 12 months
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(restaurantData?.rows ?? [])}
          className="flex items-center gap-1.5 rounded-lg bg-[#D9480F] px-3 py-1.5 text-xs font-semibold text-white"
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
            <LegendDot color="#1565C0" label="Online delivery" />
            <LegendDot color="#2E7D32" label="Dine-in" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F6EFE9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 11, fill: "#8a7566" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8a7566" }}
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
                  stroke="#1565C0"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dineIn"
                  name="Dine-in"
                  stroke="#2E7D32"
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
              <LegendDot color="#2E7D32" label="Commission revenue" />
              <LegendDot color="#D9480F" label="Delivery partner spend" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsVsSpending ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F6EFE9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={monthLabel}
                    tick={{ fontSize: 11, fill: "#8a7566" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8a7566" }}
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
                    stroke="#2E7D32"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    name="Delivery partner spend"
                    stroke="#D9480F"
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
                      <span className="font-semibold">{formatPrice(d.value)}</span>
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
                        <AvatarFallback className="bg-[#D9480F] text-[11px] font-semibold text-white">
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      {r.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.city}</TableCell>
                  <TableCell>{formatNumber(r.orders)}</TableCell>
                  <TableCell>{formatPrice(r.onlineRevenue)}</TableCell>
                  <TableCell>{formatPrice(r.dineInRevenue)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(r.totalRevenue)}
                  </TableCell>
                  <TableCell>{formatPrice(r.commission)}</TableCell>
                  <TableCell className="pr-6">
                    <Badge
                      variant={STATUS_VARIANT[r.status] ?? "muted"}
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
      />
    </AdminLayout>
  );
}
