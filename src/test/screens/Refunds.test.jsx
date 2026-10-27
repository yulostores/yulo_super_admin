import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockMutation, renderScreen } from "../utils";

const m = vi.hoisted(() => ({}));

vi.mock("@/screens/AdminLayout", async () => {
  const format = await import("@/lib/format");
  const { FakeLayout } = await import("../utils");
  return { default: FakeLayout, ...format };
});
vi.mock("@/hooks/admin/useRefunds", () => ({
  useRefunds: () => ({
    data: { refunds: m.rows, total: m.rows.length, page: 1, limit: 20 },
    isLoading: false,
    error: null,
  }),
  useRetryRefund: () => m.retry,
  useRestaurantNames: () => new Map(),
}));

import Refunds from "@/screens/finance/Refunds";

beforeEach(() => {
  m.retry = mockMutation();
  m.retry.mutateAsync.mockResolvedValue({ refund: { status: "processing" } });
  m.rows = [
    {
      _id: "ord1234567",
      source: "order",
      restaurantId: "r1",
      restaurantName: "Spice Garden",
      updatedAt: "2026-10-20T10:00:00Z",
      refund: {
        status: "pending",
        amountPaise: 45000,
        cause: "order_cancelled",
      },
    },
  ];
});

describe("Refunds — send", () => {
  it("sends a refund only after confirming the amount", async () => {
    const user = userEvent.setup();
    renderScreen(<Refunds />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(m.retry.mutateAsync).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("₹450.00");
    expect(dialog).toHaveTextContent("Spice Garden");
    await user.click(
      within(dialog).getByRole("button", { name: "Send refund" }),
    );
    expect(m.retry.mutateAsync).toHaveBeenCalledWith("ord1234567");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("sends nothing when cancelled", async () => {
    const user = userEvent.setup();
    renderScreen(<Refunds />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.retry.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the dialog when Razorpay refuses", async () => {
    const user = userEvent.setup();
    m.retry.mutateAsync.mockRejectedValue(new Error("Razorpay is down"));
    renderScreen(<Refunds />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(screen.getByRole("button", { name: "Send refund" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Razorpay is down")).toBeInTheDocument();
  });
});
