// Restaurant Payouts (Figma S1–S5): Weekly batch · Clearance queue · Payout history · Bank
// requests. Release is manual and per restaurant — Schedule → Release → Record the result —
// and every number here is the server's (services/payoutView.service.js).

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Headset,
  Info,
  Landmark,
  ShieldCheck,
  Store,
} from "lucide-react";

import { Badge } from "./ui";
import { Button } from "./ui";
import { Card, CardContent } from "./ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";
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
import { usePagination } from "@/hooks/admin/usePagination";
import { usePaymentIssueCounts } from "@/hooks/admin/usePaymentIssues";
import {
  useBankRequests,
  usePayoutsClearance,
  usePayoutsHistory,
  usePayoutsWeekly,
} from "@/hooks/admin/usePayouts";
import { useStores } from "@/hooks/admin/useStores";
import {
  BANK_REQUEST_STATUS,
  TRANSFER,
  dayMonth,
  dayMonthYear,
  isoDay,
  payoutDay,
  periodLabel,
  rupees,
  shiftWeek,
  todayIso,
} from "@/lib/payouts";
import AdminLayout from "../AdminLayout";
import { MoreMenu } from "./MaintenanceTools";
import {
  Banner,
  EligibilityBadge,
  IconTile,
  KpiCard,
  PayoutTabs,
  TransferBadge,
  saveBlob,
} from "./parts";

const ACTION_LABEL = {
  schedule: "Schedule",
  review: "Review",
  record_result: "Record result",
  reschedule: "Reschedule",
  review_hold: "Review hold",
  view: "Open",
};

function RestaurantCell({ name, sub }) {
  return (
    <div className="flex items-center gap-4">
      <IconTile icon={Store} />
      <div>
        <p className="text-base font-medium">{name ?? "—"}</p>
        {sub ? <p className="mt-0.5 text-sm text-pay-ink2">{sub}</p> : null}
      </div>
    </div>
  );
}

// A record row's title cell with its file tile (clearance orders).
function RecordCell({ title, sub }) {
  return (
    <div className="flex items-center gap-4">
      <IconTile icon={FileText} />
      <div>
        <p className="text-base font-medium">{title}</p>
        {sub ? <p className="mt-0.5 text-sm text-pay-ink2">{sub}</p> : null}
      </div>
    </div>
  );
}

function RowAction({ label, onClick }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Button>
  );
}

function TableState({ isLoading, empty, colSpan, emptyText }) {
  if (isLoading)
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="py-10 text-center font-normal text-pay-ink2"
        >
          Loading…
        </TableCell>
      </TableRow>
    );
  if (empty)
    return (
      <TableRow>
        <TableCell
          colSpan={colSpan}
          className="py-10 text-center font-normal text-pay-ink2"
        >
          {emptyText}
        </TableCell>
      </TableRow>
    );
  return null;
}

// A table in a card: 20 bold title (+ 14 subtitle), the table edge to edge, a 14 #666 footer
// line with the pager in it (only when there is more than one page).
function TableCard({ title, subtitle, children, footer, pager }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 pb-4 pt-6">
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-pay-ink2">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer || pager ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pay-line/70 px-6 py-4 text-sm text-pay-ink2">
            <span>{footer}</span>
            {pager}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// The pager inside a table card's footer — only when there is more than one page, so the
// footer's own count line isn't repeated by a second one below the card.
function Pager({ page, total, limit, setPage }) {
  const pages = total ? Math.max(1, Math.ceil(total / limit)) : 1;
  if (pages <= 1) return null;
  return (
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
  );
}

// ── S1 / S2 · Weekly batch ─────────────────────────────────────────────────────────────────
function WeeklyTab({ data, isLoading, error }) {
  const navigate = useNavigate();
  const open = (id) => navigate(`/payouts/${id}?from=weekly`);
  const k = data?.kpis;
  const rows = data?.rows ?? [];
  const empty = !isLoading && rows.length === 0;
  const range = data ? periodLabel(data.periodStart, data.periodEnd) : "";

  return (
    <>
      {error ? (
        <p className="text-sm text-pay-danger">{error.message}</p>
      ) : null}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CreditCard}
          label="Batch total"
          value={rupees(k?.batchTotal.amountPaise ?? 0)}
          sub={
            k?.batchTotal.restaurants
              ? `${k.batchTotal.restaurants} restaurant${k.batchTotal.restaurants === 1 ? "" : "s"} · ${k.batchTotal.orders} orders`
              : "No statements this week"
          }
          actionLabel={empty ? "View history" : "View batch"}
          onAction={() =>
            empty
              ? navigate("/payouts?tab=history")
              : document
                  .getElementById("weekly-batch")
                  ?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <KpiCard
          icon={CreditCard}
          label="Ready to release"
          value={rupees(k?.readyToRelease.amountPaise ?? 0)}
          sub={
            k?.readyToRelease.restaurants
              ? `${k.readyToRelease.restaurants} restaurant${k.readyToRelease.restaurants === 1 ? "" : "s"} · scheduled`
              : "Nothing scheduled yet"
          }
          actionLabel="Review queue"
          onAction={() => navigate("/payouts?tab=history&status=scheduled")}
        />
        <KpiCard
          icon={CreditCard}
          label="On hold"
          value={rupees(k?.onHold.amountPaise ?? 0)}
          sub={
            k?.onHold.restaurants
              ? `${k.onHold.restaurants} restaurant${k.onHold.restaurants === 1 ? "" : "s"}${k.onHold.reasons?.length ? ` · ${k.onHold.reasons.join(", ").toLowerCase()}` : ""}`
              : "No payouts on hold"
          }
          actionLabel={empty ? "View hold" : "Review hold"}
          onAction={() => navigate("/payouts?tab=history&status=not_scheduled")}
        />
        <KpiCard
          icon={CreditCard}
          label="Awaiting clearance"
          value={rupees(k?.awaitingClearance.amountPaise ?? 0)}
          sub={`${k?.awaitingClearance.orders ?? 0} orders · not in a statement`}
          actionLabel="View queue"
          onAction={() => navigate("/payouts?tab=clearance")}
        />
      </section>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <IconTile icon={CalendarDays} tone="info" size={56} />
            <h2 className="text-xl font-bold">No payouts to release yet</h2>
            <p className="max-w-md text-base text-pay-ink2">
              Statements are created when a week closes and its orders clear.
              Nothing is waiting for you to release for {range}.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Button
                type="button"
                onClick={() => navigate("/payouts?tab=clearance")}
              >
                View clearance queue
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/payouts?tab=history")}
              >
                View payout history
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div id="weekly-batch">
          <TableCard title="Weekly batch">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead className="text-right">Food incl. GST</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net payable</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead>Bank transfer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.settlementId}
                    className="cursor-pointer"
                    onClick={() => open(r.settlementId)}
                  >
                    <TableCell>
                      <RestaurantCell
                        name={r.restaurant?.name}
                        sub={
                          r.restaurant?.gstRegistered === false
                            ? "Not GST registered"
                            : "GST registered"
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupees(r.foodInclGstPaise)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* Deductions are positive; a week whose credits beat its food total
                          (adjustments, carried-in money) shows as + */}
                      {r.deductionsPaise > 0
                        ? `−${rupees(r.deductionsPaise)}`
                        : r.deductionsPaise < 0
                          ? `+${rupees(-r.deductionsPaise)}`
                          : rupees(0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupees(r.netPayablePaise)}
                    </TableCell>
                    <TableCell>
                      <EligibilityBadge value={r.eligibility} />
                    </TableCell>
                    <TableCell>
                      <TransferBadge value={r.transfer?.status} />
                      {r.transfer?.status === "scheduled" ? (
                        <p className="mt-1 text-sm font-normal text-pay-ink2">
                          {payoutDay(r.transfer.scheduledFor)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowAction
                        label={ACTION_LABEL[r.nextAction] ?? "Open"}
                        onClick={() => open(r.settlementId)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableState isLoading={isLoading} colSpan={7} />
              </TableBody>
            </Table>
          </TableCard>
        </div>
      )}

      {empty ? null : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            [
              "1 · Schedule",
              "Pick the release date. The restaurant sees Scheduled with that date.",
              CalendarDays,
              "info",
            ],
            [
              "2 · Release",
              "Confirm amount and account, then send the transfer. The restaurant sees Processing.",
              Landmark,
              "accent",
            ],
            [
              "3 · Record the result",
              "Save the bank reference to mark Paid, or log a failure. Nothing turns Paid on its own.",
              BadgeCheck,
              "positive",
            ],
          ].map(([title, text, icon, tone]) => (
            <Card key={title}>
              <CardContent>
                <IconTile icon={icon} tone={tone} />
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm text-pay-ink2">{text}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}

// ── S3 · Clearance queue ───────────────────────────────────────────────────────────────────
function ClearanceTab() {
  const navigate = useNavigate();
  const { page, limit, setPage, setLimit } = usePagination(20);
  const { data, isLoading, error } = usePayoutsClearance({ page, limit });
  const rows = data?.rows ?? [];
  const totals = data?.totals;

  return (
    <>
      <Banner
        tone="info"
        icon={Info}
        title="Orders clear before they can be paid out"
      >
        Online payments clear after T+2. Until then an order is not eligible,
        has no statement and cannot be scheduled. Nothing here needs your action
        yet.
      </Banner>
      {error ? (
        <p className="text-sm text-pay-danger">{error.message}</p>
      ) : null}
      <TableCard
        title="Clearance queue"
        subtitle="Orders paid online that have not cleared yet."
        footer={
          totals
            ? `${totals.count} order${totals.count === 1 ? "" : "s"} · ${rupees(totals.expectedPayoutPaise)} clearing · ${totals.restaurants} restaurant${totals.restaurants === 1 ? "" : "s"}`
            : null
        }
        pager={
          <Pager
            page={data?.page ?? page}
            total={totals?.count}
            limit={limit}
            setPage={setPage}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Customer paid</TableHead>
              <TableHead className="text-right">Expected payout</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Statement</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.kind}-${r.id}`}>
                <TableCell>
                  <RecordCell
                    title={r.displayNo}
                    sub={r.restaurant?.name ?? "—"}
                  />
                </TableCell>
                <TableCell>
                  <p>{dayMonth(r.placedAt)}</p>
                  <p className="mt-0.5 text-sm font-normal text-pay-ink2">
                    {r.stage === "awaiting_delivery"
                      ? "Not delivered yet"
                      : r.clearsAt
                        ? `Clears ${dayMonth(r.clearsAt)}`
                        : "Clearing"}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.customerPaidPaise != null
                    ? rupees(r.customerPaidPaise)
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.expectedPayoutPaise != null
                    ? rupees(r.expectedPayoutPaise)
                    : "—"}
                </TableCell>
                <TableCell>
                  <EligibilityBadge value="pending" />
                </TableCell>
                <TableCell className="text-pay-ink2">Not assigned</TableCell>
                <TableCell className="text-right">
                  {/* The super admin has no order screen — a dine-in bill opens its bill page;
                      a delivery order still clearing has nothing to open yet. */}
                  {r.kind === "bill" ? (
                    <RowAction
                      label="View order"
                      onClick={() => navigate(`/bills/${r.id}`)}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            <TableState
              isLoading={isLoading}
              empty={!isLoading && rows.length === 0}
              colSpan={7}
              emptyText="No orders are clearing — every paid order is in a statement."
            />
          </TableBody>
        </Table>
      </TableCard>
    </>
  );
}

// ── S4 · Payout history ────────────────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { value: "4w", label: "Last 4 weeks", days: 28 },
  { value: "12w", label: "Last 12 weeks", days: 84 },
  { value: "all", label: "All time", days: null },
];

// The history filters as the API's query (also what the header's CSV download exports).
function historyQuery(filters) {
  const range = RANGE_OPTIONS.find((r) => r.value === filters.range);
  return {
    restaurantId: filters.restaurantId || undefined,
    transferStatus: filters.status || undefined,
    from: range?.days
      ? new Date(Date.now() - range.days * 86_400_000).toISOString()
      : undefined,
  };
}

// S4's "Download CSV" sits in the page header (the filtered set, every page).
function HistoryCsvButton({ filters }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  async function exportCsv() {
    setDownloading(true);
    try {
      saveBlob(
        await adminApi.exportPayoutsHistory(historyQuery(filters)),
        `payout-history-${todayIso()}.csv`,
      );
    } catch (err) {
      toast.error(err, "Couldn't download the payout history.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      onClick={exportCsv}
      disabled={downloading}
    >
      <Download /> {downloading ? "Downloading…" : "Download CSV"}
    </Button>
  );
}

function HistoryTab({ filters, setFilters }) {
  const navigate = useNavigate();
  const { page, limit, setPage } = usePagination(20);
  const { data: stores } = useStores({ limit: 100 });

  const query = useMemo(() => historyQuery(filters), [filters]);
  const { data, isLoading, error } = usePayoutsHistory({
    ...query,
    page,
    limit,
  });
  const k = data?.kpis;
  const rows = data?.rows ?? [];

  const set = (patch) => {
    setPage(1);
    setFilters({ ...filters, ...patch });
  };

  return (
    <>
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard
          icon={CreditCard}
          label="Paid to restaurants"
          value={rupees(k?.paid.amountPaise ?? 0)}
          sub={`${k?.paid.count ?? 0} completed transfer${k?.paid.count === 1 ? "" : "s"}`}
          actionLabel="View paid"
          onAction={() => set({ status: "paid" })}
        />
        <KpiCard
          icon={CreditCard}
          label="Scheduled"
          value={rupees(k?.scheduled.amountPaise ?? 0)}
          sub={`${k?.scheduled.count ?? 0} payout${k?.scheduled.count === 1 ? "" : "s"}${k?.scheduled.nextDate ? ` · ${payoutDay(k.scheduled.nextDate)}` : ""}`}
          actionLabel="View scheduled"
          onAction={() => set({ status: "scheduled" })}
        />
        <KpiCard
          icon={CreditCard}
          label="Not yet scheduled"
          value={rupees(k?.notYetScheduled.amountPaise ?? 0)}
          sub={`${k?.notYetScheduled.count ?? 0} payout${k?.notYetScheduled.count === 1 ? "" : "s"} · eligible`}
          actionLabel="Schedule"
          onAction={() => set({ status: "not_scheduled" })}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.restaurantId || "all"}
          onValueChange={(v) => set({ restaurantId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-auto min-w-[150px] gap-2">
            <SelectValue placeholder="Restaurant: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Restaurant: All</SelectItem>
            {(stores?.stores ?? []).map((s) => (
              <SelectItem key={s._id} value={String(s._id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => set({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-auto min-w-[130px] gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            {Object.entries(TRANSFER).map(([key, t]) => (
              <SelectItem key={key} value={key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.range} onValueChange={(v) => set({ range: v })}>
          <SelectTrigger className="w-auto min-w-[130px] gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => set({ restaurantId: "", status: "", range: "4w" })}
          className="px-2 text-sm font-semibold text-pay-outline hover:underline"
        >
          Reset
        </button>
      </div>

      {error ? (
        <p className="text-sm text-pay-danger">{error.message}</p>
      ) : null}
      <TableCard
        title="Payout ledger"
        subtitle="Every statement and its bank transfer. Paid means you saved the bank reference."
        footer={
          data
            ? `Showing ${rows.length} of ${data.total} payouts · Paid total ${rupees(k?.paid.amountPaise ?? 0)} · Scheduled and held amounts not included`
            : null
        }
        pager={
          <Pager
            page={data?.page ?? page}
            total={data?.total}
            limit={limit}
            setPage={setPage}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Statement period</TableHead>
              <TableHead className="text-right">Net payout</TableHead>
              <TableHead>Bank transfer</TableHead>
              <TableHead>Transfer date</TableHead>
              <TableHead>Bank reference</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.settlementId}
                className="cursor-pointer"
                onClick={() =>
                  navigate(`/payouts/${r.settlementId}?from=history`)
                }
              >
                <TableCell>
                  <RestaurantCell
                    name={r.restaurant?.name}
                    sub="Weekly statement"
                  />
                </TableCell>
                <TableCell>{periodLabel(r.periodStart, r.periodEnd)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {rupees(r.netPayoutPaise)}
                </TableCell>
                <TableCell>
                  {r.eligibility === "on_hold" ? (
                    <EligibilityBadge value="on_hold" />
                  ) : (
                    <TransferBadge value={r.transfer?.status} />
                  )}
                </TableCell>
                <TableCell>
                  {r.transferDate ? dayMonthYear(r.transferDate) : "—"}
                </TableCell>
                <TableCell
                  className={r.bankReference ? undefined : "text-pay-ink2"}
                >
                  {r.bankReference ??
                    (r.transfer?.status === "paid"
                      ? "On record"
                      : "Added when paid")}
                </TableCell>
                <TableCell className="text-right">
                  <RowAction
                    label="Open"
                    onClick={() =>
                      navigate(`/payouts/${r.settlementId}?from=history`)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableState
              isLoading={isLoading}
              empty={!isLoading && rows.length === 0}
              colSpan={7}
              emptyText="No payouts match your filters."
            />
          </TableBody>
        </Table>
      </TableCard>
    </>
  );
}

// ── S5 · Bank requests ─────────────────────────────────────────────────────────────────────
function BankRequestsTab() {
  const navigate = useNavigate();
  const { page, limit, setPage } = usePagination(20);
  const { data, isLoading, error } = useBankRequests({
    status: "open",
    page,
    limit,
  });
  const rows = data?.requests ?? [];

  return (
    <>
      <Banner
        tone="info"
        icon={ShieldCheck}
        title="Review before the next release"
      >
        Owners ask for a bank change from Bank &amp; payout settings. A request
        does not change any payout status. A scheduled or failed payout stays as
        it is until you act on it.
      </Banner>
      {error ? (
        <p className="text-sm text-pay-danger">{error.message}</p>
      ) : null}
      <TableCard
        title="Bank update requests"
        subtitle="Full account details stay protected. You see masked digits only."
        footer={
          data?.counts
            ? `${data.counts.open} open request${data.counts.open === 1 ? "" : "s"} · ${data.counts.awaitingRestaurant} awaiting restaurant`
            : null
        }
        pager={
          <Pager
            page={data?.page ?? page}
            total={data?.total}
            limit={limit}
            setPage={setPage}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Current account</TableHead>
              <TableHead>Request status</TableHead>
              <TableHead>Affects</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const st = BANK_REQUEST_STATUS[r.requestStatus] ?? {
                label: r.requestStatus,
                variant: "muted",
              };
              const a = r.affects;
              return (
                <TableRow key={r.restaurantId}>
                  <TableCell>
                    <RestaurantCell
                      name={r.restaurantName}
                      sub={`Bank account update${r.requestedAccountLast4 ? ` · to ending ${r.requestedAccountLast4}` : ""}`}
                    />
                  </TableCell>
                  <TableCell>{dayMonth(r.receivedAt)}</TableCell>
                  <TableCell>
                    {r.currentAccountLast4
                      ? `Ending ${r.currentAccountLast4}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {a ? (
                      <>
                        <p className="tabular-nums">
                          {rupees(a.netPayablePaise)}
                        </p>
                        <p className="mt-0.5 text-sm font-normal text-pay-ink2">
                          {TRANSFER[a.transferStatus]?.label ??
                            a.transferStatus}
                          {a.scheduledFor
                            ? ` · ${payoutDay(a.scheduledFor)}`
                            : ""}
                        </p>
                      </>
                    ) : (
                      <span className="text-pay-ink2">No open payout</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowAction
                      label="Review request"
                      onClick={() =>
                        navigate(`/stores/${r.restaurantId}#bank-account`)
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            <TableState
              isLoading={isLoading}
              empty={!isLoading && rows.length === 0}
              colSpan={6}
              emptyText="No open bank account change requests."
            />
          </TableBody>
        </Table>
      </TableCard>
    </>
  );
}

const TABS = ["weekly", "clearance", "history", "bank"];

export default function PayoutsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "weekly";
  const weekStart = params.get("week") ?? undefined;
  const weekly = usePayoutsWeekly(weekStart);
  const { data: issueCounts } = usePaymentIssueCounts();
  const counts = weekly.data?.tabCounts;
  const openIssues =
    (issueCounts?.open ?? 0) +
    (issueCounts?.in_review ?? 0) +
    (issueCounts?.awaiting_restaurant ?? 0);

  const historyFilters = {
    restaurantId: params.get("restaurant") ?? "",
    status: params.get("status") ?? "",
    range: params.get("range") ?? "4w",
  };
  const setHistoryFilters = (f) => {
    const next = { tab: "history" };
    if (f.restaurantId) next.restaurant = f.restaurantId;
    if (f.status) next.status = f.status;
    if (f.range && f.range !== "4w") next.range = f.range;
    setParams(next);
  };

  const tabs = [
    { key: "weekly", label: "Weekly batch", to: "/payouts" },
    {
      key: "clearance",
      label: "Clearance queue",
      count: counts?.clearanceQueue,
      to: "/payouts?tab=clearance",
    },
    { key: "history", label: "Payout history", to: "/payouts?tab=history" },
    {
      key: "bank",
      label: "Bank requests",
      count: counts?.bankRequests,
      to: "/payouts?tab=bank",
    },
  ];

  const data = weekly.data;
  const goWeek = (n) =>
    data && setParams({ week: isoDay(shiftWeek(data.periodStart, n)) });
  const firstScheduled = data?.rows?.find(
    (r) => r.transfer?.status === "scheduled",
  );

  const action = (
    <div className="flex shrink-0 items-center gap-3 font-pay">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate("/payouts/issues")}
      >
        <Headset /> Payment issues
        {openIssues ? (
          <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-pay-accent px-1 text-[11px] font-bold text-white">
            {openIssues}
          </span>
        ) : null}
      </Button>
      {tab === "history" ? <HistoryCsvButton filters={historyFilters} /> : null}
      {data && (tab === "weekly" || tab === "clearance") ? (
        <>
          {/* The week chip (S1–S3); the arrows step through weeks on the batch tab. */}
          <div className="flex h-10 items-center rounded-full border border-pay-outline bg-white text-sm font-semibold text-pay-outline">
            {tab === "weekly" ? (
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => goWeek(-1)}
                className="grid h-10 w-9 place-items-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="px-1">
              Week {periodLabel(data.periodStart, data.periodEnd)}
            </span>
            {tab === "weekly" ? (
              <button
                type="button"
                aria-label="Next week"
                onClick={() => goWeek(1)}
                className="grid h-10 w-9 place-items-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="w-5" />
            )}
          </div>
          {tab === "weekly" && firstScheduled ? (
            <Button
              type="button"
              onClick={() =>
                navigate(`/payouts/${firstScheduled.settlementId}?from=weekly`)
              }
            >
              Review ready payouts
            </Button>
          ) : null}
        </>
      ) : null}
      <MoreMenu />
    </div>
  );

  return (
    <AdminLayout
      title="Payouts"
      subtitle={
        tab === "history" || tab === "bank"
          ? "Manually release each restaurant's weekly payout. Owners see every status change."
          : undefined
      }
      action={action}
      mainClassName="pay-scope gap-6"
    >
      <PayoutTabs tabs={tabs} active={tab} />
      {tab === "weekly" ? (
        <WeeklyTab
          data={weekly.data}
          isLoading={weekly.isLoading}
          error={weekly.error}
        />
      ) : null}
      {tab === "clearance" ? <ClearanceTab /> : null}
      {tab === "history" ? (
        <HistoryTab filters={historyFilters} setFilters={setHistoryFilters} />
      ) : null}
      {tab === "bank" ? <BankRequestsTab /> : null}
    </AdminLayout>
  );
}
