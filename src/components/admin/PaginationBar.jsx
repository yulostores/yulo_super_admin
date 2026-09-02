import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// A compact window around the current page: [1, "…", 4, 5, 6, "…", 20].
function getPageNumbers(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const window = new Set([1, pages, page]);
  for (const offset of [-1, 1]) {
    const n = page + offset;
    if (n > 1 && n < pages) window.add(n);
  }
  // Keep the row a stable width when the current page sits at either end.
  if (page <= 3) [2, 3, 4].forEach((n) => window.add(n));
  if (page >= pages - 2)
    [pages - 3, pages - 2, pages - 1].forEach((n) => window.add(n));
  return [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

function ArrowButton({ disabled, onClick, label, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream bg-white text-brand-ink2 transition disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * One pagination layout for every admin table. The page-size dropdown appears
 * only when the caller supplies `onPageSizeChange` — previously this component
 * carried two entirely separate renderings of the same control.
 */
export default function PaginationBar({
  page,
  pages,
  total,
  onPageChange,
  itemLabel = "items",
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const totalPages = pages || 1;
  const size = pageSize || 10;
  const start = total ? (page - 1) * size + 1 : 0;
  const end = total ? Math.min(page * size, total) : 0;

  if (!total) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 px-1"
    >
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {total} {itemLabel}
      </p>

      <div className="flex items-center gap-1.5">
        <ArrowButton
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </ArrowButton>

        {totalPages > 1
          ? pageNumbers.map((n, i) => (
              <span key={n} className="flex items-center gap-1.5">
                {i > 0 && n - pageNumbers[i - 1] > 1 ? (
                  <span className="px-1 text-xs text-muted-foreground">…</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPageChange(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg border text-xs font-semibold transition",
                    n === page
                      ? "border-transparent bg-brand-orange text-white"
                      : "border-brand-cream bg-white text-brand-ink2 hover:bg-brand-cream/30",
                  )}
                >
                  {n}
                </button>
              </span>
            ))
          : null}

        <ArrowButton
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </ArrowButton>

        {onPageSizeChange ? (
          <Select
            value={String(size)}
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
        ) : null}
      </div>
    </nav>
  );
}
