import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCustomer, useSetCustomerStatus } from "@/hooks/admin/useCustomers";
import AdminLayout, { formatDate } from "../AdminLayout";

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: customer, isLoading, error } = useCustomer(id);
  const setStatus = useSetCustomerStatus(id);

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

  return (
    <AdminLayout
      breadcrumb="Customer Report > Customer Details"
      title={customer.name}
      subtitle={`Customer ID: ${customer._id} · Joined ${formatDate(customer.createdAt)}`}
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus.mutate(!customer.isActive)}
          disabled={setStatus.isPending}
          className={customer.isActive ? "text-brand-maroon" : "text-[#2E7D32]"}
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
            <AvatarFallback className="bg-[#D9480F] text-lg font-semibold text-white">
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
    </AdminLayout>
  );
}
