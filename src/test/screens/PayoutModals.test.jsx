import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockMutation, renderScreen } from "../utils";

const m = vi.hoisted(() => ({}));

vi.mock("@/hooks/admin/usePayouts", () => ({
  usePayoutOptions: () => ({ data: { holdReasons: {}, failureReasons: {} } }),
  useSchedulePayout: () => m.schedule,
  useChangePayoutDate: () => m.schedule,
  useReschedulePayout: () => m.schedule,
  useReleasePayout: () => m.release,
  useMarkPayoutPaid: () => m.markPaid,
  useMarkPayoutFailed: () => m.other,
  useHoldPayout: () => m.other,
  useUpdatePayoutHoldReason: () => m.other,
  useReleasePayoutHold: () => m.other,
}));

import { MarkPaidModal, ReleaseModal } from "@/screens/payouts/PayoutModals";

const data = {
  restaurant: { name: "Spice Garden" },
  settlement: {
    _id: "set1",
    periodStart: "2026-10-12T00:00:00+05:30",
    periodEnd: "2026-10-18T23:59:59+05:30",
    totals: { netPayable: 1245000 },
  },
  // Released a few days ago, so "credited today" (the form's default) is a valid date.
  transfer: {
    releasedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
    scheduledFor: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
  destination: { accountNumberLast4: "4321" },
};

beforeEach(() => {
  m.schedule = mockMutation();
  m.release = mockMutation();
  m.markPaid = mockMutation();
  m.other = mockMutation();
});

describe("Settlement mark paid", () => {
  it("reviews the amount and reference before marking paid", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderScreen(<MarkPaidModal open data={data} onClose={onClose} />);

    await user.type(screen.getByLabelText("Bank reference"), "UTR123456");
    await user.click(
      screen.getByRole("button", { name: "Save and mark as paid" }),
    );
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();

    const review = screen.getByRole("alertdialog", {
      name: "Mark ₹12,450.00 to Spice Garden as paid?",
    });
    expect(review).toHaveTextContent("UTR123456");
    await user.click(
      within(review).getByRole("button", { name: "Mark as paid" }),
    );
    expect(m.markPaid.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ bankReference: "UTR123456" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("does not mark paid when the review is cancelled", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderScreen(<MarkPaidModal open data={data} onClose={onClose} />);
    await user.type(screen.getByLabelText("Bank reference"), "UTR123456");
    await user.click(
      screen.getByRole("button", { name: "Save and mark as paid" }),
    );
    const review = screen.getByRole("alertdialog");
    await user.click(within(review).getByRole("button", { name: "Cancel" }));
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // The form stays open for a correction.
    expect(
      screen.getByRole("dialog", { name: "Mark as paid" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Escape closes only the review, not the form underneath", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderScreen(<MarkPaidModal open data={data} onClose={onClose} />);
    await user.type(screen.getByLabelText("Bank reference"), "UTR123456");
    await user.click(
      screen.getByRole("button", { name: "Save and mark as paid" }),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();
  });

  it("shows the form's own error instead of the review when the reference is missing", async () => {
    const user = userEvent.setup();
    renderScreen(<MarkPaidModal open data={data} onClose={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: "Save and mark as paid" }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByText("Enter the bank reference to continue."),
    ).toBeInTheDocument();
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("Settlement release", () => {
  it("is itself a confirmation naming the amount; Cancel releases nothing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderScreen(<ReleaseModal open data={data} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.release.mutateAsync).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Release ₹12,450.00" }),
    );
    expect(m.release.mutateAsync).toHaveBeenCalledWith(1245000);
  });
});
