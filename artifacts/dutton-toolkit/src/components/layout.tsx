import { Link, useLocation } from "wouter";
import {
  Hammer,
  Users,
  FileText,
  DollarSign,
  Home,
  Menu,
  X,
  Map as MapIcon,
  Car,
  Receipt,
  ClipboardList,
  Search,
  ListChecks,
  Inbox,
  RefreshCw,
  LogOut,
  MessageSquare,
  CalendarDays,
  Shield,
  Navigation,
  Calculator,
  Bug,
  UserCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { useRole } from "@/lib/role";
import { useAuth } from "@/lib/auth";

const PRO_NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/jobs", label: "Jobs", icon: Hammer },
  { href: "/nearby-jobs", label: "Nearby Requests", icon: Inbox },
  { href: "/lead-inbox", label: "Service Requests", icon: ClipboardList },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/customer-crm", label: "Customer CRM", icon: ListChecks },
  { href: "/estimates", label: "Estimates", icon: Calculator },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/mileage", label: "Mileage", icon: Car },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/route-planner", label: "Route Planner", icon: Navigation },
  { href: "/report-bug", label: "Report Bug", icon: Bug },
];

const CUSTOMER_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/post-request", label: "Request Service", icon: ClipboardList },
  { href: "/find-pros", label: "Find Pros", icon: Search },
  { href: "/my-jobs", label: "My Work", icon: ListChecks },
  { href: "/my-requests", label: "My Requests", icon: Inbox },
  { href: "/my-quotes", label: "Quotes", icon: DollarSign },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/report-bug", label: "Report Bug", icon: Bug },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role, clearRole } = useRole();
  const { user, logout, isConfigured, isAdmin } = useAuth();

  const navItems = role === "customer" ? CUSTOMER_NAV : PRO_NAV;
  const subtitle = role === "customer" ? "Customer Portal" : "Pro Portal";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleSwitch = () => {
    if (
      confirm(
        "Switch account type? You'll be returned to the account picker. Your data stays saved on this device.",
      )
    ) {
      clearRole();
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-primary text-white sticky top-0 z-50 print:hidden shadow-md">
        <div className="font-bold text-lg tracking-tight">Dutton Connect</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-white z-40 flex flex-col print:hidden overflow-y-auto">
          <nav className="flex flex-col p-4 gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg font-medium transition-colors ${
                    location === item.href || (item.href !== "/" && location.startsWith(item.href))
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </div>
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin">
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg font-medium transition-colors ${
                    location.startsWith("/admin")
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Shield size={20} />
                  Admin
                </div>
              </Link>
            )}
            <button
              onClick={handleSwitch}
              className="flex items-center gap-3 p-4 rounded-lg font-medium text-gray-700 hover:bg-gray-100 text-left"
            >
              <RefreshCw size={20} />
              Switch account type
            </button>
          </nav>
          <div className="mt-auto p-6 border-t bg-gray-50 space-y-3">
            {isConfigured && user && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </Button>
              </div>
            )}
            <div className="flex gap-3 text-xs text-gray-500">
              <Link href="/privacy">
                <span className="hover:underline cursor-pointer">Privacy</span>
              </Link>
              <Link href="/terms">
                <span className="hover:underline cursor-pointer">Terms</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border sticky top-0 h-screen print:hidden">
        <div className="p-6 bg-primary text-white">
          <h1 className="font-bold text-xl tracking-tight leading-tight">Dutton Connect</h1>
          <div className="text-primary-foreground/80 text-xs mt-1 font-medium tracking-wider uppercase">
            {subtitle}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </div>
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors cursor-pointer ${
                  location.startsWith("/admin")
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Shield size={18} />
                Admin
              </div>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/50 space-y-2">
          {isConfigured && user && (
            <div className="space-y-1.5 pb-2 border-b border-sidebar-border">
              <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
            onClick={handleSwitch}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Switch account
          </Button>
          <div className="flex gap-3 pt-1">
            <Link href="/privacy">
              <span className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground cursor-pointer">
                Privacy
              </span>
            </Link>
            <Link href="/terms">
              <span className="text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground cursor-pointer">
                Terms
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-[100vw] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          <div className="mx-auto max-w-5xl print:max-w-none">
            {children}
          </div>
        </div>
        <footer className="print:hidden text-center py-3 border-t text-xs text-gray-400 flex items-center justify-center gap-3">
          <Link href="/privacy">
            <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
          </Link>
          <span>·</span>
          <Link href="/terms">
            <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
          </Link>
        </footer>
      </main>
    </div>
  );
}
