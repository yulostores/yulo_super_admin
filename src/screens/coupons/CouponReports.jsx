import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarList } from "@/components/admin/charts/BarList";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import {
  useAllSellers,
  useCouponCategories,
  useCouponReport,
} from "@/hooks/admin/useSellers";
import { formatDate, formatNumber } from "@/lib/format";
import { SELLER_STATUS, sellerOptions } from "@/lib/coupons";
import AdminLayout from "../AdminLayout";

export const EMPTY_REPORT_FILTERS = {
  from: "",
  to: "",
  category: "",
  seller: "",
};

/** The filters as every report's query: blanks left out. */
export function reportQuery(filters) {
  const q = {};
  for (const [k, v] of Object.entries(filters)) if (v) q[k] = v;
  return q;
}

const GENDERS = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["not_given", "Not given"],
];
const AGE_BANDS = [
  ["under-18", "Under 18"],
  ["18-24", "18–24"],
  ["25-34", "25–34"],
  ["35-44", "35–44"],
  ["45-54", "45–54"],
  ["55+", "55+"],
  ["not-given", "Not given"],
];
const TOP_SELLERS = 10;
const ROLE = { owner: "Owner", manager: "Manager", employee: "Employee" };
const LOGIN_STATUS = {
  active: { label: "Active", variant: "ok" },
  inactive: { label: "Inactive", variant: "muted" },
  removed: { label: "Removed", variant: "danger" },
};
const rate = (r) => `${Number(r ?? 0).toFixed(1)}%`;

/**
 * Coupon reports: one filter row (date range, category, seller) drives every report below —
 * totals, category and seller distribution, demographics, the issued-vs-redeemed trend, the
 * seller table and the employee redemption table. Each report loads (and fails) on its own.
 */
export default function CouponReports() {
  const [draft, setDraft] = useState(EMPTY_REPORT_FILTERS);
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS);
  const [filterError, setFilterError] = useState("");
  const [interval, setTrendInterval] = useState("day");
  const q = reportQuery(filters);
  const categories = useCouponCategories();
  const sellers = useAllSellers();

  const summary = useCouponReport("summary", q);
  const byCategory = useCouponReport("by-category", q);
  const bySeller = useCouponReport("by-seller", q);
  const demographics = useCouponReport("demographics", q);
  const trends = useCouponReport("trends", { ...q, interval });
  const sellerTable = useCouponReport("sellers", q);
  const employees = useCouponReport("employees", q);

  function apply(e) {
    e.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to)
      return setFilterError("The start date is after the end date.");
    setFilterError("");
    setFilters(draft);
  }
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const field =
    "mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground";

  return (
    <AdminLayout
      title="Coupon reports"
      breadcrumb="Coupons"
      subtitle={
        filters.from || filters.to
          ? `Issued ${filters.from ? formatDate(filters.from) : "from the start"} to ${filters.to ? formatDate(filters.to) : "today"}`
          : "All time"
      }
    >
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={apply}
            noValidate
            className="grid grid-cols-2 items-end gap-3 md:grid-cols-6"
            aria-label="Report filters"
          >
            <label className="text-xs text-muted-foreground">
              From
              <input
                type="date"
                aria-label="From"
                className={field}
                value={draft.from}
                onChange={set("from")}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <input
                type="date"
                aria-label="To"
                className={field}
                value={draft.to}
                onChange={set("to")}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Category
              <select
                aria-label="Category"
                className={field}
                value={draft.category}
                onChange={set("category")}
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Seller
              <select
                aria-label="Seller"
                className={field}
                value={draft.seller}
                onChange={set("seller")}
              >
                <option value="">All sellers</option>
                {sellerOptions(sellers.data?.sellers).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Apply</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(EMPTY_REPORT_FILTERS);
                setFilters(EMPTY_REPORT_FILTERS);
                setFilterError("");
              }}
            >
              Clear
            </Button>
          </form>
          {filterError ? (
            <p role="alert" className="mt-2 text-sm text-brand-maroon">
              {filterError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Section title="Totals" query={summary} testId="report-summary">
        {(d) => (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Tile label="Issued" value={formatNumber(d.issued)} />
              <Tile
                label="Pending"
                value={formatNumber(d.pending)}
                hint="Bought, not yet given out"
              />
              <Tile
                label="Active"
                value={formatNumber(d.active)}
                hint="With customers, unused"
              />
              <Tile label="Redeemed" value={formatNumber(d.redeemed)} />
              <Tile label="Expired" value={formatNumber(d.expired)} />
              <Tile label="Redemption rate" value={rate(d.redemptionRate)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Complimentary (not counted above):{" "}
              {formatNumber(d.complimentary.total)} · assigned{" "}
              {formatNumber(d.complimentary.assigned)} · used{" "}
              {formatNumber(d.complimentary.used)} · unused{" "}
              {formatNumber(d.complimentary.unused)}
            </p>
          </>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Issued by category"
          query={byCategory}
          testId="report-by-category"
          isEmpty={(d) => d.categories.every((c) => c.issued === 0)}
          emptyText="No coupons issued in this period."
        >
          {(d) => (
            <BarList
              label="Issued by category"
              sort
              items={d.categories.map((c) => ({
                key: c.key,
                label: c.name,
                value: c.issued,
              }))}
            />
          )}
        </Section>
        <Section
          title="Issued by seller"
          query={bySeller}
          testId="report-by-seller"
          isEmpty={(d) => d.sellers.length === 0}
          emptyText="No coupons issued in this period."
        >
          {(d) => (
            <>
              <BarList
                label="Issued by seller"
                items={d.sellers.slice(0, TOP_SELLERS).map((s) => ({
                  key: String(s.id),
                  label: s.name ?? "—",
                  value: s.issued,
                }))}
              />
              {d.sellers.length > TOP_SELLERS ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Top {TOP_SELLERS} of {d.sellers.length} sellers — every seller
                  is in the table below.
                </p>
              ) : null}
            </>
          )}
        </Section>
      </div>

      <Section
        title="Who gets them"
        query={demographics}
        testId="report-demographics"
        isEmpty={(d) => d.total === 0}
        emptyText="No coupons issued in this period."
      >
        {(d) => (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                Gender
              </h3>
              <BarList
                label="Gender"
                items={GENDERS.map(([key, label]) => ({
                  key,
                  label,
                  value: d.gender[key] ?? 0,
                }))}
              />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                Age on the day of issue
              </h3>
              <BarList
                label="Age bands"
                items={AGE_BANDS.map(([key, label]) => ({
                  key,
                  label,
                  value: d.ageBands[key] ?? 0,
                }))}
              />
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Issued vs redeemed"
        query={trends}
        testId="report-trends"
        action={
          <select
            aria-label="Trend interval"
            value={interval}
            onChange={(e) => setTrendInterval(e.target.value)}
            className="h-8 rounded-lg border border-input bg-white px-2 text-sm"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        }
      >
        {(d) => <TrendChart series={d.series} interval={d.interval} />}
      </Section>

      <Section
        title="Sellers"
        query={sellerTable}
        testId="report-sellers"
        isEmpty={(d) => d.sellers.length === 0}
        emptyText="No sellers match these filters."
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table aria-label="Seller report">
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Bought</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Redeemed</TableHead>
                  <TableHead className="text-right">Expired</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.sellers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.businessName}</div>
                      <div className="text-xs text-muted-foreground">
                        {[s.city, s.ownerName].filter(Boolean).join(" · ") ||
                          "—"}
                      </div>
                    </TableCell>
                    <TableCell>{s.category ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={SELLER_STATUS[s.status]?.variant ?? "muted"}
                      >
                        {SELLER_STATUS[s.status]?.label ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.activePlans?.length
                        ? s.activePlans.map((pl) => pl.name).join(" + ")
                        : (s.currentPlan?.name ?? "—")}
                    </TableCell>
                    <Num>{s.allocated}</Num>
                    <Num>{s.issued}</Num>
                    <Num>{s.pending}</Num>
                    <Num>{s.redeemed}</Num>
                    <Num>{s.expired}</Num>
                    <TableCell className="text-right tabular-nums">
                      {rate(s.redemptionRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section
        title="Redemptions by employee"
        query={employees}
        testId="report-employees"
        isEmpty={(d) => d.employees.length === 0}
        emptyText="No seller logins match these filters."
      >
        {(d) => (
          <div className="overflow-x-auto">
            <Table aria-label="Employee redemptions">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead className="text-right">Redemptions</TableHead>
                  <TableHead>Last redemption</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...d.employees]
                  .sort((a, b) => b.redemptions - a.redemptions)
                  .map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.seller?.name ?? "—"}</TableCell>
                      <TableCell>{ROLE[u.role] ?? u.role}</TableCell>
                      <TableCell>{u.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={LOGIN_STATUS[u.status]?.variant ?? "muted"}
                        >
                          {LOGIN_STATUS[u.status]?.label ?? u.status}
                        </Badge>
                      </TableCell>
                      <Num>{u.redemptions}</Num>
                      <TableCell>{formatDate(u.lastRedemptionAt)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </AdminLayout>
  );
}

const Num = ({ children }) => (
  <TableCell className="text-right tabular-nums">
    {formatNumber(children)}
  </TableCell>
);

function Tile({ label, value, hint }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

/** One report card: its own loading, error (with retry) and empty states. */
function Section({
  title,
  query,
  testId,
  action,
  isEmpty = () => false,
  emptyText,
  children,
}) {
  let body;
  if (query.isError)
    body = (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 rounded-lg bg-status-danger-bg p-3 text-sm text-brand-maroon"
      >
        <span>
          {query.error?.message ?? `Could not load ${title.toLowerCase()}.`}
        </span>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  else if (query.isLoading)
    body = <p className="text-sm text-muted-foreground">Loading…</p>;
  else if (isEmpty(query.data))
    body = (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  else body = children(query.data);
  return (
    <Card data-testid={testId} aria-busy={query.isFetching || undefined}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
