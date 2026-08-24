// Platform Admin shell — light sidebar + top bar, matches the FoodHub Super
// Admin design. Used across every screen in this app.

import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Headset,
  LayoutDashboard,
  LogOut,
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
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useOpenTicketCount } from "@/hooks/admin/useTickets";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/stores", label: "Store Management", icon: Store },
  { to: "/finance", label: "Financial Analytics", icon: TrendingUp },
  { to: "/customers", label: "Customer Report", icon: Users },
  { to: "/delivery-partners", label: "Delivery Partners", icon: Truck },
  { to: "/tickets", label: "Support & Tickets", icon: Headset },
];

export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserMenu({ compact = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();
  const name = user?.name ?? "Super Admin";
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
            <AvatarFallback className="bg-[#D9480F] text-xs font-semibold text-white">
              {initials(name) || "SA"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Super Admin
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
    <div className="flex min-h-screen bg-#fafaf8 font-sans text-[#24190f]">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col justify-between border-r border-brand-cream/60 bg-white">
        <div>
          <div className="flex items-center gap-3 px-6 pb-6 pt-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#D9480F] text-white">
              <Store className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold">
                Food<span className="text-brand-orange">Hub</span>
              </p>
              <p className="text-[11px] text-muted-foreground">Super Admin</p>
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
                      ? "bg-[#D9480F] text-white shadow-sm"
                      : "text-[#5a453a] hover:bg-brand-cream/40",
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
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-brand-cream/60 bg-white text-[#5f5f5f]"
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
