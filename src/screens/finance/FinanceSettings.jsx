import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  History,
  Pencil,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toaster";
import {
  useFinanceSettings,
  useSaveFinanceSettings,
} from "@/hooks/admin/useFinance";
import {
  FINANCE_FIELD_GROUPS,
  baseVersionOf,
  buildPatch,
  describeChange,
  diffVersions,
  displayValue,
  inForceBefore,
  isSuperseded,
  serverFieldErrors,
  toForm,
} from "@/lib/financeSettings";
import { formatDateTime } from "@/lib/format";
import AdminLayout from "../AdminLayout";

// Finance Settings — every rate, fee and switch the money system runs on (B2). Versioned on
// the server: a save never edits a version, it adds one from now or from a future date, so an
// order is always priced with the version that was in force when it was placed. Three parts:
//
//   1. What's in force now, in plain words ("Platform fee charged to customer: ₹12.00 incl.
//      18% GST") — the thing an admin actually wants to check.
//   2. Any changes already scheduled for a later date.
//   3. The edit form → confirm dialog listing each change from → to → a new version; then the
//      server's own account of what changed, and which scheduled versions it was copied onto
//      (so a change scheduled for next week doesn't silently undo today's).
//
// No Figma frame exists for this screen; it follows the portal's card / table style.

// datetime-local wants local "YYYY-MM-DDTHH:mm"; the API wants an ISO string with offset.
function localInputToIso(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function ChangeList({ changes }) {
  if (!changes?.length) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {changes.map((c) => (
        <li key={c.key} className="rounded-lg bg-brand-cream/20 px-3 py-2">
          <span className="font-semibold">{c.label}</span>
          <span className="block text-xs text-muted-foreground">
            {c.from} →{" "}
            <span className="font-semibold text-brand-ink">{c.to}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function FieldInput({ field, value, onChange, error }) {
  const id = `fs-${field.key}`;
  if (field.kind === "fixed") {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <div className="flex h-10 items-center rounded-lg border border-brand-cream/70 bg-brand-cream/10 px-3 text-sm text-muted-foreground">
          {displayValue(field, value)} · fixed for now
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.kind === "boolean" ? (
        <div className="flex h-10 items-center gap-3">
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm">{value ? "On" : "Off"}</span>
        </div>
      ) : field.kind === "enum" ? (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          {field.kind === "paise" ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
          ) : null}
          <Input
            id={id}
            type={field.kind === "text" ? "text" : "number"}
            inputMode={field.kind === "text" ? undefined : "decimal"}
            step={field.kind === "paise" ? "0.01" : (field.step ?? "any")}
            min={field.kind === "text" ? undefined : 0}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={field.kind === "paise" ? "pl-7" : undefined}
          />
          {field.kind === "percent" ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="text-xs font-semibold text-brand-maroon">{error}</p>
      ) : null}
    </div>
  );
}

export default function FinanceSettings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error } = useFinanceSettings();
  const save = useSaveFinanceSettings();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { patch, changes }
  const [saved, setSaved] = useState(null); // the server's { version, changes, reappliedTo }

  const active = data?.active;

  // Oldest first, so each version is compared with the one before it.
  // Each version compared with the one it was built on (see baseVersionOf), newest first.
  const history = useMemo(() => {
    const all = data?.history ?? [];
    return [...all]
      .sort((a, b) => b.version - a.version)
      .map((v) => {
        const base = baseVersionOf(all, v);
        return {
          ...v,
          first: !base,
          superseded: isSuperseded(all, v),
          changed: base ? diffVersions(base, v) : [],
        };
      });
  }, [data?.history]);

  // Scheduled versions in date order, each shown as what changes on its day. A version replaced by a newer one for the same date
  // (a change copied onto it — reappliedTo) is shown as superseded, not as a live change.
  const upcoming = useMemo(() => {
    const all = data?.history ?? [];
    return [...(data?.upcoming ?? [])]
      .sort(
        (a, b) =>
          new Date(a.effectiveFrom) - new Date(b.effectiveFrom) ||
          a.version - b.version,
      )
      .map((v) => ({
        ...v,
        superseded: isSuperseded(all, v),
        supersededBy: Math.max(
          ...all
            .filter(
              (o) => +new Date(o.effectiveFrom) === +new Date(v.effectiveFrom),
            )
            .map((o) => o.version),
        ),
        // What changes on that day, against the rules in force just before it.
        changed: diffVersions(inForceBefore(all, v.effectiveFrom) ?? active, v),
      }));
  }, [data?.upcoming, data?.history, active]);

  const startEditing = () => {
    setForm(toForm(active));
    setEffectiveFrom("");
    setNote("");
    setFieldErrors({});
    setFormError(null);
    setSaved(null);
    setEditing(true);
  };

  const review = () => {
    setFormError(null);
    const { patch, changes, errors } = buildPatch(active, form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    if (!changes.length) {
      setFormError("Nothing has changed — edit a value first.");
      return;
    }
    const iso = localInputToIso(effectiveFrom);
    if (iso === null) {
      setFormError(
        "Enter a valid effective date, or leave it empty to apply now.",
      );
      return;
    }
    if (iso && new Date(iso).getTime() < Date.now()) {
      setFormError(
        "The effective date can't be in the past — leave it empty to apply now.",
      );
      return;
    }
    setConfirm({ patch, changes, effectiveFrom: iso });
  };

  const submit = () => {
    save.mutate(
      {
        settings: confirm.patch,
        ...(confirm.effectiveFrom
          ? { effectiveFrom: confirm.effectiveFrom }
          : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (result) => {
          setConfirm(null);
          setEditing(false);
          setSaved(result);
          toast.success(
            `Finance settings saved as version ${result.version?.version}.`,
          );
        },
        onError: (err) => {
          setConfirm(null);
          if (err.code === "NO_CHANGES") {
            setFormError(
              "These values are already in effect — nothing was saved.",
            );
          } else {
            setFieldErrors(serverFieldErrors(err));
            setFormError(err.message);
          }
          toast.error(err, "Could not save the finance settings.");
        },
      },
    );
  };

  const back = (
    <Button
      size="sm"
      variant="outline"
      onClick={() => navigate("/finance")}
      className="gap-1.5"
    >
      <ArrowLeft className="h-4 w-4" /> Financial Analytics
    </Button>
  );

  if (isLoading) {
    return (
      <AdminLayout
        breadcrumb="Financial Analytics"
        title="Finance Settings"
        action={back}
      >
        <p className="text-sm text-muted-foreground">
          Loading finance settings…
        </p>
      </AdminLayout>
    );
  }
  if (error || !active) {
    return (
      <AdminLayout
        breadcrumb="Financial Analytics"
        title="Finance Settings"
        action={back}
      >
        <p className="text-sm text-brand-maroon">
          {error?.message ?? "The finance settings could not be loaded."}
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      breadcrumb="Financial Analytics > Finance Settings"
      title="Finance Settings"
      subtitle={`Version ${active.version} · ${active.version === 1 ? "in force from the start" : `in force since ${formatDateTime(active.effectiveFrom)}`}. Every rate and fee the money system uses; a change is saved as a new version.`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {back}
          {!editing ? (
            <Button
              size="sm"
              onClick={startEditing}
              className="gap-1.5 bg-brand-orange text-white hover:brightness-105"
            >
              <Pencil className="h-4 w-4" /> Change settings
            </Button>
          ) : null}
        </div>
      }
    >
      {saved ? (
        <Card className="mb-4 border-brand-green/30">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-bold text-brand-green">
              Saved as version {saved.version?.version}
              {saved.version?.effectiveFrom
                ? ` · effective ${formatDateTime(saved.version.effectiveFrom)}`
                : ""}
            </p>
            <ChangeList changes={(saved.changes ?? []).map(describeChange)} />
            {saved.reappliedTo?.length ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">
                  Also applied to changes already scheduled
                </p>
                {saved.reappliedTo.map((r) => (
                  <p
                    key={`${r.scheduledVersion}-${r.effectiveFrom}`}
                    className="text-xs text-muted-foreground"
                  >
                    Version {r.scheduledVersion} (from{" "}
                    {formatDateTime(r.effectiveFrom)}):{" "}
                    {r.version
                      ? `copied as version ${r.version}${r.fields?.length ? ` — ${r.fields.map((k) => describeChange({ field: k }).label).join(", ")}` : ""}`
                      : "nothing to copy"}
                    {r.skippedFields?.length
                      ? `. Not copied (that version changes them itself): ${r.skippedFields
                          .map((k) => describeChange({ field: k }).label)
                          .join(", ")}`
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <section className="space-y-4">
          {FINANCE_FIELD_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader className="pb-3">
                <h2 className="text-base font-bold">{group.title}</h2>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {group.fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={form[f.key]}
                    error={fieldErrors[f.key]}
                    onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                  />
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <CalendarClock className="h-4 w-4 text-brand-orange" /> When it
                applies
              </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fs-effective">Effective from (optional)</Label>
                <Input
                  id="fs-effective"
                  type="datetime-local"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to apply now. A future date schedules the change;
                  orders placed before it keep today's rules.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fs-note">Note (optional)</Label>
                <Textarea
                  id="fs-note"
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why this change — e.g. client confirmed new rider rate"
                />
              </div>
            </CardContent>
          </Card>

          {formError ? (
            <p className="rounded-xl border border-brand-maroon/30 bg-brand-maroon/5 px-4 py-3 text-sm font-medium text-brand-maroon">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={review}
              disabled={save.isPending}
              className="bg-brand-orange text-white hover:brightness-105"
            >
              Review changes
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {FINANCE_FIELD_GROUPS.map((group) => {
              const lines = group.fields
                .map((f) => f.describe?.(active))
                .filter(Boolean);
              const plain = group.fields.filter(
                (f) => !f.describe && f.kind !== "fixed",
              );
              return (
                <Card key={group.title}>
                  <CardHeader className="pb-2">
                    <h2 className="flex items-center gap-2 text-base font-bold">
                      <Settings2 className="h-4 w-4 text-brand-orange" />{" "}
                      {group.title}
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm">
                    {lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {plain.map((f) => (
                      <p key={f.key}>
                        {f.label}:{" "}
                        <span className="font-semibold">
                          {displayValue(
                            f,
                            f.key.split(".").reduce((o, k) => o?.[k], active),
                          )}
                        </span>
                      </p>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <CalendarClock className="h-4 w-4 text-brand-orange" /> Scheduled
            changes
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No changes are scheduled.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((v) => (
                <div
                  key={v._id ?? v.version}
                  className="rounded-xl border border-brand-cream/70 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    Version {v.version}
                    <Badge variant="info">
                      From {formatDateTime(v.effectiveFrom)}
                    </Badge>
                    {v.superseded ? (
                      <Badge variant="muted">Superseded</Badge>
                    ) : null}
                  </div>
                  {v.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.note}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    {v.superseded ? (
                      <p className="text-xs text-muted-foreground">
                        Replaced by version {v.supersededBy} for this date —
                        that version is the one that applies.
                      </p>
                    ) : (
                      <ChangeList changes={v.changed} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <History className="h-4 w-4 text-brand-orange" /> Version history
          </h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>What changed</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((v) => (
                <TableRow key={v._id ?? v.version}>
                  <TableCell className="font-semibold">
                    {v.version}
                    {v.version === active.version ? (
                      <Badge variant="ok" className="ml-2">
                        In force
                      </Badge>
                    ) : null}
                    {v.superseded ? (
                      <Badge variant="muted" className="ml-2">
                        Superseded
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {v.first
                      ? "From the start"
                      : formatDateTime(v.effectiveFrom)}
                  </TableCell>
                  <TableCell className="max-w-md text-xs">
                    {v.first
                      ? "First version"
                      : v.changed.length === 0
                        ? "—"
                        : v.changed
                            .map((c) => `${c.label}: ${c.from} → ${c.to}`)
                            .join(" · ")}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    {v.note || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(v.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title="Save these changes?"
        description={
          confirm?.effectiveFrom
            ? `They take effect on ${formatDateTime(confirm.effectiveFrom)}. Orders placed before then keep today's rules.`
            : "They take effect now. Orders already placed keep the rules they were priced with."
        }
        confirmLabel="Save new version"
        loading={save.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={submit}
      >
        <div className="mt-3 max-h-72 overflow-y-auto">
          <ChangeList changes={confirm?.changes} />
        </div>
      </ConfirmDialog>
    </AdminLayout>
  );
}
