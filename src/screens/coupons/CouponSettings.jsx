import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  useCouponSettings,
  useSaveCouponSettings,
} from "@/hooks/admin/useSellers";
import { paiseToRupees, withGst } from "@/lib/coupons";
import { formatDateTime, formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";

// Settings as the form shows them (rupees, comma lists) ↔ the API's units (paise, arrays).
export function toForm(s) {
  return {
    perOrderCap: String(s.perOrderCap),
    minOrderValue: String(paiseToRupees(s.minOrderValuePaise)),
    radiusKm: String(s.radiusKm),
    reminderLeadDays: String(s.reminderLeadDays),
    smsPrice: String(paiseToRupees(s.smsPricePaise)),
    smsGstPercent: String(s.smsGstPercent),
    smsCreditPackSizes: (s.smsCreditPackSizes ?? []).join(", "),
    phoneCheckRequired: Boolean(s.phoneCheckRequired),
    agreementVersion: String(s.agreementVersion ?? 0),
    agreementText: s.agreementText ?? "",
  };
}

const packList = (text) =>
  String(text)
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);

export function fromForm(f) {
  return {
    perOrderCap: Number(f.perOrderCap),
    minOrderValuePaise: Math.round(Number(f.minOrderValue) * 100),
    radiusKm: Number(f.radiusKm),
    reminderLeadDays: Number(f.reminderLeadDays),
    smsPricePaise: Math.round(Number(f.smsPrice) * 100),
    smsGstPercent: Number(f.smsGstPercent),
    smsCreditPackSizes: packList(f.smsCreditPackSizes),
    phoneCheckRequired: f.phoneCheckRequired,
    agreementVersion: Number(f.agreementVersion),
    agreementText: f.agreementText,
  };
}

const int = (v, lo, hi) =>
  Number.isInteger(Number(v)) && v !== "" && Number(v) >= lo && Number(v) <= hi;

/** The server's ranges (couponSettings.service.js fieldShape) plus the agreement rule. */
export function validateSettings(f, active) {
  const e = {};
  if (!int(f.perOrderCap, 1, 20)) e.perOrderCap = "1 to 20";
  if (!(
    f.minOrderValue !== "" &&
    Number(f.minOrderValue) >= 0 &&
    Number(f.minOrderValue) <= 100000
  ))
    e.minOrderValue = "₹0 to ₹1,00,000";
  if (!(Number(f.radiusKm) > 0 && Number(f.radiusKm) <= 200))
    e.radiusKm = "More than 0, up to 200 km";
  if (!int(f.reminderLeadDays, 1, 30)) e.reminderLeadDays = "1 to 30 days";
  if (!(Number(f.smsPrice) >= 0.01 && Number(f.smsPrice) <= 100))
    e.smsPrice = "₹0.01 to ₹100";
  if (!(
    f.smsGstPercent !== "" &&
    Number(f.smsGstPercent) >= 0 &&
    Number(f.smsGstPercent) <= 28
  ))
    e.smsGstPercent = "0 to 28%";
  const packs = packList(f.smsCreditPackSizes);
  if (
    packs.length < 1 ||
    packs.length > 10 ||
    packs.some((n) => !Number.isInteger(n) || n < 1 || n > 1_000_000)
  )
    e.smsCreditPackSizes = "1–10 whole numbers, e.g. 100, 500, 1000";
  else if (new Set(packs).size !== packs.length)
    e.smsCreditPackSizes = "Pack sizes must be different";
  if (!int(f.agreementVersion, 0, 100_000))
    e.agreementVersion = "A whole number";
  else if (
    active &&
    f.agreementText !== (active.agreementText ?? "") &&
    Number(f.agreementVersion) <= (active.agreementVersion ?? 0)
  ) {
    e.agreementVersion =
      "Raise the version when the text changes, so every seller accepts the new one";
  }
  if (f.agreementText.length > 100_000) e.agreementText = "Too long";
  return e;
}

/** Only the fields that differ from the version in force. */
export function settingsChanges(active, f) {
  const next = fromForm(f);
  const out = {};
  for (const [k, v] of Object.entries(next)) {
    const before =
      k === "phoneCheckRequired"
        ? Boolean(active[k])
        : (active[k] ?? (k === "agreementText" ? "" : undefined));
    if (JSON.stringify(before) !== JSON.stringify(v)) out[k] = v;
  }
  return out;
}

const LABELS = {
  perOrderCap: "Coupons per order",
  minOrderValuePaise: "Minimum order",
  defaultValidityDays: "Validity",
  radiusKm: "Radius",
  reminderLeadDays: "Reminder lead",
  smsPricePaise: "SMS price",
  smsGstPercent: "SMS GST",
  smsCreditPackSizes: "Credit packs",
  phoneCheckRequired: "Phone check",
  agreementVersion: "Agreement version",
  agreementText: "Agreement text",
};

/**
 * The coupon rules. Every save is a new version in force at once; earlier versions are kept
 * (history below) and never edited.
 */
export default function CouponSettings() {
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useCouponSettings();
  const save = useSaveCouponSettings();
  const active = settings.data?.active;
  const [f, setF] = useState(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (active) setF(toForm(active));
  }, [active]);

  if (settings.isError) {
    return (
      <AdminLayout title="Coupon settings" breadcrumb="Coupons">
        <p role="alert" className="text-sm text-brand-maroon">
          {settings.error?.message ?? "Could not load the settings."}
        </p>
      </AdminLayout>
    );
  }
  if (!active || !f) {
    return (
      <AdminLayout title="Coupon settings" breadcrumb="Coupons">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminLayout>
    );
  }

  const changes = settingsChanges(active, f);
  const changed = Object.keys(changes);
  const perSms =
    Number(f.smsPrice) > 0 && Number(f.smsGstPercent) >= 0
      ? withGst(Math.round(Number(f.smsPrice) * 100), Number(f.smsGstPercent))
      : null;
  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  function submit(e) {
    e.preventDefault();
    const found = validateSettings(f, active);
    setErrors(found);
    if (Object.keys(found).length || changed.length === 0) return;
    confirm.ask({
      title: `Save version ${active.version + 1}?`,
      description: `In force immediately. Changing: ${changed.map((k) => LABELS[k]).join(", ")}.`,
      confirmLabel: "Save settings",
      onConfirm: () =>
        save.mutateAsync(
          { ...changes, ...(note.trim() ? { note: note.trim() } : {}) },
          {
            onSuccess: (res) => {
              toast.success(`Version ${res.version.version} is in force`);
              setNote("");
            },
            onError: (err) => toast.error(err, "Could not save the settings."),
          },
        ),
    });
  }

  const field = (id, label, input, hint) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{input}</div>
      {errors[id] ? (
        <p className="mt-1 text-xs text-brand-maroon">{errors[id]}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
  const num = (id, props = {}) => (
    <Input id={id} type="number" value={f[id]} onChange={set(id)} {...props} />
  );

  return (
    <AdminLayout
      title="Coupon settings"
      breadcrumb="Coupons"
      subtitle={`Version ${active.version} in force`}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-bold">Giving out coupons</h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {field(
              "perOrderCap",
              "Coupons per order",
              num("perOrderCap", { min: 1, max: 20 }),
              "One per switched-on category, up to this",
            )}
            {field(
              "minOrderValue",
              "Minimum order (₹)",
              num("minOrderValue", { min: 0, step: "0.01" }),
              "Smaller orders get no coupons",
            )}
            {/* Fixed by the business: every coupon is valid for 30 days (backend
                COUPON_VALIDITY_DAYS) — shown, not editable. */}
            <div data-testid="validity-fixed">
              <p className="text-sm font-medium">Coupon validity</p>
              <p className="mt-2 flex h-10 items-center rounded-lg border border-dashed px-3 text-sm">
                {active.defaultValidityDays ?? 30} days (fixed)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every coupon, from every offer
              </p>
            </div>
            {field(
              "radiusKm",
              "Seller radius (km)",
              num("radiusKm", { min: 0.1, step: "0.1" }),
              "Sellers this close to the restaurant",
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-bold">Reminder SMS and redemption</h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {field(
              "reminderLeadDays",
              "Remind (days before expiry)",
              num("reminderLeadDays", { min: 1, max: 30 }),
            )}
            {field(
              "smsPrice",
              "SMS price excl. GST (₹)",
              num("smsPrice", { min: 0.01, step: "0.01" }),
              perSms
                ? `Sellers pay ${formatRupees(paiseToRupees(perSms.totalPaise))} per SMS incl. GST`
                : undefined,
            )}
            {field(
              "smsGstPercent",
              "SMS GST %",
              num("smsGstPercent", { min: 0, max: 28 }),
            )}
            {field(
              "smsCreditPackSizes",
              "Credit packs (SMS)",
              <Input
                id="smsCreditPackSizes"
                value={f.smsCreditPackSizes}
                onChange={set("smsCreditPackSizes")}
              />,
              "Comma-separated, e.g. 100, 500, 1000",
            )}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch
                checked={f.phoneCheckRequired}
                onCheckedChange={(v) =>
                  setF((x) => ({ ...x, phoneCheckRequired: v }))
                }
                aria-label="Require the phone check"
              />
              Require the last 4 digits of the customer&apos;s mobile to redeem
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-bold">Partner agreement</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {field(
              "agreementVersion",
              "Version",
              num("agreementVersion", { min: 0, className: "w-32" }),
              "0 = not published. Raise it with every change to the text; sellers then accept the new version.",
            )}
            {field(
              "agreementText",
              "Text",
              <Textarea
                id="agreementText"
                rows={28}
                // Partner agreements run to thousands of words: a tall box (about 60 % of the
                // screen) that the admin can drag taller still, with the text easy to read.
                className="min-h-[60vh] resize-y leading-relaxed"
                value={f.agreementText}
                onChange={set("agreementText")}
              />,
              `${f.agreementText.length.toLocaleString("en-IN")} characters`,
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Label htmlFor="settings-note">
              Note for the history (optional)
            </Label>
            <Input
              id="settings-note"
              className="mt-1.5"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this change"
            />
          </div>
          {changed.length ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setF(toForm(active))}
            >
              Undo changes
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={changed.length === 0 || save.isPending}
          >
            {changed.length
              ? `Save ${changed.length} change${changed.length > 1 ? "s" : ""}`
              : "No changes"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-bold">Version history</h2>
        </CardHeader>
        <CardContent>
          <Table aria-label="Version history">
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Per order · min order · validity · radius</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Agreement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.data.versions.map((v) => (
                <TableRow key={v.version}>
                  <TableCell className="font-semibold">
                    {v.version}
                    {v.version === active.version ? (
                      <span className="ml-1 text-xs text-brand-green">
                        in force
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDateTime(v.createdAt)}</TableCell>
                  <TableCell>{v.note || "—"}</TableCell>
                  <TableCell>
                    {v.perOrderCap} ·{" "}
                    {formatRupees(paiseToRupees(v.minOrderValuePaise))} ·{" "}
                    {v.defaultValidityDays}d · {v.radiusKm} km
                  </TableCell>
                  <TableCell>
                    {formatRupees(paiseToRupees(v.smsPricePaise))} +{" "}
                    {v.smsGstPercent}%
                  </TableCell>
                  <TableCell>
                    {v.agreementVersion ? `v${v.agreementVersion}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {confirm.dialog}
    </AdminLayout>
  );
}
