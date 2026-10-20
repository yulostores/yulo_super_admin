// The "More" menu's admin tools (undesigned — portal style, kept out of the main flow):
//   • Generate week — statements are normally created by the Monday scheduler; this re-runs a
//     week by hand (idempotent: it tops up open statements, never touches scheduled/paid ones).
//   • Add adjustment — a credit or debit on a restaurant's next statement (a penalty is always
//     a debit). Capped at ₹10 lakh on the server.

import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "./ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateField, Input } from "./ui";
import { Label } from "./ui";
import { Textarea } from "./ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";
import { useToast } from "@/components/admin/Toaster";
import {
  useAddSettlementAdjustment,
  useGenerateSettlements,
} from "@/hooks/admin/usePayouts";
import { useStores } from "@/hooks/admin/useStores";
import {
  isoDay,
  payoutDateOfIso,
  periodLabel,
  rupees,
  todayIso,
} from "@/lib/payouts";
import { PayoutModal, WarnBox } from "./parts";

const MAX_ADJUSTMENT_RUPEES = 1_000_000; // ₹10 lakh — MAX_ADJUSTMENT_PAISE on the server

export function MoreMenu({ restaurant = null, allowGenerate = true }) {
  const [open, setOpen] = useState(null); // 'generate' | 'adjust' | null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            <MoreHorizontal /> More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-2xl font-pay">
          {allowGenerate ? (
            <DropdownMenuItem onClick={() => setOpen("generate")}>
              Generate week
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => setOpen("adjust")}>
            Add adjustment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GenerateWeekModal
        open={open === "generate"}
        onClose={() => setOpen(null)}
      />
      <AdjustmentModal
        open={open === "adjust"}
        restaurant={restaurant}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

function GenerateWeekModal({ open, onClose }) {
  const toast = useToast();
  const generate = useGenerateSettlements();
  const [day, setDay] = useState("");

  useEffect(() => {
    if (open) setDay(isoDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  }, [open]);

  async function confirm() {
    try {
      const result = await generate.mutateAsync(`${day}T12:00:00+05:30`);
      toast.success(
        `${result.count} statement${result.count === 1 ? "" : "s"} for ${periodLabel(result.periodStart, result.periodEnd, { withYear: true })}`,
      );
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't generate the week.");
    }
  }

  return (
    <PayoutModal
      open={open}
      title="Generate week"
      subtitle="Maintenance — the Monday scheduler normally does this"
      confirmLabel="Generate statements"
      confirmDisabled={!day}
      loading={generate.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label htmlFor="generate-day">Any day in the week</Label>
        <DateField
          id="generate-day"
          value={day}
          max={todayIso()}
          onChange={(e) => setDay(e.target.value)}
          display={day ? payoutDateOfIso(day) : "Pick a date"}
        />
        <p className="text-sm text-pay-ink2">
          Weeks run Monday to Sunday. Re-running a week tops up its open
          statements; scheduled and paid ones are never touched.
        </p>
      </div>
    </PayoutModal>
  );
}

function AdjustmentModal({ open, restaurant, onClose }) {
  const toast = useToast();
  const adjust = useAddSettlementAdjustment();
  const { data: stores } = useStores({ limit: 100, status: "active" });
  const [restaurantId, setRestaurantId] = useState("");
  const [direction, setDirection] = useState("credit");
  const [kind, setKind] = useState("correction");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setRestaurantId(restaurant?._id ? String(restaurant._id) : "");
    setDirection("credit");
    setKind("correction");
    setAmount("");
    setNote("");
  }, [open, restaurant]);

  // A penalty is always a debit (no GST).
  useEffect(() => {
    if (kind === "penalty") setDirection("debit");
  }, [kind]);

  const rupeesValue = Number(amount);
  const amountPaise = Math.round(rupeesValue * 100);
  const amountError =
    amount === ""
      ? null
      : !Number.isFinite(rupeesValue) || rupeesValue <= 0
        ? "Enter an amount above ₹0."
        : rupeesValue > MAX_ADJUSTMENT_RUPEES
          ? "An adjustment can be at most ₹10,00,000."
          : !/^\d+(\.\d{1,2})?$/.test(amount)
            ? "Up to two decimals."
            : null;
  const valid =
    restaurantId && amount !== "" && !amountError && note.trim().length >= 3;

  async function confirm() {
    try {
      await adjust.mutateAsync({
        restaurantId,
        amountPaise,
        direction,
        kind,
        note: note.trim(),
      });
      toast.success(
        `${direction === "credit" ? "Credit" : "Debit"} of ${rupees(amountPaise)} added to the next statement`,
      );
      onClose();
    } catch (err) {
      toast.error(err, "Couldn't add the adjustment.");
    }
  }

  const storeList = stores?.stores ?? stores?.restaurants ?? [];

  return (
    <PayoutModal
      open={open}
      title="Add adjustment"
      subtitle="Lands on the restaurant's next statement"
      confirmLabel="Add adjustment"
      confirmDisabled={!valid}
      loading={adjust.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label>Restaurant</Label>
        {restaurant ? (
          <p className="text-sm font-medium">{restaurant.name}</p>
        ) : (
          <Select value={restaurantId} onValueChange={setRestaurantId}>
            <SelectTrigger className="h-12 w-full text-base font-normal">
              <SelectValue placeholder="Choose a restaurant" />
            </SelectTrigger>
            <SelectContent>
              {storeList.map((s) => (
                <SelectItem key={s._id} value={String(s._id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kind</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="h-12 w-full text-base font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="correction">Correction</SelectItem>
              <SelectItem value="penalty">Penalty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select
            value={direction}
            onValueChange={setDirection}
            disabled={kind === "penalty"}
          >
            <SelectTrigger className="h-12 w-full text-base font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit">
                Credit (pay the restaurant)
              </SelectItem>
              <SelectItem value="debit">Debit (deduct)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adjust-amount">Amount (₹)</Label>
        <Input
          id="adjust-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.trim())}
          placeholder="0.00"
        />
        {amountError ? (
          <p role="alert" className="text-sm text-pay-danger">
            {amountError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adjust-note">Reason</Label>
        <Textarea
          id="adjust-note"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Shown on the statement — say what it corrects"
        />
      </div>
      <WarnBox>
        The restaurant sees this line on its next statement. It can't be edited
        afterwards — add an opposite adjustment to correct it.
      </WarnBox>
    </PayoutModal>
  );
}
