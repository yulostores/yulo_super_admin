// Week navigation shared by Orders & Money and the Weekly Report: ‹ week › plus "This week".
// The week lives in the URL (?week=YYYY-MM-DD) so a refresh or a shared link keeps it.

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

const DAY = 24 * 60 * 60 * 1000;

// A day inside the week, as YYYY-MM-DD in IST (the server takes any instant in the week).
export const weekParam = (date) => {
  const ist = new Date(new Date(date).getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
};

export const shiftWeek = (periodStart, weeks) => weekParam(new Date(new Date(periodStart).getTime() + weeks * 7 * DAY + DAY));

export default function WeekNav({ periodStart, periodEnd, onChange, onThisWeek, onRefresh, refreshing, updatedAt }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => onChange(shiftWeek(periodStart, -1))} disabled={!periodStart}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[200px] rounded-lg border border-brand-cream/70 bg-white px-3 py-2 text-center text-sm font-semibold">
        {periodStart ? `${formatDate(periodStart)} – ${formatDate(periodEnd)}` : "Loading…"}
      </span>
      <Button variant="outline" size="icon" aria-label="Next week" onClick={() => onChange(shiftWeek(periodStart, 1))} disabled={!periodStart}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {onThisWeek ? (
        <Button variant="outline" size="sm" onClick={onThisWeek}>
          This week
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        Refresh
      </Button>
      {updatedAt ? (
        <span className="text-xs text-muted-foreground">
          Updated {new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
    </div>
  );
}
