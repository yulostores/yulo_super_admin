import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowRight,
  Bike,
  ClipboardList,
  IndianRupee,
  Megaphone,
  Moon,
  Radio,
  Store,
  Ticket,
  TrendingUp,
  Users,
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
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  useDashboardOverview,
  useRevenueOverview,
  useTopDeliveryPartners,
  useTopStores,
  useLiveActivity,
  useHourlyActivity,
} from "@/hooks/admin/useDashboard";
import { useStores } from "@/hooks/admin/useStores";
import AdminLayout, {
  formatDate,
  formatNumber,
  formatPrice,
} from "./AdminLayout";

const RANGES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function pointLabel(date, range) {
  const d = new Date(date);
  if (range === "day")
    return d.toLocaleTimeString("en-IN", { hour: "2-digit" });
  if (range === "year")
    return d.toLocaleDateString("en-IN", { month: "short" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatHour(hour) {
  if (hour === undefined || hour === null) return "—";
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

const STORE_ICON_COLORS = [
  "bg-[#FCE9E4] text-brand-orange",
  "bg-[#E7F0FB] text-[#1565C0]",
  "bg-brand-green/10 text-brand-green",
  "bg-brand-saffron/20 text-brand-saffron",
];

const AVATAR_COLORS = [
  "bg-brand-orange",
  "bg-[#1565C0]",
  "bg-brand-green",
  "bg-[#7C3AED]",
  "bg-brand-saffron",
];

const RANK_BADGE_CLASS = {
  1: "bg-[#F2A65A] text-white",
  2: "bg-[#B0B0B8] text-white",
  3: "bg-[#C58940] text-white",
};

function RankBadge({ rank }) {
  return (
    <span
      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
        RANK_BADGE_CLASS[rank] ?? "bg-brand-cream text-brand-dark"
      }`}
    >
      {rank}
    </span>
  );
}

function initials(name) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function documentsStatus(docs) {
  return docs && docs.length > 0
    ? { label: "Submitted", variant: "ok" }
    : { label: "Pending", variant: "warn" };
}

function QuickAction({
  icon: Icon,
  iconClass,
  arrowClass,
  title,
  subtitle,
  onClick,
  highlighted,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition ${
        highlighted
          ? "bg-gradient-to-r from-[#D9480F] to-[#F2A65A] text-white"
          : "border border-brand-cream/60 bg-white hover:border-brand-orange/40"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <p className={`font-semibold ${highlighted ? "text-white" : ""}`}>
          {title}
        </p>
        <p
          className={`text-xs ${highlighted ? "text-white/85" : "text-muted-foreground"}`}
        >
          {subtitle}
        </p>
      </span>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${arrowClass}`}
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </Wrapper>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  breakdown,
  viewLabel,
  onView,
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[14px] ${iconClass}`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <strong className="mt-2 block text-2xl font-bold leading-none">
          {value}
        </strong>
        {breakdown ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-brand-cream/60 pt-2.5 text-xs">
            {breakdown.map((b) => (
              <span key={b.label} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-semibold">{b.value}</span>
              </span>
            ))}
          </div>
        ) : null}
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="mt-auto flex w-full items-center border-[1px] justify-center gap-1 rounded-lg bg-white py-2 text-xs font-semibold text-brand-orange transition"
          >
            {viewLabel} <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const [range, setRange] = useState("month");

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useDashboardOverview();
  const { data: revenueData, isLoading: revenueLoading } =
    useRevenueOverview(range);
  const { data: topStores } = useTopStores(5);
  const { data: topPartners } = useTopDeliveryPartners(5);
  const { data: pendingStores } = useStores({
    status: "pending",
    page: 1,
    limit: 5,
  });
  const { data: liveActivity } = useLiveActivity();
  const { data: hourlyActivity } = useHourlyActivity();

  if (overviewError) {
    return (
      <AdminLayout title="Dashboard">
        <p className="text-sm text-brand-maroon">
          Failed to load dashboard: {overviewError.message}
        </p>
      </AdminLayout>
    );
  }

  const avgOrderValue =
    overview?.revenue?.orders > 0
      ? overview.revenue.total / overview.revenue.orders
      : 0;

  const rangeTotals = (revenueData?.points ?? []).reduce(
    (acc, p) => ({
      revenue: acc.revenue + (p.revenue || 0),
      orders: acc.orders + (p.orders || 0),
    }),
    { revenue: 0, orders: 0 },
  );
  const rangeAvgOrder =
    rangeTotals.orders > 0 ? rangeTotals.revenue / rangeTotals.orders : 0;

  return (
    <AdminLayout
      title={`Dashboard 👋`}
      subtitle={`Welcome back, ${user?.name?.split(" ")[0] ?? "Admin"}! Here's what's happening on the platform today.`}
    >
      {/* Quick actions */}
      <section className="flex flex-col gap-4 sm:flex-row">
        <QuickAction
          icon={Store}
          iconClass="bg-[#FCE9E4] text-brand-orange"
          arrowClass="bg-brand-orange text-white"
          title="Add Store"
          subtitle="Onboard new stores to grow your platform"
          onClick={() => navigate("/stores/new")}
        />
        <QuickAction
          icon={Bike}
          iconClass="bg-[#1E88E51F] text-[#1565C0]"
          arrowClass="bg-[#1E88E5] text-white"
          title="Add Delivery Partner"
          subtitle="Register delivery partners to expand delivery network"
          onClick={() => navigate("/delivery-partners/new")}
        />
        <QuickAction
          icon={Megaphone}
          iconClass="bg-white/20 text-white"
          arrowClass="bg-white/25 text-white"
          title="Run In-App Advertisements"
          subtitle="Promote offers and boost visibility across the platform"
          highlighted
        />
      </section>

      {/* Stat cards */}
      {overviewLoading ? (
        <p className="text-sm text-muted-foreground">Loading platform stats…</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Store}
            iconClass="bg-[#F0592A] text-white"
            label="Total Stores"
            value={formatNumber(
              (overview?.stores?.pending ?? 0) +
                (overview?.stores?.active ?? 0) +
                (overview?.stores?.suspended ?? 0) +
                (overview?.stores?.rejected ?? 0) +
                (overview?.stores?.expired ?? 0),
            )}
            breakdown={[
              {
                label: "Active",
                value: formatNumber(overview?.stores?.active),
                dot: "bg-[#2E7D32]",
              },
              {
                label: "Pending",
                value: formatNumber(overview?.stores?.pending),
                dot: "bg-[#D9480F]",
              },
              {
                label: "Inactive",
                value: formatNumber(
                  (overview?.stores?.suspended ?? 0) +
                    (overview?.stores?.rejected ?? 0) +
                    (overview?.stores?.expired ?? 0),
                ),
                dot: "bg-[#9CA3AF]",
              },
            ]}
            viewLabel="View all stores"
            onView={() => navigate("/stores")}
          />
          <StatCard
            icon={Ticket}
            iconClass="bg-[#F2A459] text-white"
            label="Tickets Raised"
            value={formatNumber(
              (overview?.tickets?.open ?? 0) +
                (overview?.tickets?.in_progress ?? 0) +
                (overview?.tickets?.resolved ?? 0) +
                (overview?.tickets?.closed ?? 0),
            )}
            breakdown={[
              {
                label: "Open",
                value: formatNumber(overview?.tickets?.open),
                dot: "bg-[#B11226]",
              },
              {
                label: "Resolved",
                value: formatNumber(overview?.tickets?.resolved),
                dot: "bg-[#2E7D32]",
              },
            ]}
            viewLabel="View tickets"
            onView={() => navigate("/tickets")}
          />
          <StatCard
            icon={Users}
            iconClass="bg-[#1E88E5] text-[#ffffff]"
            label="Total Customers"
            value={formatNumber(overview?.customers)}
            viewLabel="View customer report"
            onView={() => navigate("/customers")}
          />
          <StatCard
            icon={IndianRupee}
            iconClass="bg-[#0E7C7B] text-white"
            label="Total Revenue"
            value={formatPrice(overview?.revenue?.total)}
            breakdown={[
              {
                label: "Orders",
                value: formatNumber(overview?.revenue?.orders),
                dot: "bg-[#1565C0]",
              },
              {
                label: "Avg Order",
                value: formatPrice(avgOrderValue),
                dot: "bg-[#D9480F]",
              },
            ]}
            viewLabel="View revenue report"
            onView={() => navigate("/finance")}
          />
        </section>
      )}

      {/* Revenue chart */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <h2 className="text-base font-bold">Revenue Overview</h2>
          <div className="flex gap-1 rounded-lg border border-brand-cream/70 p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  range === r.value
                    ? "bg-[#D9480F] text-white"
                    : "text-muted-foreground hover:bg-brand-cream/40"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <p className="text-sm text-muted-foreground">Loading chart…</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-brand-orange">
                    {formatPrice(rangeTotals.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-bold text-[#1565C0]">
                    {formatNumber(rangeTotals.orders)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Avg. Order Value
                  </p>
                  <p className="text-lg font-bold text-brand-green">
                    {formatPrice(rangeAvgOrder)}
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData?.points ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F6EFE9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => pointLabel(d, range)}
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
                    formatter={(value, name) => [
                      name === "revenue" ? formatPrice(value) : value,
                      name === "revenue" ? "Revenue" : "Orders",
                    ]}
                    labelFormatter={(d) => pointLabel(d, range)}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#D9480F"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#1565C0"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live activity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <h2 className="text-base font-bold">Live Activity</h2>
            <Badge variant="ok" className="flex items-center gap-1">
              <Radio className="h-3 w-3" /> Live
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#E7F0FB] text-[#1565C0]">
                  <Users className="h-3.5 w-3.5" />
                </span>
                Open Table Sessions
              </span>
              <strong>{formatNumber(liveActivity?.openTableSessions)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFF3E0] text-brand-orange">
                  <ClipboardList className="h-3.5 w-3.5" />
                </span>
                Orders In Progress
              </span>
              <strong>{formatNumber(liveActivity?.ordersInProgress)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-green/10 text-brand-green">
                  <Radio className="h-3.5 w-3.5" />
                </span>
                Live Connections
              </span>
              <strong>{formatNumber(liveActivity?.liveConnections)}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-brand-cream/60 pt-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Peak Activity Time
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatHour(hourlyActivity?.peakHour)}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Moon className="h-3.5 w-3.5" /> Least Active Time
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatHour(hourlyActivity?.leastActiveHour)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
            <h2 className="text-base font-bold">Hourly Activity</h2>
            {hourlyActivity ? (
              <p className="text-xs text-muted-foreground">
                Peak {formatHour(hourlyActivity.peakHour)} · Least active{" "}
                {formatHour(hourlyActivity.leastActiveHour)}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyActivity?.hours ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F6EFE9" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}:00`}
                    tick={{ fontSize: 10, fill: "#8a7566" }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8a7566" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                    {(hourlyActivity?.hours ?? []).map((h) => (
                      <Cell
                        key={h.hour}
                        fill={
                          h.hour === hourlyActivity?.peakHour
                            ? "#D9480F"
                            : h.hour === hourlyActivity?.leastActiveHour
                              ? "#B11226"
                              : "#2E7D32"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bottom row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">Top Performing Stores</h2>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-brand-cream/60">
                  <TableHead className="w-10 pl-5">#</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="pr-5">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topStores ?? []).map((s, i) => (
                  <TableRow key={s.restaurantId}>
                    <TableCell className="pl-5">
                      <RankBadge rank={i + 1} />
                    </TableCell>
                    <TableCell className="font-semibold">
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${STORE_ICON_COLORS[i % STORE_ICON_COLORS.length]}`}
                        >
                          <Store className="h-3.5 w-3.5" />
                        </span>
                        {s.name}
                      </span>
                    </TableCell>
                    <TableCell>{formatPrice(s.revenue)}</TableCell>
                    <TableCell>{formatNumber(s.orders)}</TableCell>
                    <TableCell className="pr-5">
                      ★ {s.avgRating?.toFixed?.(1) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {topStores?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No data yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <h2 className="text-base font-bold">Store Approval Centre</h2>
            <button
              type="button"
              onClick={() => navigate("/stores?status=pending")}
              className="text-xs font-semibold text-brand-orange"
            >
              View all
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pendingStores?.stores ?? []).map((s, i) => {
              const doc = documentsStatus(s.documents);
              const location = [s.address?.city, s.address?.state]
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={s._id}
                  className="flex cursor-pointer items-center justify-between gap-3 border-b border-[#F6EFE9] pb-3 last:border-0 last:pb-0"
                  onClick={() => navigate(`/stores/${s._id}`)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${STORE_ICON_COLORS[i % STORE_ICON_COLORS.length]}`}
                    >
                      <Store className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {s.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.ownerId?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground md:block">
                    {location || "—"}
                  </p>
                  <Badge variant={doc.variant} className="shrink-0">
                    {doc.label}
                  </Badge>
                </div>
              );
            })}
            {pendingStores?.stores?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No stores awaiting approval.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">
              Most Active Delivery Partners
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topPartners ?? []).map((p, i) => {
              const online = ["active", "busy"].includes(p.status);
              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between border-b border-[#F6EFE9] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                      <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                        {initials(p.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(p.totalDeliveries)} deliveries · ★{" "}
                        {p.rating?.toFixed?.(1) ?? "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      online ? "text-brand-green" : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${online ? "bg-brand-green" : "bg-[#9CA3AF]"}`}
                    />
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
              );
            })}
            {topPartners?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No delivery data yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
}
