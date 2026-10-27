import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCustomer, useSetCustomerStatus } from "@/hooks/admin/useCustomers";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { initials } from "@/lib/format";
import AdminLayout, { formatDate } from "../AdminLayout";

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: customer, isLoading, error } = useCustomer(id);
  const setStatus = useSetCustomerStatus(id);
  const confirm = useConfirm();
  const toast = useToast();

  if (isLoading) {
    return (
      <AdminLayout breadcrumb="Customer Report" title="Loading…">
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      </AdminLayout>
    );
  }
  if (error || !customer) {
    return (
      <AdminLayout breadcrumb="Customer Report" title="Customer not found">
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "This customer could not be found."}
        </p>
      </AdminLayout>
    );
  }

  // Deactivating locks the customer out, so it is confirmed; re-activating restores access
  // and stays one tap.
  function toggleActive() {
    const next = !customer.isActive;
    const run = () =>
      setStatus.mutateAsync(next, {
        onSuccess: () =>
          toast.success(`${customer.name} ${next ? "activated" : "deactivated"}.`),
        onError: (err) => toast.error(err, "Could not change the customer's status."),
      });
    if (next) {
      run().catch(() => {});
      return;
    }
    confirm.ask({
      title: `Deactivate ${customer.name}?`,
      description: `${customer.name} can no longer sign in or place orders until you activate the account again. Their order history is kept.`,
      confirmLabel: "Deactivate customer",
      tone: "danger",
      onConfirm: run,
    });
  }

  return (
    <AdminLayout
      breadcrumb="Customer Report > Customer Details"
      title={customer.name}
      subtitle={`Customer ID: ${customer._id} · Joined ${formatDate(customer.createdAt)}`}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={toggleActive}
          disabled={setStatus.isPending}
          className={
            customer.isActive ? "text-brand-maroon" : "text-brand-green"
          }
        >
          {setStatus.isPending
            ? "Working…"
            : customer.isActive
              ? "Deactivate Customer"
              : "Activate Customer"}
        </Button>
      }
    >
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-brand-orange text-lg font-semibold text-white">
              {initials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{customer.name}</h2>
              <Badge variant={customer.isActive ? "ok" : "danger"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          </div>
        </CardContent>
      </Card>

      {customer.savedAddresses?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">Saved Addresses</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customer.savedAddresses.map((addr) => (
              <div
                key={addr._id}
                className="rounded-xl border border-brand-cream/70 p-3.5"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                  {addr.label ?? "Address"}
                </p>
                <p className="mt-1 text-sm">
                  {[addr.street, addr.city, addr.state, addr.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {confirm.dialog}
    </AdminLayout>
  );
}
