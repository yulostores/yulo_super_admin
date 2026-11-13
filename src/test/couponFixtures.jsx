import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ToastProvider } from "@/components/admin/Toaster";

function Landed() {
  return <p data-testid="landed">{useLocation().pathname}</p>;
}

/** A coupon screen with a fresh query cache, router and toasts (the API module is mocked by the test). */
export function renderCoupons(ui, { path = "/", route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<Landed />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const apiError = (status, code, message = code, details) =>
  Object.assign(new Error(message), { status, code, details });

// ── Fixtures shaped as the backend answers (yulo_backend/server/test/coupon-api-responses.test.js) ──

export const sellerRow = (over = {}) => ({
  _id: "s1",
  businessName: "Glow Salon",
  category: { _id: "cat-salon", key: "salon", name: "Salon" },
  status: "pending",
  city: "Bengaluru",
  ownerName: "Asha Rao",
  ownerPhone: "9822222221",
  submittedAt: "2026-11-10T06:00:00.000Z",
  reviewedAt: null,
  createdAt: "2026-11-09T06:00:00.000Z",
  complete: true,
  ...over,
});

export const LIST = (over = {}) => ({
  sellers: [
    sellerRow(),
    sellerRow({
      _id: "s2",
      businessName: "Half Done Spa",
      complete: false,
      submittedAt: null,
    }),
  ],
  total: 2,
  page: 1,
  pages: 1,
  statusCounts: { pending: 2, active: 7, suspended: 1, rejected: 3 },
  ...over,
});

export const sellerDetail = (over = {}) => ({
  _id: "s1",
  status: "pending",
  submittedAt: "2026-11-10T06:00:00.000Z",
  reviewedAt: null,
  reviewedBy: null,
  rejectionReason: null,
  business: {
    businessName: "Glow Salon",
    category: { _id: "cat-salon", key: "salon", name: "Salon", enabled: true },
    gstNumber: "29ABCDE1234F1Z5",
    address: {
      line1: "12 MG Road",
      line2: null,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    },
    location: { lng: 77.59, lat: 12.97 },
    businessPhone: "9811111111",
    establishedOn: "2020-01-01T00:00:00.000Z",
  },
  owner: {
    name: "Asha Rao",
    dateOfBirth: "1990-05-05T00:00:00.000Z",
    phone: "9822222221",
    panMasked: "******234F",
    aadhaarMasked: "XXXX XXXX 2346",
    panRevealable: true,
  },
  users: [
    {
      _id: "u1",
      name: "Asha Rao",
      phone: "9822222221",
      role: "owner",
      isActive: true,
      removedAt: null,
      lastLoginAt: "2026-11-12T06:00:00.000Z",
    },
    {
      _id: "u2",
      name: "Meera Nair",
      phone: "9833333331",
      role: "manager",
      isActive: false,
      removedAt: null,
      lastLoginAt: null,
    },
  ],
  documents: [
    {
      _id: "d1",
      type: "pan_card",
      name: "pan.png",
      mimeType: "image/png",
      status: "pending",
      uploadedAt: "2026-11-09T06:00:00.000Z",
    },
  ],
  agreement: null,
  smsCreditsBalance: 40,
  missing: [],
  createdAt: "2026-11-09T06:00:00.000Z",
  ...over,
});

export const PLANS = [
  {
    _id: "p1",
    key: "basic",
    name: "Basic",
    gstPercent: 18,
    couponAllocation: 250,
    basePaise: 500000,
    gstPaise: 90000,
    totalPaise: 590000,
    price: { base: 5000, gst: 900, total: 5900 },
    isActive: true,
    sortOrder: 1,
    complimentaryCount: 5,
  },
  {
    _id: "p2",
    key: "plus",
    name: "Plus",
    gstPercent: 18,
    couponAllocation: 900,
    basePaise: 1500000,
    gstPaise: 270000,
    totalPaise: 1770000,
    price: { base: 15000, gst: 2700, total: 17700 },
    isActive: true,
    sortOrder: 2,
    complimentaryCount: 5,
  },
  {
    _id: "p3",
    key: "premium",
    name: "Premium",
    gstPercent: 18,
    couponAllocation: 4000,
    basePaise: 5000000,
    gstPaise: 900000,
    totalPaise: 5900000,
    price: { base: 50000, gst: 9000, total: 59000 },
    isActive: false,
    sortOrder: 3,
    complimentaryCount: 5,
  },
];

export const SETTINGS = {
  active: { version: 2, smsPricePaise: 300, smsGstPercent: 18 },
  versions: [],
  units: {},
};

export const subscription = (over = {}) => ({
  _id: "sub1",
  plan: {
    planId: "p1",
    key: "basic",
    name: "Basic",
    basePricePaise: 500000,
    gstPercent: 18,
    gstPaise: 90000,
    totalPaise: 590000,
    couponAllocation: 250,
    complimentaryCount: 5,
  },
  status: "active",
  amount: {
    basePaise: 500000,
    gstPaise: 90000,
    totalPaise: 590000,
    total: 5900,
  },
  paidPaise: 590000,
  method: "manual",
  reference: "UTR123456",
  allocated: 250,
  issued: 60,
  remaining: 190,
  activatedAt: "2026-11-11T06:00:00.000Z",
  exhaustedAt: null,
  createdAt: "2026-11-11T06:00:00.000Z",
  payment: {
    method: "manual",
    manual: { mode: "neft", reference: "UTR123456", overrideReason: null },
  },
  complimentary: { total: 5, issued: 4, redeemed: 1, expired: 0, void: 0 },
  ...over,
});

export const offer = (over = {}) => ({
  _id: "o1",
  title: "20% off any haircut",
  terms: "Weekdays only",
  validityDays: 30,
  status: "pending_review",
  rejectionReason: null,
  categoryId: "cat-salon",
  category: { _id: "cat-salon", key: "salon", name: "Salon" },
  seller: { _id: "s1", businessName: "Glow Salon", status: "active" },
  reviewedAt: null,
  createdAt: "2026-11-10T06:00:00.000Z",
  updatedAt: "2026-11-11T06:00:00.000Z",
  ...over,
});
