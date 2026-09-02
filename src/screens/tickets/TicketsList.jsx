import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationBar from "@/components/admin/PaginationBar";
import { usePagination } from "@/hooks/admin/usePagination";
import { useTickets } from "@/hooks/admin/useTickets";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_VARIANT,
  TICKET_STATUS_VARIANT,
  TICKET_STATUSES,
} from "@/lib/constants";
import AdminLayout, { formatDate } from "../AdminLayout";

export default function TicketsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const { page, limit, setPage, setLimit } = usePagination(10);

  const { data, isLoading, error } = useTickets({
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    category: category === "all" ? undefined : category,
    page,
    limit,
  });

  function setStatus(v) {
    setPage(1);
    if (v === "all") setSearchParams({});
    else setSearchParams({ status: v });
  }

  return (
    <AdminLayout
      title="Support & Tickets"
      subtitle="Respond to and track support tickets from owners, customers, and delivery partners."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-brand-maroon">{error.message}</p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-brand-cream/60">
                <TableHead className="pl-6">Subject</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.tickets ?? []).map((t) => (
                <TableRow
                  key={t._id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/tickets/${t._id}`)}
                >
                  <TableCell className="pl-6 font-semibold">
                    {t.subject}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {t.raisedByType?.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {t.category}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={TICKET_PRIORITY_VARIANT[t.priority] ?? "muted"}
                      className="capitalize"
                    >
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={TICKET_STATUS_VARIANT[t.status] ?? "muted"}
                      className="capitalize"
                    >
                      {t.status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-muted-foreground">
                    {formatDate(t.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && data?.tickets?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No tickets match your filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationBar
        page={data?.page ?? page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
        itemLabel="tickets"
        pageSize={limit}
        onPageSizeChange={setLimit}
      />
    </AdminLayout>
  );
}
