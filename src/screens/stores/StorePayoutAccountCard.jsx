import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, FileText, Landmark, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DocumentViewer from "@/components/admin/DocumentViewer";
import ReadOnlyField from "@/components/admin/ReadOnlyField";
import { useToast } from "@/components/admin/Toaster";
import { adminApi } from "@/api/admin.api";
import {
  useRejectPayoutAccount,
  useRejectPayoutChange,
  useRequestPayoutChangeInfo,
  useStorePayoutAccount,
  useVerifyPayoutAccount,
  useVerifyPayoutChange,
} from "@/hooks/admin/useStores";
import { formatDate, formatDateTime } from "@/lib/format";

// The bank account this store's weekly payouts are sent to (B7 / B12).
//
// Only ever masked — "Account ending 4417". The full number is shown solely through Reveal:
// a deliberate, audit-logged request whose answer lives in this component's state while the
// modal is open and is dropped the moment it closes (never in the query cache, never in a
// URL, never re-shown).
//
// Two decisions happen here:
//   • a first-time (or re-submitted) account: Verify / Reject, sent with the account's
//     submittedAt as the admin saw it;
//   • a change request on an already-verified account (S5 "Review request" lands here): the
//     verified account keeps receiving payouts until the request is decided. Verify / Reject /
//     Ask for information, sent with the request's requestedAt.
// Either way, if the owner changed something while the admin was looking the server refuses
// (409 ACCOUNT_CHANGED); the card refetches and says so instead of approving unseen details.

export const PAYOUT_ACCOUNT_STATUS = {
  verified: { label: "Verified", variant: "ok" },
  pending_verification: { label: "Pending verification", variant: "warn" },
  rejected: { label: "Rejected", variant: "danger" },
  not_added: { label: "Not added", variant: "muted" },
};

const CHANGE_STATUS = {
  in_review: { label: "Change in review", variant: "warn" },
  awaiting_restaurant: { label: "Awaiting restaurant", variant: "info" },
  rejected: { label: "Change rejected", variant: "danger" },
};

const ACCOUNT_TYPE = { savings: "Savings", current: "Current" };

const STALE_CODES = new Set([
  "ACCOUNT_CHANGED",
  "NO_OPEN_REQUEST",
  "NOT_PENDING_VERIFICATION",
]);

function AccountDetails({ account, title }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-brand-cream/70 p-3">
      {title ? (
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      <p className="text-sm font-bold">
        {account.accountNumberLast4
          ? `Account ending ${account.accountNumberLast4}`
          : "No account number"}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <ReadOnlyField
          label="Account holder"
          value={account.accountHolderName}
        />
        <ReadOnlyField label="IFSC" value={account.ifsc} />
        <ReadOnlyField label="Bank" value={account.bankName} />
        <ReadOnlyField label="Branch" value={account.branch} />
        <ReadOnlyField
          label="Account type"
          value={ACCOUNT_TYPE[account.accountType] ?? account.accountType}
        />
      </div>
    </div>
  );
}

function ProofLink({ proof, onView }) {
  if (!proof) {
    return (
      <p className="text-xs text-muted-foreground">
        No bank statement / cancelled cheque uploaded.
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onView(proof)}
      className="flex w-full items-center gap-2 rounded-lg border border-brand-cream px-3 py-2 text-left text-xs font-semibold text-brand-ink2 hover:bg-brand-cream/30"
    >
      <FileText className="h-4 w-4 text-brand-maroon" />
      <span className="flex-1">
        Proof document
        <span className="block font-normal text-muted-foreground">
          {proof.status === "verified"
            ? "Verified"
            : proof.status === "rejected"
              ? "Rejected"
              : "Awaiting review"}
          {proof.uploadedAt
            ? ` · uploaded ${formatDate(proof.uploadedAt)}`
            : ""}
        </span>
      </span>
      View
    </button>
  );
}

export default function StorePayoutAccountCard({ storeId, documents = [] }) {
  const toast = useToast();
  const {
    data: account,
    isLoading,
    error,
    refetch,
  } = useStorePayoutAccount(storeId);

  const verify = useVerifyPayoutAccount(storeId);
  const reject = useRejectPayoutAccount(storeId);
  const verifyChange = useVerifyPayoutChange(storeId);
  const rejectChange = useRejectPayoutChange(storeId);
  const askInfo = useRequestPayoutChangeInfo(storeId);

  // dialog: null | 'verify' | 'reject' | 'verifyChange' | 'rejectChange' | 'askInfo'
  const [dialog, setDialog] = useState(null);
  // { which, accountNumber } while the reveal modal is open; null otherwise.
  const [revealed, setRevealed] = useState(null);
  const [revealWarning, setRevealWarning] = useState(null); // 'current' | 'requested'
  const [revealing, setRevealing] = useState(false);
  const [viewingProof, setViewingProof] = useState(null);
  const [stale, setStale] = useState(null);

  const viewedDoc = viewingProof
    ? documents.find((d) => String(d._id) === String(viewingProof._id))
    : null;
  const fetchProof = useCallback(
    () => adminApi.getStoreDocumentFile(storeId, viewingProof?._id),
    [storeId, viewingProof?._id],
  );

  const handlers = (successMessage) => ({
    onSuccess: () => {
      setDialog(null);
      setStale(null);
      toast.success(successMessage);
    },
    onError: (err) => {
      setDialog(null);
      if (STALE_CODES.has(err.code)) {
        setStale(
          err.code === "ACCOUNT_CHANGED"
            ? "The restaurant changed these bank details while you were reviewing them. The latest details are shown below — check them again before deciding."
            : "This request is no longer open — it was decided or withdrawn meanwhile. The current state is shown below.",
        );
        refetch();
      }
      toast.error(err, "Could not update the bank account.");
    },
  });

  const doReveal = async (which) => {
    setRevealWarning(null);
    setRevealing(true);
    try {
      const res = await adminApi.revealStorePayoutAccount(storeId, which);
      setRevealed({ which, accountNumber: res.data.data.accountNumber });
    } catch (err) {
      toast.error(err, "Could not reveal the account number.");
    } finally {
      setRevealing(false);
    }
  };

  const closeReveal = () => setRevealed(null);

  // Payouts → Bank requests → "Review request" links here as #bank-account: bring the card
  // into view once it has loaded.
  useEffect(() => {
    if (account && window.location.hash === "#bank-account") {
      document
        .getElementById("bank-account")
        ?.scrollIntoView({ block: "start" });
    }
  }, [account]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Loading bank account…
        </CardContent>
      </Card>
    );
  }
  if (error || !account) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-brand-maroon">
          {error?.message ?? "The bank account could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  const status =
    PAYOUT_ACCOUNT_STATUS[account.status] ?? PAYOUT_ACCOUNT_STATUS.not_added;
  const change = account.pendingChange;
  const changeOpen = account.hasPendingChange;
  const changeStatus = change ? CHANGE_STATUS[change.status] : null;
  const busy =
    verify.isPending ||
    reject.isPending ||
    verifyChange.isPending ||
    rejectChange.isPending ||
    askInfo.isPending;

  return (
    <Card id="bank-account" className="scroll-mt-6">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Landmark className="h-4 w-4 text-brand-orange" /> Bank account
          </h2>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {stale ? (
          <p className="rounded-lg border border-brand-orange/30 bg-status-warn-bg px-3 py-2 text-xs font-medium text-brand-ink">
            {stale}
          </p>
        ) : null}

        {account.status === "not_added" ? (
          <p className="text-sm text-muted-foreground">
            The restaurant hasn't added a bank account yet. Payouts can't be
            scheduled until one is added and verified.
          </p>
        ) : (
          <>
            <AccountDetails
              account={account}
              title={changeOpen ? "Current (receives payouts)" : null}
            />
            {account.status === "rejected" && account.rejectionReason ? (
              <p className="text-xs text-brand-maroon">
                <span className="font-semibold">Rejected: </span>
                {account.rejectionReason}
              </p>
            ) : null}
            {account.verifiedAt ? (
              <p className="text-xs text-muted-foreground">
                Verified on {formatDateTime(account.verifiedAt)}
              </p>
            ) : null}
            <ProofLink proof={account.proofDocument} onView={setViewingProof} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={revealing}
                onClick={() => setRevealWarning("current")}
              >
                <Eye className="h-4 w-4" /> Reveal number
              </Button>
              {account.status === "pending_verification" ? (
                <>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => setDialog("verify")}
                    className="bg-brand-orange text-white hover:brightness-105"
                  >
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDialog("reject")}
                    className="text-brand-maroon"
                  >
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
          </>
        )}

        {change ? (
          <div className="space-y-3 border-t border-brand-cream/60 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">Requested change</p>
              {changeStatus ? (
                <Badge variant={changeStatus.variant}>
                  {changeStatus.label}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Received {formatDateTime(change.requestedAt)}. Payouts keep going
              to the current account until this is verified.
            </p>
            <AccountDetails account={change} title="Requested" />
            {change.infoRequest ? (
              <p className="rounded-lg bg-status-info-bg px-3 py-2 text-xs">
                <span className="font-semibold">
                  You asked ({formatDateTime(change.infoRequest.at)}):{" "}
                </span>
                {change.infoRequest.message}
              </p>
            ) : null}
            {change.status === "rejected" && change.rejectionReason ? (
              <p className="text-xs text-brand-maroon">
                <span className="font-semibold">Rejected: </span>
                {change.rejectionReason}
              </p>
            ) : null}
            <ProofLink proof={change.proofDocument} onView={setViewingProof} />
            {changeOpen ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={revealing}
                  onClick={() => setRevealWarning("requested")}
                >
                  <Eye className="h-4 w-4" /> Reveal requested
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => setDialog("verifyChange")}
                  className="bg-brand-orange text-white hover:brightness-105"
                >
                  Verify change
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDialog("askInfo")}
                >
                  Ask restaurant for information
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDialog("rejectChange")}
                  className="text-brand-maroon"
                >
                  Reject change
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={dialog === "verify"}
        title="Verify this bank account?"
        description={`Payouts for this restaurant will go to the account ending ${account.accountNumberLast4 ?? "—"}. Check the number against the proof document first.`}
        confirmLabel="Verify account"
        loading={verify.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          verify.mutate(account.submittedAt, handlers("Bank account verified."))
        }
      />
      <ConfirmDialog
        open={dialog === "reject"}
        title="Reject this bank account?"
        description="The reason is shown to the restaurant so they can correct it."
        requireReason
        minReasonLength={3}
        reasonLabel="Reason (shown to the restaurant)"
        confirmLabel="Reject account"
        confirmVariant="destructive"
        loading={reject.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={(reason) =>
          reject.mutate(
            { reason, submittedAt: account.submittedAt },
            handlers("Bank account rejected."),
          )
        }
      />
      <ConfirmDialog
        open={dialog === "verifyChange"}
        title="Verify the requested account?"
        description={`From now on payouts go to the account ending ${change?.accountNumberLast4 ?? "—"} instead of ${account.accountNumberLast4 ?? "—"}. A payout already scheduled must have its date confirmed again before release.`}
        confirmLabel="Verify change"
        loading={verifyChange.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          verifyChange.mutate(
            change?.requestedAt,
            handlers("Bank account change verified."),
          )
        }
      />
      <ConfirmDialog
        open={dialog === "rejectChange"}
        title="Reject the requested change?"
        description="The current account stays in use. The reason is shown to the restaurant."
        requireReason
        minReasonLength={3}
        reasonLabel="Reason (shown to the restaurant)"
        confirmLabel="Reject change"
        confirmVariant="destructive"
        loading={rejectChange.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={(reason) =>
          rejectChange.mutate(
            { reason, requestedAt: change?.requestedAt },
            handlers("Bank account change rejected."),
          )
        }
      />
      <ConfirmDialog
        open={dialog === "askInfo"}
        title="Ask the restaurant for information"
        description="The restaurant sees this message on its Bank & payout settings page. Never ask for a full account number, card details or an OTP."
        requireReason
        minReasonLength={3}
        reasonLabel="Message"
        reasonPlaceholder="e.g. Please upload a cancelled cheque for the new account."
        confirmLabel="Send request"
        loading={askInfo.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={(message) =>
          askInfo.mutate(
            { message, requestedAt: change?.requestedAt },
            handlers("Request sent to the restaurant."),
          )
        }
      />

      {/* Reveal: warn first, then show once. */}
      <ConfirmDialog
        open={!!revealWarning}
        title="Reveal the full account number?"
        description="This is recorded in the admin activity log with your name. Only reveal it to check it against the proof document — don't copy it anywhere."
        confirmLabel="Reveal"
        loading={revealing}
        onCancel={() => setRevealWarning(null)}
        onConfirm={() => doReveal(revealWarning)}
      >
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-status-warn-bg px-3 py-2 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-brand-orange" />
          {revealWarning === "requested"
            ? "Requested account (not yet in use)"
            : "Current account"}
        </p>
      </ConfirmDialog>

      {revealed ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-cream/60 bg-white p-5 shadow-lg">
            <h2 className="text-base font-bold">
              {revealed.which === "requested"
                ? "Requested account number"
                : "Account number"}
            </h2>
            <p className="mt-3 select-all rounded-lg border border-brand-cream/70 bg-brand-cream/10 px-3 py-3 text-center font-mono text-lg tracking-widest">
              {revealed.accountNumber}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Shown once. Closing this hides it again; revealing it again is
              logged again.
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={closeReveal}
              >
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <DocumentViewer
        open={!!viewingProof}
        title="Bank proof"
        doc={viewedDoc}
        fetchFile={fetchProof}
        uploadedAtLabel={
          viewedDoc?.uploadedAt ? formatDate(viewedDoc.uploadedAt) : null
        }
        onClose={() => setViewingProof(null)}
      />
    </Card>
  );
}
