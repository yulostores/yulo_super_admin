import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeLayout, mockMutation, renderScreen } from "../utils";

const m = vi.hoisted(() => ({}));

vi.mock("@/screens/AdminLayout", async () => {
  const format = await import("@/lib/format");
  const { FakeLayout } = await import("../utils");
  return { default: FakeLayout, ...format };
});
vi.mock("@/screens/stores/StorePayoutAccountCard", () => ({
  default: () => null,
}));
vi.mock("@/hooks/admin/useBills", () => ({
  useBills: () => ({ data: { bills: [] }, isLoading: false }),
}));
vi.mock("@/hooks/admin/useStores", () => ({
  useStore: () => ({ data: m.store, isLoading: false, error: null }),
  useApproveStore: () => m.approve,
  useRejectStore: () => m.reject,
  useSuspendStore: () => m.suspend,
  useReactivateStore: () => m.reactivate,
  useUpdateStore: () => m.update,
  useUpdateStoreLocation: () => m.updateLocation,
  useAddStoreNote: () => m.addNote,
  useVerifyDocument: () => m.verifyDoc,
  useRemoveStore: () => m.remove,
}));

import StoreDetail from "@/screens/stores/StoreDetail";

const baseStore = {
  _id: "store1",
  name: "Spice Garden",
  approvalStatus: "active",
  createdAt: "2026-01-01T00:00:00Z",
  documents: [
    {
      _id: "doc1",
      type: "fssai_license",
      status: "pending",
      url: "https://x/fssai.pdf",
    },
  ],
  settings: {},
  operatingHours: [],
};

function renderStore(overrides = {}) {
  m.store = { ...baseStore, ...overrides };
  return renderScreen(<StoreDetail />, {
    path: "/stores/:id",
    route: "/stores/store1",
  });
}

beforeEach(() => {
  for (const k of [
    "approve",
    "reject",
    "suspend",
    "reactivate",
    "update",
    "updateLocation",
    "addNote",
    "verifyDoc",
    "remove",
  ])
    m[k] = mockMutation();
});

describe("StoreDetail — suspend", () => {
  it("asks first, suspends only on confirm, and names the store", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    expect(m.suspend.mutate).not.toHaveBeenCalled();
    expect(m.suspend.mutateAsync).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog", {
      name: "Suspend Spice Garden?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Suspend store" }),
    );
    expect(m.suspend.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not suspend when cancelled", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.suspend.mutateAsync).not.toHaveBeenCalled();
    expect(m.suspend.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the dialog when the suspend fails", async () => {
    const user = userEvent.setup();
    m.suspend.mutateAsync.mockImplementation(async (_v, opts) => {
      const err = new Error("Only active stores can be suspended");
      opts?.onError?.(err);
      throw err;
    });
    renderStore();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(screen.getByRole("button", { name: "Suspend store" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Only active stores can be suspended"),
    ).toBeInTheDocument();
  });
});

describe("StoreDetail — approve and documents", () => {
  it("approves a pending store only after confirm", async () => {
    const user = userEvent.setup();
    renderStore({ approvalStatus: "pending" });
    await user.click(screen.getByRole("button", { name: /Approve Store/ }));
    expect(m.approve.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Approve store" }));
    expect(m.approve.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("verifies a compliance document only after confirm", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(screen.getByTitle("Reject"));
    expect(m.verifyDoc.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(m.verifyDoc.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByTitle("Verify"));
    await user.click(screen.getByRole("button", { name: "Verify document" }));
    expect(m.verifyDoc.mutateAsync).toHaveBeenCalledWith(
      { docId: "doc1", status: "verified" },
      expect.any(Object),
    );
  });
});
