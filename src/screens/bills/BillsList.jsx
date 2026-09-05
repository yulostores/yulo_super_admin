// Platform-wide bills (/bills) — GET /api/admin/bills.
//
// The finance screens report revenue in aggregate; this is the receipt behind each of
// those figures. Filterable by store, status, type and free text over the bill number,
// the table and the store name — which is what an admin has in hand when a charge is
// disputed. Arriving with ?restaurantId= scopes the list to one store, which is how
// Store Detail opens a store's bills.

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Receipt, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import PaginationBar from "@/components/admin/PaginationBar";
import { usePagination } from "@/hooks/admin/usePagination";
import { useDebouncedValue } from "@/hooks/admin/useDebouncedValue";
import { useBills } from "@/hooks/admin/useBills";
import { BILL_STATUS_VARIANT, formatMoney, humanize } from "@/lib/bill";
import { formatDateTime } from "@/lib/format";
import AdminLayout from "../AdminLayout";

export default function BillsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get("restaurantId") ?? undefined;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const { page, limit, setPage, setLimit } = usePagination(10);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, error } = useBills({
    restaurantId,
    q: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    page,
    limit,
  });

  const bills = data?.bills ?? [];

  return (
    <AdminLayout
      title="Bills"
      subtitle={
        restaurantId
          ? "Every receipt this store has issued, exactly as its guests were billed."
          : "Every receipt issued across the platform — the table it was raised for, its tax breakdown, and the rounds behind it."
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by bill no., table or store…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            <SelectItem value="dine_in">Dine in</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="takeaway">Takeaway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-brand-maroon">{error.message}</p> : null}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-brand-cream/60">
                  <TableHead className="pl-6">Bill no.</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <TableRow
                    key={b._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/bills/${b._id}`)}
                  >
                    <TableCell className="pl-6">
                      <span className="flex items-center gap-2 font-semibold">
                        <Receipt className="h-4 w-4 shrink-0 text-brand-orange" />
                        {b.billNumber ?? b.reference}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.restaurant?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {b.tableNumber ? (
                        <span className="font-medium">Table {b.tableNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{humanize(b.type)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(b.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={BILL_STATUS_VARIANT[b.status] ?? "muted"}
                        className="capitalize"
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {b.payment?.method ?? "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-bold">
                      {formatMoney(b.charges?.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No bills match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaginationBar
        page={page}
        pages={data?.pages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        itemLabel="bills"
        pageSize={limit}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />
    </AdminLayout>
  );
}
