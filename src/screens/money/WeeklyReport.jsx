// Weekly Report (/weekly-report) — GET /api/admin/finance/weekly-report.
//
// One week, everything Yulo owes: each restaurant's statement and each rider's weekly payout, with
// the account to pay into. The admin sends the money by net banking / UPI, then clicks "Mark paid"
// and enters the transfer's reference. The restaurant portal then shows "Paid · <ref>" and the
// rider app the week as paid — both read the same records this page writes.
//
// Restaurants: "Mark paid" walks the statement through schedule → release → paid on the server,
// with every check of the Payouts page (verified account, unchanged amount). Holds, failures and
// the step-by-step flow stay on Restaurant Payouts.

import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Bike, CheckCircle2, Store, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { usePayRestaurant, usePayRider, useWeeklyReport } from "@/hooks/admin/useMoney";
import { useGenerateSettlements } from "@/hooks/admin/usePayouts";
import { formatDate } from "@/lib/format";
import AdminLayout from "../AdminLayout";
import WeekNav, { weekParam } from "./WeekNav";
import { paise } from "./OrdersMoney";

const REF_RULES = { requireReason: true, minReasonLength: 4, reasonLabel: "Bank / UPI reference (UTR)", reasonPlaceholder: "e.g. 412345678901" };

function SummaryCard({ icon: Icon, title, owed, owedCount, paid, paidCount, tone }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Icon className={`h-4 w-4 ${tone}`} /> {title}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Still to pay</p>
            <p className={`text-2xl font-bold tabular-nums ${owed > 0 ? "text-brand-orange" : "text-brand-green"}`}>{paise(owed)}</p>
            <p className="text-[11px] text-muted-foreground">{owedCount} pending</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-semibold tabular-nums text-brand-green">{paise(paid)}</p>
            <p className="text-[11px] text-muted-foreground">{paidCount} paid</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PaidCell = ({ paidAt, reference }) => (
  <div className="text-xs">
    <Badge variant="ok" className="gap-1">
      <CheckCircle2 className="h-3 w-3" /> Paid
    </Badge>
    <p className="mt-1 text-muted-foreground">{paidAt ? formatDate(paidAt) : ""}</p>
    {reference ? <p className="font-mono text-muted-foreground">{reference}</p> : null}
  </div>
);

export default function WeeklyReport() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const week = params.get("week") ?? undefined;
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useWeeklyReport(week);
  const payRestaurant = usePayRestaurant();
  const payRider = usePayRider();
  const generate = useGenerateSettlements();
  const confirm = useConfirm();
  const toast = useToast();

  const setWeek = (w) => setParams(w ? { week: w } : {});

  const askPayRestaurant = (r) =>
    confirm.ask({
      title: `Mark ${r.restaurant.name ?? "this restaurant"} paid?`,
      description: `Only after you have sent ${paise(r.netPayablePaise)} by net banking to ${r.account.label ?? "the restaurant's verified account"}. The restaurant will see this payout as Paid with the reference you enter. This can't be undone here.`,
      ...REF_RULES,
      confirmLabel: `Mark ${paise(r.netPayablePaise)} paid`,
      onConfirm: (reference) =>
        payRestaurant.mutateAsync(
          { settlementId: r.settlementId, reference, expectedNetPaise: r.netPayablePaise },
          {
            onSuccess: () => toast.success(`${r.restaurant.name ?? "Restaurant"} marked paid.`),
            onError: (err) => toast.error(err, "Couldn't mark it paid."),
          },
        ),
    });

  const askPayRider = (r) =>
    confirm.ask({
      title: `Mark ${r.rider.name ?? "this rider"} paid?`,
      description: `Only after you have sent ${paise(r.netPayablePaise)} to ${r.account?.label ?? "the rider's bank / UPI (see their profile)"}. The rider will see this week as Paid in the app, with the reference you enter.`,
      ...REF_RULES,
      confirmLabel: `Mark ${paise(r.netPayablePaise)} paid`,
      onConfirm: (reference) =>
        payRider.mutateAsync(
          { payoutId: r.payoutId, reference },
          {
            onSuccess: () => toast.success(`${r.rider.name ?? "Rider"} marked paid.`),
            onError: (err) => toast.error(err, "Couldn't mark it paid."),
          },
        ),
    });

  const generateStatements = async () => {
    try {
      await generate.mutateAsync(data.periodStart);
      await refetch();
      toast.success("Restaurant statements generated for this week.");
    } catch (err) {
      toast.error(err, "Couldn't generate the statements.");
    }
  };

  const s = data?.summary;
  return (
    <AdminLayout title="Weekly Report" subtitle="What Yulo owes each restaurant and rider for the week — pay them, then mark each one paid.">
      <WeekNav
        periodStart={data?.periodStart}
        periodEnd={data?.periodEnd}
        onChange={setWeek}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        updatedAt={dataUpdatedAt}
        onThisWeek={() => setWeek(weekParam(new Date()))}
      />
      {error ? <p className="text-sm text-brand-maroon">Couldn&apos;t load: {error.message}</p> : null}

      {data && !data.weekEnded ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          This week is still running — its figures keep growing and it can be paid once it ends (Monday).
        </div>
      ) : null}
      {data?.recordsWaitingForStatement > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-cream bg-white px-4 py-3 text-sm">
          <span>
            {data.recordsWaitingForStatement} cleared restaurant record{data.recordsWaitingForStatement === 1 ? " is" : "s are"} not in a
            statement yet (statements are made every Monday at 03:00).
          </span>
          <Button size="sm" onClick={generateStatements} disabled={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate now"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Wallet className="h-4 w-4 text-brand-green" /> Money in (orders placed this week)
            </p>
            <p className="text-2xl font-bold tabular-nums">{paise(data?.moneyIn?.yuloReceivedPaise)}</p>
            <p className="text-[11px] text-muted-foreground">
              received online from {data?.moneyIn?.count ?? 0} orders &amp; bills · Yulo keeps {paise(data?.moneyIn?.yuloKeepsPaise)} after
              restaurants, riders and Razorpay fees
            </p>
          </CardContent>
        </Card>
        <SummaryCard icon={Store} title="Restaurants" tone="text-brand-orange" owed={s?.restaurants.owedPaise} owedCount={s?.restaurants.owedCount ?? 0} paid={s?.restaurants.paidPaise} paidCount={s?.restaurants.paidCount ?? 0} />
        <SummaryCard icon={Bike} title="Delivery partners" tone="text-blue-700" owed={s?.riders.owedPaise} owedCount={s?.riders.owedCount ?? 0} paid={s?.riders.paidPaise} paidCount={s?.riders.paidCount ?? 0} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-bold">Restaurants</h2>
          <p className="text-xs text-muted-foreground">
            A statement holds the orders whose money cleared this week (2 working days after payment). Holds and failed
            transfers are handled on Restaurant Payouts.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Pay into</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.restaurants ?? []).map((r) => (
                <TableRow key={r.settlementId}>
                  <TableCell className="font-semibold">{r.restaurant.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                  <TableCell className="text-xs">
                    {r.account.label ?? "—"}
                    {!r.account.verified ? <span className="block text-brand-maroon">Not verified</span> : null}
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${r.netPayablePaise < 0 ? "text-brand-maroon" : ""}`}>
                    {paise(r.netPayablePaise)}
                  </TableCell>
                  <TableCell>
                    {r.transfer.status === "paid" ? (
                      <PaidCell paidAt={r.transfer.paidAt} reference={r.transfer.reference} />
                    ) : (
                      <Badge variant={r.status === "on_hold" ? "warn" : "muted"}>{r.status === "on_hold" ? "On hold" : r.transfer.label}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {r.canMarkPaid ? (
                        <Button size="sm" onClick={() => askPayRestaurant(r)}>
                          Mark paid
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => navigate(`/payouts/${r.settlementId}`)}>
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.restaurants ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No restaurant statements for this week. Orders delivered late in a week clear (2 working days after
                    payment) into the next week&apos;s statement.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-bold">Delivery partners</h2>
          <p className="text-xs text-muted-foreground">Deliveries completed this week: pay per delivery + distance pay + tips (100% theirs), ± adjustments.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead className="text-right">Deliveries</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead className="text-right">Tips</TableHead>
                <TableHead className="text-right">Adj.</TableHead>
                <TableHead>Pay into</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.riders ?? []).map((r) => (
                <TableRow key={r.payoutId}>
                  <TableCell>
                    <p className="font-semibold">{r.rider.name ?? "—"}</p>
                    {r.rider.phone ? <p className="text-xs text-muted-foreground">{r.rider.phone}</p> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.deliveries}</TableCell>
                  <TableCell className="text-right tabular-nums">{paise(r.basePayPaise + r.distancePayPaise)}</TableCell>
                  <TableCell className="text-right tabular-nums">{paise(r.tipsPaise)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.incentivesPaise - r.deductionsPaise ? paise(r.incentivesPaise - r.deductionsPaise) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{r.account?.label ?? <span className="text-brand-maroon">No bank / UPI on file</span>}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{paise(r.netPayablePaise)}</TableCell>
                  <TableCell>
                    {r.status === "paid" ? <PaidCell paidAt={r.paidAt} reference={r.reference} /> : <Badge variant="muted">Pending</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.canMarkPaid ? (
                      <Button size="sm" onClick={() => askPayRider(r)}>
                        Mark paid
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.riders ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No deliveries this week.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {confirm.dialog}
    </AdminLayout>
  );
}
