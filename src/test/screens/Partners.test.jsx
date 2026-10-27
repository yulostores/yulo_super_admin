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
vi.mock("@/hooks/admin/useDeliveryPartners", () => ({
  useDeliveryPartner: () => ({
    data: m.partner,
    isLoading: false,
    error: null,
  }),
  useDeliveryPartners: () => ({
    data: { partners: [], total: 0, page: 1, pages: 1 },
    isLoading: false,
  }),
  usePartnerOrders: () => ({ data: { orders: [] }, isLoading: false }),
  usePayouts: () => ({ data: { rows: [] }, isLoading: false }),
  usePayoutSummary: () => ({ data: m.summary }),
  useAdjustPayout: () => m.adjust,
  useReassignOrderPartner: () => m.reassign,
  useRemoveDeliveryPartner: () => m.remove,
  useUpdateDeliveryPartner: () => m.update,
  useVerifyDeliveryPartner: () => m.verify,
  useVerifyPartnerDocument: () => m.verifyDoc,
  useMarkPayoutsPaid: () => m.markPaid,
}));

import PartnerDetail from "@/screens/deliveryPartners/PartnerDetail";
import PartnersList from "@/screens/deliveryPartners/PartnersList";

beforeEach(() => {
  for (const k of [
    "adjust",
    "reassign",
    "remove",
    "update",
    "verify",
    "verifyDoc",
    "markPaid",
  ])
    m[k] = mockMutation();
  m.partner = {
    _id: "p1",
    fullName: "Ravi Kumar",
    status: "active",
    verificationStatus: "pending_review",
    documents: [],
    vehicle: {},
    bankDetails: {},
    createdAt: "2026-01-01T00:00:00Z",
  };
  m.summary = {
    periodStart: "2026-10-12T00:00:00Z",
    periodEnd: "2026-10-18T23:59:59Z",
    pendingPayments: 2,
    payouts: [
      { _id: "po1", partnerId: "p1", status: "pending", netPayable: 1200.5 },
      { _id: "po2", partnerId: "p2", status: "pending", netPayable: 800 },
      { _id: "po3", partnerId: "p3", status: "paid", netPayable: 999 },
    ],
  };
});

const renderDetail = () =>
  renderScreen(<PartnerDetail />, {
    path: "/delivery-partners/:id",
    route: "/delivery-partners/p1",
  });

describe("Delivery partner — KYC approve", () => {
  it("approves only after confirm", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(m.verify.mutateAsync).not.toHaveBeenCalled();
    expect(m.verify.mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog", {
      name: "Approve Ravi Kumar's KYC?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Approve partner" }),
    );
    expect(m.verify.mutateAsync).toHaveBeenCalledWith(
      { decision: "approve", notes: undefined },
      expect.any(Object),
    );
  });

  it("does not approve when cancelled", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.verify.mutateAsync).not.toHaveBeenCalled();
  });

  it("rejects with the required reason, from the dialog only", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: /Reject/ }));
    expect(m.verify.mutateAsync).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", {
      name: "Reject partner",
    });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox"), "Blurred licence");
    await user.click(confirm);
    expect(m.verify.mutateAsync).toHaveBeenCalledWith(
      { decision: "reject", notes: "Blurred licence" },
      expect.any(Object),
    );
  });
});

describe("Delivery partners — clear pending rider payouts", () => {
  it("marks the unpaid payouts paid only after confirming count and total", async () => {
    const user = userEvent.setup();
    renderScreen(<PartnersList />);
    await user.click(
      screen.getByRole("button", { name: /Clear Pending Payments/ }),
    );
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();
    expect(m.markPaid.mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog", {
      name: "Mark 2 rider payouts (₹2,000.50) as paid?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Mark ₹2,000.50 paid" }),
    );
    expect(m.markPaid.mutateAsync).toHaveBeenCalledWith(
      ["po1", "po2"],
      expect.any(Object),
    );
  });

  it("marks nothing when cancelled", async () => {
    const user = userEvent.setup();
    renderScreen(<PartnersList />);
    await user.click(
      screen.getByRole("button", { name: /Clear Pending Payments/ }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.markPaid.mutateAsync).not.toHaveBeenCalled();
  });
});
