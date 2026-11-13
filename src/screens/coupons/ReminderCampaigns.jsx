import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationBar from "@/components/admin/PaginationBar";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import { usePagination } from "@/hooks/admin/usePagination";
import {
  useAllSellers,
  useCampaigns,
  useCouponCategories,
  useCreateCampaign,
} from "@/hooks/admin/useSellers";
import { formatDateTime, formatNumber } from "@/lib/format";
import { sellerOptions } from "@/lib/coupons";
import AdminLayout from "../AdminLayout";
import {
  CAMPAIGN_STATUS,
  campaignBody,
  describeFilters,
  expiryWindow,
  rupees,
} from "./campaigns";

const EMPTY = { category: "", seller: "", expiringFrom: "", expiringTo: "" };

/**
 * Reminder campaigns: an SMS to customers whose coupons are about to expire, paid by Yulo. Build
 * the filters, preview who'd get it and what it costs (₹3.54 per SMS incl. GST), confirm, and it
 * is queued for the next 10:00 IST run. Below: every campaign so far, Yulo's and the sellers'
 * daily automatic runs.
 */
export default function ReminderCampaigns() {
  const toast = useToast();
  const confirm = useConfirm();
  const categories = useCouponCategories();
  const sellers = useAllSellers();
  const create = useCreateCampaign();
  const [f, setF] = useState(EMPTY);
  const [preview, setPreview] = useState(null); // { body, result }
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setPreview(null); // a preview only stands for the filters it was made with
    setError("");
  };

  async function runPreview(e) {
    e.preventDefault();
    if (f.expiringFrom && f.expiringTo && f.expiringFrom > f.expiringTo)
      return setError("The expiry window starts after it ends.");
    const body = campaignBody(f);
    setPreviewing(true);
    setError("");
    try {
      setPreview({ body, result: await couponsApi.previewCampaign(body) });
    } catch (err) {
      setError(err?.message ?? "Could not preview the campaign.");
    } finally {
      setPreviewing(false);
    }
  }

  function askSend() {
    const { body, result } = preview;
    confirm.ask({
      title: `Send ${formatNumber(result.recipientCount)} reminder SMS?`,
      description: `${formatNumber(result.recipientCount)} × ${rupees(result.perSms.totalPaise)} = ${rupees(result.cost.totalPaise)} incl. GST, paid by Yulo. It goes out at the next 10:00 IST run and can't be recalled.`,
      confirmLabel: "Queue campaign",
      onConfirm: () =>
        create.mutateAsync(body, {
          onSuccess: () => {
            toast.success("Campaign queued — it goes out at 10:00 IST");
            setPreview(null);
          },
          onError: (err) =>
            err?.code === "NO_RECIPIENTS"
              ? setError("No coupons match these filters any more.")
              : toast.error(err, "Could not queue the campaign."),
        }),
    });
  }

  const field =
    "mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground";
  const r = preview?.result;

  return (
    <AdminLayout
      title="Reminder campaigns"
      breadcrumb="Coupons"
      subtitle="SMS customers whose coupons are about to expire"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={runPreview}
            noValidate
            aria-label="Campaign filters"
            className="grid grid-cols-2 items-end gap-3 md:grid-cols-6"
          >
            <label className="text-xs text-muted-foreground">
              Category
              <select
                aria-label="Category"
                className={field}
                value={f.category}
                onChange={set("category")}
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Seller
              <select
                aria-label="Seller"
                className={field}
                value={f.seller}
                onChange={set("seller")}
              >
                <option value="">All sellers</option>
                {sellerOptions(sellers.data?.sellers).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Expiring from
              <input
                type="date"
                aria-label="Expiring from"
                className={field}
                value={f.expiringFrom}
                onChange={set("expiringFrom")}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Expiring to
              <input
                type="date"
                aria-label="Expiring to"
                className={field}
                value={f.expiringTo}
                onChange={set("expiringTo")}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Status
              <select
                aria-label="Status"
                className={field}
                value="issued"
                disabled
              >
                <option value="issued">Active (unused)</option>
              </select>
            </label>
            <Button type="submit" disabled={previewing}>
              <Eye aria-hidden="true" /> {previewing ? "Counting…" : "Preview"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Only active coupons get reminders — redeemed, expired and void ones
            never do. Leave the dates blank for today to today + the reminder
            lead days in Coupon settings.
          </p>
          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-status-danger-bg p-3 text-sm text-brand-maroon"
            >
              {error}
            </p>
          ) : null}
          {r ? (
            <div
              data-testid="campaign-preview"
              className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-brand-cream/30 p-4"
            >
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {formatNumber(r.recipientCount)}{" "}
                  <span className="text-base font-normal">SMS</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  One per coupon expiring {expiryWindow(r.filters)} — a customer
                  with two such coupons gets two
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm" data-testid="campaign-cost">
                  {formatNumber(r.recipientCount)} ×{" "}
                  {rupees(r.perSms.totalPaise)} ={" "}
                  <span className="text-lg font-bold">
                    {rupees(r.cost.totalPaise)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {rupees(r.cost.pricePaise)} + {rupees(r.cost.gstPaise)} GST ·
                  paid by Yulo
                </div>
              </div>
              <Button
                onClick={askSend}
                disabled={r.recipientCount === 0 || create.isPending}
              >
                <Send aria-hidden="true" />{" "}
                {r.recipientCount === 0
                  ? "Nothing to send"
                  : `Send to ${formatNumber(r.recipientCount)}`}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CampaignList
        categories={categories.data ?? []}
        sellers={sellers.data?.sellers ?? []}
      />
      {confirm.dialog}
    </AdminLayout>
  );
}

function CampaignList({ categories, sellers }) {
  const [type, setType] = useState("admin");
  const { page, limit, setPage, setLimit } = usePagination(20);
  const campaigns = useCampaigns({ type, page, limit });
  const sellerName = (id) =>
    sellers.find((s) => String(s._id) === String(id))?.businessName ??
    "A seller";

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">Campaigns</CardTitle>
        <div role="tablist" className="flex gap-1">
          {[
            ["admin", "Yulo campaigns"],
            ["seller", "Sellers' daily runs"],
          ].map(([value, label]) => (
            <Button
              key={value}
              role="tab"
              aria-selected={type === value}
              size="sm"
              variant={type === value ? "default" : "ghost"}
              onClick={() => {
                setType(value);
                setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.isError ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg bg-status-danger-bg p-3 text-sm text-brand-maroon"
          >
            <span>
              {campaigns.error?.message ?? "Could not load campaigns."}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => campaigns.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : campaigns.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : campaigns.data.campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No campaigns yet.
          </p>
        ) : (
          <>
            <Table aria-label="Campaigns">
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Expiring</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.data.campaigns.map((c) => (
                  <TableRow key={c._id} data-testid={`campaign-${c._id}`}>
                    <TableCell>
                      <Link
                        to={`/reminder-campaigns/${c._id}`}
                        className="font-medium hover:underline"
                      >
                        {formatDateTime(c.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.sellerId
                        ? sellerName(c.sellerId)
                        : describeFilters(c.filters, categories, sellers)}
                    </TableCell>
                    <TableCell>{expiryWindow(c.filters)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.recipientCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.counts?.sent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.counts?.failed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupees(c.cost?.totalPaise)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={CAMPAIGN_STATUS[c.status]?.variant ?? "muted"}
                      >
                        {CAMPAIGN_STATUS[c.status]?.label ?? c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3">
              <PaginationBar
                page={page}
                pages={Math.max(1, Math.ceil(campaigns.data.total / limit))}
                total={campaigns.data.total}
                onPageChange={setPage}
                itemLabel="campaigns"
                pageSize={limit}
                onPageSizeChange={setLimit}
                pageSizeOptions={[20, 50, 100]}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
