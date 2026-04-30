import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  Hammer,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { sendQuoteRequest } from "@/lib/matching";

type Pro = {
  id: string;
  business: string;
  services: string[];
  location: string;
  serviceRadiusMiles: number;
  phone?: string;
  ratingPlaceholder: number;
  reviewsPlaceholder: number;
  verified?: boolean;
};

const SAMPLE_PROS: Pro[] = [
  {
    id: "p-athens-handyman",
    business: "Athens Handyman Services",
    services: ["Handyman", "Pressure Washing", "Yard Work", "Appliance Installation"],
    location: "Athens, GA",
    serviceRadiusMiles: 30,
    ratingPlaceholder: 5.0,
    reviewsPlaceholder: 47,
    verified: true,
  },
  {
    id: "p-athens-plumb",
    business: "Athens Pro Plumbing",
    services: ["Plumbing", "Appliance Installation"],
    location: "Watkinsville, GA",
    serviceRadiusMiles: 25,
    ratingPlaceholder: 4.8,
    reviewsPlaceholder: 132,
  },
  {
    id: "p-ne-pressure",
    business: "Northeast GA Pressure Washing",
    services: ["Pressure Washing", "Yard Work"],
    location: "Bogart, GA",
    serviceRadiusMiles: 40,
    ratingPlaceholder: 4.9,
    reviewsPlaceholder: 88,
  },
  {
    id: "p-classic-auto",
    business: "Classic City Auto Repair",
    services: ["Automotive"],
    location: "Athens, GA",
    serviceRadiusMiles: 15,
    ratingPlaceholder: 4.7,
    reviewsPlaceholder: 211,
  },
];

export default function FindNearbyPros() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleRequestQuote = async (pro: Pro) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setRequestingId(pro.id);
    try {
      const docId = await sendQuoteRequest({
        proId: pro.id,
        customerId: user.uid,
        service: pro.services[0] ?? "General",
        message: "Requesting quote",
      });

      if (docId) {
        setSentIds((prev) => new Set(prev).add(pro.id));
        toast.success("Quote request sent");
        navigate("/messages");
      } else {
        toast.error("Could not send request. Check your connection and try again.");
      }
    } catch (err) {
      console.error("[FindPros] handleRequestQuote error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find Nearby Pros
          </h1>
          <p className="text-gray-500 text-sm">
            Trusted local pros serving the Athens area.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SAMPLE_PROS.map((pro) => (
          <Card key={pro.id} className="flex flex-col">
            <CardContent className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                    <Hammer className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-lg flex items-center gap-1.5">
                      <span className="truncate" title={pro.business}>
                        {pro.business}
                      </span>
                      {pro.verified && (
                        <CheckCircle2
                          className="h-4 w-4 text-primary shrink-0"
                          aria-label="Verified"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-700">
                        {pro.ratingPlaceholder.toFixed(1)}
                      </span>
                      <span className="text-xs">
                        ({pro.reviewsPlaceholder} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {pro.services.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {pro.location} · serves {pro.serviceRadiusMiles} mi radius
                  </span>
                </div>
                {pro.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <a
                      href={`tel:${pro.phone.replace(/[^0-9]/g, "")}`}
                      className="text-primary hover:underline"
                    >
                      {pro.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-3 border-t">
                {pro.phone && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <a href={`tel:${pro.phone.replace(/[^0-9]/g, "")}`}>
                      <Phone className="mr-2 h-4 w-4" /> Call
                    </a>
                  </Button>
                )}
                <Button
                  className="flex-1"
                  disabled={requestingId === pro.id || sentIds.has(pro.id)}
                  onClick={() => handleRequestQuote(pro)}
                >
                  {requestingId === pro.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                  ) : sentIds.has(pro.id) ? (
                    "Request sent"
                  ) : (
                    "Request Quote"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Link href="/post-request">
          <Button variant="outline">
            Don't see what you need? Post a job
          </Button>
        </Link>
      </div>
    </div>
  );
}
