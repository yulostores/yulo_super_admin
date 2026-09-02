import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

const ticketKeys = {
  all: ["admin", "tickets"],
  list: (params) => ["admin", "tickets", "list", params],
  detail: (id) => ["admin", "tickets", "detail", id],
};

export function useTickets(params = {}) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => adminApi.listTickets(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => adminApi.getTicket(id).then((r) => r.data.data.ticket),
    enabled: !!id,
  });
}

export function useUpdateTicket(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.updateTicket(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useAddTicketMessage(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => adminApi.addTicketMessage(id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

// Drives the notification bell badge in AdminLayout — real open-ticket count.
export function useOpenTicketCount() {
  const { data } = useQuery({
    queryKey: ["admin", "tickets", "open-count"],
    queryFn: () =>
      adminApi
        .listTickets({ status: "open", limit: 1 })
        .then((r) => r.data.data.total),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}
