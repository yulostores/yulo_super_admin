import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Plus, Search, Store } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import PaginationBar from "@/components/admin/PaginationBar";
import { usePagination } from "@/hooks/admin/usePagination";
import { useDebouncedValue } from "@/hooks/admin/useDebouncedValue";
import { useStores } from "@/hooks/admin/useStores";
import { STORE_STATUS_VARIANT } from "@/lib/constants";
import { CHART, STORE_STATUS_COLOR, swatchFor } from "@/lib/palette";
import { storeCode, timeAgo } from "@/lib/format";
import AdminLayout, { formatDate, formatPrice } from "../AdminLayout";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

function RecentRegistrations() {
  const navigate = useNavigate();
  const { data } = useStores({ page: 1, limit: 5 });

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-sm font-bold">Recent Store Registrations</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {(data?.stores ?? []).map((s, i) => {
          const swatch = swatchFor(i);
          return (
            <div
              key={s._id}
              className="flex cursor-pointer items-center gap-3 border-b border-brand-line pb-2.5 last:border-0 last:pb-0"
              onClick={() => navigate(`/stores/${s._id}`)}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  swatch,
                )}
              >
                <Store className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.address?.city ?? "—"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(s.submittedAt ?? s.createdAt)}
              </span>
            </div>
          );
        })}
        {data?.stores?.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No stores yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function StoresList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const [search, setSearch] = useState("");
  const { page, limit, setPage, setLimit } = usePagination(10);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, error } = useStores({
    status: status || undefined,
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const counts = data?.statusCounts;
  const total = counts
    ? counts.pending +
      counts.active +
      counts.suspended +
      counts.rejected +
      counts.expired
    : 0;

  const donutData = useMemo(
    () =>
      counts
        ? Object.entries(counts)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({ name: k, value: v }))
        : [],
    [counts],
  );

  function setStatus(next) {
    setPage(1);
    if (next && next !== "all") setSearchParams({ status: next });
    else setSearchParams({});
  }

  return (
    <AdminLayout
      title="Store Management"
      subtitle="Approve, monitor, and manage every store on the platform."
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-orange text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Total Stores
              </p>
              <strong className="text-xl font-bold">{total}</strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-green text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Active Stores
              </p>
              <strong className="text-xl font-bold">
                {counts?.active ?? 0}
              </strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-saffron text-white">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Pending Stores
              </p>
              <strong className="text-xl font-bold">
                {counts?.pending ?? 0}
              </strong>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-full min-w-[240px] sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search Stores"
                  className="pl-9"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Approval Status
                </label>
                <Select
                  value={status || "all"}
                  onValueChange={(v) => setStatus(v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => navigate("/stores/new")}
              className="shrink-0 gap-1.5 bg-brand-orange text-white hover:brightness-105"
            >
              <Plus className="h-4 w-4" /> Add New Store
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-brand-maroon">{error.message}</p>
          ) : null}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-brand-cream/60">
                    <TableHead className="pl-6 normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Store
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Owner
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Contact Details
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Plan
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      City
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Revenue
                    </TableHead>
                    <TableHead className="normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Joined On
                    </TableHead>
                    <TableHead className="pr-6 text-right normal-case text-[13px] font-medium tracking-normal text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.stores ?? []).map((s, i) => {
                    const swatch = swatchFor(i);
                    return (
                      <TableRow key={s._id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                                swatch,
                              )}
                            >
                              <Store className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {storeCode(s._id)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.ownerId?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{s.ownerId?.email}</div>
                          <div>{s.ownerId?.phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="muted" className="capitalize">
                            {s.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              STORE_STATUS_VARIANT[s.approvalStatus] ?? "muted"
                            }
                            className="capitalize"
                          >
                            {s.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.address?.city ?? "—"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(s.revenue)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(s.submittedAt ?? s.createdAt)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/stores/${s._id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-orange px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Profile
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && data?.stores?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No stores match your filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PaginationBar
            page={data?.page ?? page}
            pages={data?.pages}
            total={data?.total}
            onPageChange={setPage}
            itemLabel="stores"
            pageSize={limit}
            onPageSizeChange={setLimit}
          />
        </div>

        <div className="space-y-4">
          <RecentRegistrations />
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-bold">Store Status Overview</h2>
            </CardHeader>
            <CardContent>
              {donutData.length ? (
                <div className="relative h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {donutData.map((d) => (
                          <Cell
                            key={d.name}
                            fill={STORE_STATUS_COLOR[d.name] ?? CHART.fallback}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-xl font-bold leading-none">{total}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Total Stores
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No data yet.
                </p>
              )}
              <div className="mt-3 space-y-1.5">
                {donutData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 capitalize">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: STORE_STATUS_COLOR[d.name] }}
                      />
                      {d.name}
                    </span>
                    <span className="font-semibold">
                      {d.value}
                      {total ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({((d.value / total) * 100).toFixed(1)}%)
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminLayout>
  );
}
