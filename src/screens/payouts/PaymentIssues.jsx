// Payment issues queue (Figma I1, empty state I2): restaurants' reports about payouts and
// orders. A ticket never changes a payment status by itself — "Payment status" is the
// bank-transfer status of the linked record, read live.

import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

import { Button } from "./ui";
import { Badge } from "./ui";
import { Card, CardContent } from "./ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui";
import { usePagination } from "@/hooks/admin/usePagination";
import {
  usePaymentIssueCounts,
  usePaymentIssues,
} from "@/hooks/admin/usePaymentIssues";
import {
  ISSUE_STATUS,
  ISSUE_TYPE_LABEL,
  dayMonth,
  periodLabel,
  rupees,
} from "@/lib/payouts";
import AdminLayout from "../AdminLayout";
import { Crumbs, IconTile, PayoutTabs, TransferBadge } from "./parts";

const STATUS_TABS = ["open", "in_review", "awaiting_restaurant", "resolved"];

export function linkedRecordLabel(record) {
  if (!record) return { amount: "—", sub: "No linked record" };
  if (record.kind === "payout") {
    return {
      amount: rupees(record.amountPaise),
      sub: `Payout · ${periodLabel(record.period?.start, record.period?.end)}`,
    };
  }
  return {
    amount: rupees(record.amountPaise),
    sub: `${record.kind === "bill" ? "Bill" : "Order"} ${record.displayNo ?? ""} · ${dayMonth(record.date)}`,
  };
}

// I2's empty state, per tab: "No open payment issues" on Open, the same card on the others.
const EMPTY_COPY = {
  open: "When a restaurant reports a wrong deduction, a missing order or a payout it cannot find, the ticket appears here with its payout attached.",
  in_review:
    "Tickets you mark in review appear here while you check them against the bank.",
  awaiting_restaurant:
    "Tickets wait here after you ask the restaurant for information, until it replies.",
  resolved: "Resolved tickets appear here once you close them.",
};

export default function PaymentIssues() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = STATUS_TABS.includes(params.get("status"))
    ? params.get("status")
    : "open";
  const { page, limit, setPage } = usePagination(20);
  const { data, isLoading, error } = usePaymentIssues({ status, page, limit });
  const { data: counts } = usePaymentIssueCounts();
  const tickets = data?.tickets ?? [];
  const label = ISSUE_STATUS[status].label;
  const empty = !isLoading && tickets.length === 0;

  const tabs = STATUS_TABS.map((s) => ({
    key: s,
    label: ISSUE_STATUS[s].label,
    count: counts?.[s] || null,
    to: s === "open" ? "/payouts/issues" : `/payouts/issues?status=${s}`,
  }));
  const pages = data?.pages ?? 1;

  return (
    <AdminLayout
      breadcrumb={<Crumbs items={["Payouts", "Payment issues"]} />}
      title="Payment issues"
      subtitle="Reports from restaurants about payouts and orders. A ticket never changes a payment status by itself."
      mainClassName="pay-scope gap-6"
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/payouts")}
        >
          Back to payouts
        </Button>
      }
    >
      <PayoutTabs tabs={tabs} active={status} />
      {error ? (
        <p className="text-sm text-pay-danger">{error.message}</p>
      ) : null}

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <IconTile icon={MessageSquare} tone="info" size={56} />
            <h2 className="text-xl font-bold">
              No {label.toLowerCase()} payment issues
            </h2>
            <p className="max-w-md text-base text-pay-ink2">
              {EMPTY_COPY[status]}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => navigate("/payouts?tab=history")}
            >
              View payout history
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pb-4 pt-6">
              <h2 className="text-xl font-bold">{label} tickets</h2>
              <p className="mt-1 text-sm text-pay-ink2">
                Payment status is the bank-transfer status of the linked record.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked record</TableHead>
                  <TableHead>Ticket status</TableHead>
                  <TableHead>Payment status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => {
                  const st = ISSUE_STATUS[t.status] ?? {
                    label: t.status,
                    variant: "muted",
                  };
                  const linked = linkedRecordLabel(t.linkedRecord);
                  const open = () => navigate(`/payouts/issues/${t._id}`);
                  return (
                    <TableRow
                      key={t._id}
                      className="cursor-pointer"
                      onClick={open}
                    >
                      <TableCell>
                        <p className="text-base font-medium">
                          {t.ticketNumber ?? "—"}
                        </p>
                        <p className="mt-0.5 text-sm font-normal text-pay-ink2">
                          Raised {dayMonth(t.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>{t.restaurantId?.name ?? "—"}</TableCell>
                      <TableCell>
                        {ISSUE_TYPE_LABEL[t.issueType] ?? t.subject}
                      </TableCell>
                      <TableCell>
                        <p className="tabular-nums">{linked.amount}</p>
                        <p className="mt-0.5 text-sm font-normal text-pay-ink2">
                          {linked.sub}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {t.linkedRecord?.transferStatus ? (
                          <TransferBadge
                            value={t.linkedRecord.transferStatus}
                          />
                        ) : (
                          <span className="text-sm font-normal text-pay-ink2">
                            Not in a statement
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            open();
                          }}
                        >
                          Open ticket
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center font-normal text-pay-ink2"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pay-line/70 px-6 py-4 text-sm text-pay-ink2">
              <span>
                {data?.total ?? 0} {label.toLowerCase()} ticket
                {data?.total === 1 ? "" : "s"}
              </span>
              {pages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="tabular-nums text-pay-ink">
                    {page} / {pages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
