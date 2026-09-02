import { useState } from "react";
import { useParams } from "react-router-dom";
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
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import AdminLayout, { formatDate } from "../AdminLayout";

export default function TicketDetail() {
  const { id } = useParams();
  const { data: ticket, isLoading, error } = useTicket(id);
  const update = useUpdateTicket(id);
  const addMessage = useAddTicketMessage(id);
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

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base font-bold">Conversation</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {(ticket.messages ?? []).map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.senderType === "admin"
                      ? "ml-auto bg-brand-orange text-white"
                      : "bg-brand-cream/30"
                  }`}
                >
                  <p>{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${m.senderType === "admin" ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {m.senderType === "admin" ? "Admin" : "User"} ·{" "}
                    {formatDate(m.sentAt)}
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
                  onValueChange={(v) => update.mutate({ status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace(/_/g, " ")}
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
                  {ticket.category}
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
    </AdminLayout>
  );
}
