// One payment issue (Figma I3): the restaurant's report and attachment, the reply thread
// (every message, with attachments — not drawn in I3, added above the reply box), the reply
// box, ticket progress, the linked payout, the ticket-status actions and "What the owner
// sees". Changing the ticket's status never changes the payout's status.

import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CircleCheck,
  Clock3,
  FileText,
  MessageSquare,
  Paperclip,
  X,
} from "lucide-react";

import { Badge } from "./ui";
import { Button } from "./ui";
import { Card, CardContent } from "./ui";
import { Label, Textarea } from "./ui";
import { useToast } from "@/components/admin/Toaster";
import { adminApi } from "@/api/admin.api";
import {
  useAskRestaurant,
  usePaymentIssue,
  useReplyToIssue,
  useSetIssueStatus,
} from "@/hooks/admin/usePaymentIssues";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  ISSUE_STATUS,
  ISSUE_TYPE_LABEL,
  TRANSFER,
  dayMonth,
  dayMonthYear,
  periodLabel,
  rupees,
} from "@/lib/payouts";
import AdminLayout from "../AdminLayout";
import {
  Crumbs,
  IconTile,
  OwnerSeesCard,
  PayoutModal,
  TransferBadge,
} from "./parts";

const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

const sizeOf = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round((bytes ?? 0) / 1024))} KB`;
const typeOf = (mime) =>
  mime === "application/pdf"
    ? "PDF"
    : (mime?.split("/")[1]?.toUpperCase() ?? "File");

// The owner-facing status line, mirroring the restaurant portal's mapping (F5b).
const OWNER_VIEW = {
  open: { status: "Open", step: "Awaiting review" },
  in_review: { status: "In review", step: "Awaiting review" },
  awaiting_restaurant: {
    status: "Awaiting restaurant",
    step: "Yulo needs more information",
  },
  resolved: { status: "Resolved", step: "Issue resolved" },
};

function AttachmentRow({ ticketId, attachment }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function view() {
    setBusy(true);
    try {
      const blob = await adminApi.getTicketAttachment(ticketId, attachment._id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err, "Couldn't open the attachment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-4">
      <IconTile icon={FileText} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{attachment.name}</p>
        <p className="mt-0.5 text-sm text-pay-ink2">
          {typeOf(attachment.mimeType)} · {sizeOf(attachment.size)}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={view} disabled={busy}>
        {busy ? "Opening…" : "View attachment"}
      </Button>
    </div>
  );
}

// "Issue submitted · Awaiting review · Support response · Issue resolved" — done steps green,
// the step the ticket is waiting on in the accent tint (clock), later steps grey.
function ProgressSteps({ ticket }) {
  const p = ticket.progress ?? {};
  const status = ticket.status;
  const steps = [
    {
      label: "Issue submitted",
      done: true,
      sub: dayMonth(p.submittedAt),
      icon: CircleCheck,
    },
    {
      label: "Awaiting review",
      done: Boolean(p.reviewedAt) || status !== "open",
      sub: p.reviewedAt
        ? `Reviewed ${dayMonth(p.reviewedAt)}`
        : "Not reviewed yet",
      icon: Clock3,
    },
    {
      label: "Support response",
      done: Boolean(p.firstResponseAt),
      sub: p.firstResponseAt
        ? status === "awaiting_restaurant"
          ? "Waiting for the restaurant"
          : `Replied ${dayMonth(p.firstResponseAt)}`
        : "No response yet",
      icon: MessageSquare,
    },
    {
      label: "Issue resolved",
      done: status === "resolved",
      sub: p.resolvedAt ? dayMonth(p.resolvedAt) : "Not yet resolved",
      icon: CircleCheck,
    },
  ];
  const current = steps.find((s) => !s.done)?.label;
  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-bold">Ticket progress</h2>
        <ol className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.label}>
              <IconTile
                icon={
                  s.done ? CircleCheck : s.label === current ? Clock3 : s.icon
                }
                tone={
                  s.done ? "positive" : s.label === current ? "accent" : "muted"
                }
              />
              <p className="mt-4 text-base font-semibold">{s.label}</p>
              <p className="mt-1 text-sm text-pay-ink2">{s.sub}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function LinkedRecordCard({ record }) {
  const navigate = useNavigate();
  if (!record) {
    return (
      <Card>
        <CardContent className="text-sm text-pay-ink2">
          This ticket isn't linked to a payout or an order.
        </CardContent>
      </Card>
    );
  }
  const payout = record.kind === "payout" ? record : record.statement;
  const rows =
    record.kind === "payout"
      ? [
          [
            "Period",
            periodLabel(record.period?.start, record.period?.end, {
              withYear: true,
            }),
          ],
          ["Net payout", rupees(record.amountPaise)],
          ["Paid on", record.paidAt ? dayMonthYear(record.paidAt) : "—"],
          [
            "Destination",
            record.last4 ? `Account ending ${record.last4}` : "—",
          ],
        ]
      : [
          [record.kind === "bill" ? "Bill" : "Order", record.displayNo ?? "—"],
          ["Date", dayMonthYear(record.date)],
          ["Customer paid", rupees(record.amountPaise)],
          [
            "Statement",
            payout
              ? periodLabel(payout.period?.start, payout.period?.end, {
                  withYear: true,
                })
              : "Not in a statement yet",
          ],
        ];
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {record.kind === "payout"
              ? "Linked payout"
              : `Linked ${record.kind}`}
          </h3>
          {record.transferStatus ? (
            <TransferBadge value={record.transferStatus} />
          ) : null}
        </div>
        <dl className="mt-4 space-y-3 rounded-2xl bg-pay-sunken px-4 py-4 text-base">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-pay-ink2">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
          {payout?.bankReference ? (
            <div>
              <dt className="text-sm text-pay-ink2">Bank reference</dt>
              <dd className="mt-1 font-semibold">{payout.bankReference}</dd>
            </div>
          ) : null}
        </dl>
        {payout?.settlementId ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(`/payouts/${payout.settlementId}?from=issues`)
            }
            className="mt-6 w-full"
          >
            Open payout
          </Button>
        ) : record.kind === "bill" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/bills/${record.billId}`)}
            className="mt-6 w-full"
          >
            Open bill
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Thread({ ticket }) {
  const messages = ticket.messages ?? [];
  if (messages.length === 0) return null;
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold">Conversation</h2>
        {messages.map((m) => {
          const fromSupport = m.from === "support";
          return (
            <div
              key={m._id}
              className={cn(
                "rounded-2xl px-4 py-3 text-base",
                m.requestsInformation
                  ? "bg-pay-warn-bg"
                  : fromSupport
                    ? "bg-pay-pos-bg"
                    : "bg-pay-sunken",
              )}
            >
              <p className="text-sm font-semibold text-pay-ink2">
                {fromSupport ? "Yulo support" : "Restaurant"}
                {m.requestsInformation ? " · asked for information" : ""} ·{" "}
                {formatDateTime(m.sentAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
              {m.redacted ? (
                <p className="mt-1 text-sm text-pay-ink2">
                  Numbers that looked like account, card or OTP details were
                  hidden.
                </p>
              ) : null}
              {(m.attachments ?? []).length ? (
                <div className="mt-3 space-y-3">
                  {m.attachments.map((a) => (
                    <AttachmentRow
                      key={a._id}
                      ticketId={ticket._id}
                      attachment={a}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ReplyBox({ ticket }) {
  const toast = useToast();
  const reply = useReplyToIssue(ticket._id);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileRef = useRef(null);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ATTACHMENT_TYPES.includes(f.type))
      return setFileError("Attach a PDF, JPG or PNG.");
    if (f.size > MAX_BYTES) return setFileError("The file must be under 5 MB.");
    setFileError("");
    setFile(f);
  }

  async function send() {
    try {
      await reply.mutateAsync({ text: text.trim(), file });
      toast.success("Reply sent to the restaurant");
      setText("");
      setFile(null);
    } catch (err) {
      toast.error(err, "Couldn't send the reply.");
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-bold">Reply to the restaurant</h2>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          placeholder="Write a reply to the restaurant"
          className="mt-6 min-h-[112px]"
        />
        <p className="mt-3 text-sm text-pay-ink2">
          Never ask for full account numbers, card details or OTPs.
        </p>
        {file ? (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 text-pay-accent" />
            <span className="truncate">{file.name}</span>
            <span className="text-sm text-pay-ink2">{sizeOf(file.size)}</span>
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setFile(null)}
              className="text-pay-ink2 hover:text-pay-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {fileError ? (
          <p role="alert" className="mt-2 text-sm text-pay-danger">
            {fileError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-4">
          <input
            ref={fileRef}
            type="file"
            accept={ATTACHMENT_TYPES.join(",")}
            className="hidden"
            onChange={pick}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            Attach file
          </Button>
          <Button
            type="button"
            disabled={!text.trim() || reply.isPending}
            onClick={send}
          >
            {reply.isPending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// A payout-style modal with one text field (ask for information / resolution note). Fresh text
// each time it opens.
function TextModal({
  open,
  title,
  subtitle,
  info,
  label,
  placeholder,
  minLength,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}) {
  const [text, setText] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText("");
  }
  return (
    <PayoutModal
      open={open}
      title={title}
      subtitle={subtitle}
      confirmLabel={confirmLabel}
      confirmDisabled={text.trim().length < minLength}
      loading={loading}
      onClose={onClose}
      onConfirm={() => onConfirm(text.trim())}
    >
      <div className="space-y-2">
        <Label htmlFor="ticket-text">{label}</Label>
        <Textarea
          id="ticket-text"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <p className="rounded-2xl bg-pay-info-bg px-4 py-3 text-sm">{info}</p>
    </PayoutModal>
  );
}

function StatusCard({ ticket }) {
  const toast = useToast();
  const setStatus = useSetIssueStatus(ticket._id);
  const ask = useAskRestaurant(ticket._id);
  const [dialog, setDialog] = useState(null); // 'ask' | 'resolve' | null
  const st = ISSUE_STATUS[ticket.status] ?? {
    label: ticket.status,
    variant: "muted",
  };
  const resolved = ticket.status === "resolved";

  async function markInReview() {
    try {
      await setStatus.mutateAsync({ status: "in_review" });
      toast.success(resolved ? "Ticket reopened" : "Ticket marked in review");
    } catch (err) {
      toast.error(err, "Couldn't update the ticket.");
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ticket status</h3>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <p className="mt-3 text-sm text-pay-ink2">
          Changing the ticket status does not change the payout's{" "}
          {TRANSFER[ticket.linkedRecord?.transferStatus]?.label ?? "payment"}{" "}
          status.
        </p>
        {ticket.resolutionNote ? (
          <p className="mt-4 rounded-2xl bg-pay-sunken px-4 py-3 text-sm">
            <span className="font-semibold text-pay-ink2">
              Resolution note ·{" "}
            </span>
            {ticket.resolutionNote}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-4">
          {ticket.status !== "in_review" ? (
            <Button
              type="button"
              variant="outline"
              disabled={setStatus.isPending}
              onClick={markInReview}
            >
              {resolved ? "Reopen ticket" : "Mark in review"}
            </Button>
          ) : null}
          {!resolved ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog("ask")}
              >
                Ask restaurant for information
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog("resolve")}
              >
                Resolve ticket
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>

      <TextModal
        open={dialog === "ask"}
        title="Ask restaurant for information"
        subtitle={ticket.ticketNumber}
        info="The restaurant sees your question highlighted and the ticket moves to Awaiting restaurant until they reply."
        label="What should the restaurant send?"
        placeholder="e.g. Please share the bank statement page for the week"
        minLength={3}
        confirmLabel="Send request"
        loading={ask.isPending}
        onClose={() => setDialog(null)}
        onConfirm={async (text) => {
          try {
            await ask.mutateAsync({ text });
            toast.success("Request sent — awaiting the restaurant");
            setDialog(null);
          } catch (err) {
            toast.error(err, "Couldn't send the request.");
          }
        }}
      />
      <TextModal
        open={dialog === "resolve"}
        title="Resolve ticket"
        subtitle={ticket.ticketNumber}
        info="The restaurant sees Issue resolved. The payout's status is not changed."
        label="Resolution note (optional)"
        placeholder="What was found / done"
        minLength={0}
        confirmLabel="Resolve ticket"
        loading={setStatus.isPending}
        onClose={() => setDialog(null)}
        onConfirm={async (note) => {
          try {
            await setStatus.mutateAsync({
              status: "resolved",
              ...(note ? { resolutionNote: note } : {}),
            });
            toast.success("Ticket resolved");
            setDialog(null);
          } catch (err) {
            toast.error(err, "Couldn't resolve the ticket.");
          }
        }}
      />
    </Card>
  );
}

export default function PaymentIssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ticket, isLoading, error } = usePaymentIssue(id);
  const breadcrumb = (
    <Crumbs items={["Payment issues", ticket?.ticketNumber].filter(Boolean)} />
  );

  if (isLoading) {
    return (
      <AdminLayout
        breadcrumb={breadcrumb}
        title="Loading…"
        mainClassName="pay-scope gap-6"
      >
        <p className="text-sm text-pay-ink2">Loading ticket…</p>
      </AdminLayout>
    );
  }
  if (error || !ticket) {
    return (
      <AdminLayout
        breadcrumb={breadcrumb}
        title="Ticket not found"
        mainClassName="pay-scope gap-6"
      >
        <p className="text-sm text-pay-danger">
          {error?.message ?? "This ticket could not be found."}
        </p>
      </AdminLayout>
    );
  }

  const restaurantName = ticket.restaurantId?.name ?? "the restaurant";
  const payoutId =
    ticket.linkedRecord?.kind === "payout"
      ? ticket.linkedRecord.settlementId
      : ticket.linkedRecord?.statement?.settlementId;
  const owner = OWNER_VIEW[ticket.status] ?? OWNER_VIEW.open;
  const lastSupport = [...(ticket.messages ?? [])]
    .reverse()
    .find((m) => m.from === "support");

  return (
    <AdminLayout
      breadcrumb={breadcrumb}
      title={ticket.ticketNumber ?? ticket.subject}
      subtitle={`${ISSUE_TYPE_LABEL[ticket.issueType] ?? ticket.subject} · ${restaurantName}`}
      mainClassName="pay-scope gap-6"
      action={
        payoutId ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/payouts/${payoutId}?from=issues`)}
          >
            Open payout
          </Button>
        ) : null
      }
    >
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <h2 className="text-xl font-bold">Restaurant&apos;s report</h2>
              <p className="mt-2 text-sm text-pay-ink2">
                Submitted by the owner of {restaurantName} ·{" "}
                {formatDateTime(ticket.createdAt)}
              </p>
              <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-pay-sunken px-4 py-4 text-base">
                {ticket.description}
              </p>
              {ticket.descriptionRedacted ? (
                <p className="mt-2 text-sm text-pay-ink2">
                  Numbers that looked like account, card or OTP details were
                  hidden.
                </p>
              ) : null}
              {(ticket.attachments ?? []).length ? (
                <div className="mt-4 space-y-3">
                  {ticket.attachments.map((a) => (
                    <AttachmentRow
                      key={a._id}
                      ticketId={ticket._id}
                      attachment={a}
                    />
                  ))}
                </div>
              ) : null}
              <p className="mt-4 text-sm text-pay-ink2">
                Contact: {ticket.contactEmail ?? "—"}
                {ticket.contactPhone ? ` · ${ticket.contactPhone}` : ""}
              </p>
            </CardContent>
          </Card>
          <Thread ticket={ticket} />
          {ticket.status !== "resolved" ? <ReplyBox ticket={ticket} /> : null}
          <ProgressSteps ticket={ticket} />
        </div>
        <div className="space-y-6">
          <LinkedRecordCard record={ticket.linkedRecord} />
          <StatusCard ticket={ticket} />
          <OwnerSeesCard
            context="Restaurant portal · Support ticket"
            ownerView={{
              status: owner.status,
              message: `Ticket ${ticket.ticketNumber ?? ""} · ${owner.step}. Support response: ${lastSupport ? `"${lastSupport.text.slice(0, 80)}${lastSupport.text.length > 80 ? "…" : ""}"` : "no response yet"}.`,
            }}
          />
        </div>
      </section>
    </AdminLayout>
  );
}
