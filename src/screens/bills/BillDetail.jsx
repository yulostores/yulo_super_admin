// One bill (/bills/:id) — GET /api/admin/bills/:billId.
//
// Shows the receipt as it was issued, not an admin summary of it: the same document the
// restaurant printed, the waiter settled and the guest paid against
// (components/admin/BillDocument.jsx). "View details" opens the round-by-round order
// history behind the total.

import { useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import BillDocument from "@/components/admin/BillDocument";
import { useBill } from "@/hooks/admin/useBills";
import { formatDateTime } from "@/lib/format";
import { humanize } from "@/lib/bill";
import AdminLayout from "../AdminLayout";

export default function BillDetail() {
  const { id } = useParams();
  const { data: bill, isLoading, error } = useBill(id);

  if (isLoading) {
    return (
      <AdminLayout breadcrumb="Bills" title="Loading…">
        <p className="text-sm text-muted-foreground">Loading bill…</p>
      </AdminLayout>
    );
  }

  if (error || !bill) {
    return (
      <AdminLayout breadcrumb="Bills" title="Bill not found">
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "This bill could not be found."}
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      breadcrumb="Bills > Bill Details"
      title={`Bill ${bill.billNumber ?? bill.reference}`}
      subtitle={[
        bill.restaurant?.name,
        bill.tableNumber ? `Table ${bill.tableNumber}` : humanize(bill.type),
        bill.payment?.paidAt
          ? `paid ${formatDateTime(bill.payment.paidAt)}`
          : `raised ${formatDateTime(bill.createdAt)}`,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <BillDocument bill={bill} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
