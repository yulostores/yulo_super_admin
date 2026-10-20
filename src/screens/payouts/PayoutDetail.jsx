// One restaurant's weekly payout (Figma D1–D6 + the M1 background for "Not scheduled").
//
// The header strip, "How this is calculated" lines, records and progress are the server's
// (services/payoutView.service.js) — nothing is added up here. The right column is the action
// card for the payout's state plus "What the owner sees", the exact sentence the restaurant
// portal shows. Razorpay's fee and Yulo's margin never appear here (per-order money view only).

import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Landmark,
  MessageSquare,
  Pause,
  RefreshCw,
} from "lucide-react";

import { Button } from "./ui";
import { Card, CardContent } from "./ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui";
import { useToast } from "@/components/admin/Toaster";
import { adminApi } from "@/api/admin.api";
import { usePayout } from "@/hooks/admin/usePayouts";
import {
  ISSUE_STATUS,
  ISSUE_TYPE_LABEL,
  dayMonth,
  dayMonthYear,
  isoDay,
  payoutDate,
  payoutDay,
  periodLabel,
  rupees,
} from "@/lib/payouts";
import AdminLayout from "../AdminLayout";
import { MoreMenu } from "./MaintenanceTools";
import {
  HoldModal,
  MarkFailedModal,
  MarkPaidModal,
  ReleaseHoldDialog,
  ReleaseModal,
  ScheduleModal,
} from "./PayoutModals";
import {
  Banner,
  Crumbs,
  EligibilityBadge,
  IconTile,
  OwnerSeesCard,
  PayoutProgress,
  RecordBadge,
  TransferBadge,
  saveBlob,
} from "./parts";

const ORIGIN = {
  weekly: { label: "Weekly batch", to: "/payouts" },
  history: { label: "Payout history", to: "/payouts?tab=history" },
  clearance: { label: "Clearance queue", to: "/payouts?tab=clearance" },
  issues: { label: "Payment issues", to: "/payouts/issues" },
};

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

// "Statement 28 Sep–4 Oct 2026 · 6 food orders · 2 dine-in adjustments · 1 refund"
// A paid payout: "Statement 21–27 Sep 2026 · Paid 5 Oct 2026" (D4).
function subtitleOf(data) {
  const { settlement, counts } = data;
  const bits = [
    `Statement ${periodLabel(settlement.periodStart, settlement.periodEnd, { withYear: true })}`,
  ];
  if (data.transfer?.status === "paid" && data.transfer.paidAt) {
    return `${bits[0]} · Paid ${dayMonthYear(data.transfer.paidAt)}`;
  }
  if (counts.foodOrders) bits.push(plural(counts.foodOrders, "food order"));
  if (counts.dineInBills) bits.push(plural(counts.dineInBills, "dine-in bill"));
  if (counts.dineInAdjustments)
    bits.push(plural(counts.dineInAdjustments, "dine-in adjustment"));
  if (counts.refunds) bits.push(plural(counts.refunds, "refund"));
  return bits.join(" · ");
}

function transferSubline(data) {
  const t = data.transfer;
  if (data.eligibility === "on_hold") return "Held · date unknown";
  switch (t.status) {
    case "scheduled":
      return payoutDate(t.scheduledFor);
    case "processing":
    case "failed":
      return t.attemptRef ? `Attempt ${t.attemptRef}` : null;
    case "paid":
      return [dayMonthYear(t.paidAt), t.bankReference]
        .filter(Boolean)
        .join(" · ");
    case "carried_forward":
      return "Moved into a later statement";
    default:
      return "Date unknown";
  }
}

function SummaryStrip({ data }) {
  const d = data.destination ?? {};
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <div>
          <p className="text-sm text-pay-ink2">Net payable</p>
          <p className="mt-2 text-[32px] font-bold leading-10 tracking-tight">
            {rupees(data.settlement.totals?.netPayable)}
          </p>
        </div>
        <div>
          <p className="text-sm text-pay-ink2">Eligibility</p>
          <div className="mt-2">
            <EligibilityBadge value={data.eligibility} />
          </div>
        </div>
        <div>
          <p className="text-sm text-pay-ink2">Bank transfer</p>
          <div className="mt-2">
            <TransferBadge value={data.transfer.status} />
          </div>
          {transferSubline(data) ? (
            <p className="mt-2 text-sm text-pay-ink2">
              {transferSubline(data)}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm text-pay-ink2">Destination</p>
          <p className="mt-2 text-base font-semibold">
            {d.accountNumberLast4
              ? `Account ending ${d.accountNumberLast4}`
              : "No bank account on file"}
          </p>
          <p className="mt-1 text-sm text-pay-ink2">
            {d.verified ? "Verified · full details protected" : "Not verified"}
            {d.changeRequested ? " · change requested" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Calculation({ calculation }) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-bold">How this is calculated</h2>
        <dl className="mt-6 space-y-4 text-base">
          {calculation.lines.map((l) => (
            <div key={l.key} className="flex items-center justify-between">
              <dt className="text-pay-ink2">{l.label}</dt>
              <dd className="tabular-nums">
                {l.amountPaise < 0
                  ? `−${rupees(-l.amountPaise)}`
                  : rupees(l.amountPaise)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-pay-sunken px-4 py-4 text-lg font-semibold">
          <span>Net payout</span>
          <span className="tabular-nums">
            {rupees(calculation.netPayoutPaise)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Records({ records }) {
  const navigate = useNavigate();
  const shown = records.slice(0, 50);
  return (
    <Card>
      <CardContent className="p-0">
        <h2 className="px-6 pb-4 pt-6 text-xl font-bold">
          Records in this statement
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount to restaurant</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => {
              // Bills have an admin screen (with the per-order money view); orders don't yet.
              const to = r.billId ? `/bills/${r.billId}` : null;
              return (
                <TableRow
                  key={r.entryId}
                  className={to ? "cursor-pointer" : undefined}
                  onClick={to ? () => navigate(to) : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <IconTile icon={FileText} />
                      <div>
                        <p className="text-base font-medium">
                          {r.displayNo ?? r.note ?? "—"}
                        </p>
                        <p className="mt-0.5 text-sm font-normal text-pay-ink2">
                          {r.placedAt
                            ? `Placed ${dayMonth(r.placedAt)}`
                            : `Dated ${dayMonth(r.datedAt)}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.amountToRestaurantPaise < 0
                      ? `−${rupees(-r.amountToRestaurantPaise)}`
                      : rupees(r.amountToRestaurantPaise)}
                  </TableCell>
                  <TableCell>
                    <RecordBadge value={r.status} />
                  </TableCell>
                </TableRow>
              );
            })}
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center font-normal text-pay-ink2"
                >
                  Historical per-order details are unavailable for this
                  statement.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <p className="px-6 py-5 text-sm text-pay-ink2">
          Showing {shown.length} of {records.length} records · Open a bill for
          its full settlement
        </p>
      </CardContent>
    </Card>
  );
}

// The right-hand action card for the payout's state (the frames' D1–D6 + M1 background).
function ActionCard({ data, open, onReceipt, receiptBusy }) {
  const navigate = useNavigate();
  const { settlement, transfer, eligibility } = data;
  const status = settlement.status;
  const hold = settlement.hold;
  const ticket = data.linkedTickets?.[0];
  const reviewBank = () => navigate(`/stores/${data.restaurant._id}`);

  // The icon tile says which state the card is for (D1–D6).
  const card = (icon, tone, title, body, buttons, extra = null) => (
    <Card>
      <CardContent>
        <IconTile icon={icon} tone={tone} />
        <h3 className="mt-6 text-lg font-semibold">{title}</h3>
        <p className="mt-3 text-sm text-pay-ink2">{body}</p>
        {extra}
        {buttons.length ? (
          <div className="mt-6 flex flex-col gap-4">{buttons}</div>
        ) : null}
      </CardContent>
    </Card>
  );
  const primary = (label, onClick) => (
    <Button key={label} type="button" onClick={onClick} className="w-full">
      {label}
    </Button>
  );
  const secondary = (label, onClick, disabled = false) => (
    <Button
      key={label}
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full"
    >
      {label}
    </Button>
  );

  if (status === "draft") {
    return card(
      CalendarDays,
      "info",
      "Schedule payout",
      "Pick the day the transfer will go out. The restaurant sees Scheduled with that date right away.",
      [
        primary("Schedule payout", () => open("schedule")),
        secondary("Place on hold", () => open("hold")),
      ],
    );
  }
  if (status === "approved") {
    return card(
      Landmark,
      "accent",
      "Release payout",
      `Scheduled for ${payoutDay(transfer.scheduledFor)}. Releasing sends the transfer but does not mark it Paid. You record the bank result next.`,
      [
        primary("Release payout", () => open("release")),
        secondary("Change date", () => open("change")),
        secondary("Place on hold", () => open("hold")),
      ],
    );
  }
  if (status === "processing") {
    return card(
      Clock3,
      "warn",
      "Record the bank result",
      "The transfer is with the bank. Save the bank reference to mark it Paid, or log the failure if the bank rejects it.",
      [
        primary("Mark as paid", () => open("paid")),
        secondary("Mark as failed", () => open("failed")),
      ],
    );
  }
  if (status === "paid") {
    return card(
      BadgeCheck,
      "positive",
      "Closed payout",
      `Paid on ${dayMonthYear(transfer.paidAt)}. The bank reference is saved.${ticket ? " Check it against the bank before replying to the ticket." : ""}`,
      [
        ...(ticket
          ? [
              secondary("Open ticket", () =>
                navigate(`/payouts/issues/${ticket._id}`),
              ),
            ]
          : []),
        secondary(
          receiptBusy ? "Downloading…" : "Download receipt",
          onReceipt,
          receiptBusy,
        ),
      ],
    );
  }
  if (status === "failed") {
    return card(
      RefreshCw,
      "danger",
      "Reschedule payout",
      "Check the account, then pick a new release date. No extra fee is charged and nothing is retried until you set one.",
      [
        primary("Reschedule payout", () => open("reschedule")),
        secondary("Review bank account", reviewBank),
        secondary("Place on hold", () => open("hold")),
      ],
    );
  }
  if (status === "on_hold" && hold?.manual) {
    return card(
      Pause,
      "warn",
      "Release hold",
      "Releasing the hold returns the payout to Eligible, not scheduled. You still pick the release date.",
      [
        primary("Release hold", () => open("releaseHold")),
        secondary("Update reason", () => open("updateHold")),
      ],
      hold.internalNote ? (
        <div className="mt-4 rounded-2xl bg-pay-sunken px-4 py-3 text-sm">
          <p className="font-semibold text-pay-ink2">
            Internal note · staff only
          </p>
          <p className="mt-1 text-pay-ink">{hold.internalNote}</p>
        </div>
      ) : null,
    );
  }
  if (status === "on_hold") {
    // Held by the data, not by a person — nothing to release here.
    return card(
      AlertTriangle,
      "warn",
      hold?.label ?? "On hold",
      hold?.reason === "PAYOUT_ACCOUNT_NOT_VERIFIED"
        ? "This payout waits until the restaurant's bank account is verified. Verify it from the store's bank card, then regenerate the week."
        : "The week's balance is negative. It is settled through later statements, not paid out.",
      hold?.reason === "PAYOUT_ACCOUNT_NOT_VERIFIED"
        ? [secondary("Review bank account", reviewBank)]
        : [],
    );
  }
  return card(
    FileText,
    "muted",
    "Carried forward",
    "This payout failed before manual release existed and its amount was moved into a later statement.",
    [],
  );
}

function Banners({ data }) {
  const navigate = useNavigate();
  const { settlement, transfer, eligibility } = data;
  const banners = [];
  if (settlement.status === "failed") {
    banners.push(
      <Banner
        key="failed"
        tone="danger"
        title={
          !transfer.lastFailure?.reason ||
          transfer.lastFailure.reason === "bank_rejected_credit"
            ? "The bank rejected the credit"
            : transfer.lastFailure.label
        }
      >
        The amount stays eligible and unpaid. No extra fee is charged and no
        retry date is promised until you set one.
        {transfer.lastFailure?.at
          ? ` Failed on ${dayMonthYear(transfer.lastFailure.at)}.`
          : ""}
      </Banner>,
    );
  }
  if (eligibility === "on_hold") {
    banners.push(
      <Banner
        key="hold"
        tone="hold"
        title={`Held for ${(settlement.hold?.label ?? "review").toLowerCase()}`}
      >
        This payout cannot be scheduled while it is on hold.
        {settlement.hold?.manual
          ? " Release the hold to make it eligible again."
          : ""}
      </Banner>,
    );
  }
  for (const t of data.linkedTickets ?? []) {
    banners.push(
      <Banner
        key={t._id}
        tone="info"
        icon={MessageSquare}
        title={`Linked payment issue ${t.ticketNumber ?? ""}`}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/payouts/issues/${t._id}`)}
          >
            Open ticket
          </Button>
        }
      >
        {ISSUE_TYPE_LABEL[t.issueType] ?? t.subject} ·{" "}
        {rupees(settlement.totals?.netPayable)} for{" "}
        {periodLabel(settlement.periodStart, settlement.periodEnd)}. The ticket
        does not change this payout&apos;s{" "}
        {transfer.status === "paid" ? "Paid " : ""}status.
        {ISSUE_STATUS[t.status]
          ? ` Ticket: ${ISSUE_STATUS[t.status].label.toLowerCase()}.`
          : ""}
      </Banner>,
    );
  }
  if (transfer.lastFailure && settlement.status !== "failed") {
    banners.push(
      <Banner key="prev-failure" tone="info" title="A previous attempt failed">
        {transfer.lastFailure.label} on {dayMonthYear(transfer.lastFailure.at)}
        {transfer.lastFailure.attemptRef
          ? ` (attempt ${transfer.lastFailure.attemptRef})`
          : ""}
        .
      </Banner>,
    );
  }
  return banners.length ? <div className="space-y-4">{banners}</div> : null;
}

export default function PayoutDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const toast = useToast();
  const origin = ORIGIN[params.get("from")] ?? ORIGIN.weekly;
  const { data, isLoading, error } = usePayout(id);
  const [modal, setModal] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const close = () => setModal(null);

  const breadcrumb = (
    <Crumbs
      items={["Payouts", origin.label, data?.restaurant?.name].filter(Boolean)}
    />
  );

  if (isLoading) {
    return (
      <AdminLayout
        breadcrumb={breadcrumb}
        title="Loading…"
        mainClassName="pay-scope gap-6"
      >
        <p className="text-sm text-pay-ink2">Loading payout…</p>
      </AdminLayout>
    );
  }
  if (error || !data) {
    return (
      <AdminLayout
        breadcrumb={breadcrumb}
        title="Payout not found"
        mainClassName="pay-scope gap-6"
      >
        <p className="text-sm text-pay-danger">
          {error?.message ?? "This payout could not be found."}
        </p>
      </AdminLayout>
    );
  }

  const fileBase = `${(data.restaurant.name ?? "restaurant").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${isoDay(data.settlement.periodStart)}`;

  // "Download statement" (PDF), its CSV, and a paid payout's "Download receipt" (PDF).
  async function download(kind) {
    setDownloading(kind);
    try {
      if (kind === "csv") {
        const blob = await adminApi.exportSettlement(data.settlement._id);
        saveBlob(blob, `statement-${fileBase}.csv`);
      } else {
        const { blob, filename } = await adminApi.downloadPayoutPdf(
          data.settlement._id,
          kind,
        );
        saveBlob(blob, filename ?? `${kind}-${fileBase}.pdf`);
      }
    } catch (err) {
      toast.error(
        err,
        kind === "receipt"
          ? "Couldn't download the receipt."
          : "Couldn't download the statement.",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AdminLayout
      breadcrumb={breadcrumb}
      title={data.restaurant.name ?? "Restaurant"}
      subtitle={subtitleOf(data)}
      mainClassName="pay-scope gap-6"
      action={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => download("statement")}
            disabled={Boolean(downloading)}
          >
            <Download />{" "}
            {downloading === "statement"
              ? "Downloading…"
              : "Download statement"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => download("csv")}
            disabled={Boolean(downloading)}
          >
            {downloading === "csv" ? "Downloading…" : "CSV"}
          </Button>
          <MoreMenu restaurant={data.restaurant} allowGenerate={false} />
        </div>
      }
    >
      <Banners data={data} />
      <SummaryStrip data={data} />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Calculation calculation={data.calculation} />
          <Records records={data.records ?? []} />
        </div>
        <div className="space-y-6">
          <ActionCard
            data={data}
            open={setModal}
            onReceipt={() => download("receipt")}
            receiptBusy={downloading === "receipt"}
          />
          <OwnerSeesCard ownerView={data.ownerView} />
        </div>
      </section>

      <PayoutProgress
        steps={data.progress ?? []}
        eligibility={data.eligibility}
        hold={data.settlement.hold}
      />

      <ScheduleModal
        open={modal === "schedule"}
        mode="schedule"
        data={data}
        onClose={close}
      />
      <ScheduleModal
        open={modal === "change"}
        mode="change"
        data={data}
        onClose={close}
      />
      <ScheduleModal
        open={modal === "reschedule"}
        mode="reschedule"
        data={data}
        onClose={close}
      />
      <ReleaseModal open={modal === "release"} data={data} onClose={close} />
      <MarkPaidModal open={modal === "paid"} data={data} onClose={close} />
      <MarkFailedModal open={modal === "failed"} data={data} onClose={close} />
      <HoldModal
        open={modal === "hold"}
        mode="hold"
        data={data}
        onClose={close}
      />
      <HoldModal
        open={modal === "updateHold"}
        mode="update"
        data={data}
        onClose={close}
      />
      <ReleaseHoldDialog
        open={modal === "releaseHold"}
        data={data}
        onClose={close}
      />
    </AdminLayout>
  );
}
