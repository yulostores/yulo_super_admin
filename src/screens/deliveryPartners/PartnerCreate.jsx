import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Landmark, User, Zap } from "lucide-react";

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
import { useCreateDeliveryPartner } from "@/hooks/admin/useDeliveryPartners";
import {
  ACCOUNT_TYPES,
  GENDERS,
  MAX_UPLOAD_MB,
  VEHICLE_TYPES,
} from "@/lib/constants";
import AdminLayout from "../AdminLayout";

// Every document is optional server-side (admin/deliveryPartner.controller.js
// skips any field that wasn't sent), so none is marked required here.
const FILE_FIELDS = [
  { key: "aadharCard", label: "Aadhaar Card" },
  { key: "drivingLicense", label: "Driving License" },
  { key: "vehicleRc", label: "Vehicle RC" },
  { key: "insuranceDocument", label: "Insurance Document" },
  { key: "profilePhoto", label: "Profile Photo" },
];

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  emergencyPhone: "",
  aadharNumber: "",
  panNumber: "",
  vehicleModel: "",
  vehicleNumber: "",
  vehicleType: "",
  vehicleRcNumber: "",
  insuranceProvider: "",
  insuranceNumber: "",
  insuranceValidTill: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  accountType: "",
  ifscCode: "",
  branchName: "",
  upiId: "",
};

function FieldLabel({ label, required }) {
  return (
    <Label>
      {label}
      {required ? <span className="text-brand-red"> *</span> : null}
    </Label>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} />
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

// Visual-only "+91" country-code chip in front of phone-style inputs, matching
// the Figma reference. Purely presentational — value/onChange wiring is
// untouched so it still binds straight to the same form field.
function PhoneField({ label, required, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} />
      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-input bg-white shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <span className="flex h-full shrink-0 items-center gap-1 border-r border-input bg-brand-cream/20 px-2 text-sm text-muted-foreground">
          <span aria-hidden="true">🇮🇳</span>
          <span>+91</span>
        </span>
        <Input
          type="tel"
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="h-full flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

// Date input with a decorative calendar icon to match the reference; the
// native picker indicator is stretched over the icon (invisible) so clicking
// it still opens the date picker.
function DateField({ label, required, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <Input
          type="date"
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="pr-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:opacity-0"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function PartnerCreate() {
  const navigate = useNavigate();
  const create = useCreateDeliveryPartner();
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState({});
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setFile(key, file) {
    if (file && file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`${key} exceeds ${MAX_UPLOAD_MB}MB`);
      return;
    }
    setError("");
    setFiles((f) => ({ ...f, [key]: file }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.phone) {
      setError("Full name, email, and phone are required.");
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    Object.entries(files).forEach(([k, file]) => {
      if (file) fd.append(k, file);
    });

    try {
      const { data } = await create.mutateAsync(fd);
      navigate(`/delivery-partners/${data.data.partner._id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout
      breadcrumb="Delivery Partners > Add New Delivery Partner"
      title="Add New Delivery Partner"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <p className="text-sm text-brand-maroon">{error}</p> : null}

        <Card>
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <User className="h-5 w-5 text-brand-orange" />
              Personal Information
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Full Name"
                required
                placeholder="Enter full name"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
              />
              <TextField
                label="Email Address"
                required
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PhoneField
                label="Phone Number"
                required
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
              <DateField
                label="Date of Birth"
                placeholder="Select date of birth"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
              <div className="space-y-1.5">
                <FieldLabel label="Gender" />
                <Select
                  value={form.gender}
                  onValueChange={(v) => setField("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PhoneField
                label="Emergency Phone Number"
                placeholder="Enter emergency number"
                value={form.emergencyPhone}
                onChange={(e) => setField("emergencyPhone", e.target.value)}
              />
              <TextField
                label="Aadhaar Number"
                placeholder="12-digit Aadhaar number"
                value={form.aadharNumber}
                onChange={(e) => setField("aadharNumber", e.target.value)}
              />
              <TextField
                label="PAN Number"
                placeholder="ABCDE1234F"
                value={form.panNumber}
                onChange={(e) => setField("panNumber", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-5 w-5 text-brand-orange" />
              Vehicle Information
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Vehicle Model"
              placeholder="Enter vehicle model"
              value={form.vehicleModel}
              onChange={(e) => setField("vehicleModel", e.target.value)}
            />
            <TextField
              label="Vehicle Number"
              placeholder="Enter vehicle number"
              value={form.vehicleNumber}
              onChange={(e) => setField("vehicleNumber", e.target.value)}
            />
            <div className="space-y-1.5">
              <Label>Vehicle Type</Label>
              <Select
                value={form.vehicleType}
                onValueChange={(v) => setField("vehicleType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TextField
              label="RC Number"
              placeholder="Enter RC number"
              value={form.vehicleRcNumber}
              onChange={(e) => setField("vehicleRcNumber", e.target.value)}
            />
            <TextField
              label="Insurance Provider"
              placeholder="Enter insurance provider"
              value={form.insuranceProvider}
              onChange={(e) => setField("insuranceProvider", e.target.value)}
            />
            <TextField
              label="Insurance Number"
              placeholder="Enter insurance number"
              value={form.insuranceNumber}
              onChange={(e) => setField("insuranceNumber", e.target.value)}
            />
            <DateField
              label="Insurance Valid Till"
              placeholder="Select date"
              value={form.insuranceValidTill}
              onChange={(e) => setField("insuranceValidTill", e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <FileText className="h-5 w-5 text-brand-orange" />
              Documents
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload clear and valid documents
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FILE_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <FieldLabel label={f.label} />
                <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-cream bg-brand-cream/10 p-4 text-center hover:bg-brand-cream/20">
                  {f.key === "profilePhoto" ? (
                    <User className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs font-semibold">
                    {files[f.key] ? files[f.key].name : "Upload"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    PNG, JPG or PDF
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) =>
                      setFile(f.key, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Landmark className="h-5 w-5 text-brand-orange" />
              Bank Details
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Bank Name"
              placeholder="Enter bank name"
              value={form.bankName}
              onChange={(e) => setField("bankName", e.target.value)}
            />
            <TextField
              label="Account Holder Name"
              placeholder="Enter account holder name"
              value={form.accountHolderName}
              onChange={(e) => setField("accountHolderName", e.target.value)}
            />
            <TextField
              label="Account Number"
              placeholder="Enter account number"
              value={form.accountNumber}
              onChange={(e) => setField("accountNumber", e.target.value)}
            />
            <div className="space-y-1.5">
              <FieldLabel label="Account Type" />
              <Select
                value={form.accountType}
                onValueChange={(v) => setField("accountType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TextField
              label="IFSC Code"
              placeholder="Enter IFSC code"
              value={form.ifscCode}
              onChange={(e) => setField("ifscCode", e.target.value)}
            />
            <TextField
              label="Branch Name"
              placeholder="Enter branch name"
              value={form.branchName}
              onChange={(e) => setField("branchName", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/delivery-partners")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={create.isPending}
            className="bg-brand-orange text-white hover:brightness-105"
          >
            {create.isPending ? "Creating…" : "Create Delivery Partner"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
