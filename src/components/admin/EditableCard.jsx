import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EditableCard({
  title,
  icon: Icon,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  children,
  editChildren,
  contentClassName,
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          {Icon ? <Icon className="h-4 w-4 text-brand-orange" /> : null}
          {title}
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="bg-brand-orange text-white hover:brightness-105"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-brand-cream px-3 py-1.5 text-xs font-semibold text-brand-ink2 hover:bg-brand-cream/30"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </CardHeader>
      <CardContent
        className={contentClassName ?? "grid grid-cols-1 gap-4 sm:grid-cols-2"}
      >
        {editing ? editChildren : children}
      </CardContent>
    </Card>
  );
}
