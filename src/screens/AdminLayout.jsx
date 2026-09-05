// Platform Admin shell — light sidebar + top bar. Used by every screen in this app.

import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Headset,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Store,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { BRAND_NAME, BRAND_SUFFIX, PORTAL_NAME } from "@/lib/brand";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useOpenTicketCount } from "@/hooks/admin/useTickets";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/stores", label: "Store Management", icon: Store },
  { to: "/finance", label: "Financial Analytics", icon: TrendingUp },
  // The receipts behind the revenue figures on the finance screens.
  { to: "/bills", label: "Bills", icon: ReceiptText },
  { to: "/customers", label: "Customer Report", icon: Users },
  { to: "/delivery-partners", label: "Delivery Partners", icon: Truck },
  { to: "/tickets", label: "Support & Tickets", icon: Headset },
];

function UserMenu({ compact = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();
  const name = user?.name ?? PORTAL_NAME;
  const email = user?.email ?? "";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border border-brand-cream/70 bg-white px-2.5 py-2 text-left transition hover:bg-brand-cream/20",
            compact &&
              "border-0 bg-transparent px-1.5 py-1 hover:bg-brand-cream/30",
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-brand-orange text-xs font-semibold text-white">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {PORTAL_NAME}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-brand-maroon"
        >
          <LogOut className="h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Re-exported for the screens that import formatters alongside the layout.
export { formatPrice, formatNumber, formatDate } from "@/lib/format";

export default function AdminLayout({
  children,
  title,
  breadcrumb,
  subtitle,
  action,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (item) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);
  const openTickets = useOpenTicketCount();

  return (
    <div className="flex min-h-screen bg-brand-surface font-sans text-brand-ink">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col justify-between border-r border-brand-cream/60 bg-white">
        <div>
          <div className="flex items-center gap-3 px-6 pb-6 pt-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-orange text-white">
              <Store className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold">
                {BRAND_NAME}
                <span className="text-brand-orange">{BRAND_SUFFIX}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{PORTAL_NAME}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-orange text-white shadow-sm"
                      : "text-brand-ink2 hover:bg-brand-cream/40",
                  )}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.9}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-brand-cream/60 p-3">
          <UserMenu />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6 pb-12 lg:px-7">
        <header className="flex items-center justify-between">
          <div>
            {breadcrumb ? (
              <p className="text-xs text-muted-foreground">{breadcrumb}</p>
            ) : null}
            {title ? <h1 className="text-2xl font-bold">{title}</h1> : null}
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3.5">
            {action}
            <button
              type="button"
              onClick={() => navigate("/tickets")}
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-brand-cream/60 bg-white text-status-muted"
              aria-label="Open support tickets"
            >
              <Bell className="h-[18px] w-[18px]" />
              {openTickets > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
                  {openTickets > 99 ? "99+" : openTickets}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
