import { Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import Login from "./screens/Login";
import AdminDashboard from "./screens/AdminDashboard";
import FinancialAnalytics from "./screens/finance/FinancialAnalytics";
import FinanceSettings from "./screens/finance/FinanceSettings";
import Refunds from "./screens/finance/Refunds";
import BillsList from "./screens/bills/BillsList";
import BillDetail from "./screens/bills/BillDetail";
import StoresList from "./screens/stores/StoresList";
import StoreCreate from "./screens/stores/StoreCreate";
import StoreDetail from "./screens/stores/StoreDetail";
import CustomersList from "./screens/customers/CustomersList";
import CustomerDetail from "./screens/customers/CustomerDetail";
import PartnersList from "./screens/deliveryPartners/PartnersList";
import PartnerDetail from "./screens/deliveryPartners/PartnerDetail";
import PartnerCreate from "./screens/deliveryPartners/PartnerCreate";
import TicketsList from "./screens/tickets/TicketsList";
import TicketDetail from "./screens/tickets/TicketDetail";
import PayoutsPage from "./screens/payouts/PayoutsPage";
import PayoutDetail from "./screens/payouts/PayoutDetail";
import PaymentIssues from "./screens/payouts/PaymentIssues";
import PaymentIssueDetail from "./screens/payouts/PaymentIssueDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/stores"
        element={
          <AdminRoute>
            <StoresList />
          </AdminRoute>
        }
      />
      <Route
        path="/stores/new"
        element={
          <AdminRoute>
            <StoreCreate />
          </AdminRoute>
        }
      />
      <Route
        path="/stores/:id"
        element={
          <AdminRoute>
            <StoreDetail />
          </AdminRoute>
        }
      />

      <Route
        path="/finance"
        element={
          <AdminRoute>
            <FinancialAnalytics />
          </AdminRoute>
        }
      />
      <Route
        path="/finance/settings"
        element={
          <AdminRoute>
            <FinanceSettings />
          </AdminRoute>
        }
      />
      <Route
        path="/finance/refunds"
        element={
          <AdminRoute>
            <Refunds />
          </AdminRoute>
        }
      />

      <Route
        path="/bills"
        element={
          <AdminRoute>
            <BillsList />
          </AdminRoute>
        }
      />
      <Route
        path="/bills/:id"
        element={
          <AdminRoute>
            <BillDetail />
          </AdminRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <AdminRoute>
            <CustomersList />
          </AdminRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <AdminRoute>
            <CustomerDetail />
          </AdminRoute>
        }
      />

      {/* Restaurant payouts (B12 / Figma S–D–M–I). /payouts/issues before /payouts/:id. */}
      <Route
        path="/payouts"
        element={
          <AdminRoute>
            <PayoutsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/payouts/issues"
        element={
          <AdminRoute>
            <PaymentIssues />
          </AdminRoute>
        }
      />
      <Route
        path="/payouts/issues/:id"
        element={
          <AdminRoute>
            <PaymentIssueDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/payouts/:id"
        element={
          <AdminRoute>
            <PayoutDetail />
          </AdminRoute>
        }
      />

      <Route
        path="/delivery-partners"
        element={
          <AdminRoute>
            <PartnersList />
          </AdminRoute>
        }
      />
      <Route
        path="/delivery-partners/new"
        element={
          <AdminRoute>
            <PartnerCreate />
          </AdminRoute>
        }
      />
      <Route
        path="/delivery-partners/:id"
        element={
          <AdminRoute>
            <PartnerDetail />
          </AdminRoute>
        }
      />

      <Route
        path="/tickets"
        element={
          <AdminRoute>
            <TicketsList />
          </AdminRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <AdminRoute>
            <TicketDetail />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
