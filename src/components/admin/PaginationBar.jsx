import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Builds a compact page list like [1,2,3,4,"…",N] for the numbered pager.
function getPageNumbers(page, pages) {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const nums = new Set([1, 2, 3, 4, page]);
  return [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

export default function PaginationBar({
  page,
  pages,
  total,
  onPageChange,
  itemLabel = "items",
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  // Opt-in rich layout (numbered pages + "Showing x to y" + page-size
  // dropdown) — only used when a consumer passes onPageSizeChange, so
  // existing callers keep their current simple layout untouched.
  if (onPageSizeChange) {
    const safePages = pages || 1;
    const start = total ? (page - 1) * (pageSize || 10) + 1 : 0;
    const end = total ? Math.min(page * (pageSize || 10), total) : 0;
    const pageNumbers = getPageNumbers(page, safePages);

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-muted-foreground">
          {total ? (
            <>
              Showing {start} to {end} of {total} {itemLabel}
            </>
          ) : (
            `0 ${itemLabel}`
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream bg-white text-[#5a453a] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((n, i) => (
            <span key={n} className="flex items-center gap-1.5">
              {i > 0 && n - pageNumbers[i - 1] > 1 ? (
                <span className="px-1 text-xs text-muted-foreground">…</span>
              ) : null}
              <button
                type="button"
                onClick={() => onPageChange(n)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg border text-xs font-semibold transition",
                  n === page
                    ? "border-transparent bg-[#D9480F] text-white"
                    : "border-brand-cream bg-white text-[#5a453a] hover:bg-brand-cream/30",
                )}
              >
                {n}
              </button>
            </span>
          ))}
          <button
            type="button"
            disabled={page >= safePages}
            onClick={() => onPageChange(page + 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream bg-white text-[#5a453a] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Select
            value={String(pageSize || 10)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="ml-1 h-8 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (!pages || pages <= 1) {
    return total ? (
      <p className="px-1 text-xs text-muted-foreground">
        {total} {itemLabel}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pages} · {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream bg-white text-[#5a453a] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream bg-white text-[#5a453a] disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
