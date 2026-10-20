// Success / error toasts for admin mutations. Most actions used to fail silently — the
// request 4xx'd and nothing on screen changed — so every money-related mutation now says
// what happened. Kept tiny on purpose (no toast library in this project): a context, a
// stack in the bottom-right corner, auto-dismiss after a few seconds.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const DISMISS_MS = { success: 4000, error: 7000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );

  const push = useCallback(
    (tone, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), DISMISS_MS[tone] ?? 5000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      // Accepts an Error from the API client (its message is the server's) or a string.
      error: (
        errOrMessage,
        fallback = "Something went wrong. Please try again.",
      ) =>
        push(
          "error",
          typeof errOrMessage === "string"
            ? errOrMessage
            : errOrMessage?.message || fallback,
        ),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${
              t.tone === "error"
                ? "border-brand-maroon/30"
                : "border-brand-green/30"
            }`}
          >
            {t.tone === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-maroon" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
            )}
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-brand-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
