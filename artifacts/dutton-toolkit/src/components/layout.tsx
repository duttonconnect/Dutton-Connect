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
  LogOut,
  MessageSquare,
  CalendarDays,
  Shield,
  Navigation,
  Calculator,
  Bug,
  UserCircle,
  Bell,
  Wallet,
  Gift,
  RefreshCw,
  Plus,
  Camera,
  ShieldCheck,
  Users2,
  History,
  CalendarCheck,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useRole } from "@/lib/role";
import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { subscribeToOpenReportCount } from "@/lib/reports";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/referrals", label: "Invite Friends", icon: Gift },
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
  { href: "/home-profile", label: "Home Profile", icon: Home },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/photo-wall", label: "Before & After", icon: Camera },
  { href: "/warranties", label: "Warranties", icon: ShieldCheck },
  { href: "/bundle-requests", label: "Neighbor Bundles", icon: Users2 },
  { href: "/service-history", label: "Service History", icon: History },
  { href: "/availability", label: "Book a Slot", icon: CalendarCheck },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/referrals", label: "Invite Friends", icon: Gift },
  { href: "/report-bug", label: "Report Bug", icon: Bug },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role, roles, currentMode, setCurrentMode, addRole, clearRole } = useRole();
  const { user, logout, isConfigured, isAdmin, saveRolesToCloud, addRoleToCloud } = useAuth();
  const { routePlannerDirty, setRoutePlannerDirty, routePlannerHasContent } = useAppStore();
  const routePlannerShouldWarn = routePlannerDirty && routePlannerHasContent;

  const [openReportCount, setOpenReportCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToOpenReportCount(setOpenReportCount);
    return unsubscribe;
  }, [isAdmin]);

  const [pendingNavCallback, setPendingNavCallback] = useState<(() => void) | null>(null);

  const origPushStateRef = useRef<typeof history.pushState>(history.pushState.bind(history));
  const bypassGuardRef = useRef(false);
  const routePlannerShouldWarnRef = useRef(routePlannerShouldWarn);
  routePlannerShouldWarnRef.current = routePlannerShouldWarn;

  useEffect(() => {
    if (!routePlannerShouldWarn) return;
    const orig = origPushStateRef.current;

    history.pushState = function (state, title, url) {
      if (bypassGuardRef.current) {
        orig.call(history, state, title, url);
        return;
      }
      const targetPath = typeof url === "string" ? url : (url?.toString() ?? "");
      if (!targetPath.includes("/route-planner")) {
        setPendingNavCallback(() => () => {
          bypassGuardRef.current = true;
          history.pushState = orig;
          orig.call(history, state, title, url);
          window.dispatchEvent(new PopStateEvent("popstate", { state }));
          bypassGuardRef.current = false;
        });
      } else {
        orig.call(history, state, title, url);
      }
    };

    return () => {
      history.pushState = orig;
    };
  }, [routePlannerShouldWarn]);

  useEffect(() => {
    if (!routePlannerShouldWarn) return;
    const orig = origPushStateRef.current;
    const savedUrl = window.location.href;
    const savedState = window.history.state;

    function handler() {
      if (bypassGuardRef.current) return;
      if (!routePlannerShouldWarnRef.current) return;
      const destinationUrl = window.location.href;
      const destinationState = window.history.state;
      bypassGuardRef.current = true;
      orig.call(history, savedState, "", savedUrl);
      window.dispatchEvent(new PopStateEvent("popstate", { state: savedState }));
      bypassGuardRef.current = false;
      setPendingNavCallback(() => () => {
        bypassGuardRef.current = true;
        orig.call(history, destinationState, "", destinationUrl);
        window.dispatchEvent(new PopStateEvent("popstate", { state: destinationState }));
        bypassGuardRef.current = false;
      });
    }

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [routePlannerShouldWarn]);

  const navItems = currentMode === "customer" ? CUSTOMER_NAV : PRO_NAV;
  const subtitle = currentMode === "customer" ? "Customer Portal" : "Pro Portal";
  const isProMode = currentMode === "pro";
  const isBoth = roles.length >= 2;

  // Header bg: navy for pro, blue for customer
  const headerBg = isProMode ? "bg-[#0F172A]" : "bg-primary";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const switchMode = (to: "customer" | "pro") => {
    if (to === currentMode) return;
    setCurrentMode(to);
    if (user) saveRolesToCloud(roles, to);
    toast.success(`Switched to ${to === "customer" ? "Customer" : "Pro"} Mode`);
  };

  const handleAddRole = async (newRole: "customer" | "pro") => {
    addRole(newRole);
    if (user) await addRoleToCloud(newRole);
    const newRoles = [...roles, newRole];
    if (user) saveRolesToCloud(newRoles, currentMode ?? newRole);
    toast.success(
      newRole === "pro"
        ? "Pro access added. You can now switch between modes anytime."
        : "Customer mode added. Switch anytime from the menu.",
    );
  };

  const ModeSwitcher = ({ compact }: { compact?: boolean }) => {
    if (isBoth) {
      return (
        <div className={`flex rounded-lg border overflow-hidden ${compact ? "text-xs" : "text-sm"}`}>
          <button
            onClick={() => switchMode("customer")}
            className={`flex-1 py-2 font-medium transition-colors ${
              currentMode === "customer"
                ? "bg-primary text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => switchMode("pro")}
            className={`flex-1 py-2 font-medium transition-colors ${
              currentMode === "pro"
                ? "bg-[#0F172A] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Pro
          </button>
        </div>
      );
    }

    if (currentMode === "customer") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => handleAddRole("pro")}
        >
          <Plus className="h-3.5 w-3.5" />
          Become a Pro
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => handleAddRole("customer")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Customer Mode
      </Button>
    );
  };

  return (
    <>
      <Dialog
        open={pendingNavCallback !== null}
        onOpenChange={(open) => { if (!open) setPendingNavCallback(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>
              Your route has unsaved changes. If you leave now, your current start address, end address, and stops will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingNavCallback(null)}>
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const nav = pendingNavCallback;
                setRoutePlannerDirty(false);
                setPendingNavCallback(null);
                nav?.();
              }}
            >
              Leave anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-[100dvh] flex flex-col bg-gray-50 md:flex-row">
        {/* Mobile Header */}
        <header className={`md:hidden flex items-center justify-between p-4 ${headerBg} text-white sticky top-0 z-50 print:hidden shadow-md transition-colors`}>
          <div className="flex items-center gap-2">
            <div className="font-bold text-lg tracking-tight">Dutton Connect</div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              isProMode
                ? "bg-white/15 border-white/30 text-white"
                : "bg-white/20 border-white/30 text-white"
            }`}>
              {isProMode ? "Pro" : "Customer"}
            </span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-white z-40 flex flex-col print:hidden overflow-y-auto">
            <nav className="flex flex-col p-4 gap-2">
              {navItems.map((item) => (
                <Link key={item.href + item.label} href={item.href}>
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
                    {openReportCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold leading-none">
                        {openReportCount > 99 ? "99+" : openReportCount}
                      </span>
                    )}
                  </div>
                </Link>
              )}
            </nav>

            <div className="mt-auto p-5 border-t bg-gray-50 space-y-3">
              {/* Mode switcher */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Mode</p>
                <ModeSwitcher />
              </div>

              {isConfigured && user && (
                <div className="space-y-2 pt-2 border-t">
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
              <div className="flex gap-3 text-xs text-gray-500 pt-1 border-t">
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
          <div className={`p-6 ${headerBg} text-white transition-colors`}>
            <h1 className="font-bold text-xl tracking-tight leading-tight">Dutton Connect</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-primary-foreground/80 text-xs font-medium tracking-wider uppercase">
                {subtitle}
              </div>
              {isBoth && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                  Dual
                </span>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href + item.label} href={item.href}>
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
                  {openReportCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold leading-none">
                      {openReportCount > 99 ? "99+" : openReportCount}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </nav>

          <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/50 space-y-3">
            {/* Mode switcher */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {isBoth ? "Switch Mode" : "Account"}
              </p>
              <ModeSwitcher />
            </div>

            {isConfigured && user && (
              <div className="space-y-1.5 pt-2 border-t border-sidebar-border">
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

            {/* Back to account picker (edge case: no mode set) */}
            {!isBoth && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground text-xs"
                onClick={() => clearRole()}
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Change account type
              </Button>
            )}

            <div className="flex gap-3 pt-1 border-t border-sidebar-border">
              <Link href="/privacy-policy">
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
            <Link href="/privacy-policy">
              <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
            </Link>
            <span>·</span>
            <Link href="/terms">
              <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
            </Link>
          </footer>
        </main>
      </div>
    </>
  );
}
