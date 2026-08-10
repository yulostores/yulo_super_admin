import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bike,
  Calendar,
  Clock,
  Download,
  FileText,
  Landmark,
  Mail,
  Package,
  Phone,
  Star,
  Trash2,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import EditableCard from "@/components/admin/EditableCard";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  useAdjustPayout,
  useDeliveryPartner,
  useDeliveryPartners,
  usePartnerOrders,
  usePayouts,
  useReassignOrderPartner,
  useRemoveDeliveryPartner,
  useUpdateDeliveryPartner,
} from "@/hooks/admin/useDeliveryPartners";
import AdminLayout, { formatDate, formatNumber, formatPrice } from "../AdminLayout";

const PAYOUT_STATUS_VARIANT = {
  pending: "warn",
  processing: "info",
  paid: "ok",
};

function PayoutDetails({ partnerId }) {
  const [period, setPeriod] = useState("weekly");
  const { data, isLoading } = usePayouts(partnerId, { period });
  const adjust = useAdjustPayout(partnerId);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ incentives: "0", deductions: "0" });

  function beginEdit(payout) {
    setEditingId(payout._id);
    setForm({
      incentives: String(payout.incentives ?? 0),
      deductions: String(payout.deductions ?? 0),
    });
  }

  function save(payoutId) {
    adjust.mutate(
      {
        payoutId,
        body: {
          incentives: Number(form.incentives) || 0,
          deductions: Number(form.deductions) || 0,
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <h2 className="text-base font-bold">Payout Details</h2>
        <div className="flex gap-1 rounded-lg border border-brand-cream/70 p-1">
          {["weekly", "monthly"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                period === p
                  ? "bg-[#D9480F] text-white"
                  : "text-muted-foreground hover:bg-brand-cream/40"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payouts…</p>
        ) : null}
        {(data?.rows ?? []).map((payout) => (
          <div
            key={payout._id}
            className="rounded-xl border border-brand-cream/70 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payout.deliveriesCount} deliveries · ₹{payout.perDeliveryRate}/delivery
                </p>
              </div>
              <Badge
                variant={PAYOUT_STATUS_VARIANT[payout.status] ?? "muted"}
                className="capitalize"
              >
                {payout.status}
              </Badge>
            </div>

            {editingId === payout._id ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Incentives</Label>
                  <Input
                    type="number"
                    value={form.incentives}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, incentives: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Deductions</Label>
                  <Input
                    type="number"
                    value={form.deductions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deductions: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => save(payout._id)}
                    disabled={adjust.isPending}
                    className="rounded-lg bg-[#D9480F] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-brand-cream px-3 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Gross Earnings" value={formatPrice(payout.grossEarnings)} />
                <Field label="Incentives" value={formatPrice(payout.incentives)} />
                <Field label="Deductions" value={formatPrice(payout.deductions)} />
                <Field label="Net Payable" value={formatPrice(payout.netPayable)} />
              </div>
            )}

            {editingId !== payout._id ? (
              <button
                type="button"
                onClick={() => beginEdit(payout)}
                className="mt-2 text-xs font-semibold text-brand-orange"
              >
                Adjust incentives/deductions
              </button>
            ) : null}
          </div>
        ))}
        {!isLoading && data?.rows?.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No payout periods yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DeliveryAssignments({ partnerId }) {
  const { data, isLoading } = usePartnerOrders(partnerId, { limit: 10 });
  const { data: activePartners } = useDeliveryPartners({ status: "active", limit: 50 });
  const reassign = useReassignOrderPartner();

  return (
    <Card>
      <CardHeader className="pb-3">
        <h2 className="text-base font-bold">Delivery Assignments</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assignments…</p>
        ) : null}
        {(data?.orders ?? []).map((order) => (
          <div
            key={order._id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F6EFE9] pb-2.5 last:border-0 last:pb-0"
          >
            <div>
              <p className="text-sm font-semibold">
                {order.restaurantId?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.createdAt)} · {order.items?.length ?? 0} items
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  order.deliveryAssignment?.status === "delivered" ? "ok" : "warn"
                }
                className="capitalize"
              >
                {order.deliveryAssignment?.status?.replace(/_/g, " ")}
              </Badge>
              {order.deliveryAssignment?.status !== "delivered" ? (
                <Select
                  onValueChange={(newPartnerId) =>
                    reassign.mutate({ orderId: order._id, partnerId: newPartnerId })
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Reassign…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activePartners?.partners ?? [])
                      .filter((p) => p._id !== partnerId)
                      .map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
        ))}
        {!isLoading && data?.orders?.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No delivery assignments yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT = {
  active: "ok",
  busy: "warn",
  inactive: "muted",
  suspended: "danger",
};

const DOC_LABELS = {
  aadhar_card: "Aadhaar Card",
  driving_license: "Driving License",
  vehicle_rc: "Vehicle RC",
  insurance_document: "Insurance Document",
  profile_photo: "Profile Photo",
};

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, dot }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {dot ? <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> : null}
        {value}
      </span>
    </div>
  );
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

function isImageDoc(doc) {
  const ext = doc.url?.split(".").pop()?.toLowerCase();
  return doc.type === "profile_photo" || IMAGE_EXTENSIONS.includes(ext ?? "");
}

function docFileName(doc) {
  if (!doc.url) return "—";
  const last = doc.url.split("/").pop() ?? doc.url;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export default function PartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: partner, isLoading, error } = useDeliveryPartner(id);
  const update = useUpdateDeliveryPartner(id);
  const remove = useRemoveDeliveryPartner();

  const [removeOpen, setRemoveOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({});
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({});
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({});

  useEffect(() => {
    if (!partner) return;
    setPersonalForm({
      fullName: partner.fullName ?? "",
      phone: partner.phone ?? "",
      emergencyPhone: partner.emergencyPhone ?? "",
      aadharNumber: partner.aadharNumber ?? "",
      panNumber: partner.panNumber ?? "",
    });
    setVehicleForm(partner.vehicle ?? {});
    setBankForm(partner.bankDetails ?? {});
  }, [partner]);

  if (isLoading) {
    return (
      <AdminLayout breadcrumb="Delivery Partners" title="Loading…">
        <p className="text-sm text-muted-foreground">
          Loading delivery partner…
        </p>
      </AdminLayout>
    );
  }
  if (error || !partner) {
    return (
      <AdminLayout breadcrumb="Delivery Partners" title="Partner not found">
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "This delivery partner could not be found."}
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      breadcrumb="Delivery Partners > Delivery Partner Details"
      title="Delivery Partner Details"
      action={
        <div className="flex items-center gap-2">
          <Select
            value={partner.status}
            onValueChange={(v) => update.mutate({ status: v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["active", "busy", "inactive", "suspended"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setRemoveOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-brand-maroon/40 px-3 py-2 text-xs font-semibold text-brand-maroon hover:bg-brand-maroon/5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      }
    >
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-6 p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-[#D9480F] text-xl font-semibold text-white">
                {initials(partner.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold">{partner.fullName}</p>
                <Badge variant="warn">
                  ID: {partner._id.slice(-6).toUpperCase()}
                </Badge>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {partner.email}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {partner.phone}
              </p>
              <Badge
                variant={STATUS_VARIANT[partner.status] ?? "muted"}
                className="mt-3 capitalize"
              >
                {partner.status}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <SummaryRow
              icon={Calendar}
              label="Joined On"
              value={formatDate(partner.joinedOn ?? partner.createdAt)}
            />
            <SummaryRow
              icon={Package}
              label="Total Deliveries"
              value={formatNumber(partner.totalDeliveries)}
            />
            <SummaryRow
              icon={Star}
              label="Average Rating"
              value={`★ ${partner.rating?.toFixed?.(1) ?? "—"}`}
            />
            {/* No lastActive/online-status field exists on the DeliveryPartner
                model or API yet — render the label with a placeholder instead
                of fabricating a timestamp. */}
            <SummaryRow icon={Clock} label="Last Active" value="—" />
          </div>
        </CardContent>
      </Card>

      <PayoutDetails partnerId={id} />
      <DeliveryAssignments partnerId={id} />

      <EditableCard
        title="Personal Information"
        icon={User}
        contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        editing={editingPersonal}
        saving={update.isPending}
        onEdit={() => setEditingPersonal(true)}
        onCancel={() => setEditingPersonal(false)}
        onSave={() =>
          update.mutate(personalForm, {
            onSuccess: () => setEditingPersonal(false),
          })
        }
        editChildren={
          <>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={personalForm.fullName ?? ""}
                onChange={(e) =>
                  setPersonalForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={personalForm.phone ?? ""}
                onChange={(e) =>
                  setPersonalForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Phone</Label>
              <Input
                value={personalForm.emergencyPhone ?? ""}
                onChange={(e) =>
                  setPersonalForm((f) => ({
                    ...f,
                    emergencyPhone: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhar Number</Label>
              <Input
                value={personalForm.aadharNumber ?? ""}
                onChange={(e) =>
                  setPersonalForm((f) => ({
                    ...f,
                    aadharNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input
                value={personalForm.panNumber ?? ""}
                onChange={(e) =>
                  setPersonalForm((f) => ({ ...f, panNumber: e.target.value }))
                }
              />
            </div>
          </>
        }
      >
        <Field label="Full Name" value={partner.fullName} />
        <Field label="Email Address" value={partner.email} />
        <Field label="Phone Number" value={partner.phone} />
        <Field
          label="Date of Birth"
          value={partner.dateOfBirth ? formatDate(partner.dateOfBirth) : "—"}
        />
        <Field
          label="Gender"
          value={
            partner.gender ? (
              <span className="capitalize">{partner.gender}</span>
            ) : (
              "—"
            )
          }
        />
        <Field label="Emergency Phone" value={partner.emergencyPhone} />
        <Field label="Aadhar Number" value={partner.aadharNumber} />
        <Field label="PAN Number" value={partner.panNumber} />
      </EditableCard>

      <EditableCard
        title="Vehicle Information"
        icon={Bike}
        contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        editing={editingVehicle}
        saving={update.isPending}
        onEdit={() => setEditingVehicle(true)}
        onCancel={() => setEditingVehicle(false)}
        onSave={() =>
          update.mutate(
            { vehicle: vehicleForm },
            { onSuccess: () => setEditingVehicle(false) },
          )
        }
        editChildren={
          <>
            <div className="space-y-1.5">
              <Label>Vehicle Model</Label>
              <Input
                value={vehicleForm.model ?? ""}
                onChange={(e) =>
                  setVehicleForm((f) => ({ ...f, model: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Number</Label>
              <Input
                value={vehicleForm.number ?? ""}
                onChange={(e) =>
                  setVehicleForm((f) => ({ ...f, number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Type</Label>
              <Select
                value={vehicleForm.type ?? ""}
                onValueChange={(v) =>
                  setVehicleForm((f) => ({ ...f, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2_wheeler">2 Wheeler</SelectItem>
                  <SelectItem value="ev_2_wheeler">EV 2 Wheeler</SelectItem>
                  <SelectItem value="non_rto_2_wheeler">
                    Non-RTO 2 Wheeler
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>RC Number</Label>
              <Input
                value={vehicleForm.rcNumber ?? ""}
                onChange={(e) =>
                  setVehicleForm((f) => ({ ...f, rcNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Provider</Label>
              <Input
                value={vehicleForm.insuranceProvider ?? ""}
                onChange={(e) =>
                  setVehicleForm((f) => ({
                    ...f,
                    insuranceProvider: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Number</Label>
              <Input
                value={vehicleForm.insuranceNumber ?? ""}
                onChange={(e) =>
                  setVehicleForm((f) => ({
                    ...f,
                    insuranceNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Validity</Label>
              <Input
                type="date"
                value={
                  vehicleForm.insuranceValidTill
                    ? String(vehicleForm.insuranceValidTill).slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setVehicleForm((f) => ({
                    ...f,
                    insuranceValidTill: e.target.value,
                  }))
                }
              />
            </div>
          </>
        }
      >
        <Field label="Vehicle Model" value={partner.vehicle?.model} />
        <Field label="Vehicle Number" value={partner.vehicle?.number} />
        <Field
          label="Vehicle Type"
          value={
            partner.vehicle?.type ? (
              <span className="capitalize">
                {partner.vehicle.type.replace(/_/g, " ")}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field label="RC Number" value={partner.vehicle?.rcNumber} />
        <Field
          label="Insurance Provider"
          value={partner.vehicle?.insuranceProvider}
        />
        <Field
          label="Insurance Number"
          value={partner.vehicle?.insuranceNumber}
        />
        <Field
          label="Insurance Validity"
          value={
            partner.vehicle?.insuranceValidTill
              ? formatDate(partner.vehicle.insuranceValidTill)
              : "—"
          }
        />
      </EditableCard>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
          <FileText className="h-4 w-4 text-brand-orange" />
          <h2 className="text-base font-bold">Document Information</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(partner.documents ?? []).map((doc) => (
            <div
              key={doc.type}
              className="rounded-xl border border-brand-cream/70 p-3"
            >
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isImageDoc(doc)
                    ? "bg-brand-green/10 text-brand-green"
                    : "bg-brand-orange/10 text-brand-orange"
                }`}
              >
                {isImageDoc(doc) ? "IMG" : "PDF"}
              </span>
              <p className="mt-2 text-sm font-semibold">
                {DOC_LABELS[doc.type] ?? doc.type}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {docFileName(doc)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Uploaded on {formatDate(doc.uploadedAt)}
                </p>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-cream/70 text-brand-orange hover:bg-brand-cream/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {(partner.documents ?? []).length === 0 ? (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
              No documents uploaded.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <EditableCard
        title="Bank Details"
        icon={Landmark}
        contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        editing={editingBank}
        saving={update.isPending}
        onEdit={() => setEditingBank(true)}
        onCancel={() => setEditingBank(false)}
        onSave={() =>
          update.mutate(
            { bankDetails: bankForm },
            { onSuccess: () => setEditingBank(false) },
          )
        }
        editChildren={
          <>
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input
                value={bankForm.bankName ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({ ...f, bankName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Holder Name</Label>
              <Input
                value={bankForm.accountHolderName ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({
                    ...f,
                    accountHolderName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input
                value={bankForm.accountNumber ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({ ...f, accountNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select
                value={bankForm.accountType ?? ""}
                onValueChange={(v) =>
                  setBankForm((f) => ({ ...f, accountType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code</Label>
              <Input
                value={bankForm.ifscCode ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({ ...f, ifscCode: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch Name</Label>
              <Input
                value={bankForm.branchName ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({ ...f, branchName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>UPI ID</Label>
              <Input
                value={bankForm.upiId ?? ""}
                onChange={(e) =>
                  setBankForm((f) => ({ ...f, upiId: e.target.value }))
                }
              />
            </div>
          </>
        }
      >
        <Field label="Bank Name" value={partner.bankDetails?.bankName} />
        <Field
          label="Account Holder Name"
          value={partner.bankDetails?.accountHolderName}
        />
        <Field
          label="Account Number"
          value={partner.bankDetails?.accountNumber}
        />
        <Field
          label="Account Type"
          value={
            partner.bankDetails?.accountType ? (
              <span className="capitalize">
                {partner.bankDetails.accountType}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field label="IFSC Code" value={partner.bankDetails?.ifscCode} />
        <Field label="Branch Name" value={partner.bankDetails?.branchName} />
        <Field label="UPI ID" value={partner.bankDetails?.upiId} />
        {/* "Payment Preference" appears in the Figma reference but there is
            no corresponding field on the DeliveryPartner.bankDetails schema
            (server/models/DeliveryPartner.js) — intentionally omitted rather
            than showing fabricated data. */}
      </EditableCard>

      <ConfirmDialog
        open={removeOpen}
        title="Remove this delivery partner"
        description="This permanently deletes the partner record — this cannot be undone."
        confirmLabel="Remove Permanently"
        confirmVariant="destructive"
        loading={remove.isPending}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() =>
          remove.mutate(id, { onSuccess: () => navigate("/delivery-partners") })
        }
      />
    </AdminLayout>
  );
}
