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
    listCategories: vi.fn(),
    listSellers: vi.fn(),
    couponReport: vi.fn(),
    previewCampaign: vi.fn(),
    createCampaign: vi.fn(),
    listCampaigns: vi.fn(),
    getCampaign: vi.fn(),
  },
}));

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { couponsApi } from "@/api/coupons.api";
import CouponReports, {
  EMPTY_REPORT_FILTERS,
  reportQuery,
} from "@/screens/coupons/CouponReports";
import ReminderCampaigns from "@/screens/coupons/ReminderCampaigns";
import CampaignDetail from "@/screens/coupons/CampaignDetail";
import {
  campaignBody,
  describeFilters,
  rupees,
} from "@/screens/coupons/campaigns";
import { LIST, apiError, renderCoupons, sellerRow } from "../couponFixtures";

const CATEGORIES = [
  { _id: "c1", key: "salon", name: "Salon", enabled: true, sortOrder: 1 },
  { _id: "c2", key: "spa", name: "Spa", enabled: true, sortOrder: 2 },
];
const SELLERS = LIST({
  sellers: [
    sellerRow({ status: "active" }),
    sellerRow({ _id: "s2", businessName: "Calm Spa", status: "active" }),
  ],
});

// ── Report fixtures, shaped as yulo_backend/server/services/adminCouponReports.service.js answers ──
const REPORTS = {
  summary: {
    issued: 1250,
    active: 400,
    redeemed: 700,
    expired: 150,
    void: 3,
    redemptionRate: 56,
    pending: 980,
    stock: { allocated: 2230, issued: 1250, pending: 980 },
    complimentary: { total: 15, assigned: 6, used: 2, expired: 0, unused: 13 },
  },
  "by-category": {
    categories: [
      {
        id: "c1",
        key: "salon",
        name: "Salon",
        enabled: true,
        issued: 900,
        active: 300,
        redeemed: 500,
        expired: 100,
        void: 0,
        redemptionRate: 55.56,
      },
      {
        id: "c2",
        key: "spa",
        name: "Spa",
        enabled: true,
        issued: 350,
        active: 100,
        redeemed: 200,
        expired: 50,
        void: 3,
        redemptionRate: 57.14,
      },
    ],
  },
  "by-seller": {
    sellers: [
      {
        id: "s1",
        name: "Glow Salon",
        status: "active",
        issued: 900,
        redeemed: 500,
      },
      {
        id: "s2",
        name: "Calm Spa",
        status: "active",
        issued: 350,
        redeemed: 200,
      },
    ],
  },
  demographics: {
    total: 1250,
    counts: {},
    gender: { male: 500, female: 650, other: 20, not_given: 80 },
    ageBands: {
      "under-18": 0,
      "18-24": 300,
      "25-34": 600,
      "35-44": 250,
      "45-54": 60,
      "55+": 20,
      "not-given": 20,
    },
  },
  trends: {
    interval: "day",
    from: "2026-11-11",
    to: "2026-11-13",
    status: null,
    series: [
      { bucket: "2026-11-11", issued: 10, redeemed: 4 },
      { bucket: "2026-11-12", issued: 12, redeemed: 7 },
      { bucket: "2026-11-13", issued: 9, redeemed: 3 },
    ],
    totals: { issued: 31, redeemed: 14 },
  },
  sellers: {
    sellers: [
      {
        id: "s1",
        businessName: "Glow Salon",
        category: "Salon",
        status: "active",
        city: "Bengaluru",
        businessPhone: "8040000000",
        ownerName: "Asha Rao",
        approvedAt: "2026-10-01T00:00:00.000Z",
        currentPlan: { key: "basic", name: "Basic" },
        activePlans: [
          { key: "basic", name: "Basic" },
          { key: "plus", name: "Plus" },
        ],
        allocated: 1500,
        issued: 900,
        pending: 600,
        redeemed: 500,
        expired: 100,
        void: 0,
        redemptionRate: 55.56,
      },
    ],
  },
  employees: {
    employees: [
      {
        id: "u1",
        seller: { id: "s1", name: "Glow Salon" },
        name: "Asha Rao",
        role: "owner",
        phone: "9822222221",
        status: "active",
        redemptions: 3,
        lastRedemptionAt: "2026-11-10T06:00:00.000Z",
      },
      {
        id: "u2",
        seller: { id: "s1", name: "Glow Salon" },
        name: "Ravi Kumar",
        role: "employee",
        phone: "9822222223",
        status: "removed",
        redemptions: 41,
        lastRedemptionAt: "2026-11-12T06:00:00.000Z",
      },
    ],
  },
};
const EMPTY_REPORTS = {
  summary: {
    ...REPORTS.summary,
    issued: 0,
    active: 0,
    redeemed: 0,
    expired: 0,
    redemptionRate: 0,
    pending: 0,
    complimentary: { total: 0, assigned: 0, used: 0, expired: 0, unused: 0 },
  },
  "by-category": {
    categories: REPORTS["by-category"].categories.map((c) => ({
      ...c,
      issued: 0,
    })),
  },
  "by-seller": { sellers: [] },
  demographics: { total: 0, counts: {}, gender: {}, ageBands: {} },
  trends: {
    ...REPORTS.trends,
    series: REPORTS.trends.series.map((s) => ({
      ...s,
      issued: 0,
      redeemed: 0,
    })),
  },
  sellers: { sellers: [] },
  employees: { employees: [] },
};
const SECTIONS = [
  ["summary", "report-summary"],
  ["by-category", "report-by-category"],
  ["by-seller", "report-by-seller"],
  ["demographics", "report-demographics"],
  ["trends", "report-trends"],
  ["sellers", "report-sellers"],
  ["employees", "report-employees"],
];

afterEach(() => vi.clearAllMocks());
beforeEach(() => {
  couponsApi.listCategories.mockResolvedValue(CATEGORIES);
  couponsApi.listSellers.mockResolvedValue(SELLERS);
});

// ── Reports ───────────────────────────────────────────────────────────────────

describe("Coupon reports", () => {
  const render = () =>
    renderCoupons(<CouponReports />, { path: "/r", route: "/r" });
  const callsFor = (name) =>
    couponsApi.couponReport.mock.calls
      .filter(([n]) => n === name)
      .map(([, p]) => p);
  const section = (id) => screen.getByTestId(id);

  it("every report with data", async () => {
    couponsApi.couponReport.mockImplementation(async (name) => REPORTS[name]);
    render();
    await waitFor(() =>
      expect(
        within(section("report-employees")).queryByText("Loading…"),
      ).toBeNull(),
    );

    const totals = section("report-summary");
    for (const t of ["1,250", "980", "400", "700", "150", "56.0%"])
      expect(within(totals).getByText(t)).toBeTruthy();
    expect(totals.textContent).toContain(
      "Complimentary (not counted above): 15",
    );

    const cats = within(section("report-by-category")).getAllByRole("listitem");
    expect(cats.map((li) => li.textContent)).toEqual([
      "Salon900 (72%)",
      "Spa350 (28%)",
    ]);
    expect(
      within(section("report-by-seller")).getByTestId("bar-s2").textContent,
    ).toBe("Calm Spa350 (28%)");

    const demo = section("report-demographics");
    expect(within(demo).getByTestId("bar-female").textContent).toBe(
      "Female650 (52%)",
    );
    expect(within(demo).getByTestId("bar-25-34").textContent).toBe(
      "25–34600 (48%)",
    );
    // Age bands keep their order (an ordered scale), not ranked.
    expect(
      within(
        within(demo).getByRole("list", { name: "Age bands" }),
      ).getAllByRole("listitem")[0].textContent,
    ).toContain("Under 18");

    const trendRows = within(section("report-trends")).getAllByRole("row", {
      hidden: true,
    });
    expect(trendRows).toHaveLength(4);
    expect(trendRows[2].textContent).toContain("127");

    const sellerRows = within(
      screen.getByRole("table", { name: "Seller report" }),
    ).getAllByRole("row");
    expect(sellerRows[1].textContent).toContain("Glow Salon");
    expect(sellerRows[1].textContent).toContain("Basic + Plus"); // every active plan
    expect(sellerRows[1].textContent).toContain("1,500");
    expect(sellerRows[1].textContent).toContain("55.6%");

    const empRows = within(
      screen.getByRole("table", { name: "Employee redemptions" }),
    ).getAllByRole("row");
    expect(empRows[1].textContent).toContain("Ravi Kumar"); // most redemptions first
    expect(empRows[1].textContent).toContain("Removed");
    expect(empRows[1].textContent).toContain("41");
    expect(empRows[2].textContent).toContain("Owner");
  });

  it("every report empty", async () => {
    couponsApi.couponReport.mockImplementation(
      async (name) => EMPTY_REPORTS[name],
    );
    render();
    await waitFor(() =>
      expect(
        within(section("report-employees")).queryByText("Loading…"),
      ).toBeNull(),
    );
    expect(
      within(section("report-summary")).getAllByText("0").length,
    ).toBeGreaterThanOrEqual(5);
    for (const id of [
      "report-by-category",
      "report-by-seller",
      "report-demographics",
    ])
      expect(
        within(section(id)).getByText("No coupons issued in this period."),
      ).toBeTruthy();
    expect(
      within(section("report-trends")).getByText("No coupons in this period."),
    ).toBeTruthy();
    expect(
      within(section("report-sellers")).getByText(
        "No sellers match these filters.",
      ),
    ).toBeTruthy();
    expect(
      within(section("report-employees")).getByText(
        "No seller logins match these filters.",
      ),
    ).toBeTruthy();
  });

  it.each(SECTIONS)(
    "%s failing shows its own error with Retry; the rest still render",
    async (failing, testId) => {
      couponsApi.couponReport.mockImplementation(async (name) => {
        if (name === failing) throw apiError(500, "X", `${failing} broke`);
        return REPORTS[name];
      });
      const user = userEvent.setup();
      render();
      const alert = await within(section(testId)).findByRole("alert");
      expect(alert.textContent).toContain(`${failing} broke`);
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      const other = SECTIONS.find(([n]) => n !== failing)[1];
      await waitFor(() =>
        expect(within(section(other)).queryByText("Loading…")).toBeNull(),
      );

      couponsApi.couponReport.mockImplementation(async (name) => REPORTS[name]);
      await user.click(within(alert).getByRole("button", { name: "Retry" }));
      await waitFor(() =>
        expect(within(section(testId)).queryByRole("alert")).toBeNull(),
      );
    },
  );

  it("a date range (and category / seller) goes to every report", async () => {
    couponsApi.couponReport.mockImplementation(async (name) => REPORTS[name]);
    const user = userEvent.setup();
    render();
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(7),
    );
    for (const [name] of SECTIONS)
      expect(callsFor(name)[0]).toEqual(
        name === "trends" ? { interval: "day" } : {},
      );

    await user.type(screen.getByLabelText("From"), "2026-10-01");
    await user.type(screen.getByLabelText("To"), "2026-10-31");
    expect(couponsApi.couponReport).toHaveBeenCalledTimes(7); // nothing until Apply
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(14),
    );
    const range = { from: "2026-10-01", to: "2026-10-31" };
    for (const [name] of SECTIONS)
      expect(callsFor(name).at(-1)).toEqual(
        name === "trends" ? { ...range, interval: "day" } : range,
      );

    await user.selectOptions(screen.getByLabelText("Category"), "c2");
    await user.selectOptions(screen.getByLabelText("Seller"), "s2");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(21),
    );
    for (const [name] of SECTIONS)
      expect(callsFor(name).at(-1)).toMatchObject({
        ...range,
        category: "c2",
        seller: "s2",
      });
  });

  it("a backwards range is refused without querying", async () => {
    couponsApi.couponReport.mockImplementation(async (name) => REPORTS[name]);
    const user = userEvent.setup();
    render();
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(7),
    );
    await user.type(screen.getByLabelText("From"), "2026-11-10");
    await user.type(screen.getByLabelText("To"), "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "The start date is after the end date.",
    );
    expect(couponsApi.couponReport).toHaveBeenCalledTimes(7);
  });

  it("the trend interval only re-asks the trend", async () => {
    couponsApi.couponReport.mockImplementation(async (name) => REPORTS[name]);
    const user = userEvent.setup();
    render();
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(7),
    );
    await user.selectOptions(screen.getByLabelText("Trend interval"), "week");
    await waitFor(() =>
      expect(couponsApi.couponReport).toHaveBeenCalledTimes(8),
    );
    expect(couponsApi.couponReport).toHaveBeenLastCalledWith("trends", {
      interval: "week",
    });
  });

  it("reportQuery leaves blanks out", () => {
    expect(reportQuery(EMPTY_REPORT_FILTERS)).toEqual({});
    expect(reportQuery({ ...EMPTY_REPORT_FILTERS, to: "2026-11-01" })).toEqual({
      to: "2026-11-01",
    });
  });
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

const PER_SMS = { pricePaise: 300, gstPaise: 54, totalPaise: 354, total: 3.54 };
// What the server answers: totalPaise = count × 354 (yulo_backend/server/utils/couponPricing.js).
const previewFor = (
  count,
  filters = { expiringFrom: "2026-11-13", expiringTo: "2026-11-16" },
) => ({
  filters,
  recipientCount: count,
  perSms: PER_SMS,
  cost: {
    pricePaise: count * 300,
    gstPaise: count * 54,
    totalPaise: count * 354,
    total: (count * 354) / 100,
  },
});
const campaign = (over = {}) => ({
  _id: "cmp1",
  status: "queued",
  filters: {
    category: "c1",
    expiringFrom: "2026-11-13",
    expiringTo: "2026-11-16",
  },
  recipientCount: 12,
  cost: {
    unitPricePaise: 300,
    gstPercent: 18,
    pricePaise: 3600,
    gstPaise: 648,
    totalPaise: 4248,
    total: 42.48,
  },
  counts: { sent: 0, failed: 0 },
  createdBy: "admin",
  sellerId: null,
  createdAt: "2026-11-13T05:00:00.000Z",
  startedAt: null,
  finishedAt: null,
  ...over,
});

describe("Reminder campaigns", () => {
  beforeEach(() => {
    couponsApi.listCampaigns.mockResolvedValue({
      campaigns: [campaign()],
      total: 1,
      page: 1,
      limit: 20,
    });
  });
  const render = () =>
    renderCoupons(<ReminderCampaigns />, { path: "/rc", route: "/rc" });

  it("preview → confirm → queued, with exactly the previewed filters", async () => {
    couponsApi.previewCampaign.mockResolvedValue(previewFor(12));
    couponsApi.createCampaign.mockResolvedValue(campaign());
    const user = userEvent.setup();
    render();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Glow Salon" })).toBeTruthy(),
    );
    await user.selectOptions(screen.getByLabelText("Category"), "c1");
    await user.selectOptions(screen.getByLabelText("Seller"), "s1");
    await user.type(screen.getByLabelText("Expiring from"), "2026-11-13");
    await user.type(screen.getByLabelText("Expiring to"), "2026-11-16");
    expect(screen.getByLabelText("Status").disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    const body = {
      category: "c1",
      seller: "s1",
      expiringFrom: "2026-11-13",
      expiringTo: "2026-11-16",
    };
    expect(couponsApi.previewCampaign).toHaveBeenCalledWith(body);

    const preview = await screen.findByTestId("campaign-preview");
    expect(preview.textContent).toContain("12 SMS");
    expect(preview.textContent).toContain("One per coupon expiring");
    expect(preview.textContent).toContain("13 Nov – 16 Nov");
    expect(screen.getByTestId("campaign-cost").textContent).toBe(
      "12 × ₹3.54 = ₹42.48",
    );
    expect(couponsApi.createCampaign).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Send to 12" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("12 × ₹3.54 = ₹42.48");
    expect(couponsApi.createCampaign).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole("button", { name: "Queue campaign" }),
    );
    expect(couponsApi.createCampaign).toHaveBeenCalledWith(body);
    expect((await screen.findByRole("status")).textContent).toContain(
      "Campaign queued",
    );
    expect(screen.queryByTestId("campaign-preview")).toBeNull();
    await waitFor(() =>
      expect(couponsApi.listCampaigns).toHaveBeenCalledTimes(2),
    );
  });

  it.each([1, 7, 12, 333, 2468])(
    "cost shown for %i recipients = count × ₹3.54",
    async (count) => {
      couponsApi.previewCampaign.mockResolvedValue(previewFor(count));
      const user = userEvent.setup();
      render();
      await user.click(screen.getByRole("button", { name: /Preview/ }));
      const expected = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format((count * 354) / 100);
      expect((await screen.findByTestId("campaign-cost")).textContent).toBe(
        `${count.toLocaleString("en-IN")} × ₹3.54 = ${expected}`,
      );
    },
  );

  it("cancelling the confirm sends nothing; changing a filter drops the preview", async () => {
    couponsApi.previewCampaign.mockResolvedValue(previewFor(5));
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    expect(couponsApi.previewCampaign).toHaveBeenCalledWith({});
    await user.click(await screen.findByRole("button", { name: "Send to 5" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    expect(couponsApi.createCampaign).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Spa" })).toBeTruthy(),
    );
    await user.selectOptions(screen.getByLabelText("Category"), "c2");
    expect(screen.queryByTestId("campaign-preview")).toBeNull();
  });

  it("nobody matching: nothing to send", async () => {
    couponsApi.previewCampaign.mockResolvedValue(previewFor(0));
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    expect(
      (await screen.findByRole("button", { name: "Nothing to send" })).disabled,
    ).toBe(true);
    expect(screen.getByTestId("campaign-cost").textContent).toBe(
      "0 × ₹3.54 = ₹0.00",
    );
  });

  it("refusals: a backwards window (not sent), a preview error, and recipients gone by send time", async () => {
    couponsApi.previewCampaign
      .mockRejectedValueOnce(apiError(400, "VALIDATION_ERROR", "Invalid id"))
      .mockResolvedValue(previewFor(2));
    couponsApi.createCampaign.mockRejectedValue(apiError(422, "NO_RECIPIENTS"));
    const user = userEvent.setup();
    render();
    await user.type(screen.getByLabelText("Expiring from"), "2026-11-20");
    await user.type(screen.getByLabelText("Expiring to"), "2026-11-10");
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    expect(screen.getByRole("alert").textContent).toBe(
      "The expiry window starts after it ends.",
    );
    expect(couponsApi.previewCampaign).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Expiring to"));
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("Invalid id");
    await user.click(screen.getByRole("button", { name: /Preview/ }));
    await user.click(await screen.findByRole("button", { name: "Send to 2" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Queue campaign",
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No coupons match these filters any more.",
    );
  });

  it("the list: Yulo campaigns and sellers' runs, linked to their detail", async () => {
    couponsApi.listCampaigns.mockImplementation(async ({ type }) =>
      type === "seller"
        ? {
            campaigns: [
              campaign({
                _id: "cmp2",
                sellerId: "s2",
                status: "done",
                counts: { sent: 3, failed: 1 },
                recipientCount: 4,
              }),
            ],
            total: 1,
          }
        : { campaigns: [campaign()], total: 1 },
    );
    const user = userEvent.setup();
    render();
    const row = await screen.findByTestId("campaign-cmp1");
    await waitFor(() => expect(row.textContent).toContain("Salon"));
    expect(row.textContent).toContain("₹42.48");
    expect(row.textContent).toContain("Queued");
    expect(within(row).getByRole("link").getAttribute("href")).toBe(
      "/reminder-campaigns/cmp1",
    );
    expect(couponsApi.listCampaigns).toHaveBeenLastCalledWith({
      type: "admin",
      page: 1,
      limit: 20,
    });
    await user.click(screen.getByRole("tab", { name: "Sellers' daily runs" }));
    const seller = await screen.findByTestId("campaign-cmp2");
    expect(seller.textContent).toContain("Calm Spa");
    expect(seller.textContent).toContain("Done");
    expect(couponsApi.listCampaigns).toHaveBeenLastCalledWith({
      type: "seller",
      page: 1,
      limit: 20,
    });
  });

  it("the list: empty and error", async () => {
    couponsApi.listCampaigns.mockResolvedValueOnce({ campaigns: [], total: 0 });
    const { unmount } = render();
    expect(await screen.findByText("No campaigns yet.")).toBeTruthy();
    unmount();
    couponsApi.listCampaigns.mockRejectedValue(
      apiError(500, "X", "List broke"),
    );
    render();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "List broke",
    );
  });

  it("helpers", () => {
    expect(
      campaignBody({
        category: "",
        seller: "s1",
        expiringFrom: "",
        expiringTo: "2026-11-16",
      }),
    ).toEqual({ seller: "s1", expiringTo: "2026-11-16" });
    expect(describeFilters({}, CATEGORIES, [])).toBe(
      "All categories and sellers",
    );
    expect(rupees(4248)).toBe("₹42.48");
  });
});

describe("Campaign detail", () => {
  const render = () =>
    renderCoupons(<CampaignDetail />, {
      path: "/reminder-campaigns/:id",
      route: "/reminder-campaigns/cmp1",
    });

  it("sent / failed / waiting, cost, and the log with masked phones", async () => {
    couponsApi.getCampaign.mockResolvedValue({
      campaign: campaign({
        status: "done",
        counts: { sent: 2, failed: 1 },
        recipientCount: 3,
        cost: {
          pricePaise: 900,
          gstPaise: 162,
          totalPaise: 1062,
          total: 10.62,
        },
      }),
      logCounts: { queued: 0, sent: 2, failed: 1 },
      log: [
        {
          couponId: "k1",
          phone: "******0001",
          status: "sent",
          error: null,
          sentAt: "2026-11-13T04:31:00.000Z",
        },
        {
          couponId: "k2",
          phone: "******0002",
          status: "sent",
          error: null,
          sentAt: "2026-11-13T04:31:00.000Z",
        },
        {
          couponId: "k3",
          phone: "******0003",
          status: "failed",
          error: "DLT_REJECTED",
          sentAt: null,
        },
      ],
      total: 3,
      page: 1,
      limit: 50,
    });
    render();
    const counts = await screen.findByTestId("log-counts");
    expect(counts.textContent).toBe("Sent2Failed1Waiting0");
    expect(screen.getByText("₹10.62")).toBeTruthy();
    expect(couponsApi.getCampaign).toHaveBeenCalledWith("cmp1", {
      page: 1,
      limit: 50,
    });
    const rows = within(
      screen.getByRole("table", { name: "SMS log" }),
    ).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(rows[3].textContent).toContain("******0003");
    expect(rows[3].textContent).toContain("DLT_REJECTED");
    // Never a full mobile number on this page.
    expect(document.body.textContent).not.toMatch(/[6-9]\d{9}/);
  });

  it("queued: nothing sent yet; 404: says so", async () => {
    couponsApi.getCampaign.mockResolvedValueOnce({
      campaign: campaign(),
      logCounts: { queued: 0, sent: 0, failed: 0 },
      log: [],
      total: 0,
    });
    const { unmount } = render();
    expect(await screen.findByText("Nothing sent yet.")).toBeTruthy();
    expect(screen.getByText("Goes out at the next 10:00 IST run")).toBeTruthy();
    unmount();
    couponsApi.getCampaign.mockRejectedValue(apiError(404, "NOT_FOUND"));
    render();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This campaign doesn't exist.",
    );
  });
});
