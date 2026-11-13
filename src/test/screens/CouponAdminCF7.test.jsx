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
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    listCoupons: vi.fn(),
    exportCoupons: vi.fn(),
    listSellers: vi.fn(),
    issueCoupon: vi.fn(),
    listComplimentary: vi.fn(),
    assignComplimentary: vi.fn(),
    markComplimentaryUsed: vi.fn(),
    getCouponSettings: vi.fn(),
    saveCouponSettings: vi.fn(),
  },
}));

// Radix's Switch measures itself with ResizeObserver, which jsdom doesn't have.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { couponsApi } from "@/api/coupons.api";
import CouponCategories, {
  validateCategory,
} from "@/screens/coupons/CouponCategories";
import CouponsList, {
  couponQuery,
  EMPTY_FILTERS,
} from "@/screens/coupons/CouponsList";
import Complimentary from "@/screens/coupons/Complimentary";
import CouponSettings, {
  settingsChanges,
  toForm,
  validateSettings,
} from "@/screens/coupons/CouponSettings";
import { LIST, apiError, renderCoupons, sellerRow } from "../couponFixtures";

const CATEGORIES = [
  {
    _id: "c1",
    key: "salon",
    name: "Salon",
    icon: null,
    enabled: false,
    sortOrder: 1,
    activeSellers: 3,
    sellersWithLiveOffer: 2,
    stockRemaining: 480,
  },
  {
    _id: "c2",
    key: "spa",
    name: "Spa",
    icon: null,
    enabled: true,
    sortOrder: 2,
    activeSellers: 1,
    sellersWithLiveOffer: 0,
    stockRemaining: 0,
  },
];
const ACTIVE_SETTINGS = {
  _id: "v2",
  version: 2,
  perOrderCap: 3,
  minOrderValuePaise: 0,
  defaultValidityDays: 30,
  radiusKm: 10,
  reminderLeadDays: 3,
  smsPricePaise: 300,
  smsGstPercent: 18,
  smsCreditPackSizes: [100, 500, 1000],
  agreementVersion: 1,
  agreementText: "Partner terms v1",
  phoneCheckRequired: false,
  createdAt: "2026-11-10T06:00:00.000Z",
  note: "Agreement published",
};

afterEach(() => vi.clearAllMocks());

// ── Categories ────────────────────────────────────────────────────────────────

describe("Categories", () => {
  beforeEach(() => couponsApi.listCategories.mockResolvedValue(CATEGORIES));
  const render = () =>
    renderCoupons(<CouponCategories />, { path: "/c", route: "/c" });
  const switchOf = (name) => screen.getByRole("switch", { name: `${name} on` });

  it("each category with its sellers, live offers and stock; an on category with nothing to give is flagged", async () => {
    render();
    const salon = await screen.findByTestId("cat-salon");
    expect(salon.textContent).toContain("3");
    expect(salon.textContent).toContain("480");
    expect(
      within(screen.getByTestId("cat-spa")).getByText("Nothing to give"),
    ).toBeTruthy();
    expect(switchOf("Salon").getAttribute("aria-checked")).toBe("false");
    expect(switchOf("Spa").getAttribute("aria-checked")).toBe("true");
  });

  it("switching on: asks first, the switch moves at once (before the server answers)", async () => {
    let finish;
    couponsApi.updateCategory.mockReturnValue(new Promise((r) => (finish = r)));
    const user = userEvent.setup();
    render();
    await screen.findByTestId("cat-salon");
    await user.click(switchOf("Salon"));
    expect(couponsApi.updateCategory).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Switch on",
      }),
    );
    expect(couponsApi.updateCategory).toHaveBeenCalledWith("c1", {
      enabled: true,
    });
    await waitFor(() =>
      expect(switchOf("Salon").getAttribute("aria-checked")).toBe("true"),
    );
    couponsApi.listCategories.mockResolvedValue([
      { ...CATEGORIES[0], enabled: true },
      CATEGORIES[1],
    ]);
    finish({ ...CATEGORIES[0], enabled: true });
    expect((await screen.findByRole("status")).textContent).toContain(
      "Salon is on",
    );
  });

  it("the server refuses: the switch moves back and the reason is shown", async () => {
    couponsApi.updateCategory.mockRejectedValue(
      apiError(500, "X", "Database unavailable"),
    );
    const user = userEvent.setup();
    render();
    await screen.findByTestId("cat-salon");
    await user.click(switchOf("Salon"));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Switch on",
      }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Database unavailable",
    );
    await waitFor(() =>
      expect(switchOf("Salon").getAttribute("aria-checked")).toBe("false"),
    );
  });

  it("switching on a category that can't give anything out warns in the confirm", async () => {
    couponsApi.listCategories.mockResolvedValue([
      { ...CATEGORIES[1], enabled: false },
    ]);
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole("switch", { name: "Spa on" }));
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "no seller in it can give any out yet",
    );
  });

  it("add (key checked, duplicate flagged), rename, reorder", async () => {
    couponsApi.createCategory
      .mockRejectedValueOnce(apiError(409, "DUPLICATE"))
      .mockResolvedValue({ _id: "c3" });
    couponsApi.updateCategory.mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(
      await screen.findByRole("button", { name: "Add category" }),
    );
    await user.type(screen.getByLabelText("Key"), "Bad Key!");
    await user.type(screen.getByLabelText("Name"), "Pharmacy");
    const form = screen.getByLabelText("Key").closest("form");
    await user.click(
      within(form).getByRole("button", { name: "Add category" }),
    );
    expect(
      screen.getByText("2–30 lowercase letters, digits or dashes"),
    ).toBeTruthy();
    await user.clear(screen.getByLabelText("Key"));
    await user.type(screen.getByLabelText("Key"), "salon");
    await user.click(
      within(form).getByRole("button", { name: "Add category" }),
    );
    expect(
      await screen.findByText("A category with this key already exists"),
    ).toBeTruthy();
    await user.clear(screen.getByLabelText("Key"));
    await user.type(screen.getByLabelText("Key"), "pharmacy");
    await user.click(
      within(form).getByRole("button", { name: "Add category" }),
    );
    expect(couponsApi.createCategory).toHaveBeenLastCalledWith({
      key: "pharmacy",
      name: "Pharmacy",
      sortOrder: 3,
    });

    await user.click(
      within(await screen.findByTestId("cat-spa")).getByRole("button", {
        name: "Rename",
      }),
    );
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Spa & Wellness");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(couponsApi.updateCategory).toHaveBeenCalledWith("c2", {
      name: "Spa & Wellness",
    });

    couponsApi.updateCategory.mockClear();
    await user.click(screen.getByRole("button", { name: "Move Spa up" }));
    await waitFor(() =>
      expect(couponsApi.updateCategory).toHaveBeenCalledTimes(2),
    );
    expect(couponsApi.updateCategory.mock.calls).toEqual([
      ["c2", { sortOrder: 1 }],
      ["c1", { sortOrder: 2 }],
    ]);
    expect(screen.getByRole("button", { name: "Move Salon up" }).disabled).toBe(
      true,
    );
  });

  it("validateCategory", () => {
    expect(validateCategory({ key: "ok-key", name: "X" }, true)).toEqual({
      name: "2 to 40 characters",
    });
    expect(validateCategory({ key: "", name: "Good" }, false)).toEqual({});
  });
});

// ── Coupons ───────────────────────────────────────────────────────────────────

const couponRow = (over = {}) => ({
  id: "k1",
  code: "KM4T7QXH2P",
  kind: "customer",
  customerName: "Rahul Verma",
  mobile: "9811100002",
  age: 26,
  gender: "male",
  category: { id: "c1", name: "Salon" },
  seller: { id: "s1", name: "Glow Salon" },
  offerTitle: "20% off",
  source: "order",
  issuedAt: "2026-11-01T06:00:00.000Z",
  expiresAt: "2026-12-01T06:00:00.000Z",
  status: "redeemed",
  redeemedAt: "2026-11-03T06:00:00.000Z",
  redeemedBy: { id: "u2", name: "Ravi Kumar", role: "employee" },
  ...over,
});

describe("Coupons", () => {
  beforeEach(() => {
    couponsApi.listCoupons.mockResolvedValue({
      coupons: [
        couponRow(),
        couponRow({
          id: "k2",
          kind: "complimentary",
          customerName: "Team Member",
          mobile: "9900000001",
          age: null,
          gender: null,
          status: "issued",
          redeemedAt: null,
          redeemedBy: null,
        }),
      ],
      total: 2,
      page: 1,
      limit: 50,
    });
    couponsApi.listCategories.mockResolvedValue(CATEGORIES);
    couponsApi.listSellers.mockResolvedValue(
      LIST({
        sellers: [
          sellerRow({ status: "active" }),
          sellerRow({
            _id: "s9",
            businessName: "Pending Spa",
            status: "pending",
          }),
        ],
      }),
    );
  });
  const render = () =>
    renderCoupons(<CouponsList />, { path: "/coupons", route: "/coupons" });
  const lastQuery = () => couponsApi.listCoupons.mock.calls.at(-1)[0];

  it("rows: customer, mobile, age, gender, category, seller, dates, status (and who redeemed)", async () => {
    render();
    const table = await screen.findByRole("table", { name: "Coupons" });
    const rows = within(table).getAllByRole("row");
    expect(rows[0].textContent).toBe(
      "CustomerMobileAgeGenderCategorySellerIssuedExpiresStatus",
    );
    expect(rows[1].textContent).toContain("Rahul Verma");
    expect(rows[1].textContent).toContain("9811100002");
    expect(rows[1].textContent).toContain("26");
    expect(rows[1].textContent).toContain("Ravi Kumar");
    expect(rows[2].textContent).toContain("Complimentary");
    expect(lastQuery()).toEqual({
      kind: "customer",
      sort: "-issuedAt",
      page: 1,
      limit: 50,
    });
  });

  it("every filter goes to the query", async () => {
    const user = userEvent.setup();
    render();
    await screen.findByRole("table", { name: "Coupons" });
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Glow Salon" })).toBeTruthy(),
    );
    const steps = [
      ["Kind", "complimentary", { kind: "complimentary" }],
      ["Status", "issued", { status: "issued" }],
      ["Category", "c2", { category: "c2" }],
      ["Seller", "s1", { seller: "s1" }],
      ["Gender", "not_given", { gender: "not_given" }],
      ["Age band", "25-34", { ageBand: "25-34" }],
      ["Sort", "expiresAt", { sort: "expiresAt" }],
    ];
    let expected = { sort: "-issuedAt", kind: "customer" };
    for (const [label, value, part] of steps) {
      await user.selectOptions(screen.getByLabelText(label), value);
      expected = { ...expected, ...part };
      await waitFor(() =>
        expect(lastQuery()).toEqual({ ...expected, page: 1, limit: 50 }),
      );
    }
    for (const [label, value, key] of [
      ["Issued from", "2026-10-01", "issuedFrom"],
      ["Issued to", "2026-10-31", "issuedTo"],
      ["Expiring from", "2026-11-01", "expiringFrom"],
      ["Expiring to", "2026-11-30", "expiringTo"],
    ]) {
      await user.type(screen.getByLabelText(label), value);
      expected = { ...expected, [key]: value };
      await waitFor(() =>
        expect(lastQuery()).toEqual({ ...expected, page: 1, limit: 50 }),
      );
    }
    await user.type(screen.getByLabelText("Search coupons"), "9811100002");
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        ...expected,
        search: "9811100002",
        page: 1,
        limit: 50,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        kind: "customer",
        sort: "-issuedAt",
        page: 1,
        limit: 50,
      }),
    );
  });

  it("Export CSV carries the current filters (no paging), and downloads", async () => {
    couponsApi.exportCoupons.mockResolvedValue(new Blob(["a,b"]));
    URL.createObjectURL = vi.fn(() => "blob:csv");
    URL.revokeObjectURL = vi.fn();
    const clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function click() {
        clicks.push(this.href);
      },
    );
    const user = userEvent.setup();
    render();
    await screen.findByRole("table", { name: "Coupons" });
    await user.selectOptions(screen.getByLabelText("Status"), "expired");
    await user.type(screen.getByLabelText("Issued from"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: /Export CSV/ }));
    expect(couponsApi.exportCoupons).toHaveBeenCalledWith({
      kind: "customer",
      sort: "-issuedAt",
      status: "expired",
      issuedFrom: "2026-10-01",
    });
    await waitFor(() => expect(clicks).toEqual(["blob:csv"]));
  });

  it("a rate-limited export says to wait", async () => {
    couponsApi.exportCoupons.mockRejectedValue(
      apiError(429, "RATE_LIMITED", "Too many exports"),
    );
    const user = userEvent.setup();
    render();
    await screen.findByRole("table", { name: "Coupons" });
    await user.click(screen.getByRole("button", { name: /Export CSV/ }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "wait a minute",
    );
  });

  it("couponQuery leaves blanks out", () => {
    expect(couponQuery({ ...EMPTY_FILTERS, kind: "" }, "")).toEqual({
      sort: "-issuedAt",
    });
  });
});

describe("Manual issue", () => {
  beforeEach(() => {
    couponsApi.listCoupons.mockResolvedValue({
      coupons: [],
      total: 0,
      page: 1,
      limit: 50,
    });
    couponsApi.listCategories.mockResolvedValue(CATEGORIES);
    couponsApi.listSellers.mockResolvedValue(
      LIST({
        sellers: [
          sellerRow({ status: "active" }),
          sellerRow({
            _id: "s9",
            businessName: "Pending Spa",
            status: "pending",
          }),
        ],
      }),
    );
  });
  const open = async (user) => {
    renderCoupons(<CouponsList />, { path: "/coupons", route: "/coupons" });
    await screen.findByText("No coupons match these filters.");
    await user.click(screen.getByRole("button", { name: /Issue a coupon/ }));
    const dialog = screen.getByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("option", { name: /Glow Salon/ }),
      ).toBeTruthy(),
    );
    return dialog;
  };

  it("only active sellers; checks the number and the seller", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    expect(
      within(dialog).queryByRole("option", { name: /Pending Spa/ }),
    ).toBeNull();
    await user.click(
      within(dialog).getByRole("button", { name: "Issue coupon" }),
    );
    expect(
      within(dialog).getByText("Enter the customer's 10-digit mobile number"),
    ).toBeTruthy();
    expect(
      within(dialog).getByText("Choose the seller whose coupon to give"),
    ).toBeTruthy();
    expect(couponsApi.issueCoupon).not.toHaveBeenCalled();
  });

  it("issues with a request id that stays the same on a retry; confirms with the code", async () => {
    couponsApi.issueCoupon
      .mockRejectedValueOnce(apiError(503, "X", "Try again"))
      .mockResolvedValue({
        coupon: { code: "ABCDE23456", customerName: "Priya Sharma" },
        duplicate: false,
      });
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.type(
      within(dialog).getByLabelText("Customer mobile"),
      "+91 98111 00001",
    );
    await user.selectOptions(within(dialog).getByLabelText("Seller"), "s1");
    await user.type(
      within(dialog).getByLabelText("Why (kept in the audit log)"),
      "Goodwill",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Issue coupon" }),
    );
    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    await user.click(
      within(dialog).getByRole("button", { name: "Issue coupon" }),
    );
    const [first, second] = couponsApi.issueCoupon.mock.calls.map((c) => c[0]);
    expect(first).toEqual({
      phone: "9811100001",
      sellerId: "s1",
      note: "Goodwill",
      requestId: expect.any(String),
    });
    expect(second.requestId).toBe(first.requestId);
    expect((await screen.findByRole("status")).textContent).toContain(
      "Coupon ABCDE23456 issued to Priya Sharma",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refusals: unknown customer on the field; no stock / no offer as a message", async () => {
    couponsApi.issueCoupon
      .mockRejectedValueOnce(apiError(404, "CUSTOMER_NOT_FOUND"))
      .mockRejectedValueOnce(apiError(409, "NO_STOCK"));
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.type(
      within(dialog).getByLabelText("Customer mobile"),
      "9811199999",
    );
    await user.selectOptions(within(dialog).getByLabelText("Seller"), "s1");
    await user.click(
      within(dialog).getByRole("button", { name: "Issue coupon" }),
    );
    expect(
      await within(dialog).findByText("No customer account uses this number"),
    ).toBeTruthy();
    await user.click(
      within(dialog).getByRole("button", { name: "Issue coupon" }),
    );
    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "no coupons left",
    );
  });
});

// ── Complimentary ─────────────────────────────────────────────────────────────

describe("Complimentary", () => {
  const pools = {
    groups: [
      {
        subscriptionId: "sub1",
        seller: { id: "s1", name: "Glow Salon" },
        plan: { key: "basic", name: "Basic" },
        activatedAt: "2026-11-01T06:00:00.000Z",
        coupons: [
          {
            id: "cc1",
            code: "CMPA234567",
            status: "issued",
            expiresAt: "2026-12-01T06:00:00.000Z",
            redeemedAt: null,
            assignedTo: null,
          },
          {
            id: "cc2",
            code: "CMPB234567",
            status: "issued",
            expiresAt: "2026-12-01T06:00:00.000Z",
            redeemedAt: null,
            assignedTo: {
              name: "Sana Khan",
              phone: "9900000002",
              note: "Launch",
              at: "2026-11-02T00:00:00.000Z",
            },
          },
          {
            id: "cc3",
            code: "CMPC234567",
            status: "redeemed",
            expiresAt: "2026-12-01T06:00:00.000Z",
            redeemedAt: "2026-11-05T00:00:00.000Z",
            assignedTo: null,
          },
        ],
      },
    ],
    total: 3,
  };
  beforeEach(() => {
    couponsApi.listComplimentary.mockResolvedValue(pools);
    couponsApi.listSellers.mockResolvedValue(
      LIST({ sellers: [sellerRow({ status: "active" })] }),
    );
  });
  const render = () =>
    renderCoupons(<Complimentary />, { path: "/x", route: "/x" });

  it("pools per seller and plan; filters go to the query", async () => {
    const user = userEvent.setup();
    render();
    const pool = await screen.findByTestId("pool-sub1");
    expect(pool.textContent).toContain("Glow Salon");
    expect(pool.textContent).toContain("Basic plan");
    expect(couponsApi.listComplimentary).toHaveBeenCalledWith({
      status: "issued",
    });
    expect(
      within(screen.getByTestId("comp-CMPB234567")).getByText("Sana Khan"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("comp-CMPC234567")).queryByRole("button"),
    ).toBeNull();
    await user.selectOptions(screen.getByLabelText("Assigned"), "false");
    await waitFor(() =>
      expect(couponsApi.listComplimentary).toHaveBeenLastCalledWith({
        status: "issued",
        assigned: "false",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Seller"), "s1");
    await waitFor(() =>
      expect(couponsApi.listComplimentary).toHaveBeenLastCalledWith({
        status: "issued",
        assigned: "false",
        seller: "s1",
      }),
    );
  });

  it("assign: checked, then sent; reassign is prefilled", async () => {
    couponsApi.assignComplimentary.mockResolvedValue({});
    const user = userEvent.setup();
    render();
    const row = await screen.findByTestId("comp-CMPA234567");
    await user.click(within(row).getByRole("button", { name: "Assign" }));
    const form = within(row).getByRole("form", { name: "Assign CMPA234567" });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByText("Enter the team member's name")).toBeTruthy();
    await user.type(within(form).getByLabelText("Team member"), "Imran Ali");
    await user.type(within(form).getByLabelText("Mobile"), "99000 00003");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(couponsApi.assignComplimentary).toHaveBeenCalledWith("cc1", {
      name: "Imran Ali",
      phone: "9900000003",
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "assigned to Imran Ali",
    );

    const assigned = screen.getByTestId("comp-CMPB234567");
    await user.click(
      within(assigned).getByRole("button", { name: "Reassign" }),
    );
    expect(within(assigned).getByLabelText("Team member").value).toBe(
      "Sana Khan",
    );
  });

  it("mark used: confirmed first", async () => {
    couponsApi.markComplimentaryUsed.mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(
      within(await screen.findByTestId("comp-CMPB234567")).getByRole("button", {
        name: "Mark used",
      }),
    );
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Used by Sana Khan",
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Mark used",
      }),
    );
    expect(couponsApi.markComplimentaryUsed).toHaveBeenCalledWith("cc2");
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

describe("Coupon settings", () => {
  beforeEach(() => {
    couponsApi.getCouponSettings.mockResolvedValue({
      active: ACTIVE_SETTINGS,
      versions: [
        ACTIVE_SETTINGS,
        {
          ...ACTIVE_SETTINGS,
          version: 1,
          agreementVersion: 0,
          note: "Defaults seeded by the system",
        },
      ],
      units: {},
    });
  });
  const render = () =>
    renderCoupons(<CouponSettings />, { path: "/s", route: "/s" });

  it("shows the version in force in form units, the per-SMS total, and the history", async () => {
    render();
    expect((await screen.findByLabelText("Coupons per order")).value).toBe("3");
    expect(screen.getByLabelText("SMS price excl. GST (₹)").value).toBe("3");
    expect(
      screen.getByText("Sellers pay ₹3.54 per SMS incl. GST"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Credit packs (SMS)").value).toBe(
      "100, 500, 1000",
    );
    expect(screen.getByRole("button", { name: "No changes" }).disabled).toBe(
      true,
    );
    const history = within(
      screen.getByRole("table", { name: "Version history" }),
    ).getAllByRole("row");
    expect(history).toHaveLength(3);
    expect(history[1].textContent).toContain("in force");
    expect(history[2].textContent).toContain("Defaults seeded by the system");
  });

  it("validation: ranges, pack sizes, and a changed agreement text needs a higher version", async () => {
    const user = userEvent.setup();
    render();
    const cap = await screen.findByLabelText("Coupons per order");
    await user.clear(cap);
    await user.type(cap, "25");
    await user.clear(screen.getByLabelText("Credit packs (SMS)"));
    await user.type(screen.getByLabelText("Credit packs (SMS)"), "100, 100");
    await user.type(screen.getByLabelText("Text"), " (updated)");
    await user.click(screen.getByRole("button", { name: /Save 3 changes/ }));
    expect(screen.getByText("1 to 20")).toBeTruthy();
    expect(screen.getByText("Pack sizes must be different")).toBeTruthy();
    expect(
      screen.getByText(/Raise the version when the text changes/),
    ).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("saves only what changed, in the API's units (paise), with the note, after confirming", async () => {
    couponsApi.saveCouponSettings.mockResolvedValue({
      version: { ...ACTIVE_SETTINGS, version: 3 },
      changes: [],
    });
    const user = userEvent.setup();
    render();
    const min = await screen.findByLabelText("Minimum order (₹)");
    await user.clear(min);
    await user.type(min, "199.5");
    await user.clear(screen.getByLabelText("Seller radius (km)"));
    await user.type(screen.getByLabelText("Seller radius (km)"), "7.5");
    await user.click(
      screen.getByRole("switch", { name: "Require the phone check" }),
    );
    await user.type(
      screen.getByLabelText("Note for the history (optional)"),
      "Pilot in Pune",
    );
    await user.click(screen.getByRole("button", { name: "Save 3 changes" }));
    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Minimum order, Radius, Phone check",
    );
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Save settings",
      }),
    );
    expect(couponsApi.saveCouponSettings).toHaveBeenCalledWith({
      minOrderValuePaise: 19950,
      radiusKm: 7.5,
      phoneCheckRequired: true,
      note: "Pilot in Pune",
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "Version 3 is in force",
    );
  });

  it("publishing a new agreement version with its text", async () => {
    couponsApi.saveCouponSettings.mockResolvedValue({
      version: { ...ACTIVE_SETTINGS, version: 3 },
      changes: [],
    });
    const user = userEvent.setup();
    render();
    await user.clear(await screen.findByLabelText("Text"));
    await user.type(screen.getByLabelText("Text"), "Partner terms v2");
    await user.clear(screen.getByLabelText("Version"));
    await user.type(screen.getByLabelText("Version"), "2");
    await user.click(screen.getByRole("button", { name: "Save 2 changes" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Save settings",
      }),
    );
    expect(couponsApi.saveCouponSettings).toHaveBeenCalledWith({
      agreementVersion: 2,
      agreementText: "Partner terms v2",
    });
  });

  it("helpers: toForm / settingsChanges / validateSettings", () => {
    const f = toForm(ACTIVE_SETTINGS);
    expect(settingsChanges(ACTIVE_SETTINGS, f)).toEqual({});
    expect(validateSettings(f, ACTIVE_SETTINGS)).toEqual({});
    expect(
      validateSettings(
        { ...f, smsPrice: "0", radiusKm: "0", reminderLeadDays: "31" },
        ACTIVE_SETTINGS,
      ),
    ).toEqual({
      smsPrice: "₹0.01 to ₹100",
      radiusKm: "More than 0, up to 200 km",
      reminderLeadDays: "1 to 30 days",
    });
  });
});
