import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  Hammer,
  Droplets,
  Leaf,
  Sparkles,
  Car,
  Wind,
  MapPin,
  BadgeCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Zap,
  Truck,
  PaintbrushVertical,
  Bug,
  ClipboardList,
  Search,
  Bell,
  Home,
  Star,
  Navigation,
  Receipt,
  Calculator,
  Users,
  CalendarDays,
  FileText,
  DollarSign,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { label: "Cleaning Services", icon: Sparkles },
  { label: "Handyman", icon: Hammer },
  { label: "Plumbing", icon: Droplets },
  { label: "Yard Work", icon: Leaf },
  { label: "Electrical", icon: Zap },
  { label: "Moving Help", icon: Truck },
  { label: "Painting", icon: PaintbrushVertical },
  { label: "Pest Control", icon: Bug },
  { label: "Pressure Washing", icon: Wind },
  { label: "Automotive", icon: Car },
];

const TRUST = [
  {
    icon: MapPin,
    title: "Local requests",
    desc: "Connect with professionals serving your neighborhood.",
  },
  {
    icon: BadgeCheck,
    title: "Verified profiles",
    desc: "Pros are reviewed by real customers in your area.",
  },
  {
    icon: MessageSquare,
    title: "Secure messaging",
    desc: "Message pros directly before committing to anything.",
  },
];

const CUSTOMER_FEATURES = [
  { icon: ClipboardList, text: "Post a request in under 2 minutes" },
  { icon: Search, text: "Browse and compare nearby pros" },
  { icon: MessageSquare, text: "Message pros before hiring anyone" },
  { icon: Star, text: "Leave reviews after the job is done" },
  { icon: Home, text: "Home Profile — save your property details once" },
  { icon: Bell, text: "Service Reminders — never miss routine maintenance" },
  { icon: CalendarDays, text: "Schedule and track upcoming jobs" },
];

const PRO_FEATURES = [
  { icon: ClipboardList, text: "Browse nearby customer job requests" },
  { icon: FileText, text: "Send professional quotes instantly" },
  { icon: Users, text: "Manage all your customers in one place" },
  { icon: DollarSign, text: "Track payments and outstanding balances" },
  { icon: Navigation, text: "Route Planner for efficient daily scheduling" },
  { icon: Receipt, text: "Mileage and receipt tracker for tax time" },
  { icon: Calculator, text: "Build and send detailed estimates" },
];

export default function Login() {
  const { login, isConfigured } = useAuth();
  const [, setLocation] = useLocation();

  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      if (
        msg.includes("invalid-credential") ||
        msg.includes("wrong-password") ||
        msg.includes("user-not-found")
      ) {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#F8FAFC" }}>

      {/* Minimal nav */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <span className="text-lg font-bold tracking-tight text-gray-900">Dutton Connect</span>
        <button
          onClick={() => setShowSignIn((v) => !v)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section
        className="px-6 pt-14 pb-12 text-white text-center"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)" }}
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-2xl mx-auto">
          Your neighborhood, done right.
        </h1>
        <p className="mt-4 text-blue-200 text-base sm:text-lg max-w-xl mx-auto">
          Post any job, compare real quotes, and hire the right local pro — all in one place.
        </p>

        {/* Category chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-colors cursor-default"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Role cards */}
      <section className="px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Customer card */}
          <Link href="/signup?role=customer">
            <div className="group cursor-pointer rounded-2xl border-2 border-blue-100 bg-white p-6 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">I need a service</div>
                <p className="text-sm text-gray-500 mt-1">
                  Post a request and receive quotes from local pros.
                </p>
              </div>
              <Button className="mt-auto w-full rounded-xl" size="sm">
                Get Started
              </Button>
            </div>
          </Link>

          {/* Pro card */}
          <Link href="/signup?role=pro">
            <div className="group cursor-pointer rounded-2xl border-2 border-gray-100 bg-white p-6 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col gap-3">
              <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Hammer className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">I provide services</div>
                <p className="text-sm text-gray-500 mt-1">
                  Find local requests, send quotes, and grow your business.
                </p>
              </div>
              <Button variant="outline" className="mt-auto w-full rounded-xl" size="sm">
                Join as a Pro
              </Button>
            </div>
          </Link>
        </div>
      </section>

      {/* Feature showcase */}
      <section className="px-6 pb-12 max-w-4xl mx-auto w-full">
        <h2 className="text-center text-xl font-bold text-gray-900 mb-8">
          Everything you need, built in
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Customer features */}
          <div className="rounded-2xl bg-white border border-blue-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">For Customers</span>
            </div>
            <ul className="space-y-3">
              {CUSTOMER_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="h-6 w-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=customer">
              <Button size="sm" className="w-full mt-2">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Pro features */}
          <div className="rounded-2xl bg-white border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Hammer className="h-4 w-4 text-gray-700" />
              </div>
              <span className="font-semibold text-gray-900">For Service Pros</span>
            </div>
            <ul className="space-y-3">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=pro">
              <Button size="sm" variant="outline" className="w-full mt-2">
                Join as a Pro
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="px-6 pb-10 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-4 text-center">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-800">{title}</div>
              <p className="text-xs text-gray-500 hidden sm:block leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sign-in toggle */}
      <section className="px-6 pb-12 max-w-md mx-auto w-full">
        <button
          onClick={() => setShowSignIn((v) => !v)}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Already have an account?{" "}
          <span className="font-medium text-blue-600">Sign in</span>
          {showSignIn ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showSignIn && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            {!isConfigured && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                Firebase not configured.{" "}
                <Link href="/" className="underline font-medium">
                  Continue without signing in
                </Link>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Sign in</>
                )}
              </Button>
            </form>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-gray-100 text-center text-xs text-gray-400 flex items-center justify-center gap-4">
        <Link href="/privacy">
          <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
        </Link>
        <span>·</span>
        <Link href="/terms">
          <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
        </Link>
      </footer>
    </div>
  );
}
