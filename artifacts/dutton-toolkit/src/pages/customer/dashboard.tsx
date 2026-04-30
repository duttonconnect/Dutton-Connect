import { Link } from "wouter";
import {
  Hammer,
  Droplets,
  Leaf,
  Sparkles,
  Wind,
  Car,
  Package,
  Wrench,
  Search,
  ListChecks,
  ArrowRight,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { OnboardingBanner } from "@/components/onboarding-banner";

const CATEGORIES = [
  { label: "Handyman", icon: Hammer, color: "bg-blue-50 text-blue-600" },
  { label: "Plumbing", icon: Droplets, color: "bg-cyan-50 text-cyan-600" },
  { label: "Yard Work", icon: Leaf, color: "bg-green-50 text-green-600" },
  { label: "House Cleaning", icon: Sparkles, color: "bg-purple-50 text-purple-600" },
  { label: "Pressure Washing", icon: Wind, color: "bg-sky-50 text-sky-600" },
  { label: "Automotive", icon: Car, color: "bg-orange-50 text-orange-600" },
  { label: "Appliance Installation", icon: Package, color: "bg-amber-50 text-amber-600" },
  { label: "Other", icon: Wrench, color: "bg-gray-100 text-gray-600" },
];

export default function CustomerDashboard() {
  const { jobRequests } = useAppStore();
  const myRequests = jobRequests ?? [];
  const openCount = myRequests.length;

  return (
    <div className="space-y-8">
      <OnboardingBanner />

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white p-7 md:p-10 space-y-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Find local pros for any job
          </h1>
          <p className="mt-2 text-blue-100 text-base md:text-lg">
            Tell local pros what you need — they come to you.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/post-request">
            <Button size="lg" variant="secondary" className="font-semibold shadow">
              <ClipboardList className="mr-2 h-5 w-5" />
              Request Service
            </Button>
          </Link>
          <Link href="/find-pros">
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white/40 bg-white/10 hover:bg-white/20 font-semibold"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Pros
            </Button>
          </Link>
        </div>
        <p className="text-xs text-blue-200">
          Compare quotes and choose who fits best
        </p>
      </div>

      {/* Category Grid */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">
          What do you need help with?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map(({ label, icon: Icon, color }) => (
            <Link key={label} href="/post-request">
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-center leading-tight text-gray-700 group-hover:text-primary transition-colors">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Quick actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard
            to="/post-request"
            icon={<ClipboardList className="h-6 w-6" />}
            title="Request Service"
            description="Describe what you need and let local pros send quotes."
            accent
          />
          <ActionCard
            to="/find-pros"
            icon={<Search className="h-6 w-6" />}
            title="Find Nearby Pros"
            description="Browse trusted pros serving your area."
          />
          <ActionCard
            to="/my-requests"
            icon={<ListChecks className="h-6 w-6" />}
            title="My Requests"
            description={
              openCount === 0
                ? "Track requests you've posted."
                : `${openCount} active request${openCount === 1 ? "" : "s"}`
            }
            badge={openCount > 0 ? openCount : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  description,
  accent,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <Link href={to}>
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all h-full rounded-2xl ${
          accent ? "border-primary/30" : "border-gray-100"
        }`}
      >
        <CardContent className="p-6 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                accent ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {icon}
            </div>
            {badge !== undefined && (
              <span className="bg-primary text-white text-xs font-bold rounded-full h-6 min-w-6 px-2 flex items-center justify-center">
                {badge}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">{title}</div>
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </div>
          <div className="text-sm font-medium text-primary flex items-center">
            Open <ChevronRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
