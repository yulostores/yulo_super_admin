import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, FileText, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DocumentViewer from "@/components/admin/DocumentViewer";
import ReadOnlyField from "@/components/admin/ReadOnlyField";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { couponsApi } from "@/api/coupons.api";
import {
  couponKeys,
  useCouponPlans,
  useCouponSettings,
  useSeller,
  useSellerAction,
  useSellerSubscriptions,
} from "@/hooks/admin/useSellers";
import {
  DOCUMENT_LABEL,
  SELLER_ROLE_LABEL,
  SELLER_STATUS,
  SUBSCRIPTION_STATUS,
  paiseToRupees,
} from "@/lib/coupons";
import { formatDate, formatDateTime, formatRupees } from "@/lib/format";
import AdminLayout from "../AdminLayout";
import AmountReceivedDialog from "./AmountReceivedDialog";

const MISSING_LABEL = (m) =>
  m === "business"
    ? "Business details"
    : m === "owner"
      ? "Owner details (PAN, Aadhaar)"
      : m.startsWith("document:")
        ? `${DOCUMENT_LABEL[m.slice(9)] ?? m.slice(9)} upload`
        : m;

/**
 * One coupon partner: business, owner (PAN / Aadhaar masked; PAN revealable, audit-logged),
 * documents, team, plans and SMS credits; Approve / Reject / Suspend / Reactivate behind a
 * confirmation; "Amount Received" for a plan or for SMS credits.
 */
export default function SellerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const seller = useSeller(id);
  const subscriptions = useSellerSubscriptions(id);
  const plans = useCouponPlans();
  const settings = useCouponSettings();
  const [dialog, setDialog] = useState(null); // 'plan' | 'credits' | null
  const [viewing, setViewing] = useState(null);
  // Stable per document: the viewer refetches whenever this function changes.
  const viewingId = viewing?._id;
  const fetchViewed = useCallback(
    () => couponsApi.getSellerDocumentFile(id, viewingId),
    [id, viewingId],
  );

  const approve = useSellerAction(id, () => couponsApi.approveSeller(id));
  const reject = useSellerAction(id, (reason) =>
    couponsApi.rejectSeller(id, reason),
  );
  const suspend = useSellerAction(id, (reason) =>
    couponsApi.suspendSeller(id, reason),
  );
  const reactivate = useSellerAction(id, () => couponsApi.reactivateSeller(id));

  if (seller.isLoading) {
    return (
      <AdminLayout title="Seller" breadcrumb="Coupons / Sellers">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminLayout>
    );
  }
  if (seller.isError) {
    return (
      <AdminLayout title="Seller" breadcrumb="Coupons / Sellers">
        <p role="alert" className="text-sm text-brand-maroon">
          {seller.error?.message ?? "Could not load this seller."}
        </p>
      </AdminLayout>
    );
  }
  const s = seller.data;
  const name = s.business.businessName;
  const status = SELLER_STATUS[s.status] ?? {
    label: s.status,
    variant: "muted",
  };

  const run = (mutation, message, failure) => (reason) =>
    mutation.mutateAsync(reason, {
      onSuccess: () => toast.success(message),
      onError: (err) => {
        if (err?.code === "ONBOARDING_INCOMPLETE")
          toast.error(
            `Can't approve yet — missing: ${(err.details?.missing ?? []).map(MISSING_LABEL).join(", ")}`,
          );
        else toast.error(err, failure);
      },
    });

  const actions = (
    <div className="flex flex-wrap gap-2">
      {s.status === "pending" ? (
        <>
          <Button
            variant="outline"
            onClick={() =>
              confirm.ask({
                title: `Reject ${name}?`,
                description:
                  "The owner sees your reason and can fix the application and send it again.",
                requireReason: true,
                minReasonLength: 5,
                reasonLabel: "Reason (shown to the seller)",
                reasonPlaceholder:
                  "e.g. The PAN card photo is blurred — please upload a clearer one.",
                confirmLabel: "Reject application",
                tone: "danger",
                onConfirm: run(
                  reject,
                  `${name} was rejected`,
                  "Could not reject.",
                ),
              })
            }
          >
            Reject
          </Button>
          <Button
            onClick={() =>
              confirm.ask({
                title: `Approve ${name}?`,
                description:
                  "The business and its team can sign in, buy plans and create offers. Check the documents first.",
                confirmLabel: "Approve",
                onConfirm: run(
                  approve,
                  `${name} is approved`,
                  "Could not approve.",
                ),
              })
            }
          >
            Approve
          </Button>
        </>
      ) : null}
      {s.status === "active" ? (
        <Button
          variant="outline"
          onClick={() =>
            confirm.ask({
              title: `Suspend ${name}?`,
              description:
                "Every login is signed out at once. No coupons are given out or redeemed until you reactivate it.",
              requireReason: true,
              minReasonLength: 3,
              reasonLabel: "Reason (kept in the audit log)",
              confirmLabel: "Suspend",
              tone: "danger",
              onConfirm: run(
                suspend,
                `${name} is suspended`,
                "Could not suspend.",
              ),
            })
          }
        >
          Suspend
        </Button>
      ) : null}
      {s.status === "suspended" ? (
        <Button
          onClick={() =>
            confirm.ask({
              title: `Reactivate ${name}?`,
              description:
                "Its team can sign in again and its coupons go back to customers.",
              confirmLabel: "Reactivate",
              onConfirm: run(
                reactivate,
                `${name} is active again`,
                "Could not reactivate.",
              ),
            })
          }
        >
          Reactivate
        </Button>
      ) : null}
    </div>
  );

  const recorded = (what) => () => {
    setDialog(null);
    toast.success(
      what === "plan"
        ? "Payment recorded — plan activated"
        : "Payment recorded — credits added",
    );
    qc.invalidateQueries({ queryKey: couponKeys.seller(id) });
    qc.invalidateQueries({ queryKey: couponKeys.subscriptions(id) });
  };

  return (
    <AdminLayout title={name} breadcrumb="Coupons / Sellers" action={actions}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-sm text-muted-foreground">
          {s.submittedAt
            ? `Submitted ${formatDate(s.submittedAt)}`
            : "Application not sent yet"}
          {s.reviewedAt ? ` · reviewed ${formatDate(s.reviewedAt)}` : ""}
        </span>
      </div>
      {s.status === "rejected" && s.rejectionReason ? (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-brand-maroon">
          Rejected: {s.rejectionReason}
        </p>
      ) : null}
      {s.status === "pending" && s.missing?.length ? (
        <div
          role="alert"
          className="rounded-xl bg-status-warn-bg p-3 text-sm text-brand-orange"
        >
          Still missing before it can be approved:{" "}
          {s.missing.map(MISSING_LABEL).join(", ")}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-bold">Business</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Name" value={name} />
            <ReadOnlyField label="Category" value={s.business.category?.name} />
            <ReadOnlyField label="GSTIN" value={s.business.gstNumber ?? "—"} />
            <ReadOnlyField
              label="Shop phone"
              value={s.business.businessPhone}
            />
            <ReadOnlyField
              label="Started"
              value={
                s.business.establishedOn
                  ? formatDate(s.business.establishedOn)
                  : "—"
              }
            />
            <ReadOnlyField
              label="Map position"
              value={
                s.business.location
                  ? `${s.business.location.lat}, ${s.business.location.lng}`
                  : "Not set"
              }
            />
            <div className="col-span-2">
              <ReadOnlyField
                label="Address"
                value={
                  [
                    s.business.address?.line1,
                    s.business.address?.line2,
                    s.business.address?.city,
                    s.business.address?.state,
                    s.business.address?.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
            </div>
          </CardContent>
        </Card>
        <OwnerCard seller={s} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-bold">Documents</h2>
        </CardHeader>
        <CardContent>
          {s.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents uploaded.
            </p>
          ) : (
            <ul className="divide-y">
              {s.documents.map((d) => (
                <li
                  key={d._id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <FileText
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="flex-1">
                    <span className="font-medium">
                      {DOCUMENT_LABEL[d.type] ?? d.type}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {d.name ?? ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(d.uploadedAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewing(d)}
                  >
                    View
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-bold">Team</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>{SELLER_ROLE_LABEL[u.role] ?? u.role}</TableCell>
                  <TableCell>
                    {u.removedAt ? (
                      <Badge variant="muted">Removed</Badge>
                    ) : u.isActive ? (
                      <Badge variant="ok">Active</Badge>
                    ) : (
                      <Badge variant="warn">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <h2 className="text-sm font-bold">Plans</h2>
          {s.status === "active" ? (
            <Button
              size="sm"
              onClick={() => setDialog("plan")}
              disabled={!plans.data}
            >
              Amount Received
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {subscriptions.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (subscriptions.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plans bought yet.
            </p>
          ) : (
            <Table aria-label="Plans">
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Complimentary</TableHead>
                  <TableHead>Activated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.data.map((sub) => {
                  const st = SUBSCRIPTION_STATUS[sub.status] ?? {
                    label: sub.status,
                    variant: "muted",
                  };
                  return (
                    <TableRow key={sub._id}>
                      <TableCell className="font-medium">
                        {sub.plan.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.paidPaise != null
                          ? formatRupees(paiseToRupees(sub.paidPaise))
                          : "—"}
                        <div className="text-xs text-muted-foreground">
                          {sub.method === "manual"
                            ? `Amount Received · ${sub.payment?.manual?.mode ?? ""}`
                            : "Razorpay"}
                          {sub.reference ? ` · ${sub.reference}` : ""}
                        </div>
                        {sub.payment?.manual?.overrideReason ? (
                          <div className="text-xs text-brand-orange">
                            Override: {sub.payment.manual.overrideReason}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {sub.issued.toLocaleString("en-IN")} /{" "}
                        {sub.allocated.toLocaleString("en-IN")} given
                      </TableCell>
                      <TableCell>
                        {sub.complimentary
                          ? `${sub.complimentary.total} (${sub.complimentary.redeemed ?? 0} used)`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {sub.activatedAt ? formatDate(sub.activatedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <h2 className="text-sm font-bold">SMS credits</h2>
          {s.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialog("credits")}
              disabled={!settings.data}
            >
              Amount Received
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <p>
            <span className="text-2xl font-bold" data-testid="sms-balance">
              {(s.smsCreditsBalance ?? 0).toLocaleString("en-IN")}
            </span>{" "}
            credits left
          </p>
          <p className="text-muted-foreground">
            Agreement:{" "}
            {s.agreement?.version
              ? `version ${s.agreement.version} accepted ${formatDate(s.agreement.acceptedAt)}`
              : "not accepted yet"}
          </p>
        </CardContent>
      </Card>

      <AmountReceivedDialog
        open={dialog !== null}
        kind={dialog ?? "plan"}
        seller={s}
        plans={plans.data ?? []}
        smsPrice={settings.data?.active}
        onClose={() => setDialog(null)}
        onRecorded={recorded(dialog)}
      />
      <DocumentViewer
        open={Boolean(viewing)}
        title={viewing ? (DOCUMENT_LABEL[viewing.type] ?? viewing.type) : ""}
        doc={viewing}
        fetchFile={fetchViewed}
        uploadedAtLabel={viewing ? formatDateTime(viewing.uploadedAt) : ""}
        onClose={() => setViewing(null)}
      />
      {confirm.dialog}
    </AdminLayout>
  );
}

/**
 * The owner, identity numbers masked. Reveal shows the full PAN — a deliberate, audit-logged
 * request; the answer lives only in this component's state and is dropped on Hide (never in the
 * query cache or a URL). Aadhaar is never stored in full, so it can't be revealed.
 */
function OwnerCard({ seller }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pan, setPan] = useState(null);
  const o = seller.owner;

  const reveal = () =>
    confirm.ask({
      title: "Reveal the owner's PAN?",
      description:
        "Your access is logged with your name and the time. Only reveal it to check it against the PAN card document.",
      confirmLabel: "Reveal PAN",
      onConfirm: async () => {
        try {
          const { value } = await couponsApi.revealIdentity(seller._id, "pan");
          setPan(value);
        } catch (err) {
          toast.error(err, "Could not reveal the PAN.");
        }
      },
    });

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="text-sm font-bold">Owner</h2>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Name" value={o.name} />
        <ReadOnlyField
          label="Date of birth"
          value={o.dateOfBirth ? formatDate(o.dateOfBirth) : "—"}
        />
        <ReadOnlyField label="Mobile" value={o.phone} />
        <div>
          <ReadOnlyField label="PAN" value={pan ?? o.panMasked ?? "—"} />
          {o.panRevealable ? (
            <button
              type="button"
              onClick={pan ? () => setPan(null) : reveal}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange hover:underline"
            >
              {pan ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {pan ? "Hide" : "Reveal"}
            </button>
          ) : null}
        </div>
        <div>
          <ReadOnlyField label="Aadhaar" value={o.aadhaarMasked ?? "—"} />
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Only the
            last 4 digits are stored
          </p>
        </div>
      </CardContent>
      {confirm.dialog}
    </Card>
  );
}
