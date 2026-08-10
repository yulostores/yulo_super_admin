import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, previewLogin } = useAdminAuth();

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
      await login({ email: form.email, password: form.password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen font-sans">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex w-[44%] flex-col justify-between p-12"
        style={{
          background: "linear-gradient(160deg, #23180E 0%, #1A120A 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #A4161A, #D9480F)" }}
          >
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Food<span className="text-[#F2A65A]">Hub</span>
          </span>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#F2A65A]">
            Super Admin
          </p>
          <h2 className="text-[32px] font-bold leading-snug text-white">
            Run the platform
            <br />
            <span className="text-[#F2A65A]">with full visibility.</span>
          </h2>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/40">
            Approve stores, manage customers and delivery partners, and keep
            support tickets moving — all from one console.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Store Approvals",
              "Customer Oversight",
              "Delivery Partners",
              "Support Desk",
            ].map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">© 2026 Yulo Stores</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#FFF8F5] px-6 py-12">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div
            className="h-7 w-7 rounded-lg"
            style={{ background: "linear-gradient(135deg, #A4161A, #D9480F)" }}
          />
          <span className="text-lg font-bold text-[#23180E]">
            Food<span className="text-[#D9480F]">Hub</span>
          </span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#23180E]">
              Super Admin sign in
            </h1>
            <p className="mt-1.5 text-sm text-[#7a6555]">
              Enter your admin credentials to continue
            </p>
          </div>

          <div className="rounded-2xl border border-[#F5DFCE] bg-white p-7 shadow-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a6555]">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@yulostores.com"
                  required
                  className="w-full rounded-xl border border-[#F5DFCE] bg-[#FFFAF7] px-4 py-3 text-sm text-[#23180E] placeholder-[#c4aa96] outline-none transition focus:border-[#D9480F] focus:ring-1 focus:ring-[#D9480F]/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a6555]">
                  Password
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Your password"
                    required
                    className="w-full rounded-xl border border-[#F5DFCE] bg-[#FFFAF7] px-4 py-3 pr-12 text-sm text-[#23180E] placeholder-[#c4aa96] outline-none transition focus:border-[#D9480F] focus:ring-1 focus:ring-[#D9480F]/30"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c4aa96] hover:text-[#7a6555]"
                  >
                    {showPw ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(90deg, #A4161A 0%, #D9480F 100%)",
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* DEV-ONLY — remove once the backend + a real admin login work */}
            <button
              type="button"
              onClick={() => {
                previewLogin();
                navigate("/", { replace: true });
              }}
              className="mt-3 w-full rounded-xl border border-dashed border-[#F5DFCE] py-2.5 text-xs font-semibold text-[#a08070] hover:border-[#D9480F] hover:text-[#D9480F]"
            >
              Preview UI without login (dev only, no backend needed)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
