// The payout action modals — Figma M1 Schedule payout (also Change date / Reschedule payout),
// M2 Release payout, M3 Mark as paid, M4 Mark as failed, M5 Place on hold (also Update
// reason) — and the Release hold confirm. Each is one server step; the server refuses a
// stale one (409) and the detail screen refetches. Copy follows the frames.

import { useEffect, useState } from "react";

import { DateField, Input, Label } from "./ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";
import { useToast } from "@/components/admin/Toaster";
import {
  useChangePayoutDate,
  useHoldPayout,
  useMarkPayoutFailed,
  useMarkPayoutPaid,
  usePayoutOptions,
  useReleasePayout,
  useReleasePayoutHold,
  useReschedulePayout,
  useSchedulePayout,
  useUpdatePayoutHoldReason,
} from "@/hooks/admin/usePayouts";
import {
  dayMonthYear,
  isoDay,
  payoutDateOfIso,
  periodLabel,
  rupees,
  todayIso,
} from "@/lib/payouts";
import { InfoBox, PayoutModal, SummaryBox, WarnBox } from "./parts";

const DAY_NAME = {
  monday: "Mondays",
  tuesday: "Tuesdays",
  wednesday: "Wednesdays",
  thursday: "Thursdays",
  friday: "Fridays",
  saturday: "Saturdays",
  sunday: "Sundays",
};

// "12 Oct 2026" for a "YYYY-MM-DD" (the date-credited field).
const dayMonthYearOfIso = (iso) => dayMonthYear(`${iso}T12:00:00+05:30`);

const destinationOf = (data) =>
  data.destination?.accountNumberLast4
    ? `Account ending ${data.destination.accountNumberLast4}`
    : "No bank account on file";

const subtitleOf = (data, extra) =>
  [
    data.restaurant?.name,
    extra ??
      periodLabel(data.settlement.periodStart, data.settlement.periodEnd, {
        withYear: true,
      }),
  ]
    .filter(Boolean)
    .join(" · ");

const amountSubtitle = (data) =>
  subtitleOf(data, rupees(data.settlement.totals?.netPayable));

const help = "text-sm text-pay-ink2";
const errorText = "text-sm text-pay-danger";

// Server field errors ({ details.fieldErrors }) or the message.
const fieldError = (err, field) =>
  err?.details?.fieldErrors?.[field]?.[0] ?? null;

function ReasonSelect({ value, onChange, reasons, id }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-12 w-full text-base font-normal">
        <SelectValue placeholder="Choose a reason" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(reasons ?? {}).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── M1 · Schedule payout / Change date / Reschedule payout ──────────────────────────────────
const SCHEDULE_COPY = {
  schedule: {
    title: "Schedule payout",
    confirm: "Schedule payout",
    done: "Payout scheduled",
  },
  change: {
    title: "Change release date",
    confirm: "Save new date",
    done: "Release date changed",
  },
  reschedule: {
    title: "Reschedule payout",
    confirm: "Reschedule payout",
    done: "Payout rescheduled",
  },
};

export function ScheduleModal({ open, mode = "schedule", data, onClose }) {
  const toast = useToast();
  const { data: options } = usePayoutOptions();
  const id = data?.settlement?._id;
  const schedule = useSchedulePayout(id);
  const change = useChangePayoutDate(id);
  const reschedule = useReschedulePayout(id);
  const mutation = { schedule, change, reschedule }[mode];
  const copy = SCHEDULE_COPY[mode];
  const [date, setDate] = useState("");

  // Fresh each time it opens: the current date when changing it, else the next payout day.
  useEffect(() => {
    if (!open) return;
    const current = data?.transfer?.scheduledFor;
    setDate(
      mode === "change" && current
        ? isoDay(current)
        : isoDay(options?.defaultReleaseDate) || todayIso(),
    );
  }, [open, mode, data, options?.defaultReleaseDate]);

  if (!data) return null;
  const tooEarly = date && date < todayIso();

  async function confirm() {
    try {
      await mutation.mutateAsync(date);
      toast.success(`${copy.done} for ${payoutDateOfIso(date)}`);
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't save the release date.");
    }
  }

  return (
    <PayoutModal
      open={open}
      title={copy.title}
      subtitle={subtitleOf(data)}
      confirmLabel={copy.confirm}
      confirmDisabled={!date || tooEarly}
      loading={mutation.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <SummaryBox
        rows={[
          ["Net payable", rupees(data.settlement.totals?.netPayable)],
          ["Destination", destinationOf(data)],
        ]}
      />
      <div className="space-y-2">
        <Label htmlFor="release-date">Release date</Label>
        <DateField
          id="release-date"
          value={date}
          min={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          display={date ? payoutDateOfIso(date) : "Pick a date"}
          invalid={Boolean(tooEarly)}
        />
        <p className={tooEarly ? errorText : help}>
          {tooEarly
            ? "Pick today or a later date."
            : `Payouts go out on ${DAY_NAME[options?.payoutDayOfWeek] ?? "the payout day"}. You can change the date until you release.`}
        </p>
      </div>
      <InfoBox>
        The restaurant sees Scheduled · {payoutDateOfIso(date)} as soon as you
        save. Nothing is sent to the bank yet.
      </InfoBox>
    </PayoutModal>
  );
}

// ── M2 · Release payout ─────────────────────────────────────────────────────────────────────
export function ReleaseModal({ open, data, onClose }) {
  const toast = useToast();
  const release = useReleasePayout(data?.settlement?._id);
  if (!data) return null;
  const amount = data.settlement.totals?.netPayable;

  async function confirm() {
    try {
      // The amount the admin is looking at: refused if the statement changed since.
      await release.mutateAsync(amount);
      toast.success(`${rupees(amount)} released — record the bank result next`);
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't release the payout.");
    }
  }

  return (
    <PayoutModal
      open={open}
      title="Release payout"
      subtitle={subtitleOf(data)}
      confirmLabel={`Release ${rupees(amount)}`}
      loading={release.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <SummaryBox
        rows={[
          ["Amount", rupees(amount)],
          ["Destination", destinationOf(data)],
          [
            "Scheduled for",
            payoutDateOfIso(isoDay(data.transfer?.scheduledFor)),
          ],
        ]}
      />
      {data.destination?.changeRequested ? (
        <WarnBox>
          The restaurant has asked to change its bank account. This transfer
          goes to the verified account above until that change is verified.
        </WarnBox>
      ) : null}
      <WarnBox>
        This creates a transfer attempt and the restaurant sees Processing. It
        does not mark the payout Paid. You record the bank result next.
      </WarnBox>
    </PayoutModal>
  );
}

// ── M3 · Mark as paid ───────────────────────────────────────────────────────────────────────
export function MarkPaidModal({ open, data, onClose }) {
  const toast = useToast();
  const markPaid = useMarkPayoutPaid(data?.settlement?._id);
  const [reference, setReference] = useState("");
  const [credited, setCredited] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReference("");
    setCredited(todayIso());
    setTouched(false);
    setServerError(null);
  }, [open]);

  if (!data) return null;
  const releasedOn = isoDay(data.transfer?.releasedAt);
  const referenceMissing = reference.trim().length < 4;
  const dateError =
    credited > todayIso()
      ? "The credit date can't be in the future."
      : releasedOn && credited < releasedOn
        ? "The credit date can't be before the payout was released."
        : null;

  async function confirm() {
    setTouched(true);
    if (referenceMissing || dateError) return;
    try {
      await markPaid.mutateAsync({
        bankReference: reference.trim(),
        // Midday IST of the chosen day — a bare date would be read as UTC midnight.
        creditedAt: `${credited}T12:00:00+05:30`,
      });
      toast.success("Payout marked paid — the restaurant sees the reference");
      onClose();
    } catch (err) {
      setServerError(err);
      toast.error(err, "Couldn't mark the payout paid.");
    }
  }

  const refError =
    fieldError(serverError, "bankReference") ??
    (touched && referenceMissing
      ? "Enter the bank reference to continue."
      : null);

  return (
    <PayoutModal
      open={open}
      title="Mark as paid"
      subtitle={subtitleOf(data, rupees(data.settlement.totals?.netPayable))}
      confirmLabel="Save and mark as paid"
      loading={markPaid.isPending}
      // Paid is final and the restaurant sees it at once — review the typed reference and
      // date against the amount before it is saved.
      validate={() => {
        setTouched(true);
        return !referenceMissing && !dateError;
      }}
      review={{
        title: `Mark ${rupees(data.settlement.totals?.netPayable)} to ${data.restaurant?.name ?? "this restaurant"} as paid?`,
        description: `Bank reference ${reference.trim() || "—"}, credited ${credited ? dayMonthYearOfIso(credited) : "—"}. The restaurant sees Paid with this reference immediately, and a paid payout can't be reopened — check it against your bank record.`,
        confirmLabel: "Mark as paid",
      }}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label htmlFor="bank-reference">Bank reference</Label>
        <Input
          id="bank-reference"
          value={reference}
          maxLength={40}
          onChange={(e) => setReference(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Enter the reference from the bank"
          aria-invalid={Boolean(refError)}
          className={refError ? "border-pay-danger" : undefined}
          autoFocus
        />
        {refError ? (
          <p role="alert" className={errorText}>
            {refError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="credited-at">Date credited</Label>
        <DateField
          id="credited-at"
          value={credited}
          max={todayIso()}
          min={releasedOn || undefined}
          onChange={(e) => setCredited(e.target.value)}
          display={credited ? dayMonthYearOfIso(credited) : "Pick a date"}
          invalid={Boolean(dateError)}
        />
        {dateError ? (
          <p role="alert" className={errorText}>
            {dateError}
          </p>
        ) : null}
      </div>
      <InfoBox>
        The restaurant sees Paid with this reference as soon as you save. Check
        it against your bank record first.
      </InfoBox>
    </PayoutModal>
  );
}

// ── M4 · Mark as failed ─────────────────────────────────────────────────────────────────────
export function MarkFailedModal({ open, data, onClose }) {
  const toast = useToast();
  const { data: options } = usePayoutOptions();
  const markFailed = useMarkPayoutFailed(data?.settlement?._id);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("bank_rejected_credit");
    setNote("");
  }, [open]);

  if (!data) return null;
  const needsNote = reason === "other" && note.trim().length < 3;

  async function confirm() {
    try {
      await markFailed.mutateAsync({
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(
        "Payout marked failed — it stays eligible for a reschedule",
      );
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't mark the payout failed.");
    }
  }

  return (
    <PayoutModal
      open={open}
      title="Mark as failed"
      subtitle={amountSubtitle(data)}
      confirmLabel="Mark as failed"
      confirmDisabled={!reason || needsNote}
      loading={markFailed.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <SummaryBox
        rows={[
          ["Attempt reference", data.transfer?.attemptRef ?? "—"],
          ["Amount", rupees(data.settlement.totals?.netPayable)],
        ]}
      />
      <div className="space-y-2">
        <Label htmlFor="failure-reason">Reason</Label>
        <ReasonSelect
          id="failure-reason"
          value={reason}
          onChange={setReason}
          reasons={options?.failureReasons}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="failure-note">
          Note{reason === "other" ? "" : " (optional)"}
        </Label>
        <Input
          id="failure-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What the bank told you"
        />
      </div>
      <WarnBox>
        The amount stays eligible and unpaid. No extra fee is charged and no
        retry date is promised until you reschedule.
      </WarnBox>
    </PayoutModal>
  );
}

// ── M5 · Place on hold / Update reason ──────────────────────────────────────────────────────
export function HoldModal({ open, mode = "hold", data, onClose }) {
  const toast = useToast();
  const { data: options } = usePayoutOptions();
  const id = data?.settlement?._id;
  const hold = useHoldPayout(id);
  const update = useUpdatePayoutHoldReason(id);
  const mutation = mode === "update" ? update : hold;
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const current = data?.settlement?.hold;
    setReason(
      mode === "update" && current?.manual ? current.reason : "dispute_review",
    );
    setNote(mode === "update" ? (current?.internalNote ?? "") : "");
  }, [open, mode, data]);

  if (!data) return null;

  async function confirm() {
    try {
      await mutation.mutateAsync({
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(
        mode === "update" ? "Hold reason updated" : "Payout placed on hold",
      );
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't save the hold.");
    }
  }

  return (
    <PayoutModal
      open={open}
      title={mode === "update" ? "Update hold reason" : "Place on hold"}
      subtitle={amountSubtitle(data)}
      confirmLabel={mode === "update" ? "Save reason" : "Place on hold"}
      confirmDisabled={!reason}
      loading={mutation.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label htmlFor="hold-reason">Reason</Label>
        <ReasonSelect
          id="hold-reason"
          value={reason}
          onChange={setReason}
          reasons={options?.holdReasons}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hold-note">Internal note</Label>
        <Input
          id="hold-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the team"
        />
        <p className={help}>Only Yulo staff can see this note.</p>
      </div>
      <WarnBox>
        The restaurant sees On hold and no date is promised. Release the hold to
        make the payout eligible again.
      </WarnBox>
    </PayoutModal>
  );
}

// ── Release hold ────────────────────────────────────────────────────────────────────────────
export function ReleaseHoldDialog({ open, data, onClose }) {
  const toast = useToast();
  const releaseHold = useReleasePayoutHold(data?.settlement?._id);
  if (!data) return null;
  return (
    <PayoutModal
      open={open}
      title="Release hold"
      subtitle={amountSubtitle(data)}
      confirmLabel="Release hold"
      loading={releaseHold.isPending}
      onClose={onClose}
      onConfirm={async () => {
        try {
          await releaseHold.mutateAsync();
          toast.success(
            "Hold released — the payout is eligible, not scheduled",
          );
          onClose();
        } catch (err) {
          toast.error(err, "Couldn't release the hold.");
        }
      }}
    >
      <InfoBox>
        Releasing the hold returns the payout to Eligible, not scheduled. You
        still pick the release date.
      </InfoBox>
    </PayoutModal>
  );
}
