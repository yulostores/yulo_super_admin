import { useState } from "react";
import { Download, Gift, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationBar from "@/components/admin/PaginationBar";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import { useDebouncedValue } from "@/hooks/admin/useDebouncedValue";
import { usePagination } from "@/hooks/admin/usePagination";
import {
  useAllSellers,
  useCouponCategories,
  useCoupons,
} from "@/hooks/admin/useSellers";
import { formatDate } from "@/lib/format";
import { sellerOptions } from "@/lib/coupons";
import AdminLayout from "../AdminLayout";
import ManualIssueDialog from "./ManualIssueDialog";

export const COUPON_STATUS = {
  issued: { label: "Active", variant: "ok" },
  redeemed: { label: "Redeemed", variant: "info" },
  expired: { label: "Expired", variant: "muted" },
  void: { label: "Void", variant: "danger" },
};
const GENDERS = {
  male: "Male",
  female: "Female",
  other: "Other",
  not_given: "Not given",
};
const AGE_BANDS = [
  "under-18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
  "not-given",
];
const SORTS = [
  { value: "-issuedAt", label: "Newest issued" },
  { value: "issuedAt", label: "Oldest issued" },
  { value: "expiresAt", label: "Expiring soonest" },
  { value: "-redeemedAt", label: "Recently redeemed" },
];

export const EMPTY_FILTERS = {
  category: "",
  seller: "",
  status: "",
  kind: "customer",
  issuedFrom: "",
  issuedTo: "",
  expiringFrom: "",
  expiringTo: "",
  gender: "",
  ageBand: "",
  sort: "-issuedAt",
};

/** The filters as the API's query: blanks left out (search added by the caller). */
export function couponQuery(filters, search = "") {
  const q = {};
  for (const [k, v] of Object.entries(filters)) if (v) q[k] = v;
  if (search) q.search = search;
  return q;
}

/**
 * Every coupon — the super admin sees the customer's mobile (for WhatsApp reminders) and
 * complimentary coupons. Every filter goes to the server; Export CSV downloads exactly the rows
 * the filters select (all pages), audit-logged there.
 */
export default function CouponsList() {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { page, limit, setPage, setLimit } = usePagination(50);
  const [issuing, setIssuing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = couponQuery(filters, debounced);
  const coupons = useCoupons({ ...q, page, limit });
  const categories = useCouponCategories();
  const sellers = useAllSellers();

  const set = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await couponsApi.exportCoupons(q);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coupons-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toast.error(
        err?.status === 429
          ? "Too many exports — wait a minute and try again."
          : err,
        "Could not export.",
      );
    } finally {
      setExporting(false);
    }
  }

  const select = (key, label, options, allLabel) => (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        aria-label={label}
        value={filters[key]}
        onChange={set(key)}
        className="mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground"
      >
        {allLabel !== undefined ? <option value="">{allLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const date = (key, label) => (
    <label className="text-xs text-muted-foreground">
      {label}
      <input
        type="date"
        aria-label={label}
        value={filters[key]}
        onChange={set(key)}
        className="mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground"
      />
    </label>
  );

  return (
    <AdminLayout
      title="Coupons"
      breadcrumb="Coupons"
      subtitle="Every coupon issued, with the customer's mobile"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIssuing(true)}>
            <Gift aria-hidden="true" /> Issue a coupon
          </Button>
          <Button onClick={exportCsv} disabled={exporting}>
            <Download aria-hidden="true" />{" "}
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search coupons"
              className="pl-9"
              placeholder="Coupon code, mobile number or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {select(
              "kind",
              "Kind",
              [
                { value: "customer", label: "Customer" },
                { value: "complimentary", label: "Complimentary" },
              ],
              "All kinds",
            )}
            {select(
              "status",
              "Status",
              Object.entries(COUPON_STATUS).map(([value, s]) => ({
                value,
                label: s.label,
              })),
              "Any status",
            )}
            {select(
              "category",
              "Category",
              (categories.data ?? []).map((c) => ({
                value: c._id,
                label: c.name,
              })),
              "All categories",
            )}
            {select(
              "seller",
              "Seller",
              sellerOptions(sellers.data?.sellers),
              "All sellers",
            )}
            {select(
              "gender",
              "Gender",
              Object.entries(GENDERS).map(([value, label]) => ({
                value,
                label,
              })),
              "Any gender",
            )}
            {select(
              "ageBand",
              "Age band",
              AGE_BANDS.map((b) => ({
                value: b,
                label:
                  b === "not-given"
                    ? "Not given"
                    : b === "under-18"
                      ? "Under 18"
                      : b,
              })),
              "Any age",
            )}
            {date("issuedFrom", "Issued from")}
            {date("issuedTo", "Issued to")}
            {date("expiringFrom", "Expiring from")}
            {date("expiringTo", "Expiring to")}
            {select("sort", "Sort", SORTS)}
            <div className="flex items-end">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {coupons.isError ? (
            <p role="alert" className="text-sm text-brand-maroon">
              {coupons.error?.message ?? "Could not load coupons."}
            </p>
          ) : coupons.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : coupons.data.coupons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No coupons match these filters.
            </p>
          ) : (
            <Table aria-label="Coupons">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.data.coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.customerName ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {c.code}
                      </div>
                    </TableCell>
                    <TableCell>{c.mobile ?? "—"}</TableCell>
                    <TableCell>{c.age ?? "—"}</TableCell>
                    <TableCell>{c.gender ? GENDERS[c.gender] : "—"}</TableCell>
                    <TableCell>{c.category?.name ?? "—"}</TableCell>
                    <TableCell>{c.seller?.name ?? "—"}</TableCell>
                    <TableCell>{formatDate(c.issuedAt)}</TableCell>
                    <TableCell>{formatDate(c.expiresAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={COUPON_STATUS[c.status]?.variant ?? "muted"}
                        >
                          {COUPON_STATUS[c.status]?.label ?? c.status}
                        </Badge>
                        {c.kind === "complimentary" ? (
                          <Badge variant="muted">Complimentary</Badge>
                        ) : null}
                      </div>
                      {c.redeemedAt ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">{`${formatDate(c.redeemedAt)}${c.redeemedBy?.name ? ` · ${c.redeemedBy.name}` : ""}`}</div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {coupons.data && coupons.data.total > 0 ? (
            <div className="mt-3">
              <PaginationBar
                page={page}
                pages={Math.max(1, Math.ceil(coupons.data.total / limit))}
                total={coupons.data.total}
                onPageChange={setPage}
                itemLabel="coupons"
                pageSize={limit}
                onPageSizeChange={setLimit}
                pageSizeOptions={[20, 50, 100, 200]}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ManualIssueDialog
        open={issuing}
        sellers={(sellers.data?.sellers ?? []).filter(
          (s) => s.status === "active",
        )}
        onClose={() => setIssuing(false)}
      />
    </AdminLayout>
  );
}
