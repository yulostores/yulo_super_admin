import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockMutation, renderScreen } from "../utils";

const m = vi.hoisted(() => ({}));

vi.mock("@/screens/AdminLayout", async () => {
  const format = await import("@/lib/format");
  const { FakeLayout } = await import("../utils");
  return { default: FakeLayout, ...format };
});
vi.mock("@/hooks/admin/useCustomers", () => ({
  useCustomer: () => ({ data: m.customer, isLoading: false, error: null }),
  useSetCustomerStatus: () => m.setStatus,
}));

import CustomerDetail from "@/screens/customers/CustomerDetail";

const renderCustomer = () =>
  renderScreen(<CustomerDetail />, {
    path: "/customers/:id",
    route: "/customers/c1",
  });

beforeEach(() => {
  m.setStatus = mockMutation();
  m.customer = {
    _id: "c1",
    name: "Asha Rao",
    isActive: true,
    createdAt: "2026-01-01",
  };
});

describe("Customer — deactivate", () => {
  it("deactivates only after confirm", async () => {
    const user = userEvent.setup();
    renderCustomer();
    await user.click(
      screen.getByRole("button", { name: "Deactivate Customer" }),
    );
    expect(m.setStatus.mutateAsync).not.toHaveBeenCalled();
    screen.getByRole("alertdialog", { name: "Deactivate Asha Rao?" });
    await user.click(
      screen.getByRole("button", { name: "Deactivate customer" }),
    );
    expect(m.setStatus.mutateAsync).toHaveBeenCalledWith(
      false,
      expect.any(Object),
    );
  });

  it("does nothing when cancelled", async () => {
    const user = userEvent.setup();
    renderCustomer();
    await user.click(
      screen.getByRole("button", { name: "Deactivate Customer" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.setStatus.mutateAsync).not.toHaveBeenCalled();
  });

  it("re-activating stays one tap", async () => {
    const user = userEvent.setup();
    m.customer.isActive = false;
    renderCustomer();
    await user.click(screen.getByRole("button", { name: "Activate Customer" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(m.setStatus.mutateAsync).toHaveBeenCalledWith(
      true,
      expect.any(Object),
    );
  });
});
