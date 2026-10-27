// Building blocks shared by the Restaurant Payouts screens (Figma S1–S5, D1–D6, M1–M5, I1–I3):
// the KPI card, the tab strip, the modal shell, the summary / info / warning boxes, the
// "What the owner sees" card and the four-step progress strip.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  Clock3,
  Info,
  Landmark,
  ChevronRight,
  Pause,
  X,
} from "lucide-react";

import { Badge } from "./ui";
import { Button } from "./ui";
import { Card, CardContent } from "./ui";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  ELIGIBILITY,
  OWNER_STATUS_VARIANT,
  RECORD_STATUS,
  TRANSFER,
  dayMonth,
  dayMonthYear,
  payoutDate,
} from "@/lib/payouts";

// Kept for call sites that pass them explicitly; ./ui's Button variants already carry the
// frames' styles (outline #F0592A h40, solid #FF5F00 h48 on the accent shadow).
export const outlineOrange = "";
export const solidOrange = "";

// The frames' 40px tinted icon tile (cards, banners, rows, progress steps).
const TILE_TONES = {
  accent: "bg-pay-tint text-pay-accent",
  info: "bg-pay-info-bg text-pay-info",
  positive: "bg-pay-pos-bg text-pay-pos",
  warn: "bg-pay-warn-bg text-pay-warn",
  danger: "bg-pay-danger-bg text-pay-danger",
  muted: "bg-pay-sunken text-pay-ink3",
};
export function IconTile({
  icon: Icon,
  tone = "accent",
  size = 40,
  className,
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        size >= 56 ? "rounded-2xl" : "rounded-xl",
        TILE_TONES[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon className={size >= 56 ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.8} />
    </span>
  );
}

// "Payouts › Weekly batch › Annapurna Kitchen" with chevrons (pass as AdminLayout breadcrumb).
export function Crumbs({ items }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {items.map((label, i) => (
        <span key={label + i} className="inline-flex items-center gap-1.5">
          {i > 0 ? <ChevronRight className="h-4 w-4 text-pay-ink3" /> : null}
          <span
            className={
              i === items.length - 1
                ? "font-medium text-pay-ink"
                : "text-pay-ink2"
            }
          >
            {label}
          </span>
        </span>
      ))}
    </span>
  );
}

export function EligibilityBadge({ value }) {
  const s = ELIGIBILITY[value] ?? { label: value ?? "—", variant: "muted" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function TransferBadge({ value }) {
  const s = TRANSFER[value] ?? { label: value ?? "—", variant: "muted" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function RecordBadge({ value }) {
  const s = RECORD_STATUS[value] ?? { label: value ?? "—", variant: "muted" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  actionLabel,
  onAction,
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col">
        <IconTile icon={Icon} size={56} />
        <p className="mt-6 text-base text-pay-ink2">{label}</p>
        <strong className="mt-1 block text-4xl font-bold leading-tight tracking-tight text-pay-ink">
          {value}
        </strong>
        {sub ? <p className="mt-1 text-sm text-pay-ink3">{sub}</p> : null}
        {onAction ? <span className="block h-6" aria-hidden /> : null}
        {onAction ? (
          <Button
            type="button"
            variant="outline"
            onClick={onAction}
            className="mt-auto w-full"
          >
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

// "Weekly batch · Clearance queue 3 · Payout history · Bank requests 1" — counts from the server.
export function PayoutTabs({ tabs, active }) {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-wrap gap-6">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => navigate(t.to)}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "text-base transition-colors",
            active === t.key
              ? "font-semibold text-pay-accent"
              : "text-pay-ink2 hover:text-pay-ink",
          )}
        >
          {t.label}
          {t.count ? <span className="ml-1">{t.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

// The modal shell of M1–M5 (title, subtitle, close ×, body, Cancel + confirm). Esc closes it.
export function PayoutModal({
  open,
  title,
  subtitle,
  children,
  confirmLabel,
  confirmDisabled = false,
  loading = false,
  danger = false,
  // Optional second step for the modals whose form decides the money (mark paid, add
  // adjustment): { title, description, confirmLabel, tone }. Submitting then opens a
  // ConfirmDialog over the form and onConfirm runs only from its confirm button. `validate`
  // runs first and can refuse (show the form's own errors) before the review appears.
  review = null,
  validate,
  onConfirm,
  onClose,
}) {
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    if (!open) setReviewing(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  function submit() {
    if (confirmDisabled || loading) return;
    if (!review) {
      onConfirm();
      return;
    }
    if (validate && !validate()) return;
    setReviewing(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pay-ink/40 px-4 font-pay text-pay-ink">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[20px] bg-white p-8 shadow-pay-modal"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-pay-ink2">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pay-sunken text-pay-ink hover:bg-pay-line"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6">{children}</div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          {/* M4 / M5 confirm in the standard orange too; `danger` is kept for the API only. */}
          <Button type="submit" disabled={confirmDisabled || loading}>
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
      {review ? (
        <ConfirmDialog
          open={reviewing}
          title={review.title}
          description={review.description}
          confirmLabel={review.confirmLabel}
          tone={review.tone}
          loading={loading}
          onCancel={() => setReviewing(false)}
          onConfirm={async () => {
            // onConfirm reports its own errors and closes the modal on success; the
            // review closes either way, leaving the form open after a failure.
            try {
              await onConfirm();
            } finally {
              setReviewing(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

// Grey key/value summary at the top of a modal ("Net payable ₹… / Destination …").
export function SummaryBox({ rows }) {
  return (
    <dl className="space-y-3 rounded-2xl bg-pay-sunken px-4 py-4 text-base">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <dt className="text-pay-ink2">{label}</dt>
          <dd className="text-right font-medium text-pay-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InfoBox({ children }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-pay-info-bg px-4 py-3 text-sm text-pay-ink">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-pay-info" />
      <p>{children}</p>
    </div>
  );
}

export function WarnBox({ children }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-pay-warn-bg px-4 py-3 text-sm text-pay-ink">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-pay-warn" />
      <p>{children}</p>
    </div>
  );
}

// Page banner (S3, S5, D4 linked ticket, D5 failed, D6 on hold): a white card with a 40px
// tinted icon tile — the icon says what kind of message it is.
const BANNER = {
  warn: { tone: "warn", icon: AlertTriangle },
  hold: { tone: "warn", icon: Pause },
  danger: { tone: "danger", icon: AlertTriangle },
  info: { tone: "info", icon: Info },
};
export function Banner({ tone = "warn", icon, title, children, action }) {
  const b = BANNER[tone] ?? BANNER.warn;
  return (
    <Card>
      <CardContent className="flex items-start gap-4 px-6 py-5">
        <IconTile icon={icon ?? b.icon} tone={b.tone} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-pay-ink">{title}</p>
          {children ? (
            <div className="mt-1 text-sm text-pay-ink2">{children}</div>
          ) : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

// "What the owner sees / Restaurant portal · Payments" — the sentence the restaurant reads.
export function OwnerSeesCard({
  ownerView,
  context = "Restaurant portal · Payments",
}) {
  if (!ownerView) return null;
  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold">What the owner sees</h3>
        <p className="mt-2 text-sm text-pay-ink2">{context}</p>
        <div className="mt-4 rounded-2xl bg-pay-sunken p-4">
          <Badge variant={OWNER_STATUS_VARIANT[ownerView.status] ?? "muted"}>
            {ownerView.status}
          </Badge>
          {ownerView.message ? (
            <p className="mt-3 text-base">{ownerView.message}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const STEP_ICON = {
  eligible: CircleCheck,
  scheduled: CalendarDays,
  released: Landmark,
  paid: CircleCheck,
};

// "Payout progress": Eligible · Scheduled · Released · Paid (step 4 "Failed" on failure). Each
// step is done (green check), current (accent tint — the step waiting on the admin or the bank),
// pending (grey), held (amber pause on step 1) or failed (red triangle on step 4).
export function PayoutProgress({ steps, eligibility, hold }) {
  const held = eligibility === "on_hold";
  const current = held ? null : steps.find((s) => !s.done)?.key;
  const holdLabel = (hold?.label ?? "review").toLowerCase();
  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-bold">Payout progress</h2>
        <ol className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          {steps.map((s) => {
            let tone = s.done
              ? "positive"
              : s.key === current
                ? "accent"
                : "muted";
            let Icon = s.done ? CircleCheck : (STEP_ICON[s.key] ?? CircleCheck);
            let sub;
            switch (s.key) {
              case "eligible":
                if (held) {
                  tone = "warn";
                  Icon = Pause;
                  sub = `On hold · ${holdLabel}`;
                } else {
                  sub =
                    s.done && s.at
                      ? `Cleared on ${dayMonth(s.at)}, checks passed`
                      : "Cleared and checks passed";
                }
                break;
              case "scheduled":
                if (held) sub = "Paused while held";
                else if (s.date) sub = payoutDate(s.date);
                else sub = "Pick a release date";
                break;
              case "released":
                sub = s.done ? "Sent to the bank" : "Transfer sent from Yulo";
                break;
              case "paid":
                if (s.done)
                  sub = s.at
                    ? `${dayMonthYear(s.at)} · bank reference saved`
                    : "Bank reference saved";
                else if (s.key === current) sub = "Waiting for the bank result";
                else sub = "Bank reference saved";
                if (s.key === current) Icon = Clock3;
                break;
              case "failed":
                tone = "danger";
                Icon = AlertTriangle;
                sub = "Bank rejected the credit";
                break;
              default:
                sub = "";
            }
            return (
              <li key={s.key}>
                <IconTile icon={Icon} tone={tone} />
                <p className="mt-4 text-lg font-semibold">{s.label}</p>
                <p className="mt-1 text-sm text-pay-ink2">{sub}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// The download-to-file dance for a Blob the API handed back (CSV exports, attachments).
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
