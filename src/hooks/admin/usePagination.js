import { useCallback, useState } from "react";

// Page + page-size state for the admin tables. `limit` is settable here so the
// screens stop pairing this hook with a second, separate pageSize useState.
export function usePagination(initialLimit = 10) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);

  // Changing page size while on page 9 would otherwise land past the last page.
  const setLimit = useCallback((next) => {
    setLimitState(next);
    setPage(1);
  }, []);

  return { page, limit, setPage, setLimit };
}
