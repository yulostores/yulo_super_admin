import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddTicketMessage,
  useTicket,
  useUpdateTicket,
} from "@/hooks/admin/useTickets";
import {
  TICKET_PRIORITIES,
  TICKET_SETTABLE_STATUSES,
  TICKET_STATUS_LABEL,
} from "@/lib/constants";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import AdminLayout, { formatDate } from "../AdminLayout";
import { formatPrice } from "@/lib/format";

export default function TicketDetail() {
  const { id } = useParams();
  const { data: ticket, isLoading, error } = useTicket(id);
  const update = useUpdateTicket(id);
  const addMessage = useAddTicketMessage(id);
  const confirm = useConfirm();
  const toast = useToast();
  const [reply, setReply] = useState("");

  if (isLoading) {
    return (
      <AdminLayout breadcrumb="Support & Tickets" title="Loading…">
        <p className="text-sm text-muted-foreground">Loading ticket…</p>
      </AdminLayout>
    );
  }
  if (error || !ticket) {
    return (
      <AdminLayout breadcrumb="Support & Tickets" title="Ticket not found">
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "This ticket could not be found."}
        </p>
      </AdminLayout>
    );
  }

  // Payment issues have their own screen (linked payout, ask-for-information, attachments).
  if (ticket.kind === "payment") {
    return <Navigate to={`/payouts/issues/${ticket._id}`} replace />;
  }

  // Resolving closes the conversation for the customer and stamps resolvedAt, so it is
  // confirmed; open ⇄ in review is routine triage and stays one tap.
  function changeStatus(next) {
    if (next === ticket.status) return;
    const run = () =>
      update.mutateAsync(
        { status: next },
        {
          onSuccess: () =>
            toast.success(`Ticket marked ${TICKET_STATUS_LABEL[next] ?? next}.`),
          onError: (err) => toast.error(err, "Could not update the ticket."),
        },
      );
    if (next !== "resolved") {
      run().catch(() => {});
      return;
    }
    confirm.ask({
      title: `Resolve "${ticket.subject}"?`,
      description:
        "The ticket is marked resolved and the customer sees it as closed. You can reopen it later from this screen if needed.",
      confirmLabel: "Resolve ticket",
      onConfirm: run,
    });
  }

  return (
    <AdminLayout
      breadcrumb="Support & Tickets > Ticket Details"
      title={ticket.subject}
      subtitle={`Raised by ${ticket.raisedByType?.replace(/_/g, " ")} · ${formatDate(ticket.createdAt)}`}
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Description</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.raisedByUser || ticket.order ? (
            <Card>
              <CardHeader className="pb-3">
                <h2 className="text-base font-bold">Customer &amp; order</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ticket.raisedByUser ? (
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="font-medium">{ticket.raisedByUser.name || "No name on file"}</span>
                    {ticket.raisedByUser.phone ? <span>{ticket.raisedByUser.phone}</span> : null}
                    {ticket.raisedByUser.email ? (
                      <span className="text-muted-foreground">{ticket.raisedByUser.email}</span>
                    ) : null}
                  </div>
                ) : null}
                {ticket.order ? (
                  <div className="rounded-xl border border-brand-cream/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        #{ticket.order.ref} · {ticket.order.restaurant?.name ?? "Restaurant"}
                      </span>
                      <Badge variant="muted" className="capitalize">
                        {String(ticket.order.status).replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {(ticket.order.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {formatPrice(ticket.order.grandTotal)} · {ticket.order.paymentStatus}
                      {ticket.order.refundStatus && ticket.order.refundStatus !== "none"
                        ? ` · refund ${ticket.order.refundStatus}`
                        : ""}
                      {" · "}
                      {ticket.order.deliveredAt
                        ? `delivered ${formatDate(ticket.order.deliveredAt)}`
                        : `placed ${formatDate(ticket.order.createdAt)}`}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Conversation</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {(ticket.messages ?? []).map((m, i) => (
                <div
                  key={m._id ?? i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.from === "support" || m.senderType === "admin"
                      ? "ml-auto bg-brand-orange text-white"
                      : "bg-brand-cream/30"
                  }`}
                >
                  <p>{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${m.from === "support" || m.senderType === "admin" ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {m.from === "support" || m.senderType === "admin"
                      ? "Admin"
                      : "User"}{" "}
                    · {formatDate(m.sentAt)}
                  </p>
                </div>
              ))}
              {(ticket.messages ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No messages yet.
                </p>
              ) : null}

              <div className="flex items-end gap-2 border-t border-brand-cream/60 pt-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply…"
                  className="min-h-[44px]"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={!reply.trim() || addMessage.isPending}
                  onClick={() =>
                    addMessage.mutate(reply.trim(), {
                      onSuccess: () => setReply(""),
                    })
                  }
                  className="bg-brand-orange text-white hover:brightness-105"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-sm font-bold">Ticket Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Status</p>
                <Select
                  value={ticket.status}
                  onValueChange={changeStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_SETTABLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TICKET_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Priority</p>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => update.mutate({ priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="muted" className="capitalize">
                  {String(ticket.category ?? "").replace(/_/g, " ")}
                </Badge>
              </div>
              {ticket.resolvedAt ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resolved At</span>
                  <span className="font-medium">
                    {formatDate(ticket.resolvedAt)}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
      {confirm.dialog}
    </AdminLayout>
  );
}
