import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { BRAND_NAME, BRAND_SUFFIX, PORTAL_NAME } from "@/lib/brand";

const HIGHLIGHTS = [
  "Store Approvals",
  "Customer Oversight",
  "Delivery Partners",
  "Support Desk",
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAdminAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen font-sans">
      {/* ── Left brand panel ── */}
      <div className="hidden w-[44%] flex-col justify-between bg-sidebar-gradient p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            {BRAND_NAME}
            <span className="text-brand-saffron">{BRAND_SUFFIX}</span>
          </span>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-saffron">
            {PORTAL_NAME}
          </p>
          <h2 className="text-[32px] font-bold leading-snug text-white">
            Run the platform
            <br />
            <span className="text-brand-saffron">with full visibility.</span>
          </h2>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/40">
            Approve stores, manage customers and delivery partners, and keep
            support tickets moving — all from one console.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {HIGHLIGHTS.map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} {BRAND_NAME} {BRAND_SUFFIX}
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-brand-page px-6 py-12">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="text-lg font-bold text-brand-dark">
            {BRAND_NAME}
            <span className="text-brand-orange">{BRAND_SUFFIX}</span>
          </span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-brand-dark">
              {PORTAL_NAME} sign in
            </h1>
            <p className="mt-1.5 text-sm text-brand-muted">
              Enter your admin credentials to continue
            </p>
          </div>

          <div className="rounded-2xl border border-brand-cream bg-white p-7 shadow-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-brand-cream bg-brand-page px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-muted/60 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-muted"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-brand-cream bg-brand-page px-4 py-3 pr-12 text-sm text-brand-dark outline-none transition placeholder:text-brand-muted/60 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted/70 hover:text-brand-muted"
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-brand-maroon/20 bg-brand-maroon/5 px-4 py-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-maroon" />
                  <p className="text-sm text-brand-maroon">{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
