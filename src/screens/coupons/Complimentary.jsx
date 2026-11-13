import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import {
  useAllSellers,
  useComplimentary,
  useComplimentaryAction,
} from "@/hooks/admin/useSellers";
import { formatDate } from "@/lib/format";
import { sellerOptions } from "@/lib/coupons";
import AdminLayout from "../AdminLayout";
import { COUPON_STATUS } from "./CouponsList";
import { toPhoneDigits } from "./ManualIssueDialog";

/**
 * Complimentary coupons: each plan bought comes with a few extra coupons reserved for the Yulo
 * team (sellers and customers never see them). Hand each to a team member, and mark it used when
 * it is. Grouped by seller and plan purchase.
 */
export default function Complimentary() {
  const [filters, setFilters] = useState({
    seller: "",
    assigned: "",
    status: "issued",
  });
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v),
  );
  const pools = useComplimentary(params);
  const sellers = useAllSellers({ status: "active" });
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const select = (key, label, options) => (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        aria-label={label}
        value={filters[key]}
        onChange={set(key)}
        className="mt-1 block h-9 w-full rounded-lg border border-input bg-white px-2 text-sm text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <AdminLayout
      title="Complimentary coupons"
      breadcrumb="Coupons"
      subtitle="Reserved for the Yulo team — 5 with every plan"
    >
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          {select("seller", "Seller", [
            { value: "", label: "All sellers" },
            ...sellerOptions(sellers.data?.sellers),
          ])}
          {select("assigned", "Assigned", [
            { value: "", label: "Assigned or not" },
            { value: "false", label: "Not assigned yet" },
            { value: "true", label: "Assigned" },
          ])}
          {select("status", "Status", [
            { value: "", label: "Any status" },
            ...Object.entries(COUPON_STATUS).map(([value, s]) => ({
              value,
              label: s.label,
            })),
          ])}
        </CardContent>
      </Card>

      {pools.isError ? (
        <p role="alert" className="text-sm text-brand-maroon">
          {pools.error?.message ?? "Could not load complimentary coupons."}
        </p>
      ) : pools.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pools.data.groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No complimentary coupons match.
        </p>
      ) : (
        pools.data.groups.map((g) => (
          <Card key={g.subscriptionId} data-testid={`pool-${g.subscriptionId}`}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <h2 className="text-sm font-bold">
                <Link
                  to={`/sellers/${g.seller.id}`}
                  className="hover:underline"
                >
                  {g.seller.name}
                </Link>{" "}
                <span className="font-normal text-muted-foreground">
                  · {g.plan?.name ?? "Plan"} plan
                  {g.activatedAt ? ` bought ${formatDate(g.activatedAt)}` : ""}
                </span>
              </h2>
              <Badge variant="muted">{g.coupons.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {g.coupons.map((c) => (
                  <ComplimentaryRow key={c.id} coupon={c} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </AdminLayout>
  );
}

function ComplimentaryRow({ coupon }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [assigning, setAssigning] = useState(false);
  const markUsed = useComplimentaryAction(() =>
    couponsApi.markComplimentaryUsed(coupon.id),
  );
  const status = COUPON_STATUS[coupon.status] ?? {
    label: coupon.status,
    variant: "muted",
  };
  const usable = coupon.status === "issued";

  return (
    <li className="py-3" data-testid={`comp-${coupon.code}`}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono">{coupon.code}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-xs text-muted-foreground">
          expires {formatDate(coupon.expiresAt)}
        </span>
        <span className="flex-1">
          {coupon.assignedTo ? (
            <>
              <span className="font-medium">{coupon.assignedTo.name}</span>{" "}
              <span className="text-muted-foreground">
                {coupon.assignedTo.phone}
              </span>
              {coupon.assignedTo.note ? (
                <span className="block text-xs text-muted-foreground">
                  {coupon.assignedTo.note}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </span>
        {usable && !assigning ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssigning(true)}
            >
              {coupon.assignedTo ? "Reassign" : "Assign"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                confirm.ask({
                  title: `Mark ${coupon.code} as used?`,
                  description: coupon.assignedTo
                    ? `Used by ${coupon.assignedTo.name}. This can't be undone.`
                    : "It isn't assigned to anyone yet. This can't be undone.",
                  confirmLabel: "Mark used",
                  onConfirm: () =>
                    markUsed.mutateAsync(undefined, {
                      onSuccess: () =>
                        toast.success(`${coupon.code} marked used`),
                      onError: (err) =>
                        toast.error(err, "Could not mark it used."),
                    }),
                })
              }
            >
              Mark used
            </Button>
          </>
        ) : null}
      </div>
      {assigning ? (
        <AssignForm coupon={coupon} onDone={() => setAssigning(false)} />
      ) : null}
      {confirm.dialog}
    </li>
  );
}

function AssignForm({ coupon, onDone }) {
  const toast = useToast();
  const assign = useComplimentaryAction((body) =>
    couponsApi.assignComplimentary(coupon.id, body),
  );
  const [f, setF] = useState({
    name: coupon.assignedTo?.name ?? "",
    phone: coupon.assignedTo?.phone ?? "",
    note: coupon.assignedTo?.note ?? "",
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (f.name.trim().length < 2) found.name = "Enter the team member's name";
    const phone = toPhoneDigits(f.phone);
    if (!/^[6-9]\d{9}$/.test(phone))
      found.phone = "Enter a 10-digit mobile number";
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await assign.mutateAsync({
        name: f.name.trim(),
        phone,
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      toast.success(`${coupon.code} assigned to ${f.name.trim()}`);
      onDone();
    } catch (err) {
      toast.error(err, "Could not assign the coupon.");
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-brand-cream/30 p-3"
      aria-label={`Assign ${coupon.code}`}
    >
      <div>
        <Label htmlFor={`as-name-${coupon.id}`}>Team member</Label>
        <Input
          id={`as-name-${coupon.id}`}
          className="mt-1 w-48"
          value={f.name}
          onChange={set("name")}
        />
        {errors.name ? (
          <p className="mt-1 text-xs text-brand-maroon">{errors.name}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor={`as-phone-${coupon.id}`}>Mobile</Label>
        <Input
          id={`as-phone-${coupon.id}`}
          inputMode="tel"
          className="mt-1 w-40"
          value={f.phone}
          onChange={set("phone")}
        />
        {errors.phone ? (
          <p className="mt-1 text-xs text-brand-maroon">{errors.phone}</p>
        ) : null}
      </div>
      <div className="min-w-[12rem] flex-1">
        <Label htmlFor={`as-note-${coupon.id}`}>Note (optional)</Label>
        <Input
          id={`as-note-${coupon.id}`}
          className="mt-1"
          value={f.note}
          onChange={set("note")}
          placeholder="For the launch event"
        />
      </div>
      <Button type="submit" size="sm" disabled={assign.isPending}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}
