import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaginationBar from "@/components/admin/PaginationBar";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { usePagination } from "@/hooks/admin/usePagination";
import { useOfferDecision, useOffers } from "@/hooks/admin/useSellers";
import { OFFER_STATUS } from "@/lib/coupons";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import AdminLayout from "../AdminLayout";

const TABS = ["pending_review", "approved", "paused", "rejected", "draft"];

/**
 * Offer review: what each seller's coupon promises customers, approved or rejected before anyone
 * receives it. Each decision is sent with the offer's `updatedAt` as shown here — if the seller
 * edited it meanwhile, the server refuses (409 OFFER_CHANGED) and the queue reloads with the new
 * text, so nothing is ever approved unread.
 */
export default function OfferReview() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState("pending_review");
  const { page, limit, setPage, setLimit } = usePagination(20);
  const offers = useOffers({ status, page, limit });
  const decide = useOfferDecision();
  const counts = offers.data?.statusCounts ?? {};

  const decision = (offer, kind) => (reason) =>
    decide.mutateAsync(
      { id: offer._id, decision: kind, reason, updatedAt: offer.updatedAt },
      {
        onSuccess: () =>
          toast.success(
            kind === "approve"
              ? `"${offer.title}" is live`
              : `"${offer.title}" was sent back to the seller`,
          ),
        onError: (err) =>
          err?.code === "OFFER_CHANGED"
            ? toast.error(
                "The seller changed this offer while you were reviewing it — the new version is shown now.",
              )
            : toast.error(err, "Could not save the decision."),
      },
    );

  return (
    <AdminLayout
      title="Offer review"
      breadcrumb="Coupons"
      subtitle="Every offer is checked before customers receive it"
    >
      <div
        role="tablist"
        aria-label="Offer status"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={status === t}
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              status === t
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-brand-cream bg-white text-brand-ink2",
            )}
          >
            {OFFER_STATUS[t].label}
            <span className="ml-1.5 opacity-80">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      {offers.isError ? (
        <p role="alert" className="text-sm text-brand-maroon">
          {offers.error?.message ?? "Could not load offers."}
        </p>
      ) : offers.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : offers.data.offers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {status === "pending_review"
              ? "Nothing to review. 🎉"
              : "No offers here."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {offers.data.offers.map((o) => (
            <li key={o._id} data-testid={`offer-${o._id}`}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">{o.title}</p>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          to={`/sellers/${o.seller?._id}`}
                          className="hover:underline"
                        >
                          {o.seller?.businessName}
                        </Link>{" "}
                        · {o.category?.name} ·{" "}
                        {`valid ${o.validityDays ?? 30} days`} · edited{" "}
                        {formatDateTime(o.updatedAt)}
                      </p>
                    </div>
                    <Badge variant={OFFER_STATUS[o.status]?.variant ?? "muted"}>
                      {OFFER_STATUS[o.status]?.label ?? o.status}
                    </Badge>
                  </div>
                  {o.terms ? (
                    <p className="whitespace-pre-wrap rounded-lg bg-brand-cream/30 p-3 text-sm">
                      {o.terms}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No terms.
                    </p>
                  )}
                  {o.status === "rejected" && o.rejectionReason ? (
                    <p className="text-sm text-brand-maroon">
                      Rejected: {o.rejectionReason}
                    </p>
                  ) : null}
                  {o.status === "pending_review" ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        onClick={() =>
                          confirm.ask({
                            title: `Reject "${o.title}"?`,
                            description:
                              "The seller sees your reason and can edit the offer and send it again.",
                            requireReason: true,
                            minReasonLength: 5,
                            reasonLabel: "Reason (shown to the seller)",
                            confirmLabel: "Reject offer",
                            tone: "danger",
                            onConfirm: decision(o, "reject"),
                          })
                        }
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() =>
                          confirm.ask({
                            title: `Approve "${o.title}"?`,
                            description: `Customers start receiving this as ${o.seller?.businessName}'s coupon.`,
                            confirmLabel: "Approve offer",
                            onConfirm: decision(o, "approve"),
                          })
                        }
                      >
                        Approve
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {offers.data && offers.data.total > 0 ? (
        <PaginationBar
          page={page}
          pages={offers.data.pages}
          total={offers.data.total}
          onPageChange={setPage}
          itemLabel="offers"
          pageSize={limit}
          onPageSizeChange={setLimit}
        />
      ) : null}
      {confirm.dialog}
    </AdminLayout>
  );
}
