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
    listSellerBills: vi.fn(),
    getSellerBill: vi.fn(),
    sellerBillPdf: vi.fn(),
    exportSellerBills: vi.fn(),
  },
}));

import { couponsApi } from "@/api/coupons.api";
import SellerBillsList, {
  billQuery,
  EMPTY_BILL_FILTERS,
} from "@/screens/coupons/SellerBillsList";
import SellerBillDetail from "@/screens/coupons/SellerBillDetail";
import { LIST, apiError, renderCoupons, sellerRow } from "../couponFixtures";

// As GET /api/admin/seller-bills answers (yulo_backend/server/services/sellerBills.service.js).
const row = (over = {}) => ({
  id: "b1",
  kind: "plan",
  billNumber: "YSB-000001",
  seller: { id: "s1", name: "Glow Salon", city: "Pune" },
  description: "Basic plan — 250 coupons",
  basePaise: 500000,
  handlingFeePaise: 17500,
  gstPaise: 93150,
  totalPaise: 610650,
  paidPaise: 610650,
  method: "online",
  mode: null,
  reference: "pay_1",
  paidAt: "2026-11-13T06:00:00.000Z",
  ...over,
});
const LIST_RESPONSE = {
  bills: [
    row({
      id: "b3",
      kind: "sms",
      billNumber: "YSB-000003",
      description: "100 SMS credits @ ₹3",
      basePaise: 30000,
      handlingFeePaise: 0,
      gstPaise: 5400,
      totalPaise: 35400,
      method: "manual",
      mode: "upi",
      reference: "UPI-9",
    }),
    row(),
  ],
  total: 2,
  page: 1,
  limit: 20,
  summary: {
    count: 2,
    basePaise: 530000,
    handlingFeePaise: 17500,
    gstPaise: 98550,
    totalPaise: 646050,
    byKind: {
      plan: { count: 1, totalPaise: 610650 },
      sms: { count: 1, totalPaise: 35400 },
    },
    byMethod: {
      online: { count: 1, totalPaise: 610650 },
      manual: { count: 1, totalPaise: 35400 },
    },
  },
};
const DETAIL = {
  ...row(),
  issuedBy: {
    name: "Yulo Stores Technologies Pvt. Ltd.",
    gstin: null,
    address: null,
  },
  billedTo: {
    name: "Glow Salon",
    ownerName: "Asha Rao",
    category: "Salon",
    gstin: "27ABCDE1234F1Z5",
    phone: "9811111111",
    address: "12 MG Road, Pune",
  },
  lines: [
    { label: "Basic plan — 250 coupons", amountPaise: 500000 },
    { label: "Payment handling fee (3.5%)", amountPaise: 17500 },
    { label: "GST (18%)", amountPaise: 93150 },
  ],
  payment: {
    method: "online",
    methodLabel: "Online (Razorpay)",
    mode: null,
    modeLabel: null,
    reference: "pay_1",
    receivedOn: null,
    paidAt: "2026-11-13T06:00:00.000Z",
    amountPaise: 610650,
  },
};

afterEach(() => vi.clearAllMocks());
beforeEach(() => {
  couponsApi.listSellers.mockResolvedValue(
    LIST({ sellers: [sellerRow({ status: "active" })] }),
  );
});

describe("Seller bills list", () => {
  const render = () =>
    renderCoupons(<SellerBillsList />, {
      path: "/seller-bills",
      route: "/seller-bills",
    });
  const lastQuery = () => couponsApi.listSellerBills.mock.calls.at(-1)[0];

  it("the report over the filtered bills, and the rows newest first", async () => {
    couponsApi.listSellerBills.mockResolvedValue(LIST_RESPONSE);
    render();
    const report = await screen.findByTestId("bills-report");
    for (const t of [
      "Bills2",
      "Collected₹6,460.50",
      "GST₹985.50",
      "Payment handling fees₹175.00",
      "Coupon plans₹6,106.50",
      "SMS credits₹354.00",
      "Paid online₹6,106.50",
      "Amount Received₹354.00",
    ])
      expect(report.textContent).toContain(t);
    const rows = within(
      screen.getByRole("table", { name: "Seller bills" }),
    ).getAllByRole("row");
    expect(rows[1].textContent).toContain("YSB-000003");
    expect(rows[1].textContent).toContain("SMS credits");
    expect(rows[1].textContent).toContain("Amount Received");
    expect(rows[2].textContent).toContain("₹6,106.50");
    expect(lastQuery()).toEqual({ page: 1, limit: 20 });
  });

  it("every filter and the search go to the query; a backwards range is refused", async () => {
    couponsApi.listSellerBills.mockResolvedValue(LIST_RESPONSE);
    const user = userEvent.setup();
    render();
    await screen.findByTestId("bills-report");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Glow Salon" })).toBeTruthy(),
    );
    await user.selectOptions(screen.getByLabelText("Seller"), "s1");
    await user.selectOptions(screen.getByLabelText("For"), "plan");
    await user.selectOptions(screen.getByLabelText("Paid by"), "online");
    await user.type(screen.getByLabelText("From"), "2026-11-01");
    await user.type(screen.getByLabelText("To"), "2026-11-30");
    await user.type(screen.getByLabelText("Search bills"), "YSB-000001");
    await waitFor(() =>
      expect(lastQuery()).toEqual({
        seller: "s1",
        kind: "plan",
        method: "online",
        from: "2026-11-01",
        to: "2026-11-30",
        q: "YSB-000001",
        page: 1,
        limit: 20,
      }),
    );
    await user.clear(screen.getByLabelText("From"));
    await user.type(screen.getByLabelText("From"), "2026-12-15");
    expect(screen.getByRole("alert").textContent).toBe(
      "The start date is after the end date.",
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 1, limit: 20 }));
  });

  it("Export CSV downloads exactly the filtered bills", async () => {
    couponsApi.listSellerBills.mockResolvedValue(LIST_RESPONSE);
    couponsApi.exportSellerBills.mockResolvedValue(new Blob(["a,b"]));
    URL.createObjectURL = vi.fn(() => "blob:csv");
    URL.revokeObjectURL = vi.fn();
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    render();
    await screen.findByTestId("bills-report");
    await user.selectOptions(screen.getByLabelText("Paid by"), "manual");
    await user.click(screen.getByRole("button", { name: /Export CSV/ }));
    expect(couponsApi.exportSellerBills).toHaveBeenCalledWith({
      method: "manual",
    });
    await waitFor(() => expect(clicked).toHaveBeenCalled());
  });

  it("a row opens its bill", async () => {
    couponsApi.listSellerBills.mockResolvedValue(LIST_RESPONSE);
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByTestId("bill-YSB-000001"));
    expect(screen.getByTestId("landed").textContent).toBe("/seller-bills/b1");
  });

  it("empty and error", async () => {
    couponsApi.listSellerBills.mockResolvedValueOnce({
      ...LIST_RESPONSE,
      bills: [],
      total: 0,
      summary: { ...LIST_RESPONSE.summary, count: 0 },
    });
    const { unmount } = render();
    expect(
      await screen.findByText("No bills match these filters."),
    ).toBeTruthy();
    unmount();
    couponsApi.listSellerBills.mockRejectedValue(
      apiError(500, "X", "Bills broke"),
    );
    render();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Bills broke",
    );
  });

  it("billQuery leaves blanks out", () => {
    expect(billQuery(EMPTY_BILL_FILTERS, "")).toEqual({});
    expect(billQuery({ ...EMPTY_BILL_FILTERS, kind: "sms" }, "x")).toEqual({
      kind: "sms",
      q: "x",
    });
  });
});

describe("Seller bill detail", () => {
  const render = () =>
    renderCoupons(<SellerBillDetail />, {
      path: "/seller-bills/:id",
      route: "/seller-bills/b1",
    });

  it("issued by, billed to, the lines (handling fee for online), total and payment", async () => {
    couponsApi.getSellerBill.mockResolvedValue(DETAIL);
    render();
    const bill = await screen.findByTestId("seller-bill");
    expect(couponsApi.getSellerBill).toHaveBeenCalledWith("b1");
    expect(bill.textContent).toContain("Yulo Stores Technologies Pvt. Ltd.");
    expect(bill.textContent).toContain("YSB-000001");
    expect(bill.textContent).toContain("Asha Rao");
    expect(bill.textContent).toContain("GSTIN 27ABCDE1234F1Z5");
    const lines = within(
      screen.getByRole("table", { name: "Bill lines" }),
    ).getAllByRole("row");
    expect(lines.map((r) => r.textContent)).toEqual([
      "Basic plan — 250 coupons₹5,000.00",
      "Payment handling fee (3.5%)₹175.00",
      "GST (18%)₹931.50",
      "Total₹6,106.50",
    ]);
    expect(bill.textContent).toContain("Online (Razorpay)");
    expect(bill.textContent).toContain("pay_1");
  });

  it("Download PDF saves the server's PDF under the bill number", async () => {
    couponsApi.getSellerBill.mockResolvedValue(DETAIL);
    couponsApi.sellerBillPdf.mockResolvedValue(
      new Blob(["%PDF"], { type: "application/pdf" }),
    );
    URL.createObjectURL = vi.fn(() => "blob:pdf");
    URL.revokeObjectURL = vi.fn();
    const names = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function click() {
        names.push(this.download);
      },
    );
    const user = userEvent.setup();
    render();
    await user.click(
      await screen.findByRole("button", { name: /Download PDF/ }),
    );
    expect(couponsApi.sellerBillPdf).toHaveBeenCalledWith("b1");
    await waitFor(() => expect(names).toEqual(["YSB-000001.pdf"]));
  });

  it("a download failure is shown; a missing bill says so", async () => {
    couponsApi.getSellerBill.mockResolvedValueOnce(DETAIL);
    couponsApi.sellerBillPdf.mockRejectedValue(apiError(500, "X", "PDF broke"));
    const user = userEvent.setup();
    const { unmount } = render();
    await user.click(
      await screen.findByRole("button", { name: /Download PDF/ }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "PDF broke",
    );
    unmount();
    couponsApi.getSellerBill.mockRejectedValue(apiError(404, "NOT_FOUND"));
    render();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This bill doesn't exist.",
    );
  });
});
