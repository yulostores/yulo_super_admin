// Shared helpers for the screen tests: a mutation double shaped like TanStack Query's, and a
// render that supplies the router and the toast context every screen expects.
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { ToastProvider } from "@/components/admin/Toaster";

export function mockMutation() {
  const m = {
    isPending: false,
    isError: false,
    error: null,
    mutate: vi.fn(),
    // Calls the per-call onSuccess like the real thing so screens can close/toast.
    mutateAsync: vi.fn(async (_vars, opts) => {
      opts?.onSuccess?.({});
      opts?.onSettled?.({});
      return {};
    }),
  };
  return m;
}

export function renderScreen(ui, { path = "/", route = "/" } = {}) {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>navigated away</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

// A stand-in for AdminLayout (it pulls in auth and the ticket-count query).
export function FakeLayout({ title, action, children }) {
  return (
    <main>
      <h1>{title}</h1>
      <div>{action}</div>
      {children}
    </main>
  );
}
