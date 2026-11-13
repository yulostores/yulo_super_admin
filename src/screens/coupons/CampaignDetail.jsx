import { Link, useParams } from "react-router-dom";

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
import { usePagination } from "@/hooks/admin/usePagination";
import {
  useAllSellers,
  useCampaign,
  useCouponCategories,
} from "@/hooks/admin/useSellers";
import { formatDateTime, formatNumber } from "@/lib/format";
import AdminLayout from "../AdminLayout";
import {
  CAMPAIGN_STATUS,
  LOG_STATUS,
  describeFilters,
  expiryWindow,
  rupees,
} from "./campaigns";

/** One campaign: who it was for, what it cost, sent / failed, and the SMS log (phones masked). */
export default function CampaignDetail() {
  const { id } = useParams();
  const { page, limit, setPage, setLimit } = usePagination(50);
  const detail = useCampaign(id, { page, limit });
  const categories = useCouponCategories();
  const sellers = useAllSellers();

  const back = (
    <Button asChild variant="outline">
      <Link to="/reminder-campaigns">All campaigns</Link>
    </Button>
  );

  if (detail.isError)
    return (
      <AdminLayout title="Campaign" breadcrumb="Coupons" action={back}>
        <p role="alert" className="text-sm text-brand-maroon">
          {detail.error?.status === 404
            ? "This campaign doesn't exist."
            : (detail.error?.message ?? "Could not load the campaign.")}
        </p>
      </AdminLayout>
    );
  if (detail.isLoading)
    return (
      <AdminLayout title="Campaign" breadcrumb="Coupons" action={back}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminLayout>
    );

  const { campaign: c, logCounts, log, total } = detail.data;
  const status = CAMPAIGN_STATUS[c.status] ?? {
    label: c.status,
    variant: "muted",
  };
  const who = c.sellerId
    ? `${(sellers.data?.sellers ?? []).find((s) => String(s._id) === String(c.sellerId))?.businessName ?? "A seller"}'s daily run`
    : describeFilters(c.filters, categories.data ?? [], sellers.data?.sellers);

  return (
    <AdminLayout
      title="Reminder campaign"
      breadcrumb="Coupons"
      subtitle={`Created ${formatDateTime(c.createdAt)}`}
      action={back}
    >
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Status">
            <Badge variant={status.variant}>{status.label}</Badge>
            {c.status === "queued" ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Goes out at the next 10:00 IST run
              </div>
            ) : null}
          </Fact>
          <Fact label="For">
            {who}
            <div className="text-xs text-muted-foreground">
              Coupons expiring {expiryWindow(c.filters)}
            </div>
          </Fact>
          <Fact label="Recipients">{formatNumber(c.recipientCount)}</Fact>
          <Fact label="Cost">
            {rupees(c.cost?.totalPaise)}
            <div className="text-xs text-muted-foreground">
              {rupees(c.cost?.pricePaise)} + {rupees(c.cost?.gstPaise)} GST
            </div>
          </Fact>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3" data-testid="log-counts">
        <Count label="Sent" value={logCounts.sent} />
        <Count label="Failed" value={logCounts.failed} />
        <Count label="Waiting" value={logCounts.queued} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SMS log</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {c.status === "queued" || c.status === "draft"
                ? "Nothing sent yet."
                : "No messages were logged."}
            </p>
          ) : (
            <>
              <Table aria-label="SMS log">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((l, i) => (
                    <TableRow key={`${l.couponId}-${i}`}>
                      <TableCell className="font-mono">
                        {l.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={LOG_STATUS[l.status]?.variant ?? "muted"}
                        >
                          {LOG_STATUS[l.status]?.label ?? l.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(l.sentAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.error ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3">
                <PaginationBar
                  page={page}
                  pages={Math.max(1, Math.ceil(total / limit))}
                  total={total}
                  onPageChange={setPage}
                  itemLabel="messages"
                  pageSize={limit}
                  onPageSizeChange={setLimit}
                  pageSizeOptions={[50, 100]}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

function Count({ label, value }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {formatNumber(value)}
        </div>
      </CardContent>
    </Card>
  );
}
