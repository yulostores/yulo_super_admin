import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

// Payment issues (Figma I1–I3): SupportTicket with kind=payment. A ticket never changes a
// payout's status — these hooks only ever touch tickets.

const issueKeys = {
  all: ["admin", "tickets"],
  list: (params) => ["admin", "tickets", "payment", "list", params],
  counts: ["admin", "tickets", "payment", "counts"],
  detail: (id) => ["admin", "tickets", "detail", id],
};

export function usePaymentIssues(params = {}) {
  return useQuery({
    queryKey: issueKeys.list(params),
    queryFn: () =>
      adminApi
        .listTickets({ ...params, kind: "payment" })
        .then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentIssueCounts() {
  return useQuery({
    queryKey: issueKeys.counts,
    queryFn: () =>
      adminApi.getTicketCounts("payment").then((r) => r.data.data.counts),
    staleTime: 30_000,
  });
}

export function usePaymentIssue(id) {
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => adminApi.getTicket(id).then((r) => r.data.data.ticket),
    enabled: !!id,
  });
}

function useIssueAction(id, mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: issueKeys.all }),
  });
}

// { text, file? } — a reply to the restaurant.
export const useReplyToIssue = (id) =>
  useIssueAction(id, (body) => adminApi.replyToTicket(id, body));
// { text, file? } — "Ask restaurant for information" (moves it to Awaiting restaurant).
export const useAskRestaurant = (id) =>
  useIssueAction(id, (body) =>
    adminApi.replyToTicket(id, { ...body, requestsInformation: true }),
  );
// { status: in_review | resolved, resolutionNote? }
export const useSetIssueStatus = (id) =>
  useIssueAction(id, (body) => adminApi.updateTicket(id, body));
