// The Restaurant Payouts / Payment issues design system (Figma "Payouts (Bible)"): drop-in
// replacements for the shared shadcn pieces, with the frames' tokens — Plus Jakarta Sans,
// #FF5F00 / #F0592A accents, borderless 20px cards on the elevation shadow, 28px badges,
// sentence-case table headers, pill inputs. Same names and props as @/components/ui/*, so a
// payout screen swaps its import path and nothing else; every other screen in the portal
// keeps the shared components untouched.

import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { CalendarDays } from "lucide-react";

import {
  Select,
  SelectContent as BaseSelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger as BaseSelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Badge ───────────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold",
  {
    variants: {
      variant: {
        ok: "bg-pay-pos-bg text-pay-pos",
        info: "bg-pay-info-bg text-pay-info",
        // Amber: Processing, In review.
        warn: "bg-pay-warn-bg text-pay-warn",
        danger: "bg-pay-danger-bg text-pay-danger",
        muted: "bg-pay-sunken text-pay-ink2",
        accent: "bg-pay-tint text-pay-accent",
        default: "bg-pay-sunken text-pay-ink",
        outline: "border border-pay-line text-pay-ink",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// ── Button ──────────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pay-accent/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: solid orange on the accent shadow, h48.
        default:
          "h-12 bg-pay-accent px-6 text-white shadow-pay-primary hover:brightness-105",
        // Secondary: white with the orange outline, h40.
        outline:
          "h-10 border border-pay-outline bg-white px-5 text-pay-outline hover:bg-pay-tint",
        ghost: "h-10 px-3 text-pay-outline hover:bg-pay-tint",
        link: "h-auto px-0 text-pay-outline underline-offset-4 hover:underline",
        destructive: "h-12 bg-pay-danger px-6 text-white hover:brightness-110",
        secondary: "h-10 bg-pay-sunken px-5 text-pay-ink hover:bg-pay-line",
      },
      size: {
        default: "",
        // Row actions and toolbar buttons keep the frame's h40.
        sm: "h-10 px-5",
        lg: "h-12 px-6",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "PayButton";

// ── Card ────────────────────────────────────────────────────────────────────────

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[20px] bg-white text-pay-ink shadow-pay-card",
      className,
    )}
    {...props}
  />
));
Card.displayName = "PayCard";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
CardContent.displayName = "PayCardContent";

// Card titles: h2 20 bold (main cards), h3 18 semibold (side cards).
export function CardTitle({
  as: As = "h2",
  side = false,
  className,
  ...props
}) {
  return (
    <As
      className={cn(
        side ? "text-lg font-semibold" : "text-xl font-bold",
        "text-pay-ink",
        className,
      )}
      {...props}
    />
  );
}

// ── Table ───────────────────────────────────────────────────────────────────────

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-base", className)}
      {...props}
    />
  </div>
));
Table.displayName = "PayTable";

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-pay-canvas", className)} {...props} />
));
TableHeader.displayName = "PayTableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "PayTableBody";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn("border-b border-pay-line/70 transition-colors", className)}
    {...props}
  />
));
TableRow.displayName = "PayTableRow";

// Header: sentence case, 14 medium #666 on the canvas tint.
export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-3 text-left align-middle text-sm font-medium text-pay-ink2 first:pl-6 last:pr-6",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "PayTableHead";

// Rows ≥72px: 20px vertical padding, 16px medium cells.
export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-5 align-middle text-base font-medium text-pay-ink first:pl-6 last:pr-6",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "PayTableCell";

// ── Form fields (pill, h48) ────────────────────────────────────────────────────

const field =
  "w-full border border-pay-line bg-white text-base text-pay-ink placeholder:text-pay-ink3 focus-visible:border-pay-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pay-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn("flex h-12 rounded-full px-5", field, className)}
    {...props}
  />
));
Input.displayName = "PayInput";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] rounded-[20px] px-5 py-3",
      field,
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "PayTextarea";

export function Label({ className, ...props }) {
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  return (
    <label
      className={cn("text-sm font-semibold text-pay-ink", className)}
      {...props}
    />
  );
}

export const SelectTrigger = React.forwardRef(
  ({ className, ...props }, ref) => (
    <BaseSelectTrigger
      ref={ref}
      className={cn(
        "h-10 rounded-full border-pay-line bg-white px-5 text-sm font-semibold text-pay-ink shadow-none",
        className,
      )}
      {...props}
    />
  ),
);
SelectTrigger.displayName = "PaySelectTrigger";

// The list renders in a portal outside .pay-scope — give it the payout font explicitly.
export const SelectContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <BaseSelectContent
      ref={ref}
      className={cn("rounded-2xl font-pay", className)}
      {...props}
    />
  ),
);
SelectContent.displayName = "PaySelectContent";

export { Select, SelectGroup, SelectItem, SelectValue };

// ── Date field: the frames' pill showing "Mon 12 Oct 2026" + calendar icon ────────────────
// A real <input type="date"> sits over it (invisible), so the browser's picker, keyboard entry
// and min/max all still work; the pill only formats what it holds.
export function DateField({ id, value, onChange, min, max, display, invalid }) {
  const ref = React.useRef(null);
  return (
    <div
      className={cn(
        "relative flex h-12 w-full items-center justify-between rounded-full border bg-white px-5 text-base text-pay-ink",
        invalid ? "border-pay-danger" : "border-pay-line",
        "focus-within:border-pay-outline focus-within:ring-2 focus-within:ring-pay-accent/20",
      )}
    >
      <span>{display}</span>
      <CalendarDays className="h-5 w-5 text-pay-ink2" aria-hidden />
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={onChange}
        onClick={() => ref.current?.showPicker?.()}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
