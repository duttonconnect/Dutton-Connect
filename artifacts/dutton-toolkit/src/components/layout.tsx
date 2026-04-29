import { Link, useLocation } from "wouter";
import { Hammer, Users, FileText, DollarSign, Home, Menu, X, Map as MapIcon, Car } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Hammer },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/mileage", label: "Mileage", icon: Car },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-primary text-white sticky top-0 z-50 print:hidden shadow-md">
        <div className="font-bold text-lg tracking-tight">Dutton Solutions LLC</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-white z-40 flex flex-col print:hidden">
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
          </nav>
          <div className="mt-auto p-6 border-t bg-gray-50">
            <div className="text-sm font-semibold text-gray-900 mb-1">Dutton Solutions LLC</div>
            <div className="text-sm text-gray-600">706-523-1447</div>
            <div className="text-sm text-gray-600">www.duttonsolutionsllc.com</div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border sticky top-0 h-screen print:hidden">
        <div className="p-6 bg-primary text-white">
          <h1 className="font-bold text-xl tracking-tight leading-tight">Dutton Solutions</h1>
          <div className="text-primary-foreground/80 text-xs mt-1 font-medium tracking-wider uppercase">Field Toolkit</div>
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
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/50">
          <div className="text-xs font-bold text-sidebar-foreground mb-1 uppercase tracking-wider">Contact</div>
          <div className="text-sm font-medium text-sidebar-foreground/80">706-523-1447</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">duttonsolutionsllc.com</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-[100vw] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
          <div className="mx-auto max-w-5xl print:max-w-none">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav (Optional, but using top menu for now) */}
    </div>
  );
}
