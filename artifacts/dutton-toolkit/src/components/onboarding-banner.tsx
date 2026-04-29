import { useEffect, useState } from "react";
import { Link } from "wouter";
import { X, ClipboardList, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { useRole } from "@/lib/role";

const BANNER_KEY = "dutton_onboarding_dismissed_v1";

export function OnboardingBanner() {
  const { role } = useRole();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) {
        setVisible(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(BANNER_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  const isCustomer = role === "customer";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
      <div className="shrink-0 mt-0.5 text-blue-600">
        {isCustomer ? (
          <ClipboardList className="h-5 w-5" />
        ) : (
          <MapPin className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900">
          {isCustomer
            ? "Post your first job to get started"
            : "Check Nearby Jobs to find work"}
        </p>
        <p className="text-xs text-blue-700 mt-0.5">
          {isCustomer
            ? "Describe what you need and local pros will send you quotes."
            : "Browse open requests from customers in your area and send quotes."}
        </p>
        <Link href={isCustomer ? "/post-request" : "/nearby-jobs"}>
          <Button size="sm" className="mt-2.5 h-7 text-xs px-3">
            {isCustomer ? "Post a Job" : "View Nearby Jobs"}
          </Button>
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-blue-400 hover:text-blue-700 transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
