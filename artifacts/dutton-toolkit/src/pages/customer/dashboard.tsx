import { Link } from "wouter";
import { ClipboardList, Search, ListChecks, ArrowRight, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { OnboardingBanner } from "@/components/onboarding-banner";

export default function CustomerDashboard() {
  const { jobRequests } = useAppStore();
  const myRequests = jobRequests ?? [];
  const openCount = myRequests.length;

  return (
    <div className="space-y-6">
      <OnboardingBanner />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Dutton Connect</h1>
        <p className="text-gray-500">
          Local jobs. Trusted pros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          to="/post-request"
          icon={<ClipboardList className="h-6 w-6" />}
          title="Post a Job"
          description="Describe what you need and let local pros bid."
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
          title="My Job Requests"
          description={
            openCount === 0
              ? "Track requests you've posted."
              : `${openCount} active request${openCount === 1 ? "" : "s"}`
          }
          badge={openCount > 0 ? openCount : undefined}
        />
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Need help right now?
            </div>
            <div className="text-sm text-gray-600">
              Reach Dutton Solutions LLC directly.
            </div>
          </div>
          <Button asChild variant="outline">
            <a href="tel:7065231447">
              <Phone className="mr-2 h-4 w-4" /> 706-523-1447
            </a>
          </Button>
        </CardContent>
      </Card>
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
        className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${
          accent ? "border-primary/30" : ""
        }`}
      >
        <CardContent className="p-6 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between">
            <div
              className={`h-12 w-12 rounded-lg flex items-center justify-center ${
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
            Open <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
