import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import { useSellerBill } from "@/hooks/admin/useSellers";
import { saveBlob } from "@/lib/download";
import { formatDate, formatDateTime, formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";
import { KIND_LABEL } from "./SellerBillsList";

const rupees = (paise) => formatRupees((paise ?? 0) / 100);

/** One seller bill as issued: who issued it, who it is billed to, the lines, the payment. */
export default function SellerBillDetail() {
  const { id } = useParams();
  const toast = useToast();
  const bill = useSellerBill(id);
  const [downloading, setDownloading] = useState(false);
  const back = (
    <Button asChild variant="outline">
      <Link to="/seller-bills">All seller bills</Link>
    </Button>
  );

  if (bill.isError)
    return (
      <AdminLayout title="Seller bill" breadcrumb="Coupons" action={back}>
        <p role="alert" className="text-sm text-brand-maroon">
          {bill.error?.status === 404
            ? "This bill doesn't exist."
            : (bill.error?.message ?? "Could not load the bill.")}
        </p>
      </AdminLayout>
    );
  if (bill.isLoading)
    return (
      <AdminLayout title="Seller bill" breadcrumb="Coupons" action={back}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminLayout>
    );

  const b = bill.data;

  async function download() {
    setDownloading(true);
    try {
      saveBlob(await couponsApi.sellerBillPdf(b.id), `${b.billNumber}.pdf`);
    } catch (err) {
      toast.error(err, "Could not download the bill.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AdminLayout
      title={`Bill ${b.billNumber}`}
      breadcrumb="Coupons > Seller bills"
      subtitle={`${b.seller?.name ?? "—"} · ${KIND_LABEL[b.kind]} · paid ${formatDateTime(b.paidAt)}`}
      action={
        <div className="flex gap-2">
          {back}
          <Button onClick={download} disabled={downloading}>
            <Download aria-hidden="true" />{" "}
            {downloading ? "Downloading…" : "Download PDF"}
          </Button>
        </div>
      }
    >
      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="space-y-6 p-6" data-testid="seller-bill">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold">{b.issuedBy.name}</p>
              {b.issuedBy.gstin ? (
                <p className="text-xs text-muted-foreground">
                  GSTIN {b.issuedBy.gstin}
                </p>
              ) : null}
              {b.issuedBy.address ? (
                <p className="text-xs text-muted-foreground">
                  {b.issuedBy.address}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Bill number</p>
              <p className="font-mono text-base font-bold">{b.billNumber}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(b.paidAt)}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/40 p-4 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Billed to
            </p>
            <p className="mt-1 font-semibold">{b.billedTo.name ?? "—"}</p>
            {b.billedTo.ownerName ? <p>{b.billedTo.ownerName}</p> : null}
            {b.billedTo.address ? (
              <p className="text-muted-foreground">{b.billedTo.address}</p>
            ) : null}
            <p className="text-muted-foreground">
              {[
                b.billedTo.phone,
                b.billedTo.gstin && `GSTIN ${b.billedTo.gstin}`,
                b.billedTo.category,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <table className="w-full text-sm" aria-label="Bill lines">
            <tbody>
              {b.lines.map((l) => (
                <tr key={l.label} className="border-b last:border-0">
                  <td className="py-2">{l.label}</td>
                  <td className="py-2 text-right tabular-nums">
                    {rupees(l.amountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground">
                <td className="pt-3 text-base font-bold">Total</td>
                <td
                  className="pt-3 text-right text-base font-bold tabular-nums"
                  data-testid="bill-total"
                >
                  {rupees(b.totalPaise)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <Fact label="Paid by">
              <Badge variant={b.payment.method === "online" ? "info" : "muted"}>
                {b.payment.methodLabel}
              </Badge>
              {b.payment.modeLabel ? ` ${b.payment.modeLabel}` : ""}
            </Fact>
            <Fact label="Reference">
              <span className="font-mono">{b.payment.reference ?? "—"}</span>
            </Fact>
            {b.payment.receivedOn ? (
              <Fact label="Received on">
                {formatDate(b.payment.receivedOn)}
              </Fact>
            ) : null}
            <Fact label="Paid on">{formatDateTime(b.paidAt)}</Fact>
            <Fact label="Amount paid">
              {b.payment.amountPaise == null
                ? "—"
                : rupees(b.payment.amountPaise)}
            </Fact>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{children}</div>
    </div>
  );
}
