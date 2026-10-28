import { Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/admin/useConfirm";
import { useToast } from "@/components/admin/Toaster";
import { useSetStoreLiveActivity } from "@/hooks/admin/useStores";

// Live customer activity for one store: the owner sees customers browsing their menu in real
// time and can send them a personal offer. Off for every store until a super admin turns it on
// here, and only does anything while the server-wide switch (LIVE_ACTIVITY_ENABLED) is on —
// `store.liveActivity.serverEnabled` says which, so a choice that has no effect yet is labelled.
export default function StoreLiveActivityCard({ store }) {
  const toggle = useSetStoreLiveActivity(store._id);
  const confirm = useConfirm();
  const toast = useToast();

  const on = Boolean(store.liveActivityEnabled);
  const serverEnabled = store.liveActivity?.serverEnabled !== false;

  const ask = (next) =>
    confirm.ask({
      title: next
        ? `Turn on live customer activity for ${store.name}?`
        : `Turn off live customer activity for ${store.name}?`,
      description: next
        ? `${store.name} will see customers browsing their menu in real time (first name and cart only) and can send them personal offers. Customers who turned off activity sharing are never shown. You can turn it off again at any time.`
        : `${store.name}'s live dashboard stops, no new activity is recorded and they can't send offers. Offers already sent stop showing to customers. You can turn it on again later.`,
      confirmLabel: next ? "Turn on" : "Turn off",
      tone: next ? undefined : "danger",
      onConfirm: () =>
        toggle.mutateAsync(next, {
          onSuccess: () =>
            toast.success(
              next
                ? `Live customer activity is on for ${store.name}.`
                : `Live customer activity is off for ${store.name}.`,
            ),
          onError: (err) =>
            toast.error(err, "Could not change live customer activity."),
        }),
    });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Radio className="h-4 w-4 text-brand-orange" />
            Live customer activity
          </h2>
          <Badge variant={on ? (serverEnabled ? "ok" : "warn") : "muted"}>
            {on ? "On" : "Off"}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Lets the owner watch customers browse their menu in real time and send
          them personal offers.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Switch
            id="store-live-activity"
            checked={on}
            disabled={toggle.isPending || confirm.isOpen}
            onCheckedChange={ask}
          />
          <Label htmlFor="store-live-activity" className="text-sm">
            {on ? "On for this store" : "Off for this store"}
          </Label>
        </div>
        {!serverEnabled ? (
          <p className="mt-3 rounded-xl border border-[#F5C99B] bg-[#FFF7ED] px-3 py-2 text-xs">
            The feature is switched off on the server (LIVE_ACTIVITY_ENABLED).
            This choice is saved and takes effect once it is switched on.
          </p>
        ) : null}
      </CardContent>
      {confirm.dialog}
    </Card>
  );
}
