import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, FileText, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EditableCard from "@/components/admin/EditableCard";
import {
  useApproveStore,
  useAddStoreNote,
  useReactivateStore,
  useRejectStore,
  useRemoveStore,
  useStore,
  useSuspendStore,
  useUpdateStore,
  useUpdateStoreLocation,
  useVerifyDocument,
} from "@/hooks/admin/useStores";
import { useBills } from "@/hooks/admin/useBills";
import {
  DAYS,
  DEFAULT_DELIVERY_RADIUS_KM,
  DISCOVERY_RADIUS_KM,
  INDIA_BBOX,
  MAX_DELIVERY_RADIUS_KM,
  STORE_DOCUMENT_TYPES,
  STORE_STATUS_LABEL,
  STORE_STATUS_VARIANT,
} from "@/lib/constants";
import { BILL_STATUS_VARIANT, formatMoney, humanize } from "@/lib/bill";
import ReadOnlyField from "@/components/admin/ReadOnlyField";
import DocumentViewer, {
  documentFileName,
} from "@/components/admin/DocumentViewer";
import { adminApi } from "@/api/admin.api";
import { formatDateTime, hhmm, toHHMM } from "@/lib/format";
import AdminLayout, { formatDate } from "../AdminLayout";

// Everything an admin needs to answer "why can't customers see this store?", in one place.
//
// The three ways a live, approved store stays invisible, none of which was visible from any
// portal before this:
//
//   1. No map point at all — the address never geocoded.
//   2. [0, 0] — "Null Island", the value a failed lookup used to be defaulted to. The store
//      sits in the Gulf of Guinea and matches nobody's search.
//   3. A reversed pair — [latitude, longitude] where GeoJSON wants [longitude, latitude].
//      Both halves are individually valid, so nothing rejected it; the store is simply in
//      the wrong hemisphere.
//
// The fourth, much less dramatic case is a store that is placed correctly but whose own
// delivery radius is smaller than the distance to the customer. That one is not a fault, so
// it is reported as a plain fact rather than as a problem.
function StoreLocationSummary({ store, onRegeocode, regeocoding, error }) {
  const coordinates = store.location?.coordinates;
  const [lng, lat] = Array.isArray(coordinates) ? coordinates : [];
  const hasPair =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(lng) &&
    Number.isFinite(lat);

  const isNullIsland = hasPair && lng === 0 && lat === 0;
  const inBox = (x, y) =>
    x >= INDIA_BBOX.minLng &&
    x <= INDIA_BBOX.maxLng &&
    y >= INDIA_BBOX.minLat &&
    y <= INDIA_BBOX.maxLat;
  const looksReversed = hasPair && !inBox(lng, lat) && inBox(lat, lng);
  const outOfArea = hasPair && !isNullIsland && !looksReversed && !inBox(lng, lat);

  const problem = !hasPair
    ? "This store has no map point, so it cannot appear in any customer's list however correct its address is. Re-place it from the address below."
    : isNullIsland
      ? "This store sits at [0, 0] — a placeholder in the Gulf of Guinea, not a real location. It is invisible to every customer. Re-place it from the address below."
      : looksReversed
        ? `These coordinates look reversed: as latitude ${lng}, longitude ${lat} they fall inside India, but they are stored the other way round. The store is currently placed in the wrong hemisphere.`
        : outOfArea
          ? "These coordinates fall outside the area this platform serves. Check them, or re-place the store from its address."
          : null;

  const ownRadius = store.delivery?.radiusKm;
  const effectiveRadius = Math.min(
    Number(ownRadius) > 0 ? Number(ownRadius) : DEFAULT_DELIVERY_RADIUS_KM,
    MAX_DELIVERY_RADIUS_KM,
  );

  return (
    <>
      <ViewBox label="Latitude" value={hasPair ? String(lat) : null} />
      <ViewBox label="Longitude" value={hasPair ? String(lng) : null} />

      <div className="sm:col-span-2 space-y-3">
        {problem ? (
          <p className="rounded-lg border border-brand-maroon/30 bg-brand-maroon/5 px-3 py-2 text-xs font-medium text-brand-maroon">
            {problem}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Customers within {DISCOVERY_RADIUS_KM} km of this point see this store, nearest
            first.{" "}
            {Number(ownRadius) > 0
              ? `It delivers up to ${effectiveRadius} km; beyond that it is still listed, marked as not deliverable.`
              : `No delivery radius is set, so it is treated as delivering across the full ${effectiveRadius} km.`}
          </p>
        )}

        {error ? (
          <p className="text-xs font-semibold text-brand-maroon">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegeocode}
            disabled={regeocoding}
          >
            {regeocoding ? "Placing…" : "Re-place from address"}
          </Button>
          {hasPair ? (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-brand-orange"
            >
              Open on a map
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ViewBox({ label, value, multiline }) {
  return (
    <div className="space-y-1.5">
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      <div
        className={`rounded-lg border border-brand-cream/70 bg-white px-3 py-2 text-sm ${
          multiline
            ? "min-h-[72px] whitespace-pre-line"
            : "flex h-9 items-center"
        }`}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function PhoneBox({ label, value, editable, onChange }) {
  const local = (value ?? "").replace(/^\+?91[\s-]?/, "");
  return (
    <div className="space-y-1.5">
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      <div className="flex gap-2">
        <div className="flex h-9 w-16 shrink-0 items-center justify-center gap-0.5 rounded-lg border border-brand-cream/70 bg-brand-cream/20 text-sm text-muted-foreground">
          +91 <ChevronDown className="h-3 w-3" />
        </div>
        {editable ? (
          <Input
            value={local}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
        ) : (
          <div className="flex h-9 flex-1 items-center rounded-lg border border-brand-cream/70 bg-white px-3 text-sm">
            {local || <span className="text-muted-foreground">—</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: store, isLoading, error } = useStore(id);

  const approve = useApproveStore(id);
  const reject = useRejectStore(id);
  const suspend = useSuspendStore(id);
  const reactivate = useReactivateStore(id);
  const update = useUpdateStore(id);
  const updateLocation = useUpdateStoreLocation(id);
  const addNote = useAddStoreNote(id);
  const verifyDoc = useVerifyDocument(id);
  const remove = useRemoveStore(id);

  // The last few receipts this store issued — the concrete counterpart to the revenue
  // figures on the finance screens. The full, filterable list lives at /bills.
  const { data: billsPage, isLoading: billsLoading } = useBills({ restaurantId: id, limit: 5 });
  const recentBills = billsPage?.bills ?? [];

  const [rejectOpen, setRejectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [note, setNote] = useState("");
  // Which document the in-portal viewer is showing, held as { type, label } rather than
  // the document itself: verifying from inside the viewer refetches the store, and a
  // snapshotted copy would keep rendering the old status behind the same file.
  const [viewingDoc, setViewingDoc] = useState(null);

  const [editingHours, setEditingHours] = useState(false);
  const [hoursForm, setHoursForm] = useState([]);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({});
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ lat: "", lng: "" });
  const [locationError, setLocationError] = useState(null);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState({});
  const [editingLicenses, setEditingLicenses] = useState(false);
  const [licensesForm, setLicensesForm] = useState({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  // Read live off the store each render, so a verify/reject made from inside the viewer
  // repaints it rather than leaving a stale snapshot on screen. Declared up here with the
  // other hooks — the render body below returns early while the store is loading.
  const viewedDoc = viewingDoc
    ? (store?.documents ?? []).find((d) => d.type === viewingDoc.type)
    : null;
  const viewedDocId = viewedDoc?._id;
  // Stable identity so the viewer fetches the file once per document, not per render.
  const fetchViewedFile = useCallback(
    () => adminApi.getStoreDocumentFile(id, viewedDocId),
    [id, viewedDocId],
  );

  useEffect(() => {
    if (!store) return;
    setHoursForm(
      DAYS.map((day) => {
        const existing = store.operatingHours?.find((h) => h.day === day);
        return (
          existing ?? { day, isOpen: true, openTime: 900, closeTime: 2200 }
        );
      }),
    );
    setDeliveryForm(store.delivery ?? {});
    // Coordinates are stored GeoJSON [lng, lat]; the inputs are labelled lat/lng because
    // that is the order every map app on earth shows them in, and pasting a pair the wrong
    // way round is the single easiest way to move a restaurant to the Arctic.
    const [lng, lat] = store.location?.coordinates ?? [];
    setLocationForm({
      lat: Number.isFinite(lat) ? String(lat) : "",
      lng: Number.isFinite(lng) ? String(lng) : "",
    });
    setLocationError(null);
    setBusinessForm(store.settings ?? {});
    setLicensesForm(store.settings ?? {});
    setProfileForm({
      name: store.name ?? "",
      category: store.category ?? "",
      description: store.description ?? "",
      cuisineTypes: (store.cuisineTypes ?? []).join(", "),
      bannerImage: store.bannerImage ?? "",
      street: store.address?.street ?? "",
      city: store.address?.city ?? "",
      state: store.address?.state ?? "",
      pincode: store.address?.pincode ?? "",
      alternatePhone: store.settings?.alternatePhone ?? "",
    });
  }, [store]);

  if (isLoading) {
    return (
      <AdminLayout breadcrumb="Store Management" title="Loading…">
        <p className="text-sm text-muted-foreground">Loading store…</p>
      </AdminLayout>
    );
  }
  if (error || !store) {
    return (
      <AdminLayout breadcrumb="Store Management" title="Store not found">
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "This store could not be found."}
        </p>
      </AdminLayout>
    );
  }

  const status = store.approvalStatus;

  return (
    <AdminLayout
      breadcrumb="Store Management > Store Details"
      title={
        <span className="flex items-center gap-3">
          {store.name}
          <Badge variant={STORE_STATUS_VARIANT[status] ?? "muted"}>
            {STORE_STATUS_LABEL[status] ?? status}
          </Badge>
        </span>
      }
      subtitle={`Store ID: ${store._id} · Submitted on ${formatDate(store.submittedAt ?? store.createdAt)}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {status === "pending" ? (
            <>
              <Button
                size="sm"
                onClick={() => approve.mutate()}
                disabled={approve.isPending}
                className="gap-1.5 bg-brand-orange text-white hover:brightness-105"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve Store
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                className="gap-1.5 text-brand-maroon"
              >
                <XCircle className="h-4 w-4" /> Reject Store
              </Button>
            </>
          ) : null}
          {status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => suspend.mutate()}
              disabled={suspend.isPending}
              className="text-brand-maroon"
            >
              Suspend
            </Button>
          ) : null}
          {status === "suspended" ? (
            <Button
              size="sm"
              onClick={() => reactivate.mutate()}
              disabled={reactivate.isPending}
              className="bg-brand-orange text-white hover:brightness-105"
            >
              Reactivate
            </Button>
          ) : null}
          {/* Without this a rejection was a dead end: the API accepts an approve from any
              status, but the buttons above only appeared while "pending", so once an owner
              had corrected what was flagged there was no way left to let them through. */}
          {status === "rejected" ? (
            <Button
              size="sm"
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="gap-1.5 bg-brand-orange text-white hover:brightness-105"
            >
              <CheckCircle2 className="h-4 w-4" />
              {approve.isPending ? "Approving…" : "Approve anyway"}
            </Button>
          ) : null}
          {status !== "pending" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRemoveOpen(true)}
              className="gap-1.5 text-brand-maroon"
            >
              <XCircle className="h-4 w-4" /> Remove Store
            </Button>
          ) : null}
        </div>
      }
    >
      {/* Why this store is in the state it's in. The reason an admin typed is the one
          thing the owner is shown verbatim, so it has to be visible here too — otherwise
          whoever picks the application up next has no idea what was asked for. */}
      {status === "rejected" && store.rejectionReason ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-brand-maroon">
          <span className="font-semibold">Rejected: </span>
          {store.rejectionReason}
        </p>
      ) : null}

      {/* There is no resubmit endpoint — a rejected owner just re-saves their store
          settings, which bumps updatedAt and nothing else. That timestamp is the only
          signal an admin gets that the application is worth a second look. */}
      {status === "rejected" &&
      store.reviewedAt &&
      store.updatedAt &&
      new Date(store.updatedAt) > new Date(store.reviewedAt) ? (
        <p className="mb-4 rounded-xl border border-[#F5C99B] bg-[#FFF7ED] px-4 py-3 text-sm">
          The owner has edited their details since this rejection (last saved{" "}
          {formatDate(store.updatedAt)}). Re-check the sections below before deciding again.
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Profile */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-5 p-5">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="h-20 w-20 rounded-xl border border-brand-cream/70 object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-xl border border-brand-cream/70 bg-brand-cream/30 text-lg font-bold">
                  {store.name?.slice(0, 2)?.toUpperCase()}
                </div>
              )}
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <ReadOnlyField label="Owner Name" value={store.ownerId?.name} />
                <ReadOnlyField label="Email" value={store.ownerId?.email} />
                <ReadOnlyField label="Phone" value={store.ownerId?.phone} />
                <ReadOnlyField
                  label="Plan"
                  value={<span className="capitalize">{store.plan}</span>}
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <EditableCard
            title="Business Hours"
            editing={editingHours}
            saving={update.isPending}
            onEdit={() => setEditingHours(true)}
            onCancel={() => setEditingHours(false)}
            onSave={() =>
              update.mutate(
                { operatingHours: hoursForm },
                { onSuccess: () => setEditingHours(false) },
              )
            }
            editChildren={hoursForm.map((h, i) => (
              <div
                key={h.day}
                className="flex items-center gap-2 sm:col-span-2"
              >
                <span className="w-24 shrink-0 text-sm capitalize">
                  {h.day}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHoursForm((cur) =>
                      cur.map((x, xi) =>
                        xi === i ? { ...x, isOpen: !x.isOpen } : x,
                      ),
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${h.isOpen ? "bg-status-ok-bg text-brand-green" : "bg-status-muted-bg text-status-muted"}`}
                >
                  {h.isOpen ? "Open" : "Closed"}
                </button>
                {h.isOpen ? (
                  <>
                    <Input
                      type="time"
                      value={hhmm(h.openTime)}
                      onChange={(e) => {
                        const next = toHHMM(e.target.value);
                        if (next === null) return;
                        setHoursForm((cur) =>
                          cur.map((x, xi) =>
                            xi === i ? { ...x, openTime: next } : x,
                          ),
                        );
                      }}
                      className="w-32"
                    />
                    <Input
                      type="time"
                      value={hhmm(h.closeTime)}
                      onChange={(e) => {
                        const next = toHHMM(e.target.value);
                        if (next === null) return;
                        setHoursForm((cur) =>
                          cur.map((x, xi) =>
                            xi === i ? { ...x, closeTime: next } : x,
                          ),
                        );
                      }}
                      className="w-32"
                    />
                  </>
                ) : null}
              </div>
            ))}
          >
            {DAYS.map((day) => {
              const h = store.operatingHours?.find((x) => x.day === day);
              return (
                <div
                  key={day}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize text-muted-foreground">
                    {day}
                  </span>
                  <span className="font-medium">
                    {h?.isOpen === false
                      ? "Closed"
                      : h
                        ? `${hhmm(h.openTime)} – ${hhmm(h.closeTime)}`
                        : "—"}
                  </span>
                </div>
              );
            })}
          </EditableCard>

          {/* Delivery Charges */}
          <EditableCard
            title="Delivery Charges"
            editing={editingDelivery}
            saving={update.isPending}
            onEdit={() => setEditingDelivery(true)}
            onCancel={() => setEditingDelivery(false)}
            onSave={() =>
              update.mutate(
                { delivery: deliveryForm },
                { onSuccess: () => setEditingDelivery(false) },
              )
            }
            editChildren={
              <>
                <div className="space-y-1.5">
                  <Label>Radius (km)</Label>
                  <Input
                    type="number"
                    value={deliveryForm.radiusKm ?? ""}
                    onChange={(e) =>
                      setDeliveryForm((f) => ({
                        ...f,
                        radiusKm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Base Charge</Label>
                  <Input
                    type="number"
                    value={deliveryForm.baseCharge ?? ""}
                    onChange={(e) =>
                      setDeliveryForm((f) => ({
                        ...f,
                        baseCharge: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Free Threshold</Label>
                  <Input
                    type="number"
                    value={deliveryForm.freeThreshold ?? ""}
                    onChange={(e) =>
                      setDeliveryForm((f) => ({
                        ...f,
                        freeThreshold: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Minutes</Label>
                  <Input
                    type="number"
                    value={deliveryForm.estimatedMinutes ?? ""}
                    onChange={(e) =>
                      setDeliveryForm((f) => ({
                        ...f,
                        estimatedMinutes: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </>
            }
          >
            <ReadOnlyField
              label="Radius (km)"
              value={store.delivery?.radiusKm}
            />
            <ReadOnlyField
              label="Base Charge"
              value={store.delivery?.baseCharge}
            />
            <ReadOnlyField
              label="Free Threshold"
              value={store.delivery?.freeThreshold ?? "—"}
            />
            <ReadOnlyField
              label="Estimated Time"
              value={
                store.delivery?.estimatedMinutes
                  ? `${store.delivery.estimatedMinutes} mins`
                  : "—"
              }
            />
          </EditableCard>

          {/* Map Location — where this store actually sits for "restaurants near me".
              Not cosmetic: a store with a missing, zeroed or reversed point is approved,
              active, correctly addressed and invisible to every customer, and until this
              card existed there was nowhere in any portal to see that, let alone fix it. */}
          <EditableCard
            title="Map Location"
            editing={editingLocation}
            saving={updateLocation.isPending}
            onEdit={() => {
              setLocationError(null);
              setEditingLocation(true);
            }}
            onCancel={() => {
              setEditingLocation(false);
              setLocationError(null);
            }}
            onSave={() => {
              setLocationError(null);
              const lat = Number(locationForm.lat);
              const lng = Number(locationForm.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                setLocationError("Enter both a latitude and a longitude.");
                return;
              }
              // Sent GeoJSON-order, which is the reverse of how the inputs are labelled.
              updateLocation.mutate([lng, lat], {
                onSuccess: () => setEditingLocation(false),
                onError: (err) =>
                  setLocationError(err?.message ?? "Could not update the location."),
              });
            }}
            editChildren={
              <>
                <div className="space-y-1.5">
                  <Label>Latitude</Label>
                  <Input
                    value={locationForm.lat}
                    onChange={(e) =>
                      setLocationForm((f) => ({ ...f, lat: e.target.value }))
                    }
                    placeholder="e.g. 23.9924"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input
                    value={locationForm.lng}
                    onChange={(e) =>
                      setLocationForm((f) => ({ ...f, lng: e.target.value }))
                    }
                    placeholder="e.g. 85.3616"
                  />
                </div>
                {locationError ? (
                  <p className="sm:col-span-2 text-xs font-semibold text-brand-maroon">
                    {locationError}
                  </p>
                ) : null}
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Paste the pair exactly as a map app shows it — latitude first. Leave both
                  as they are and use “Re-place from address” below to have the address
                  looked up again instead.
                </p>
              </>
            }
          >
            <StoreLocationSummary
              store={store}
              onRegeocode={() => {
                setLocationError(null);
                updateLocation.mutate(undefined, {
                  onError: (err) =>
                    setLocationError(
                      err?.message ?? "Could not place that address on the map.",
                    ),
                });
              }}
              regeocoding={updateLocation.isPending}
              error={locationError}
            />
          </EditableCard>

          {/* Business Details */}
          <EditableCard
            title="Business Details"
            editing={editingBusiness}
            saving={update.isPending}
            onEdit={() => setEditingBusiness(true)}
            onCancel={() => setEditingBusiness(false)}
            onSave={() =>
              update.mutate(
                { settings: { ...store.settings, ...businessForm } },
                { onSuccess: () => setEditingBusiness(false) },
              )
            }
            editChildren={
              <>
                <div className="space-y-1.5">
                  <Label>Legal Entity Type</Label>
                  <Input
                    value={businessForm.legalEntityType ?? ""}
                    onChange={(e) =>
                      setBusinessForm((f) => ({
                        ...f,
                        legalEntityType: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Name</Label>
                  <Input
                    value={businessForm.ownerName ?? ""}
                    onChange={(e) =>
                      setBusinessForm((f) => ({
                        ...f,
                        ownerName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN Number</Label>
                  <Input
                    value={businessForm.panNumber ?? ""}
                    onChange={(e) =>
                      setBusinessForm((f) => ({
                        ...f,
                        panNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            }
          >
            <ReadOnlyField
              label="Legal Entity Type"
              value={store.settings?.legalEntityType}
            />
            <ReadOnlyField
              label="Owner Name"
              value={store.settings?.ownerName}
            />
            <ReadOnlyField
              label="PAN Number"
              value={store.settings?.panNumber}
            />
          </EditableCard>

          {/* Licenses & Tax */}
          <EditableCard
            title="Licenses & Tax"
            editing={editingLicenses}
            saving={update.isPending}
            onEdit={() => setEditingLicenses(true)}
            onCancel={() => setEditingLicenses(false)}
            onSave={() =>
              update.mutate(
                { settings: { ...store.settings, ...licensesForm } },
                { onSuccess: () => setEditingLicenses(false) },
              )
            }
            editChildren={
              <>
                <div className="space-y-1.5">
                  <Label>GST Number</Label>
                  <Input
                    value={licensesForm.gstNumber ?? ""}
                    onChange={(e) =>
                      setLicensesForm((f) => ({
                        ...f,
                        gstNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GST %</Label>
                  <Input
                    type="number"
                    value={licensesForm.gstPercent ?? ""}
                    onChange={(e) =>
                      setLicensesForm((f) => ({
                        ...f,
                        gstPercent: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Health Permit / FSSAI ID</Label>
                  <Input
                    value={licensesForm.healthPermitId ?? ""}
                    onChange={(e) =>
                      setLicensesForm((f) => ({
                        ...f,
                        healthPermitId: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration No.</Label>
                  <Input
                    value={licensesForm.registrationNo ?? ""}
                    onChange={(e) =>
                      setLicensesForm((f) => ({
                        ...f,
                        registrationNo: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            }
          >
            <ReadOnlyField
              label="GST Number"
              value={store.settings?.gstNumber}
            />
            <ReadOnlyField label="GST %" value={store.settings?.gstPercent} />
            <ReadOnlyField
              label="Health Permit / FSSAI ID"
              value={store.settings?.healthPermitId}
            />
            <ReadOnlyField
              label="Registration No."
              value={store.settings?.registrationNo}
            />
          </EditableCard>

          {/* Restaurant Information */}
          <EditableCard
            title="Restaurant Information"
            editing={editingProfile}
            saving={update.isPending}
            onEdit={() => setEditingProfile(true)}
            onCancel={() => setEditingProfile(false)}
            onSave={() =>
              update.mutate(
                {
                  name: profileForm.name,
                  category: profileForm.category,
                  description: profileForm.description,
                  cuisineTypes: profileForm.cuisineTypes
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  bannerImage: profileForm.bannerImage,
                  address: {
                    street: profileForm.street,
                    city: profileForm.city,
                    state: profileForm.state,
                    pincode: profileForm.pincode,
                  },
                  settings: {
                    ...store.settings,
                    alternatePhone: profileForm.alternatePhone,
                  },
                },
                { onSuccess: () => setEditingProfile(false) },
              )
            }
            editChildren={
              <>
                <div className="space-y-1.5">
                  <Label>Restaurant Name</Label>
                  <Input
                    value={profileForm.name ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Store Category</Label>
                  <Input
                    value={profileForm.category ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
                <ViewBox label="Owner Name" value={store.ownerId?.name} />
                <div className="space-y-1.5">
                  <Label>Cuisine Type (comma separated)</Label>
                  <Input
                    value={profileForm.cuisineTypes ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        cuisineTypes: e.target.value,
                      }))
                    }
                  />
                </div>
                <ViewBox label="Email Address" value={store.ownerId?.email} />
                <div className="space-y-1.5">
                  <Label>Store Address</Label>
                  <Textarea
                    value={profileForm.street ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, street: e.target.value }))
                    }
                  />
                </div>
                <PhoneBox label="Phone Number" value={store.ownerId?.phone} />
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={profileForm.city ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                </div>
                <PhoneBox
                  label="Alternate Phone Number"
                  value={profileForm.alternatePhone}
                  editable
                  onChange={(v) =>
                    setProfileForm((f) => ({ ...f, alternatePhone: v }))
                  }
                />
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input
                    value={profileForm.state ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, state: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Store Logo
                    </Label>
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt="Store logo"
                        className="h-24 w-24 rounded-lg border border-brand-cream object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-24 place-items-center rounded-lg border border-brand-cream/70 bg-brand-cream/20 text-xs text-muted-foreground">
                        No logo
                      </div>
                    )}
                    {store.logo ? (
                      <a
                        href={store.logo}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 block text-xs font-semibold text-brand-orange"
                      >
                        Preview Logo
                      </a>
                    ) : null}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Store Banner URL</Label>
                    <Input
                      value={profileForm.bannerImage ?? ""}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          bannerImage: e.target.value,
                        }))
                      }
                    />
                    {store.bannerImage ? (
                      <>
                        <img
                          src={store.bannerImage}
                          alt="Store banner"
                          className="h-24 w-full rounded-lg border border-brand-cream object-cover"
                        />
                        <a
                          href={store.bannerImage}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs font-semibold text-brand-orange"
                        >
                          Preview Banner
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input
                    value={profileForm.pincode ?? ""}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, pincode: e.target.value }))
                    }
                  />
                </div>
              </>
            }
          >
            <ViewBox label="Restaurant Name" value={store.name} />
            <ViewBox label="Store Category" value={store.category} />
            <ViewBox label="Owner Name" value={store.ownerId?.name} />
            <ViewBox
              label="Cuisine Type"
              value={(store.cuisineTypes ?? []).join(", ")}
            />
            <ViewBox label="Email Address" value={store.ownerId?.email} />
            <ViewBox
              label="Store Address"
              value={store.address?.street}
              multiline
            />
            <PhoneBox label="Phone Number" value={store.ownerId?.phone} />
            <ViewBox label="City" value={store.address?.city} />
            <PhoneBox
              label="Alternate Phone Number"
              value={store.settings?.alternatePhone}
            />
            <ViewBox label="State" value={store.address?.state} />
            <div className="flex gap-4">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Store Logo
                </Label>
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt="Store logo"
                    className="h-24 w-24 rounded-lg border border-brand-cream object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-lg border border-brand-cream/70 bg-brand-cream/20 text-xs text-muted-foreground">
                    No logo
                  </div>
                )}
                {store.logo ? (
                  <a
                    href={store.logo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block text-xs font-semibold text-brand-orange"
                  >
                    Preview Logo
                  </a>
                ) : null}
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Store Banner
                </Label>
                {store.bannerImage ? (
                  <img
                    src={store.bannerImage}
                    alt="Store banner"
                    className="h-24 w-32 rounded-lg border border-brand-cream object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-32 place-items-center rounded-lg border border-brand-cream/70 bg-brand-cream/20 text-xs text-muted-foreground">
                    No banner
                  </div>
                )}
                {store.bannerImage ? (
                  <a
                    href={store.bannerImage}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 block text-xs font-semibold text-brand-orange"
                  >
                    Preview Banner
                  </a>
                ) : null}
              </div>
            </div>
            <ViewBox label="Pincode" value={store.address?.pincode} />
          </EditableCard>
        </div>

        <div className="space-y-4">
          {/* Documents */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold leading-tight">
                  Documents
                  <br />
                  Submitted
                </h2>
                <p className="shrink-0 text-right text-xs leading-tight text-muted-foreground">
                  {
                    STORE_DOCUMENT_TYPES.filter((d) =>
                      (store.documents ?? []).some(
                        (sd) => sd.type === d.type && sd.url,
                      ),
                    ).length
                  }
                  /{STORE_DOCUMENT_TYPES.length} Documents
                  <br />
                  Uploaded
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {STORE_DOCUMENT_TYPES.map(({ type, label }) => {
                  const doc = (store.documents ?? []).find(
                    (d) => d.type === type,
                  );
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between gap-2 rounded-xl border border-brand-cream/70 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-cream/40 text-brand-maroon">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {doc?.url
                              ? documentFileName(doc)
                              : "Not uploaded"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {doc?.url ? (
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ type, label })}
                            className="rounded-lg border border-brand-cream px-3 py-1.5 text-xs font-semibold text-brand-ink2 hover:bg-brand-cream/30"
                          >
                            View
                          </button>
                        ) : null}
                        {doc?.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              title="Verify"
                              onClick={() =>
                                verifyDoc.mutate({
                                  docId: doc._id,
                                  status: "verified",
                                })
                              }
                              className="grid h-7 w-7 place-items-center rounded-full bg-status-ok-bg text-brand-green"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Reject"
                              onClick={() =>
                                verifyDoc.mutate({
                                  docId: doc._id,
                                  status: "rejected",
                                })
                              }
                              className="grid h-7 w-7 place-items-center rounded-full bg-status-danger-bg text-brand-maroon"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : doc?.status === "verified" ? (
                          <span
                            title="Verified"
                            className="grid h-6 w-6 place-items-center rounded-full bg-brand-green text-white"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        ) : doc?.status === "rejected" ? (
                          <span
                            title="Rejected"
                            className="grid h-6 w-6 place-items-center rounded-full bg-brand-maroon text-white"
                          >
                            <XCircle className="h-4 w-4" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent bills — the receipts behind this store's revenue. Read-only here;
              the full, filterable list lives at /bills?restaurantId=. */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-bold">Recent Bills</h2>
                <button
                  type="button"
                  onClick={() => navigate(`/bills?restaurantId=${store._id}`)}
                  className="shrink-0 text-xs font-semibold text-brand-orange hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {recentBills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {billsLoading ? "Loading bills…" : "This store has not issued any bills yet."}
                  </p>
                ) : (
                  recentBills.map((bill) => (
                    <button
                      key={bill._id}
                      type="button"
                      onClick={() => navigate(`/bills/${bill._id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl bg-brand-cream/20 px-3 py-2.5 text-left transition hover:bg-brand-cream/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {bill.billNumber ?? bill.reference}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {[
                            bill.tableNumber ? `Table ${bill.tableNumber}` : humanize(bill.type),
                            formatDateTime(bill.createdAt),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold">
                          {formatMoney(bill.charges?.grandTotal)}
                        </span>
                        <Badge
                          variant={BILL_STATUS_VARIANT[bill.status] ?? "muted"}
                          className="mt-0.5 capitalize"
                        >
                          {bill.status}
                        </Badge>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold">Admin Notes</h2>
              <div className="mt-3 space-y-3">
                {(store.adminNotes ?? [])
                  .slice()
                  .reverse()
                  .map((n, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-brand-cream/20 px-3 py-2.5"
                    >
                      <p className="text-sm">{n.note}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(n.addedAt)}
                      </p>
                    </div>
                  ))}
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add notes about this store…"
                />
                <Button
                  type="button"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() =>
                    addNote.mutate(note.trim(), {
                      onSuccess: () => setNote(""),
                    })
                  }
                  className="w-full bg-brand-orange text-white hover:brightness-105"
                >
                  {addNote.isPending ? "Saving…" : "Save Note"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ConfirmDialog
        open={rejectOpen}
        title="Reject this store"
        description="This will move the store to Rejected status. Provide a reason — it's shown to the owner."
        requireReason
        reasonLabel="Rejection reason"
        confirmLabel="Reject Store"
        confirmVariant="destructive"
        loading={reject.isPending}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason) =>
          reject.mutate(reason, { onSuccess: () => setRejectOpen(false) })
        }
      />

      <DocumentViewer
        open={!!viewingDoc}
        title={viewingDoc?.label}
        doc={viewedDoc}
        fetchFile={fetchViewedFile}
        uploadedAtLabel={
          viewedDoc?.uploadedAt ? formatDate(viewedDoc.uploadedAt) : null
        }
        actionsDisabled={verifyDoc.isPending}
        onVerify={() =>
          verifyDoc.mutate({ docId: viewedDoc?._id, status: "verified" })
        }
        onReject={() =>
          verifyDoc.mutate({ docId: viewedDoc?._id, status: "rejected" })
        }
        onClose={() => setViewingDoc(null)}
      />

      <ConfirmDialog
        open={removeOpen}
        title="Remove this store"
        description="This soft-deletes the store (sets it inactive). Order and bill history is preserved. This action does not change the approval status."
        confirmLabel="Remove Store"
        confirmVariant="destructive"
        loading={remove.isPending}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() =>
          remove.mutate(undefined, { onSuccess: () => navigate("/stores") })
        }
      />
    </AdminLayout>
  );
}
