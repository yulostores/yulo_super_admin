import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

// Shows a blank screen while the initial token refresh is in-flight,
// then redirects to login if no valid admin session exists.
export default function AdminRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
