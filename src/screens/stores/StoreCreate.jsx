import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Building2,
  CalendarDays,
  Check,
  FileImage,
  FileText,
  MapPin,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

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
import AdminLayout from "../AdminLayout";

const CUISINE_TYPES = [
  "Contemporary French",
  "North Indian",
  "South Indian",
  "Chinese",
  "Italian",
  "Mexican",
  "Thai",
  "Continental",
  "Fast Food",
  "Bakery & Desserts",
  "Multi-Cuisine",
];

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
];

const STATES = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "West Bengal",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "Punjab",
];

const LEGAL_ENTITY_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Other",
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  isOpen: day !== "sunday",
  openTime: 900,
  closeTime: 2200,
}));

const DOCUMENT_TILES = [
  { key: "fssai_license", label: "FSSAI License", icon: FileImage },
  { key: "business_registration", label: "Business Registration", icon: Building2 },
  { key: "gst_certificate", label: "GST Certificate", icon: FileText },
  { key: "pan_card", label: "Identity Proof (PAN)", icon: ShieldCheck },
  { key: "address_proof", label: "Address Proof", icon: MapPin },
  { key: "bank_statement", label: "Bank Statement", icon: Banknote },
];

const EMPTY = {
  name: "",
  category: "",
  cuisineType: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  establishedYear: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  radiusKm: "5",
  baseCharge: "0",
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

function hhmm(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).padStart(4, "0");
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

function Field({ label, required, value, onChange, type = "text", placeholder, className }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? " *" : ""}
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

function SelectField({ label, value, onChange, options, placeholder = "Select…", className }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Visual-only dropzone — there is no multipart upload endpoint wired for store
// creation yet, so this just previews the picked file locally and does not
// get sent to the server (see submit logic below).
function AssetDropzone({ label, hint, file, previewUrl, onChange }) {
  const inputRef = useRef(null);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex h-32 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream/10 text-center transition hover:border-brand-orange/60 hover:bg-brand-cream/20"
      >
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <span className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              {hint}
            </span>
          </>
        )}
      </button>
      {file ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{file.name}</p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

// Visual-only upload tile — documents aren't accepted by the store-creation
// endpoint (only the store detail page can attach/verify documents today),
// so this just shows the picked filename locally.
function DocUploadTile({ label, icon: Icon, file, onChange }) {
  const inputRef = useRef(null);
  return (
    <div>
      <p className="mb-2 truncate text-xs font-medium text-[#24190f]">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-cream bg-brand-cream/10 px-2 py-4 text-center transition hover:border-brand-orange/60 hover:bg-brand-cream/20"
      >
        {file ? (
          <>
            <Check className="h-5 w-5 text-brand-green" />
            <span className="w-full truncate text-[11px] font-medium text-[#24190f]">
              {file.name}
            </span>
          </>
        ) : (
          <>
            <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-muted-foreground">Upload</span>
            <span className="text-[10px] text-muted-foreground">PNG, JPG or PDF</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function StoreCreate() {
  const navigate = useNavigate();
  const create = useCreateStore();
  const [form, setForm] = useState(EMPTY);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [docFiles, setDocFiles] = useState({});
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  const isDirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(EMPTY) ||
      Boolean(logoFile) ||
      Boolean(bannerFile) ||
      Object.keys(docFiles).length > 0,
    [form, logoFile, bannerFile, docFiles],
  );

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleHourChange(index, patch) {
    setHours((cur) => cur.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function handleLogoChange(file) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  }

  function handleBannerChange(file) {
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : "");
  }

  function handleDocChange(key, file) {
    setDocFiles((cur) => ({ ...cur, [key]: file }));
  }

  function discardChanges() {
    setForm(EMPTY);
    setHours(DEFAULT_HOURS);
    setLogoFile(null);
    setLogoPreview("");
    setBannerFile(null);
    setBannerPreview("");
    setDocFiles({});
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
      cuisineTypes: form.cuisineType ? [form.cuisineType] : undefined,
      address: {
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
      },
      operatingHours: hours,
      delivery: {
        radiusKm: form.radiusKm ? Number(form.radiusKm) : undefined,
        baseCharge: form.baseCharge ? Number(form.baseCharge) : undefined,
        freeThreshold: form.freeThreshold ? Number(form.freeThreshold) : undefined,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      },
      settings: {
        legalEntityType: form.legalEntityType || undefined,
        ownerName: form.ownerName || undefined,
        panNumber: form.panNumber || undefined,
        gstNumber: form.gstNumber || undefined,
        healthPermitId: form.healthPermitId || undefined,
        licenseExpiry: form.licenseExpiry || undefined,
        alternatePhone: form.ownerPhone || undefined,
      },
      owner: {
        name: form.ownerName,
        email: form.ownerEmail,
        phone: form.ownerPhone || undefined,
      },
    };

    try {
      const { data } = await create.mutateAsync(body);
      if (data.data.ownerCreated) {
        setSuccessInfo(data.data);
      } else {
        navigate(`/stores/${data.data.store._id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (successInfo) {
    return (
      <AdminLayout breadcrumb="Store Management > Add New Store" title="Store Created">
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm">
              <strong>{successInfo.store.name}</strong> was created and a new owner
              account was set up for{" "}
              <strong>{successInfo.store.ownerId?.email ?? form.ownerEmail}</strong>.
            </p>
            <p className="rounded-lg border border-brand-cream bg-brand-cream/20 p-3 text-sm">
              Temporary password: <strong>{successInfo.tempPassword}</strong>
              <br />
              <span className="text-xs text-muted-foreground">
                Share this with the owner directly — there is no self-service
                password reset yet, so this is the only way they can log in for now.
              </span>
            </p>
            <Button
              onClick={() => navigate(`/stores/${successInfo.store._id}`)}
              className="bg-[#D9480F] text-white"
            >
              View Store
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumb="Store Management > Add New Store" title="Add New Store">
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {error ? <p className="text-sm text-brand-maroon">{error}</p> : null}

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
                placeholder="The Crimson Bistro"
              />
              <SelectField
                label="Cuisine Type"
                value={form.cuisineType}
                onChange={(v) => setField("cuisineType", v)}
                options={CUISINE_TYPES}
              />
              <Field
                label="Email Address"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField("contactEmail", e.target.value)}
                placeholder="contact@crimsonbistro.com"
              />
              <Field
                label="Phone Number"
                value={form.contactPhone}
                onChange={(e) => setField("contactPhone", e.target.value)}
                placeholder="+1 (555) 234-8901"
              />
              <Field
                label="Website"
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://crimsonbistro.com"
              />
              <Field
                label="Established Year"
                value={form.establishedYear}
                onChange={(e) => setField("establishedYear", e.target.value)}
                placeholder="2018"
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Full Address
                </Label>
                <Textarea
                  value={form.street}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="1248 Gourmet Way, Culinary District, Metro City, 90210"
                />
              </div>
              <SelectField
                label="City"
                value={form.city}
                onChange={(v) => setField("city", v)}
                options={CITIES}
              />
              <SelectField
                label="State"
                value={form.state}
                onChange={(v) => setField("state", v)}
                options={STATES}
              />
              <Field
                label="Pincode"
                value={form.pincode}
                onChange={(e) => setField("pincode", e.target.value)}
                placeholder="400058"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Brand Assets</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <AssetDropzone
                label="Store Logo"
                hint="UPLOAD PNG/SVG"
                file={logoFile}
                previewUrl={logoPreview}
                onChange={handleLogoChange}
              />
              <AssetDropzone
                label="Banner Image"
                hint="1920X480 RECOMMENDED"
                file={bannerFile}
                previewUrl={bannerPreview}
                onChange={handleBannerChange}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-bold">Document Information</h2>
            <p className="text-xs text-brand-orange">Upload clear and valid documents</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DOCUMENT_TILES.map((doc) => (
              <DocUploadTile
                key={doc.key}
                label={doc.label}
                icon={doc.icon}
                file={docFiles[doc.key]}
                onChange={(file) => handleDocChange(doc.key, file)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <h2 className="text-base font-bold">Opening Hours</h2>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Manage Holidays
            </Button>
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
                  <tr key={h.day} className="border-b border-brand-cream/40 last:border-0">
                    <td className="py-3 pr-4 capitalize">{h.day}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={h.isOpen}
                          onCheckedChange={(checked) => handleHourChange(i, { isOpen: checked })}
                        />
                        <span className={h.isOpen ? "text-brand-green" : "text-muted-foreground"}>
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
                            const [hh, mm] = e.target.value.split(":");
                            if (hh === undefined || mm === undefined) return;
                            handleHourChange(i, { openTime: Number(hh) * 100 + Number(mm) });
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground">--:-- --</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {h.isOpen ? (
                        <Input
                          type="time"
                          className="w-36"
                          value={hhmm(h.closeTime)}
                          onChange={(e) => {
                            const [hh, mm] = e.target.value.split(":");
                            if (hh === undefined || mm === undefined) return;
                            handleHourChange(i, { closeTime: Number(hh) * 100 + Number(mm) });
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground">--:-- --</span>
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
              label="Base Charge"
              type="number"
              value={form.baseCharge}
              onChange={(e) => setField("baseCharge", e.target.value)}
            />
            <Field
              label="Free Threshold"
              type="number"
              value={form.freeThreshold}
              onChange={(e) => setField("freeThreshold", e.target.value)}
            />
            <Field
              label="Estimated Time"
              value={form.estimatedMinutes}
              onChange={(e) => setField("estimatedMinutes", e.target.value)}
              placeholder="35-45 min"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Business Details</h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Legal Entity Type"
                value={form.legalEntityType}
                onChange={(v) => setField("legalEntityType", v)}
                options={LEGAL_ENTITY_TYPES}
              />
              <Field
                label="Owner Name"
                required
                value={form.ownerName}
                onChange={(e) => setField("ownerName", e.target.value)}
              />
              <Field
                label="Tax Identifier (PAN)"
                value={form.panNumber}
                onChange={(e) => setField("panNumber", e.target.value)}
                placeholder="ABCDE1234F"
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
                value={form.ownerPhone}
                onChange={(e) => setField("ownerPhone", e.target.value)}
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
                placeholder="27AAACR1234F1Z1"
              />
              <Field
                label="FSSAI"
                value={form.healthPermitId}
                onChange={(e) => setField("healthPermitId", e.target.value)}
                placeholder="H-992-B"
              />
              <Field
                label="FSSAI License Expiry"
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
                <span className="font-medium text-brand-maroon">You have unsaved changes</span>
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
              className="bg-[#D9480F] text-white hover:brightness-105"
            >
              {create.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
