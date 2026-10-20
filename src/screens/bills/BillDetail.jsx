// One bill (/bills/:id) — GET /api/admin/bills/:billId.
//
// Shows the receipt as it was issued, not an admin summary of it: the same document the
// restaurant printed, the waiter settled and the guest paid against
// (components/admin/BillDocument.jsx). "View details" opens the round-by-round order
// history behind the total.
//
// Beside it, the admin-only money picture (components/admin/MoneyBreakdown.jsx): a delivery
// or takeaway bill's figures live on its order, a dine-in bill's on the bill. This is also
// the admin's view of a single order — there is no separate order screen, and every
// delivery / takeaway order has its own bill.

import { useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import BillDocument from "@/components/admin/BillDocument";
import MoneyBreakdown from "@/components/admin/MoneyBreakdown";
import { useBill } from "@/hooks/admin/useBills";
import { useBillMoney } from "@/hooks/admin/useFinance";
import { formatDateTime } from "@/lib/format";
import { humanize } from "@/lib/bill";
import AdminLayout from "../AdminLayout";

export default function BillDetail() {
  const { id } = useParams();
  const { data: bill, isLoading, error } = useBill(id);
  const money = useBillMoney(bill);

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
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <BillDocument bill={bill} />
          </CardContent>
        </Card>
        <MoneyBreakdown
          data={money.data}
          isLoading={money.isLoading}
          error={money.error}
        />
      </div>
    </AdminLayout>
  );
}
