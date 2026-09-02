import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStore } from "@/hooks/admin/useStores";
import { DAYS, STORE_PLANS } from "@/lib/constants";
import { hhmm, toHHMM } from "@/lib/format";
import AdminLayout from "../AdminLayout";

// A closed set under Indian company law, so it stays a dropdown. City and state
// are free text — the previous ten-item lists silently excluded every other
// city the platform operates in.
const LEGAL_ENTITY_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Other",
];

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  isOpen: true,
  openTime: 900,
  closeTime: 2200,
}));

const EMPTY = {
  name: "",
  category: "",
  description: "",
  cuisineTypes: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  establishedYear: "",
  logo: "",
  bannerImage: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  plan: "trial",
  radiusKm: "",
  baseCharge: "",
  freeThreshold: "",
  estimatedMinutes: "",
  legalEntityType: "",
  ownerName: "",
  panNumber: "",
  gstNumber: "",
  healthPermitId: "",
  licenseExpiry: "",
  ownerEmail: "",
  ownerPhone: "",
};

function Field({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? <span className="text-brand-maroon"> *</span> : null}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="capitalize">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Drops empty values so the request only carries what the admin filled in — the
// server's zod schema rejects "" for typed fields such as establishedYear.
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined || v === null) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export default function StoreCreate() {
  const navigate = useNavigate();
  const create = useCreateStore();
  const [form, setForm] = useState(EMPTY);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  const isDirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(EMPTY) ||
      JSON.stringify(hours) !== JSON.stringify(DEFAULT_HOURS),
    [form, hours],
  );

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleHourChange(index, patch) {
    setHours((cur) =>
      cur.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    );
  }

  function discardChanges() {
    setForm(EMPTY);
    setHours(DEFAULT_HOURS);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.ownerName || !form.ownerEmail) {
      setError("Restaurant name, owner name, and owner email are required.");
      return;
    }

    const body = {
      name: form.name,
      category: form.category || undefined,
      description: form.description || undefined,
      cuisineTypes: form.cuisineTypes
        ? form.cuisineTypes
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : undefined,
      email: form.contactEmail || undefined,
      phone: form.contactPhone || undefined,
      website: form.website || undefined,
      establishedYear: form.establishedYear
        ? Number(form.establishedYear)
        : undefined,
      logo: form.logo || undefined,
      bannerImage: form.bannerImage || undefined,
      plan: form.plan || undefined,
      address: clean({
        street: form.street,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      }),
      operatingHours: hours,
      delivery: clean({
        radiusKm: form.radiusKm ? Number(form.radiusKm) : "",
        baseCharge: form.baseCharge ? Number(form.baseCharge) : "",
        freeThreshold: form.freeThreshold ? Number(form.freeThreshold) : "",
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : "",
      }),
      settings: clean({
        legalEntityType: form.legalEntityType,
        ownerName: form.ownerName,
        panNumber: form.panNumber,
        gstNumber: form.gstNumber,
        healthPermitId: form.healthPermitId,
        licenseExpiry: form.licenseExpiry,
        alternatePhone: form.ownerPhone,
      }),
      owner: {
        name: form.ownerName,
        email: form.ownerEmail,
        phone: form.ownerPhone || undefined,
      },
    };

    try {
      const { data } = await create.mutateAsync(body);
      if (data.data.ownerCreated) setSuccessInfo(data.data);
      else navigate(`/stores/${data.data.store._id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (successInfo) {
    return (
      <AdminLayout
        breadcrumb="Store Management > Add New Store"
        title="Store Created"
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm">
              <strong>{successInfo.store.name}</strong> was created and a new
              owner account was set up for <strong>{form.ownerEmail}</strong>.
            </p>
            <p className="rounded-lg border border-brand-cream bg-brand-cream/20 p-3 text-sm">
              Temporary password: <strong>{successInfo.tempPassword}</strong>
              <br />
              <span className="text-xs text-muted-foreground">
                Share this with the owner directly — there is no self-service
                password reset yet, so this is the only way they can sign in.
              </span>
            </p>
            <Button
              onClick={() => navigate(`/stores/${successInfo.store._id}`)}
              className="bg-brand-orange text-white hover:brightness-105"
            >
              View Store
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      breadcrumb="Store Management > Add New Store"
      title="Add New Store"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {error ? (
          <p role="alert" className="text-sm text-brand-maroon">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Restaurant Information</h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Restaurant Name"
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
              <Field
                label="Store Category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
              />
              <Field
                label="Cuisine Types"
                className="sm:col-span-2"
                value={form.cuisineTypes}
                onChange={(e) => setField("cuisineTypes", e.target.value)}
                placeholder="Comma separated, e.g. North Indian, Chinese"
              />
              <Field
                label="Restaurant Email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField("contactEmail", e.target.value)}
              />
              <Field
                label="Restaurant Phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setField("contactPhone", e.target.value)}
              />
              <Field
                label="Website"
                type="url"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
              />
              <Field
                label="Established Year"
                type="number"
                value={form.establishedYear}
                onChange={(e) => setField("establishedYear", e.target.value)}
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Street Address
                </Label>
                <Textarea
                  value={form.street}
                  onChange={(e) => setField("street", e.target.value)}
                />
              </div>
              <Field
                label="City"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
              <Field
                label="State"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
              />
              <Field
                label="Pincode"
                value={form.pincode}
                onChange={(e) => setField("pincode", e.target.value)}
              />
              <SelectField
                label="Plan"
                value={form.plan}
                onChange={(v) => setField("plan", v)}
                options={STORE_PLANS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Brand Assets</h2>
              <p className="text-xs text-muted-foreground">
                The create endpoint stores hosted image URLs. File upload is
                available from the store&apos;s detail page once it exists.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Logo URL"
                type="url"
                value={form.logo}
                onChange={(e) => setField("logo", e.target.value)}
              />
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Logo preview"
                  className="h-24 w-24 rounded-lg border border-brand-cream object-cover"
                />
              ) : null}
              <Field
                label="Banner URL"
                type="url"
                value={form.bannerImage}
                onChange={(e) => setField("bannerImage", e.target.value)}
              />
              {form.bannerImage ? (
                <img
                  src={form.bannerImage}
                  alt="Banner preview"
                  className="h-24 w-full rounded-lg border border-brand-cream object-cover"
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">Opening Hours</h2>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-brand-cream/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Opening Time</th>
                  <th className="py-2 pr-4">Closing Time</th>
                </tr>
              </thead>
              <tbody>
                {hours.map((h, i) => (
                  <tr
                    key={h.day}
                    className="border-b border-brand-cream/40 last:border-0"
                  >
                    <td className="py-3 pr-4 capitalize">{h.day}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={h.isOpen}
                          onCheckedChange={(checked) =>
                            handleHourChange(i, { isOpen: checked })
                          }
                        />
                        <span
                          className={
                            h.isOpen
                              ? "text-brand-green"
                              : "text-muted-foreground"
                          }
                        >
                          {h.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {h.isOpen ? (
                        <Input
                          type="time"
                          className="w-36"
                          value={hhmm(h.openTime)}
                          onChange={(e) => {
                            const next = toHHMM(e.target.value);
                            if (next !== null)
                              handleHourChange(i, { openTime: next });
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {h.isOpen ? (
                        <Input
                          type="time"
                          className="w-36"
                          value={hhmm(h.closeTime)}
                          onChange={(e) => {
                            const next = toHHMM(e.target.value);
                            if (next !== null)
                              handleHourChange(i, { closeTime: next });
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">Delivery Logistics</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Radius (km)"
              type="number"
              value={form.radiusKm}
              onChange={(e) => setField("radiusKm", e.target.value)}
            />
            <Field
              label="Base Charge (₹)"
              type="number"
              value={form.baseCharge}
              onChange={(e) => setField("baseCharge", e.target.value)}
            />
            <Field
              label="Free Delivery Above (₹)"
              type="number"
              value={form.freeThreshold}
              onChange={(e) => setField("freeThreshold", e.target.value)}
            />
            <Field
              label="Estimated Minutes"
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) => setField("estimatedMinutes", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Owner &amp; Business</h2>
              <p className="text-xs text-muted-foreground">
                An owner account is created from this email if one doesn&apos;t
                already exist.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Owner Name"
                required
                value={form.ownerName}
                onChange={(e) => setField("ownerName", e.target.value)}
              />
              <Field
                label="Owner Email"
                required
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setField("ownerEmail", e.target.value)}
              />
              <Field
                label="Owner Phone"
                type="tel"
                value={form.ownerPhone}
                onChange={(e) => setField("ownerPhone", e.target.value)}
              />
              <SelectField
                label="Legal Entity Type"
                value={form.legalEntityType}
                onChange={(v) => setField("legalEntityType", v)}
                options={LEGAL_ENTITY_TYPES}
              />
              <Field
                label="PAN Number"
                value={form.panNumber}
                onChange={(e) => setField("panNumber", e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Licenses &amp; Tax</h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="GST Number"
                className="sm:col-span-2"
                value={form.gstNumber}
                onChange={(e) => setField("gstNumber", e.target.value)}
              />
              <Field
                label="FSSAI Licence No."
                value={form.healthPermitId}
                onChange={(e) => setField("healthPermitId", e.target.value)}
              />
              <Field
                label="FSSAI Licence Expiry"
                type="date"
                value={form.licenseExpiry}
                onChange={(e) => setField("licenseExpiry", e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-brand-cream/60 bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:-mx-7 lg:px-7">
          <p className="flex items-center gap-2 text-sm">
            {isDirty ? (
              <>
                <span className="h-2 w-2 rounded-full bg-brand-maroon" />
                <span className="font-medium text-brand-maroon">
                  You have unsaved changes
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No changes yet</span>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={discardChanges}>
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
              className="bg-brand-orange text-white hover:brightness-105"
            >
              {create.isPending ? "Creating…" : "Create Store"}
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
