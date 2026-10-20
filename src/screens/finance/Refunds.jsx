// Refunds (/finance/refunds) — GET /api/admin/finance/refunds.
//
// Every refund owed, under way, done or failed, from three sources: orders, dine-in bills and
// stray payments (captured money that can't count towards its order or bill — paid twice, paid
// after the bill was settled at the counter, …). `failed` rows need a retry; `pending` rows are
// owed and not yet sent; a legacy row was owed before the refund system existed.
//
// Amounts are the server's paise. A stray payment whose amount nobody has decided yet (a dine-in
// round cancelled after its bill was paid online) can't be retried from here — the server
// answers REFUND_AMOUNT_UNKNOWN and the amount is refunded from the Razorpay dashboard.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import PaginationBar from "@/components/admin/PaginationBar";
import { useToast } from "@/components/admin/Toaster";
import { usePagination } from "@/hooks/admin/usePagination";
import {
  useRefunds,
  useRestaurantNames,
  useRetryRefund,
} from "@/hooks/admin/useRefunds";
import { formatDateTime } from "@/lib/format";
import { humanize } from "@/lib/bill";
import { rupees } from "@/lib/financeSettings";
import AdminLayout from "../AdminLayout";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Owed" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "processed", label: "Refunded" },
];

const STATUS_BADGE = {
  pending: { label: "Owed", variant: "warn" },
  processing: { label: "Processing", variant: "info" },
  processed: { label: "Refunded", variant: "ok" },
  failed: { label: "Failed", variant: "danger" },
};

const SOURCE_LABEL = {
  order: "Order",
  bill: "Dine-in bill",
  stray_payment: "Stray payment",
};

const STRAY_KIND_LABEL = {
  duplicate_payment: "Paid twice",
  bill_already_settled: "Paid after the bill was settled at the counter",
  bill_total_changed: "Bill changed while paying",
  refused_payment: "Refused payment (wrong amount)",
  dine_in_round_cancelled: "Round cancelled after the bill was paid",
};

const CAUSE_LABEL = {
  restaurant_reject: "Restaurant rejected",
  approval_timeout: "Restaurant didn't answer in time",
  customer_cancel_before_accept: "Customer cancelled before acceptance",
  customer_cancel_before_preparation: "Customer cancelled before cooking",
  restaurant_cancel_after_accept: "Cancelled after acceptance",
  paid_after_cancel: "Paid after the order was cancelled",
};

const FEE_LABEL = { restaurant: "Restaurant", platform: "Yulo" };

const shortId = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : "—");

// What the row is about and where it can be opened.
function reference(r) {
  if (r.source === "bill")
    return { text: r.billNumber ?? shortId(r._id), to: `/bills/${r._id}` };
  if (r.source === "stray_payment")
    return {
      text: r.razorpayPaymentId ?? shortId(r._id),
      to: r.billId ? `/bills/${r.billId}` : null,
    };
  return { text: `Order ${shortId(r._id)}`, to: null };
}

const amountOf = (r) => r.refund?.amountPaise ?? r.amountPaise ?? null;

function why(r) {
  if (r.source === "stray_payment")
    return STRAY_KIND_LABEL[r.kind] ?? humanize(r.kind);
  if (r.legacy) return "Owed before the refund system";
  return CAUSE_LABEL[r.refund?.cause] ?? r.refund?.reason ?? "—";
}

// Retry is offered where the server would take it: owed, failed, or stuck in processing
// without a Razorpay refund id.
const retryable = (r) =>
  ["pending", "failed"].includes(r.refund?.status) ||
  (r.refund?.status === "processing" && !r.refund?.razorpayRefundId);

export default function Refunds() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const { page, limit, setPage, setLimit } = usePagination(20);
  const { data, isLoading, error } = useRefunds({
    status: status || undefined,
    source: source || undefined,
    page,
    limit,
  });
  const retry = useRetryRefund();
  const [confirming, setConfirming] = useState(null);

  const rows = data?.refunds ?? [];
  // The server names each row's restaurant; look up only the rows it couldn't.
  const names = useRestaurantNames(
    rows.filter((r) => !r.restaurantName).map((r) => r.restaurantId),
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  async function doRetry() {
    const row = confirming;
    try {
      const result = await retry.mutateAsync(row._id);
      const s = result.refund?.status;
      toast.success(
        s === "failed"
          ? "Razorpay refused the refund again — see the failure reason."
          : "Refund sent to Razorpay.",
      );
    } catch (err) {
      if (err.code === "REFUND_AMOUNT_UNKNOWN") {
        toast.error(
          err,
          "No amount is recorded for this payment — decide the amount and refund it from the Razorpay dashboard.",
        );
      } else {
        toast.error(err, "Could not retry the refund.");
      }
    } finally {
      setConfirming(null);
    }
  }

  return (
    <AdminLayout
      breadcrumb="Financial Analytics > Refunds"
      title="Refunds"
      subtitle="Money owed back to customers — orders, dine-in bills and stray payments. Retry a failed or owed refund here."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/finance")}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Financial Analytics
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-brand-cream/70 p-1 sm:w-fit">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                status === t.value
                  ? "bg-brand-orange text-white"
                  : "text-muted-foreground hover:bg-brand-cream/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          aria-label="Source"
          className="h-9 rounded-lg border border-brand-cream/70 bg-white px-3 text-xs font-semibold"
        >
          <option value="">All sources</option>
          <option value="order">Orders</option>
          <option value="bill">Dine-in bills</option>
          <option value="stray_payment">Stray payments</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-cream/60">
                <TableHead className="pl-6">Source</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Fee borne by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure reason</TableHead>
                <TableHead>Last update</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading refunds…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-brand-maroon"
                  >
                    {error.message ?? "Could not load refunds."}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {status
                      ? "No refunds with this status."
                      : "No refunds yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const ref = reference(r);
                  const badge = STATUS_BADGE[r.refund?.status] ?? {
                    label: humanize(r.refund?.status) || "—",
                    variant: "muted",
                  };
                  const amount = amountOf(r);
                  return (
                    <TableRow key={`${r.source}-${r._id}`}>
                      <TableCell className="pl-6">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold">
                            {SOURCE_LABEL[r.source] ?? humanize(r.source)}
                          </span>
                          {r.legacy ? (
                            <Badge variant="muted">Legacy</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ref.to ? (
                          <Link
                            to={ref.to}
                            className="text-brand-orange hover:underline"
                          >
                            {ref.text}
                          </Link>
                        ) : (
                          ref.text
                        )}
                      </TableCell>
                      <TableCell>
                        {r.restaurantId ? (
                          <Link
                            to={`/stores/${r.restaurantId}`}
                            className="hover:underline"
                          >
                            {r.restaurantName ??
                              names.get(String(r.restaurantId)) ??
                              shortId(r.restaurantId)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {amount == null ? (
                          <span className="text-brand-orange">To decide</span>
                        ) : (
                          rupees(amount)
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs">
                        {why(r)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {FEE_LABEL[r.refund?.feeBorneBy] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-brand-maroon">
                        {r.refund?.failureReason ?? ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(r.updatedAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {amount == null && r.source === "stray_payment" ? (
                          <span className="text-[11px] text-muted-foreground">
                            Decide amount in Razorpay dashboard
                          </span>
                        ) : retryable(r) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setConfirming(r)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {r.refund?.status === "pending" ? "Send" : "Retry"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationBar
        page={data?.page ?? page}
        pages={pages}
        total={data?.total}
        onPageChange={setPage}
        itemLabel="refunds"
        pageSize={limit}
        onPageSizeChange={setLimit}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title={
          confirming?.refund?.status === "pending"
            ? "Send this refund?"
            : "Retry this refund?"
        }
        description={
          confirming
            ? `${rupees(amountOf(confirming))} goes back to the customer's original payment method through Razorpay. This can't be undone.`
            : ""
        }
        confirmLabel={
          confirming?.refund?.status === "pending"
            ? "Send refund"
            : "Retry refund"
        }
        loading={retry.isPending}
        onConfirm={doRetry}
        onCancel={() => setConfirming(null)}
      />
    </AdminLayout>
  );
}
