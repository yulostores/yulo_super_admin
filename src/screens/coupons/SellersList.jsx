import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { usePagination } from "@/hooks/admin/usePagination";
import { useDebouncedValue } from "@/hooks/admin/useDebouncedValue";
import { useCouponCategories, useSellers } from "@/hooks/admin/useSellers";
import { SELLER_STATUS, SELLER_STATUS_TABS } from "@/lib/coupons";
import { cn } from "@/lib/utils";
import AdminLayout, { formatDate } from "../AdminLayout";

/**
 * Coupon partners: status tabs (with counts), category, search (business, owner name or phone),
 * paging. The Pending tab is the approval queue — complete applications first in mind, so each
 * row says whether every required section is in.
 */
export default function SellersList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "pending";
  const categoryId = params.get("category") ?? "";
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { page, limit, setPage, setLimit } = usePagination(20);

  const query = {
    page,
    limit,
    ...(status !== "all" ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(debounced ? { search: debounced } : {}),
  };
  const sellers = useSellers(query);
  const categories = useCouponCategories();
  const counts = sellers.data?.statusCounts ?? {};

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <AdminLayout
      title="Sellers"
      breadcrumb="Coupons"
      subtitle="Coupon partners — applications, accounts and plans"
    >
      <div
        role="tablist"
        aria-label="Seller status"
        className="flex flex-wrap gap-2"
      >
        {[...SELLER_STATUS_TABS, "all"].map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => setFilter("status", s === "pending" ? "" : s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              status === s
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-brand-cream bg-white text-brand-ink2",
            )}
          >
            {s === "all" ? "All" : SELLER_STATUS[s].label}
            {s !== "all" ? (
              <span className="ml-1.5 opacity-80">{counts[s] ?? 0}</span>
            ) : null}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[16rem] flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search sellers"
                placeholder="Business, owner name or phone"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Category"
              value={categoryId}
              onChange={(e) => setFilter("category", e.target.value)}
              className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {sellers.isError ? (
            <p role="alert" className="text-sm text-brand-maroon">
              {sellers.error?.message ?? "Could not load sellers."}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => sellers.refetch()}
              >
                Try again
              </button>
            </p>
          ) : sellers.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : sellers.data.sellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sellers here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.data.sellers.map((s) => (
                  <TableRow
                    key={s._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/sellers/${s._id}`)}
                  >
                    <TableCell className="font-semibold">
                      <a
                        href={`/sellers/${s._id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/sellers/${s._id}`);
                        }}
                        className="hover:underline"
                      >
                        {s.businessName}
                      </a>
                    </TableCell>
                    <TableCell>{s.category?.name ?? "—"}</TableCell>
                    <TableCell>
                      <div>{s.ownerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.ownerPhone ?? ""}
                      </div>
                    </TableCell>
                    <TableCell>{s.city ?? "—"}</TableCell>
                    <TableCell>
                      {s.submittedAt ? (
                        formatDate(s.submittedAt)
                      ) : (
                        <span className="text-muted-foreground">Not sent</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant={SELLER_STATUS[s.status]?.variant ?? "muted"}
                        >
                          {SELLER_STATUS[s.status]?.label ?? s.status}
                        </Badge>
                        {s.status === "pending" && !s.complete ? (
                          <Badge variant="muted">Incomplete</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {sellers.data ? (
            <PaginationBar
              page={page}
              pages={sellers.data.pages}
              total={sellers.data.total}
              onPageChange={setPage}
              itemLabel="sellers"
              pageSize={limit}
              onPageSizeChange={setLimit}
            />
          ) : null}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
