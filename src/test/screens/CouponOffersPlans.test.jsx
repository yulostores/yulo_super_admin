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
    listOffers: vi.fn(),
    approveOffer: vi.fn(),
    rejectOffer: vi.fn(),
    listPlans: vi.fn(),
    updatePlan: vi.fn(),
  },
}));

// Radix's Switch measures itself with ResizeObserver, which jsdom doesn't have.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { couponsApi } from "@/api/coupons.api";
import OfferReview from "@/screens/coupons/OfferReview";
import CouponPlans, {
  planChanges,
  validatePlan,
} from "@/screens/coupons/CouponPlans";
import { PLANS, apiError, offer, renderCoupons } from "../couponFixtures";

const offers = (list, status = "pending_review") => ({
  offers: list,
  total: list.length,
  page: 1,
  pages: 1,
  statusCounts: {
    pending_review: 2,
    approved: 5,
    paused: 0,
    rejected: 1,
    draft: 3,
    [status]: list.length,
  },
});

afterEach(() => vi.clearAllMocks());

describe("Offer review", () => {
  beforeEach(() => {
    couponsApi.listOffers.mockResolvedValue(
      offers([
        offer(),
        offer({ _id: "o2", title: "Free hair wash", terms: "" }),
      ]),
    );
  });
  const render = () =>
    renderCoupons(<OfferReview />, {
      path: "/coupon-offers",
      route: "/coupon-offers",
    });

  it("lists offers awaiting review, with the seller, category, validity and terms", async () => {
    render();
    const card = await screen.findByTestId("offer-o1");
    expect(couponsApi.listOffers).toHaveBeenCalledWith({
      status: "pending_review",
      page: 1,
      limit: 20,
    });
    expect(card.textContent).toContain("20% off any haircut");
    expect(card.textContent).toContain("Glow Salon");
    expect(card.textContent).toContain("valid 30 days");
    expect(card.textContent).toContain("Weekdays only");
    expect(
      within(screen.getByTestId("offer-o2")).getByText("No terms."),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Awaiting review 2/ })).toBeTruthy();
  });

  it("approve: confirmed, sent with the updatedAt that was shown", async () => {
    couponsApi.approveOffer.mockResolvedValue(offer({ status: "approved" }));
    const user = userEvent.setup();
    render();
    await user.click(
      within(await screen.findByTestId("offer-o1")).getByRole("button", {
        name: "Approve",
      }),
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Approve offer",
      }),
    );
    expect(couponsApi.approveOffer).toHaveBeenCalledWith(
      "o1",
      "2026-11-11T06:00:00.000Z",
    );
    expect((await screen.findByRole("status")).textContent).toContain(
      "is live",
    );
    await waitFor(() => expect(couponsApi.listOffers).toHaveBeenCalledTimes(2));
  });

  it("reject: a reason is required and sent", async () => {
    couponsApi.rejectOffer.mockResolvedValue(offer({ status: "rejected" }));
    const user = userEvent.setup();
    render();
    await user.click(
      within(await screen.findByTestId("offer-o1")).getByRole("button", {
        name: "Reject",
      }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByRole("button", { name: "Reject offer" }).disabled,
    ).toBe(true);
    await user.type(
      within(dialog).getByLabelText("Reason (shown to the seller)"),
      "Say which haircuts",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Reject offer" }),
    );
    expect(couponsApi.rejectOffer).toHaveBeenCalledWith(
      "o1",
      "Say which haircuts",
      "2026-11-11T06:00:00.000Z",
    );
  });

  it("the seller edited it meanwhile (409 OFFER_CHANGED): told so, the queue reloads", async () => {
    couponsApi.approveOffer.mockRejectedValue(apiError(409, "OFFER_CHANGED"));
    const user = userEvent.setup();
    render();
    await user.click(
      within(await screen.findByTestId("offer-o1")).getByRole("button", {
        name: "Approve",
      }),
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Approve offer",
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "changed this offer while you were reviewing",
    );
    await waitFor(() => expect(couponsApi.listOffers).toHaveBeenCalledTimes(2));
  });

  it("other tabs: no decision buttons; empty queue", async () => {
    const user = userEvent.setup();
    render();
    await screen.findByTestId("offer-o1");
    couponsApi.listOffers.mockResolvedValue(
      offers([offer({ status: "approved" })], "approved"),
    );
    await user.click(screen.getByRole("tab", { name: /Live/ }));
    await waitFor(() =>
      expect(couponsApi.listOffers).toHaveBeenLastCalledWith({
        status: "approved",
        page: 1,
        limit: 20,
      }),
    );
    expect(
      within(await screen.findByTestId("offer-o1")).queryByRole("button", {
        name: "Approve",
      }),
    ).toBeNull();
    couponsApi.listOffers.mockResolvedValue(offers([], "pending_review"));
    await user.click(screen.getByRole("tab", { name: /Awaiting review/ }));
    expect(await screen.findByText(/Nothing to review/)).toBeTruthy();
  });
});

describe("Coupon plans editor", () => {
  beforeEach(() => couponsApi.listPlans.mockResolvedValue(PLANS));
  const render = () =>
    renderCoupons(<CouponPlans />, {
      path: "/coupon-plans",
      route: "/coupon-plans",
    });

  it("each plan with its values; the total incl. GST follows the price as it's typed", async () => {
    const user = userEvent.setup();
    render();
    const basic = await screen.findByTestId("plan-basic");
    expect(within(basic).getByLabelText("Price excl. GST (₹)").value).toBe(
      "5000",
    );
    expect(
      within(basic).getByLabelText("Complimentary (Yulo team)").value,
    ).toBe("5");
    expect(screen.getByTestId("basic-total").textContent).toContain(
      "₹5,900.00",
    );
    expect(
      within(screen.getByTestId("plan-premium")).getByText("Not on sale"),
    ).toBeTruthy();
    expect(within(basic).getByRole("button", { name: "Save" }).disabled).toBe(
      true,
    );
    await user.clear(within(basic).getByLabelText("Price excl. GST (₹)"));
    await user.type(
      within(basic).getByLabelText("Price excl. GST (₹)"),
      "4500",
    );
    expect(screen.getByTestId("basic-total").textContent).toContain(
      "₹5,310.00",
    );
    // Online: ₹4,500 + 3.5 % (₹157.50) = ₹4,657.50, + 18 % GST (₹838.35) = ₹5,495.85.
    expect(screen.getByTestId("basic-online-total").textContent).toContain(
      "₹5,495.85",
    );
    expect(screen.getByTestId("basic-online-total").textContent).toContain(
      "3.5% payment handling fee (₹157.50)",
    );
  });

  it("saves only what changed, after confirming", async () => {
    couponsApi.updatePlan.mockImplementation(async (key, body) => ({
      ...PLANS[0],
      ...(body.couponAllocation
        ? { couponAllocation: body.couponAllocation }
        : {}),
      basePaise: body.basePriceRupees * 100,
    }));
    const user = userEvent.setup();
    render();
    const basic = await screen.findByTestId("plan-basic");
    await user.clear(within(basic).getByLabelText("Price excl. GST (₹)"));
    await user.type(
      within(basic).getByLabelText("Price excl. GST (₹)"),
      "4500",
    );
    await user.clear(within(basic).getByLabelText("Coupons"));
    await user.type(within(basic).getByLabelText("Coupons"), "300");
    await user.click(within(basic).getByRole("button", { name: "Save" }));
    expect(couponsApi.updatePlan).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Save plan",
      }),
    );
    expect(couponsApi.updatePlan).toHaveBeenCalledWith("basic", {
      basePriceRupees: 4500,
      couponAllocation: 300,
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "Basic plan saved",
    );
  });

  it("invalid values are refused before asking", async () => {
    const user = userEvent.setup();
    render();
    const basic = await screen.findByTestId("plan-basic");
    await user.clear(within(basic).getByLabelText("GST %"));
    await user.type(within(basic).getByLabelText("GST %"), "40");
    await user.clear(within(basic).getByLabelText("Coupons"));
    await user.type(within(basic).getByLabelText("Coupons"), "0");
    await user.click(within(basic).getByRole("button", { name: "Save" }));
    expect(within(basic).getByText("0 to 28%")).toBeTruthy();
    expect(within(basic).getByText("A whole number, 1 or more")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("taking a plan off sale is a change; Undo restores", async () => {
    const user = userEvent.setup();
    render();
    const plus = await screen.findByTestId("plan-plus");
    await user.click(
      within(plus).getByRole("switch", { name: "Plus on sale" }),
    );
    expect(within(plus).getByRole("button", { name: "Save" }).disabled).toBe(
      false,
    );
    await user.click(within(plus).getByRole("button", { name: "Undo" }));
    expect(within(plus).getByRole("button", { name: "Save" }).disabled).toBe(
      true,
    );
  });

  it("validatePlan / planChanges", () => {
    expect(
      validatePlan({
        name: "B",
        basePrice: "0",
        gstPercent: "18",
        couponAllocation: "1.5",
        complimentaryCount: "101",
      }),
    ).toEqual({
      name: "2 to 40 characters",
      basePrice: "A price above ₹0",
      couponAllocation: "A whole number, 1 or more",
      complimentaryCount: "0 to 100",
    });
    expect(
      planChanges(PLANS[0], {
        name: "Basic",
        basePrice: "5000",
        gstPercent: "18",
        couponAllocation: "250",
        complimentaryCount: "6",
        isActive: true,
      }),
    ).toEqual({ complimentaryCount: 6 });
  });
});
