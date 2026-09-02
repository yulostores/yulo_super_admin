import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Clock,
  CreditCard,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useDeliveryPartners,
  useMarkPayoutsPaid,
  usePayoutSummary,
} from "@/hooks/admin/useDeliveryPartners";
import {
  PARTNER_STATUS_VARIANT,
  PARTNER_STATUSES,
  PAYOUT_STATUS_VARIANT,
} from "@/lib/constants";
import { initials, partnerCode } from "@/lib/format";
import AdminLayout, {
  formatDate,
  formatNumber,
  formatPrice,
} from "../AdminLayout";

// The payout summary API only returns the currently computed period's
// periodStart/periodEnd, so the date chip is a read-only readout of that period
// rather than an interactive range picker.
function formatPayoutRange(start, end) {
  if (!start || !end) return "Current period";
  const from = new Date(start).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
  const to = new Date(end).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${from} – ${to}`;
}

export default function PartnersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("weekly");
  const { page, limit, setPage, setLimit } = usePagination(10);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, error } = useDeliveryPartners({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    page,
    limit,
  });
  const { data: payoutSummary } = usePayoutSummary(period);
  const markPaid = useMarkPayoutsPaid();

  const payoutByPartnerId = useMemo(() => {
    const map = new Map();
    (payoutSummary?.payouts ?? []).forEach((p) => map.set(p.partnerId, p));
    return map;
  }, [payoutSummary]);

  const partners = data?.partners ?? [];

  const periodPayout = payoutSummary?.payouts?.[0];

  function handleClearPendingPayments() {
    const pendingIds = (payoutSummary?.payouts ?? [])
      .filter((p) => p.status !== "paid")
      .map((p) => p._id);
    if (pendingIds.length === 0) return;
    markPaid.mutate(pendingIds);
  }

  return (
    <AdminLayout title="Delivery Partner">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-1 rounded-lg border border-brand-cream/70 p-1">
          {["weekly", "monthly"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                period === p
                  ? "bg-brand-orange text-white"
                  : "text-muted-foreground hover:bg-brand-cream/40"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div
          className="flex items-center gap-2 rounded-lg border border-brand-cream/70 bg-white px-3 py-2 text-sm text-muted-foreground"
          title="Read-only: shows the current computed payout period. Custom date-range filtering isn't wired to the backend."
        >
          <Calendar className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {formatPayoutRange(
              periodPayout?.periodStart,
              periodPayout?.periodEnd,
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-orange2 text-white">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none">
                {formatPrice(payoutSummary?.totalPayable)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Total Payable
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-leaf text-white">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none">
                {formatNumber(payoutSummary?.partnersEligible)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Partners Eligible
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-indigo text-white">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none">
                {formatNumber(payoutSummary?.alreadyPaid)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Already Paid
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-amber text-white">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-bold leading-none">
                {formatNumber(payoutSummary?.pendingPayments)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Pending Payments
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full min-w-[240px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search delivery partner..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Duty Status
            </label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {PARTNER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => navigate("/delivery-partners/new")}
            className="shrink-0 gap-1.5 bg-brand-orange text-white hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> Add New Delivery Partner
          </Button>
          <Button
            onClick={handleClearPendingPayments}
            disabled={markPaid.isPending || !payoutSummary?.pendingPayments}
            className="gap-1.5 bg-brand-orange text-white hover:brightness-105"
          >
            {markPaid.isPending ? "Clearing…" : "Clear Pending Payments"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-brand-maroon">{error.message}</p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-cream/60">
                <TableHead className="pl-6">Partner</TableHead>
                <TableHead>Partner ID</TableHead>
                <TableHead>Deliveries</TableHead>
                <TableHead>Gross Earnings</TableHead>
                <TableHead>Incentives</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Paid</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => {
                const payout = payoutByPartnerId.get(p._id);
                return (
                  <TableRow key={p._id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-brand-orange text-[11px] font-semibold text-white">
                            {initials(p.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{p.fullName}</p>
                          <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            {p.phone}
                            <Badge
                              variant={
                                PARTNER_STATUS_VARIANT[p.status] ?? "muted"
                              }
                              className="capitalize"
                            >
                              {p.status}
                            </Badge>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {partnerCode(p._id)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(
                        payout?.deliveriesCount ?? p.totalDeliveries,
                      )}
                    </TableCell>
                    <TableCell>
                      {payout ? formatPrice(payout.grossEarnings) : "—"}
                    </TableCell>
                    <TableCell>
                      {payout ? formatPrice(payout.incentives) : "—"}
                    </TableCell>
                    <TableCell>
                      {payout ? formatPrice(payout.deductions) : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {payout ? formatPrice(payout.netPayable) : "—"}
                    </TableCell>
                    <TableCell>
                      {payout ? (
                        <Badge
                          variant={
                            PAYOUT_STATUS_VARIANT[payout.status] ?? "muted"
                          }
                          className="capitalize"
                        >
                          {payout.status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payout?.paidAt ? formatDate(payout.paidAt) : "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/delivery-partners/${p._id}`)}
                        className="rounded-lg border border-brand-orange px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10"
                      >
                        View Profile
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && partners.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No delivery partners match your filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
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
        itemLabel="partners"
        pageSize={limit}
        onPageSizeChange={setLimit}
      />
    </AdminLayout>
  );
}
