import { Hammer, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/lib/role";

export default function ChooseAccountType() {
  const { setRole } = useRole();

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="bg-primary text-white px-6 py-5 shadow">
        <div className="mx-auto max-w-5xl">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-80">
            Dutton Solutions LLC
          </div>
          <div className="text-xl font-bold tracking-tight">Field Toolkit</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Welcome
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Choose how you'd like to use the app. You can switch later from the menu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RoleCard
              icon={<Hammer className="h-6 w-6" />}
              title="Pro"
              subtitle="Business owner / handyman"
              bullets={[
                "Manage jobs, quotes, customers",
                "Track payments and mileage",
                "Save receipts and view the job map",
              ]}
              cta="Continue as Pro"
              onClick={() => setRole("pro")}
              accent
            />
            <RoleCard
              icon={<User className="h-6 w-6" />}
              title="Customer"
              subtitle="Homeowner / client"
              bullets={[
                "See Dutton Solutions services",
                "Request a quote or call",
                "Find contact information",
              ]}
              cta="Continue as Customer"
              onClick={() => setRole("customer")}
            />
          </div>

          <div className="text-center text-xs text-gray-500">
            706-523-1447 · duttonsolutionsllc.com
          </div>
        </div>
      </main>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  bullets,
  cta,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col cursor-pointer transition-shadow hover:shadow-lg ${
        accent ? "border-primary/30" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col flex-1 gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              accent ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {icon}
          </div>
          <div>
            <div className="text-xl font-bold leading-tight">{title}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {subtitle}
            </div>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-gray-700 flex-1">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          className="w-full mt-2"
          variant={accent ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {cta} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
