// CF10 coverage sweep: every super-admin coupon screen shows a loading state while its data is on
// the way and an error (role="alert") when it can't be loaded. The per-screen test files cover
// data, empty states and the main interactions.
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/screens/AdminLayout", async () => {
  const format = await import("@/lib/format");
  const { FakeLayout } = await import("../utils");
  return { default: FakeLayout, ...format };
});
vi.mock("@/api/coupons.api", async (importOriginal) => {
  const { couponsApi } = await importOriginal();
  return {
    couponsApi: Object.fromEntries(
      Object.keys(couponsApi).map((k) => [k, vi.fn()]),
    ),
  };
});

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { couponsApi } from "@/api/coupons.api";
import SellersList from "@/screens/coupons/SellersList";
import SellerDetail from "@/screens/coupons/SellerDetail";
import OfferReview from "@/screens/coupons/OfferReview";
import CouponPlans from "@/screens/coupons/CouponPlans";
import CouponCategories from "@/screens/coupons/CouponCategories";
import CouponsList from "@/screens/coupons/CouponsList";
import Complimentary from "@/screens/coupons/Complimentary";
import CouponSettings from "@/screens/coupons/CouponSettings";
import CouponReports from "@/screens/coupons/CouponReports";
import ReminderCampaigns from "@/screens/coupons/ReminderCampaigns";
import CampaignDetail from "@/screens/coupons/CampaignDetail";
import { apiError, renderCoupons } from "../couponFixtures";

function answer(mode) {
  for (const fn of Object.values(couponsApi))
    fn.mockImplementation(() =>
      mode === "pending"
        ? new Promise(() => {})
        : Promise.reject(apiError(500, "SERVER_ERROR", "Server is down")),
    );
}

afterEach(() => vi.clearAllMocks());

const SCREENS = [
  ["Sellers", () => <SellersList />, "/sellers", "/sellers"],
  ["Seller detail", () => <SellerDetail />, "/sellers/:id", "/sellers/s1"],
  ["Offer review", () => <OfferReview />, "/coupon-offers", "/coupon-offers"],
  ["Coupon plans", () => <CouponPlans />, "/coupon-plans", "/coupon-plans"],
  ["Categories", () => <CouponCategories />, "/c", "/c"],
  ["Coupons", () => <CouponsList />, "/coupons", "/coupons"],
  ["Complimentary", () => <Complimentary />, "/x", "/x"],
  ["Coupon settings", () => <CouponSettings />, "/s", "/s"],
  ["Coupon reports", () => <CouponReports />, "/r", "/r"],
  ["Reminder campaigns", () => <ReminderCampaigns />, "/rc", "/rc"],
  ["Campaign detail", () => <CampaignDetail />, "/rc/:id", "/rc/cmp1"],
];

describe.each(SCREENS)("%s", (_name, ui, path, route) => {
  it("shows a loading state while its data is on the way", async () => {
    answer("pending");
    renderCoupons(ui(), { path, route });
    expect((await screen.findAllByText(/Loading/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an error when its data can't be loaded", async () => {
    answer("error");
    renderCoupons(ui(), { path, route });
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
  });
});

describe("empty states not covered by the per-screen files", () => {
  it("Complimentary: nothing matching", async () => {
    couponsApi.listComplimentary.mockResolvedValue({ groups: [], total: 0 });
    couponsApi.listSellers.mockResolvedValue({ sellers: [], total: 0 });
    renderCoupons(<Complimentary />, { path: "/x", route: "/x" });
    expect(
      await screen.findByText("No complimentary coupons match."),
    ).toBeTruthy();
  });

  it("Seller detail: no plans bought yet", async () => {
    const { sellerDetail } = await import("../couponFixtures");
    couponsApi.getSeller.mockResolvedValue(sellerDetail({ status: "active" }));
    couponsApi.listSellerSubscriptions.mockResolvedValue([]);
    couponsApi.listPlans.mockResolvedValue([]);
    couponsApi.getCouponSettings.mockResolvedValue({
      active: { smsPricePaise: 300, smsGstPercent: 18 },
      versions: [],
    });
    renderCoupons(<SellerDetail />, {
      path: "/sellers/:id",
      route: "/sellers/s1",
    });
    expect(await screen.findByText("No plans bought yet.")).toBeTruthy();
  });
});

describe("seller choices", () => {
  it("same-named sellers are told apart by city and id; unique names stay plain", async () => {
    const { sellerOptions } = await import("@/lib/coupons");
    expect(
      sellerOptions([
        {
          _id: "a00000000000000000001111",
          businessName: "Glow Salon",
          city: "Pune",
        },
        {
          _id: "a00000000000000000002222",
          businessName: "Glow Salon",
          city: null,
        },
        {
          _id: "a00000000000000000003333",
          businessName: "Calm Spa",
          city: "Pune",
        },
      ]).map((o) => o.label),
    ).toEqual(["Glow Salon (Pune, #1111)", "Glow Salon (#2222)", "Calm Spa"]);
    expect(sellerOptions(undefined)).toEqual([]);
  });
});
