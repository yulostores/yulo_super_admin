import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { useCouponPlans, useUpdatePlan } from "@/hooks/admin/useSellers";
import { paiseToRupees, withGst } from "@/lib/coupons";
import { formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";

/** Plan editor rules — the server's (couponPlan.controller.js patchSchema). */
export function validatePlan(f) {
  const e = {};
  if (f.name.trim().length < 2 || f.name.trim().length > 40)
    e.name = "2 to 40 characters";
  const base = Number(f.basePrice);
  if (!(base > 0) || base > 10_000_000) e.basePrice = "A price above ₹0";
  const gst = Number(f.gstPercent);
  if (!(gst >= 0 && gst <= 28)) e.gstPercent = "0 to 28%";
  const coupons = Number(f.couponAllocation);
  if (!Number.isInteger(coupons) || coupons < 1 || coupons > 1_000_000)
    e.couponAllocation = "A whole number, 1 or more";
  const comp = Number(f.complimentaryCount);
  if (!Number.isInteger(comp) || comp < 0 || comp > 100)
    e.complimentaryCount = "0 to 100";
  return e;
}

const fromPlan = (p) => ({
  name: p.name,
  basePrice: String(paiseToRupees(p.basePaise)),
  gstPercent: String(p.gstPercent),
  couponAllocation: String(p.couponAllocation),
  complimentaryCount: String(p.complimentaryCount),
  isActive: p.isActive,
});

/** Only what changed, in the server's units (rupees in). */
export function planChanges(plan, f) {
  const before = fromPlan(plan);
  const out = {};
  if (f.name.trim() !== before.name) out.name = f.name.trim();
  if (Number(f.basePrice) !== Number(before.basePrice))
    out.basePriceRupees = Number(f.basePrice);
  if (Number(f.gstPercent) !== Number(before.gstPercent))
    out.gstPercent = Number(f.gstPercent);
  if (Number(f.couponAllocation) !== Number(before.couponAllocation))
    out.couponAllocation = Number(f.couponAllocation);
  if (Number(f.complimentaryCount) !== Number(before.complimentaryCount))
    out.complimentaryCount = Number(f.complimentaryCount);
  if (f.isActive !== before.isActive) out.isActive = f.isActive;
  return out;
}

/**
 * Coupon plans: price (GST-exclusive; the total incl. GST is shown as it will be charged), coupons,
 * complimentary coupons for the Yulo team, on sale or not. A change applies to purchases from now
 * on — plans already bought keep what they were sold with.
 */
export default function CouponPlans() {
  const plans = useCouponPlans();
  return (
    <AdminLayout
      title="Coupon plans"
      breadcrumb="Coupons"
      subtitle="Changes apply to new purchases only"
    >
      {plans.isError ? (
        <p role="alert" className="text-sm text-brand-maroon">
          {plans.error?.message ?? "Could not load plans."}
        </p>
      ) : plans.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.data.map((p) => (
            <PlanCard key={p.key} plan={p} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function PlanCard({ plan }) {
  const toast = useToast();
  const confirm = useConfirm();
  const update = useUpdatePlan();
  const [f, setF] = useState(() => fromPlan(plan));
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };
  const changes = planChanges(plan, f);
  const dirty = Object.keys(changes).length > 0;
  const preview =
    Number(f.basePrice) > 0 && Number(f.gstPercent) >= 0
      ? withGst(Math.round(Number(f.basePrice) * 100), Number(f.gstPercent))
      : null;

  function save(e) {
    e.preventDefault();
    const found = validatePlan(f);
    setErrors(found);
    if (Object.keys(found).length || !dirty) return;
    confirm.ask({
      title: `Save the ${plan.name} plan?`,
      description:
        "New purchases use these values from now on. Plans already bought are not changed.",
      confirmLabel: "Save plan",
      onConfirm: () =>
        update.mutateAsync(
          { key: plan.key, body: changes },
          {
            onSuccess: (saved) => {
              toast.success(`${plan.name} plan saved`);
              setF(fromPlan(saved));
            },
            onError: (err) => toast.error(err, "Could not save the plan."),
          },
        ),
    });
  }

  const field = (id, label, input, err) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{input}</div>
      {err ? <p className="mt-1 text-xs text-brand-maroon">{err}</p> : null}
    </div>
  );

  return (
    <Card data-testid={`plan-${plan.key}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="font-bold">{plan.name}</h2>
        <Badge variant={plan.isActive ? "ok" : "muted"}>
          {plan.isActive ? "On sale" : "Not on sale"}
        </Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} noValidate className="space-y-3">
          {field(
            `${plan.key}-name`,
            "Name",
            <Input
              id={`${plan.key}-name`}
              value={f.name}
              onChange={set("name")}
            />,
            errors.name,
          )}
          <div className="grid grid-cols-2 gap-3">
            {field(
              `${plan.key}-base`,
              "Price excl. GST (₹)",
              <Input
                id={`${plan.key}-base`}
                type="number"
                min={0}
                step="0.01"
                value={f.basePrice}
                onChange={set("basePrice")}
              />,
              errors.basePrice,
            )}
            {field(
              `${plan.key}-gst`,
              "GST %",
              <Input
                id={`${plan.key}-gst`}
                type="number"
                min={0}
                max={28}
                value={f.gstPercent}
                onChange={set("gstPercent")}
              />,
              errors.gstPercent,
            )}
          </div>
          <p className="text-sm" data-testid={`${plan.key}-total`}>
            Customers pay{" "}
            <strong>
              {preview ? formatRupees(paiseToRupees(preview.totalPaise)) : "—"}
            </strong>{" "}
            incl. GST
          </p>
          <div className="grid grid-cols-2 gap-3">
            {field(
              `${plan.key}-coupons`,
              "Coupons",
              <Input
                id={`${plan.key}-coupons`}
                type="number"
                min={1}
                value={f.couponAllocation}
                onChange={set("couponAllocation")}
              />,
              errors.couponAllocation,
            )}
            {field(
              `${plan.key}-comp`,
              "Complimentary (Yulo team)",
              <Input
                id={`${plan.key}-comp`}
                type="number"
                min={0}
                value={f.complimentaryCount}
                onChange={set("complimentaryCount")}
              />,
              errors.complimentaryCount,
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={f.isActive}
              onCheckedChange={(v) => setF((x) => ({ ...x, isActive: v }))}
              aria-label={`${plan.name} on sale`}
            />
            On sale
          </label>
          <div className="flex justify-end gap-2 pt-1">
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setF(fromPlan(plan))}
              >
                Undo
              </Button>
            ) : null}
            <Button type="submit" disabled={!dirty || update.isPending}>
              Save
            </Button>
          </div>
        </form>
      </CardContent>
      {confirm.dialog}
    </Card>
  );
}
