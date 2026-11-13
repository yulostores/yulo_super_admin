import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import {
  useCouponCategories,
  useSaveCategory,
  useToggleCategory,
} from "@/hooks/admin/useSellers";
import AdminLayout from "../AdminLayout";

/** The category form's rules — the server's (couponOffer.service.js categorySchema). */
export function validateCategory(f, isNew) {
  const e = {};
  if (isNew && !/^[a-z0-9-]{2,30}$/.test(f.key.trim().toLowerCase()))
    e.key = "2–30 lowercase letters, digits or dashes";
  const name = f.name.trim();
  if (name.length < 2 || name.length > 40) e.name = "2 to 40 characters";
  return e;
}

/**
 * Coupon categories: customers get one coupon per switched-on category, in this order. Each row
 * shows whether switching it on would give anything out — the active sellers, how many have a
 * live offer, and the stock they have left.
 */
export default function CouponCategories() {
  const toast = useToast();
  const confirm = useConfirm();
  const categories = useCouponCategories();
  const toggle = useToggleCategory();
  const save = useSaveCategory();
  const [editing, setEditing] = useState(null); // null | "new" | category

  const askToggle = (c) => {
    const turningOn = !c.enabled;
    confirm.ask({
      title: `${turningOn ? "Switch on" : "Switch off"} ${c.name}?`,
      description: turningOn
        ? c.sellersWithLiveOffer === 0 || c.stockRemaining === 0
          ? `Customers will start getting ${c.name} coupons — but no seller in it can give any out yet (${c.sellersWithLiveOffer} with a live offer, ${c.stockRemaining} coupons left).`
          : `Customers start getting ${c.name} coupons with their paid orders.`
        : `No more ${c.name} coupons are given out. Coupons customers already have stay valid.`,
      confirmLabel: turningOn ? "Switch on" : "Switch off",
      tone: turningOn ? undefined : "danger",
      onConfirm: () =>
        toggle.mutateAsync(
          { id: c._id, enabled: turningOn },
          {
            onSuccess: () =>
              toast.success(`${c.name} is ${turningOn ? "on" : "off"}`),
            onError: (err) =>
              toast.error(
                err,
                `Could not switch ${c.name} ${turningOn ? "on" : "off"}.`,
              ),
          },
        ),
    });
  };

  // Swap sortOrder with the neighbour (one request each).
  const move = async (list, index, delta) => {
    const a = list[index];
    const b = list[index + delta];
    if (!b) return;
    const aOrder =
      a.sortOrder === b.sortOrder ? a.sortOrder + delta : b.sortOrder;
    const bOrder = a.sortOrder === b.sortOrder ? b.sortOrder : a.sortOrder;
    try {
      await save.mutateAsync({ id: a._id, body: { sortOrder: aOrder } });
      await save.mutateAsync({ id: b._id, body: { sortOrder: bOrder } });
    } catch (err) {
      toast.error(err, "Could not change the order.");
    }
  };

  return (
    <AdminLayout
      title="Coupon categories"
      breadcrumb="Coupons"
      subtitle="Customers get one coupon per switched-on category, in this order"
      action={
        editing === null ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> Add category
          </Button>
        ) : null
      }
    >
      {editing !== null ? (
        <CategoryForm
          category={editing === "new" ? null : editing}
          nextOrder={(categories.data?.length ?? 0) + 1}
          onDone={() => setEditing(null)}
        />
      ) : null}
      <Card>
        <CardContent className="p-4">
          {categories.isError ? (
            <p role="alert" className="text-sm text-brand-maroon">
              {categories.error?.message ?? "Could not load categories."}
            </p>
          ) : categories.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Active sellers</TableHead>
                  <TableHead>With a live offer</TableHead>
                  <TableHead>Coupons left</TableHead>
                  <TableHead>Customers get it</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.data.map((c, i, list) => (
                  <TableRow key={c._id} data-testid={`cat-${c.key}`}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Move ${c.name} up`}
                          disabled={i === 0 || save.isPending}
                          onClick={() => move(list, i, -1)}
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Move ${c.name} down`}
                          disabled={i === list.length - 1 || save.isPending}
                          onClick={() => move(list, i, 1)}
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{c.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {c.key}
                      </span>
                    </TableCell>
                    <TableCell>{c.activeSellers}</TableCell>
                    <TableCell>{c.sellersWithLiveOffer}</TableCell>
                    <TableCell>
                      {c.stockRemaining.toLocaleString("en-IN")}
                      {c.enabled && c.stockRemaining === 0 ? (
                        <Badge variant="warn" className="ml-2">
                          Nothing to give
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={() => askToggle(c)}
                        aria-label={`${c.name} on`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(c)}
                      >
                        <Pencil aria-hidden="true" /> Rename
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {confirm.dialog}
    </AdminLayout>
  );
}

function CategoryForm({ category, nextOrder, onDone }) {
  const toast = useToast();
  const save = useSaveCategory();
  const [f, setF] = useState({
    key: category?.key ?? "",
    name: category?.name ?? "",
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  async function submit(e) {
    e.preventDefault();
    const found = validateCategory(f, !category);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await save.mutateAsync(
        category
          ? { id: category._id, body: { name: f.name.trim() } }
          : {
              body: {
                key: f.key.trim().toLowerCase(),
                name: f.name.trim(),
                sortOrder: nextOrder,
              },
            },
      );
      toast.success(
        category
          ? "Category renamed"
          : `${f.name.trim()} added — switched off until you turn it on`,
      );
      onDone();
    } catch (err) {
      if (err?.status === 409)
        setErrors({ key: "A category with this key already exists" });
      else toast.error(err, "Could not save the category.");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-wrap items-end gap-3"
        >
          {!category ? (
            <div>
              <Label htmlFor="cat-key">Key</Label>
              <Input
                id="cat-key"
                className="mt-1.5 w-48"
                placeholder="e.g. pharmacy"
                value={f.key}
                onChange={set("key")}
              />
              {errors.key ? (
                <p className="mt-1 text-xs text-brand-maroon">{errors.key}</p>
              ) : null}
            </div>
          ) : null}
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              className="mt-1.5 w-64"
              placeholder="Pharmacy"
              value={f.name}
              onChange={set("name")}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-brand-maroon">{errors.name}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={save.isPending}>
            {category ? "Save name" : "Add category"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
