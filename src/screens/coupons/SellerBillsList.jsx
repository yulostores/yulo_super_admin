import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Search } from "lucide-react";

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
import { useAllSellers, useSellerBills } from "@/hooks/admin/useSellers";
import { sellerOptions } from "@/lib/coupons";
import { saveBlob } from "@/lib/download";
import { formatDateTime, formatNumber, formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";

export const EMPTY_BILL_FILTERS = {
  seller: "",
  kind: "",
  method: "",
  from: "",
  to: "",
};
export const KIND_LABEL = { plan: "Coupon plan", sms: "SMS credits" };
export const METHOD_LABEL = { online: "Online", manual: "Amount Received" };

/** The filters (+ search) as the API's query: blanks left out. */
export function billQuery(filters, q = "") {
  const out = {};
  for (const [k, v] of Object.entries(filters)) if (v) out[k] = v;
  if (q) out.q = q;
  return out;
}

const rupees = (paise) => formatRupees((paise ?? 0) / 100);

/**
 * Seller bills: one per plan or SMS-credit purchase a coupon seller paid Yulo for (online, or
 * recorded with "Amount Received"). The report above the list covers everything the filters
 * select (all pages); Export CSV downloads exactly that. A row opens the bill, which downloads as
 * a PDF.
 */
export default function SellerBillsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_BILL_FILTERS);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { page, limit, setPage, setLimit } = usePagination(20);
  const [exporting, setExporting] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const q = billQuery(filters, debounced);
  const bills = useSellerBills({ ...q, page, limit });
  const sellers = useAllSellers();

  const set = (k) => (e) => {
    const next = { ...filters, [k]: e.target.value };
    if (next.from && next.to && next.from > next.to) {
      setRangeError("The start date is after the end date.");
      return;
    }
    setRangeError("");
    setFilters(next);
    setPage(1);
  };

  async function exportCsv() {
    setExporting(true);
    try {
      saveBlob(
        await couponsApi.exportSellerBills(q),
        `seller-bills-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      toast.error(err, "Could not export the bills.");
    } finally {
      setExporting(false);
    }
  }

  const select = (key, label, options) => (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        aria-label={label}
        value={filters[key]}
        onChange={set(key)}
        className="mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground"
      >
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

  const s = bills.data?.summary;

  return (
    <AdminLayout
      title="Seller bills"
      breadcrumb="Coupons"
      subtitle="Every plan and SMS-credit purchase a coupon seller paid for"
      action={
        <Button onClick={exportCsv} disabled={exporting}>
          <Download aria-hidden="true" />{" "}
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
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
              aria-label="Search bills"
              className="pl-9"
              placeholder="Bill no., seller or payment reference"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {select("seller", "Seller", [
              { value: "", label: "All sellers" },
              ...sellerOptions(sellers.data?.sellers),
            ])}
            {select("kind", "For", [
              { value: "", label: "Plans and SMS" },
              { value: "plan", label: "Coupon plans" },
              { value: "sms", label: "SMS credits" },
            ])}
            {select("method", "Paid by", [
              { value: "", label: "Any way" },
              { value: "online", label: "Online (Razorpay)" },
              { value: "manual", label: "Amount Received" },
            ])}
            {date("from", "From")}
            {date("to", "To")}
            <div className="flex items-end">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setFilters(EMPTY_BILL_FILTERS);
                  setSearch("");
                  setRangeError("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
          {rangeError ? (
            <p role="alert" className="text-sm text-brand-maroon">
              {rangeError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {s ? (
        <div
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          data-testid="bills-report"
        >
          <Tile label="Bills" value={formatNumber(s.count)} />
          <Tile
            label="Collected"
            value={rupees(s.totalPaise)}
            hint="Incl. GST and handling fees"
          />
          <Tile label="GST" value={rupees(s.gstPaise)} />
          <Tile
            label="Payment handling fees"
            value={rupees(s.handlingFeePaise)}
            hint="Online plan purchases"
          />
          <Tile
            label="Coupon plans"
            value={rupees(s.byKind.plan.totalPaise)}
            hint={`${formatNumber(s.byKind.plan.count)} bills`}
          />
          <Tile
            label="SMS credits"
            value={rupees(s.byKind.sms.totalPaise)}
            hint={`${formatNumber(s.byKind.sms.count)} bills`}
          />
          <Tile
            label="Paid online"
            value={rupees(s.byMethod.online.totalPaise)}
            hint={`${formatNumber(s.byMethod.online.count)} bills`}
          />
          <Tile
            label="Amount Received"
            value={rupees(s.byMethod.manual.totalPaise)}
            hint={`${formatNumber(s.byMethod.manual.count)} bills`}
          />
        </div>
      ) : null}

      <Card>
        <CardContent className="p-4">
          {bills.isError ? (
            <p role="alert" className="text-sm text-brand-maroon">
              {bills.error?.message ?? "Could not load the bills."}
            </p>
          ) : bills.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : bills.data.bills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bills match these filters.
            </p>
          ) : (
            <Table aria-label="Seller bills">
              <TableHeader>
                <TableRow>
                  <TableHead>Bill no.</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.data.bills.map((b) => (
                  <TableRow
                    key={b.id}
                    data-testid={`bill-${b.billNumber}`}
                    className="cursor-pointer hover:bg-secondary/40"
                    onClick={() => navigate(`/seller-bills/${b.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {b.billNumber}
                    </TableCell>
                    <TableCell>{formatDateTime(b.paidAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{b.seller?.name ?? "—"}</div>
                      {b.seller?.city ? (
                        <div className="text-xs text-muted-foreground">
                          {b.seller.city}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div>{KIND_LABEL[b.kind]}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.method === "online" ? "info" : "muted"}>
                        {METHOD_LABEL[b.method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {rupees(b.totalPaise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {bills.data && bills.data.total > 0 ? (
            <div className="mt-3">
              <PaginationBar
                page={page}
                pages={Math.max(1, Math.ceil(bills.data.total / limit))}
                total={bills.data.total}
                onPageChange={setPage}
                itemLabel="bills"
                pageSize={limit}
                onPageSizeChange={setLimit}
                pageSizeOptions={[20, 50, 100]}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
