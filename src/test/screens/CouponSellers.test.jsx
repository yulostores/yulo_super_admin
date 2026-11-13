import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/screens/AdminLayout", async () => {
  const format = await import("@/lib/format");
  const { FakeLayout } = await import("../utils");
  return { default: FakeLayout, ...format };
});
vi.mock("@/api/coupons.api", () => ({
  couponsApi: {
    listSellers: vi.fn(),
    listCategories: vi.fn(),
    getSeller: vi.fn(),
    revealIdentity: vi.fn(),
    approveSeller: vi.fn(),
    rejectSeller: vi.fn(),
    suspendSeller: vi.fn(),
    reactivateSeller: vi.fn(),
    getSellerDocumentFile: vi.fn(),
    listSellerSubscriptions: vi.fn(),
    recordPlanPayment: vi.fn(),
    recordCreditsPayment: vi.fn(),
    listPlans: vi.fn(),
    getCouponSettings: vi.fn(),
  },
}));

import { couponsApi } from "@/api/coupons.api";
import SellersList from "@/screens/coupons/SellersList";
import SellerDetail from "@/screens/coupons/SellerDetail";
import {
  LIST,
  PLANS,
  SETTINGS,
  apiError,
  renderCoupons,
  sellerDetail,
  subscription,
} from "../couponFixtures";

beforeEach(() => {
  couponsApi.listSellers.mockResolvedValue(LIST());
  couponsApi.listCategories.mockResolvedValue([
    { _id: "cat-salon", key: "salon", name: "Salon" },
    { _id: "cat-spa", key: "spa", name: "Spa" },
  ]);
  couponsApi.listSellerSubscriptions.mockResolvedValue([]);
  couponsApi.listPlans.mockResolvedValue(PLANS);
  couponsApi.getCouponSettings.mockResolvedValue(SETTINGS);
});
afterEach(() => vi.clearAllMocks());

// ── List ──────────────────────────────────────────────────────────────────────

describe("Sellers list", () => {
  const renderList = (route = "/sellers") =>
    renderCoupons(<SellersList />, { path: "/sellers", route });

  it("opens on the Pending queue with counts per tab; marks incomplete applications", async () => {
    renderList();
    expect(await screen.findByText("Glow Salon")).toBeTruthy();
    expect(couponsApi.listSellers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: "pending",
    });
    expect(
      screen
        .getByRole("tab", { name: /Pending review 2/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tab", { name: /Active 7/ })).toBeTruthy();
    const half = screen.getByText("Half Done Spa").closest("tr");
    expect(within(half).getByText("Incomplete")).toBeTruthy();
    expect(within(half).getByText("Not sent")).toBeTruthy();
  });

  it("tab, category and search each change the query (and go back to page 1)", async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText("Glow Salon");
    await user.click(screen.getByRole("tab", { name: /Active/ }));
    await waitFor(() =>
      expect(couponsApi.listSellers).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: "active",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Category"), "cat-spa");
    await waitFor(() =>
      expect(couponsApi.listSellers).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: "active",
        categoryId: "cat-spa",
      }),
    );
    await user.type(screen.getByLabelText("Search sellers"), "asha");
    await waitFor(() =>
      expect(couponsApi.listSellers).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: "active",
        categoryId: "cat-spa",
        search: "asha",
      }),
    );
    await user.click(screen.getByRole("tab", { name: /All/ }));
    await waitFor(() =>
      expect(couponsApi.listSellers).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        categoryId: "cat-spa",
        search: "asha",
      }),
    );
  });

  it("paging asks for the next page", async () => {
    couponsApi.listSellers.mockImplementation(async ({ page }) =>
      LIST({ total: 45, pages: 3, page }),
    );
    const user = userEvent.setup();
    renderList();
    await screen.findByText("Glow Salon");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(couponsApi.listSellers).toHaveBeenLastCalledWith({
        page: 2,
        limit: 20,
        status: "pending",
      }),
    );
  });

  it("a row opens the seller", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(await screen.findByRole("link", { name: "Glow Salon" }));
    expect(screen.getByTestId("landed").textContent).toBe("/sellers/s1");
  });

  it("empty and error states", async () => {
    couponsApi.listSellers
      .mockRejectedValueOnce(apiError(503, "X", "Server down"))
      .mockResolvedValue(LIST({ sellers: [], total: 0 }));
    const user = userEvent.setup();
    renderList();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Server down",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No sellers here.")).toBeTruthy();
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────

const renderDetail = () =>
  renderCoupons(<SellerDetail />, {
    path: "/sellers/:id",
    route: "/sellers/s1",
  });

describe("Seller detail — review actions", () => {
  it("shows business, owner (masked), documents and team", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    renderDetail();
    expect(
      await screen.findByText("12 MG Road, Bengaluru, Karnataka, 560001"),
    ).toBeTruthy();
    expect(screen.getByText("******234F")).toBeTruthy();
    expect(screen.getByText("XXXX XXXX 2346")).toBeTruthy();
    expect(screen.getByText("Only the last 4 digits are stored")).toBeTruthy();
    expect(screen.getByText("PAN card")).toBeTruthy();
    const meera = screen.getByText("Meera Nair").closest("tr");
    expect(meera.textContent).toContain("Manager");
    expect(meera.textContent).toContain("Inactive");
    expect(screen.getByTestId("sms-balance").textContent).toBe("40");
  });

  // CF10 browser run: seller documents have no storage url (they are streamed through the
  // API), and the viewer only opened for documents with one — View did nothing.
  it("View opens the document, fetched once through the API", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    couponsApi.getSellerDocumentFile.mockResolvedValue(
      new Blob(["png"], { type: "image/png" }),
    );
    URL.createObjectURL = vi.fn(() => "blob:doc");
    URL.revokeObjectURL = vi.fn();
    const user = userEvent.setup();
    renderDetail();
    const row = (await screen.findByText("PAN card")).closest("li, div");
    await user.click(
      within(row.parentElement).getAllByRole("button", { name: "View" })[0],
    );
    expect(await screen.findByRole("img")).toBeTruthy();
    expect(couponsApi.getSellerDocumentFile).toHaveBeenCalledWith("s1", "d1");
    await new Promise((r) => setTimeout(r, 50));
    expect(couponsApi.getSellerDocumentFile).toHaveBeenCalledTimes(1);
  });

  it("Approve asks first, then approves and refreshes", async () => {
    couponsApi.getSeller
      .mockResolvedValueOnce(sellerDetail())
      .mockResolvedValue(sellerDetail({ status: "active" }));
    couponsApi.approveSeller.mockResolvedValue(
      sellerDetail({ status: "active" }),
    );
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Approve Glow Salon?");
    expect(couponsApi.approveSeller).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(couponsApi.approveSeller).toHaveBeenCalledWith("s1");
    expect((await screen.findByRole("status")).textContent).toContain(
      "Glow Salon is approved",
    );
    expect(await screen.findByRole("button", { name: "Suspend" })).toBeTruthy();
  });

  it("an incomplete application can't be approved: the server's missing list is shown", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    couponsApi.approveSeller.mockRejectedValue(
      apiError(422, "ONBOARDING_INCOMPLETE", "Missing", {
        missing: ["owner", "document:aadhaar_card"],
      }),
    );
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Approve",
      }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Can't approve yet");
    expect(alert.textContent).toContain("Aadhaar card upload");
  });

  it("Reject needs a reason (5+ characters), which is sent", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    couponsApi.rejectSeller.mockResolvedValue(
      sellerDetail({ status: "rejected" }),
    );
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = screen.getByRole("alertdialog");
    const go = within(dialog).getByRole("button", {
      name: "Reject application",
    });
    expect(go.disabled).toBe(true);
    await user.type(
      within(dialog).getByLabelText("Reason (shown to the seller)"),
      "Blur",
    );
    expect(go.disabled).toBe(true);
    await user.type(
      within(dialog).getByLabelText("Reason (shown to the seller)"),
      "ry PAN photo",
    );
    await user.click(go);
    expect(couponsApi.rejectSeller).toHaveBeenCalledWith(
      "s1",
      "Blurry PAN photo",
    );
  });

  it("an active seller: Suspend with a reason; a suspended seller: Reactivate", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail({ status: "active" }));
    couponsApi.suspendSeller.mockResolvedValue({});
    const user = userEvent.setup();
    const first = renderDetail();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Suspend" }));
    const dialog = screen.getByRole("alertdialog");
    await user.type(
      within(dialog).getByLabelText("Reason (kept in the audit log)"),
      "Unpaid dues",
    );
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));
    expect(couponsApi.suspendSeller).toHaveBeenCalledWith("s1", "Unpaid dues");
    first.unmount();

    couponsApi.getSeller.mockResolvedValue(
      sellerDetail({ status: "suspended" }),
    );
    couponsApi.reactivateSeller.mockResolvedValue({});
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Reactivate" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Reactivate",
      }),
    );
    expect(couponsApi.reactivateSeller).toHaveBeenCalledWith("s1");
  });

  it("Cancel in the confirm dialog does nothing", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(couponsApi.approveSeller).not.toHaveBeenCalled();
  });
});

describe("Seller detail — PAN reveal", () => {
  it("asks first (logged), shows the full PAN, and Hide puts the mask back; Aadhaar can't be revealed", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail());
    couponsApi.revealIdentity.mockResolvedValue({
      field: "pan",
      value: "ABCDE1234F",
    });
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole("button", { name: "Reveal" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("logged");
    expect(couponsApi.revealIdentity).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole("button", { name: "Reveal PAN" }),
    );
    expect(couponsApi.revealIdentity).toHaveBeenCalledWith("s1", "pan");
    expect(await screen.findByText("ABCDE1234F")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByText("ABCDE1234F")).toBeNull();
    expect(screen.getByText("******234F")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Reveal" })).toHaveLength(1);
  });
});

describe("Seller detail — Amount Received", () => {
  const openPlanDialog = async (user) => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail({ status: "active" }));
    renderDetail();
    await screen.findByText("Plans");
    const [planButton] = await screen.findAllByRole("button", {
      name: "Amount Received",
    });
    await waitFor(() => expect(planButton.disabled).toBe(false));
    await user.click(planButton);
    return screen.getByRole("dialog");
  };

  it("prefills the plan total; a matching amount needs no reason; success refreshes the plans", async () => {
    couponsApi.recordPlanPayment.mockResolvedValue(subscription());
    const user = userEvent.setup();
    const dialog = await openPlanDialog(user);
    expect(within(dialog).getByLabelText("Amount received (₹)").value).toBe(
      "5900",
    );
    expect(
      within(dialog).queryByLabelText("Why is the amount different?"),
    ).toBeNull();
    // Inactive plans aren't offered.
    expect(
      [...within(dialog).getByLabelText("Plan").options].map((o) => o.value),
    ).toEqual(["basic", "plus"]);
    await user.selectOptions(within(dialog).getByLabelText("Plan"), "plus");
    expect(within(dialog).getByLabelText("Amount received (₹)").value).toBe(
      "17700",
    );
    await user.selectOptions(within(dialog).getByLabelText("Plan"), "basic");
    await user.selectOptions(within(dialog).getByLabelText("Paid by"), "upi");
    await user.type(
      within(dialog).getByLabelText("Payment reference"),
      "UPI-4455",
    );
    couponsApi.listSellerSubscriptions.mockResolvedValue([subscription()]);
    await user.click(
      within(dialog).getByRole("button", { name: "Record and activate plan" }),
    );
    expect(couponsApi.recordPlanPayment).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        planKey: "basic",
        amountRupees: 5900,
        mode: "upi",
        reference: "UPI-4455",
      }),
    );
    expect(
      couponsApi.recordPlanPayment.mock.calls[0][1].overrideReason,
    ).toBeUndefined();
    expect((await screen.findByRole("status")).textContent).toContain(
      "plan activated",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("UTR123456", { exact: false })).toBeTruthy();
  });

  it("a different amount requires a reason, which is sent", async () => {
    couponsApi.recordPlanPayment.mockResolvedValue(subscription());
    const user = userEvent.setup();
    const dialog = await openPlanDialog(user);
    const amount = within(dialog).getByLabelText("Amount received (₹)");
    await user.clear(amount);
    await user.type(amount, "5000");
    await user.type(
      within(dialog).getByLabelText("Payment reference"),
      "UTR777",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Record and activate plan" }),
    );
    expect(
      within(dialog).getByText("Say why the amount differs from the price"),
    ).toBeTruthy();
    expect(couponsApi.recordPlanPayment).not.toHaveBeenCalled();
    await user.type(
      within(dialog).getByLabelText("Why is the amount different?"),
      "Launch discount",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Record and activate plan" }),
    );
    expect(couponsApi.recordPlanPayment).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        amountRupees: 5000,
        overrideReason: "Launch discount",
      }),
    );
  });

  it("checks reference and date; a repeated reference is flagged on the field", async () => {
    couponsApi.recordPlanPayment.mockRejectedValue(
      apiError(409, "DUPLICATE_PAYMENT"),
    );
    const user = userEvent.setup();
    const dialog = await openPlanDialog(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Record and activate plan" }),
    );
    expect(
      within(dialog).getByText(/Enter the payment reference/),
    ).toBeTruthy();
    await user.type(
      within(dialog).getByLabelText("Payment reference"),
      "UTR123456",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Record and activate plan" }),
    );
    expect(
      await within(dialog).findByText(
        "This reference is already recorded for this seller",
      ),
    ).toBeTruthy();
  });

  it("SMS credits: credits × ₹3.54 prefilled, recorded with the credit count", async () => {
    couponsApi.recordCreditsPayment.mockResolvedValue({
      purchase: {},
      balance: 140,
    });
    couponsApi.getSeller.mockResolvedValue(sellerDetail({ status: "active" }));
    const user = userEvent.setup();
    renderDetail();
    const buttons = await screen.findAllByRole("button", {
      name: "Amount Received",
    });
    await waitFor(() => expect(buttons[1].disabled).toBe(false));
    await user.click(buttons[1]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Amount received (₹)").value).toBe(
      "354",
    );
    await user.clear(within(dialog).getByLabelText("SMS credits"));
    await user.type(within(dialog).getByLabelText("SMS credits"), "50");
    expect(within(dialog).getByLabelText("Amount received (₹)").value).toBe(
      "177",
    );
    await user.type(
      within(dialog).getByLabelText("Payment reference"),
      "UPI-CRD-1",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Record and add credits" }),
    );
    expect(couponsApi.recordCreditsPayment).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        credits: 50,
        amountRupees: 177,
        reference: "UPI-CRD-1",
      }),
    );
    expect((await screen.findByRole("status")).textContent).toContain(
      "credits added",
    );
  });

  it("not offered for a seller that isn't active", async () => {
    couponsApi.getSeller.mockResolvedValue(sellerDetail({ status: "pending" }));
    renderDetail();
    await screen.findByText("Plans");
    expect(
      screen.queryByRole("button", { name: "Amount Received" }),
    ).toBeNull();
  });
});
