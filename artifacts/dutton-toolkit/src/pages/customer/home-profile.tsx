import { useState } from "react";
import { ArrowLeft, Home, Save, BedDouble, Bath, Ruler, CalendarDays, Car, KeyRound, StickyNote, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

import { useAppStore, type HomeProfile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HOME_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "other", label: "Other" },
] as const;

export default function HomeProfilePage() {
  const { homeProfile, setHomeProfile } = useAppStore();

  const [homeType, setHomeType] = useState<HomeProfile["homeType"]>(
    homeProfile?.homeType ?? "house"
  );
  const [address, setAddress] = useState(homeProfile?.address ?? "");
  const [squareFootage, setSquareFootage] = useState(homeProfile?.squareFootage ?? "");
  const [yearBuilt, setYearBuilt] = useState(homeProfile?.yearBuilt ?? "");
  const [bedrooms, setBedrooms] = useState(homeProfile?.bedrooms ?? "");
  const [bathrooms, setBathrooms] = useState(homeProfile?.bathrooms ?? "");
  const [parkingNotes, setParkingNotes] = useState(homeProfile?.parkingNotes ?? "");
  const [accessNotes, setAccessNotes] = useState(homeProfile?.accessNotes ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Please enter your home address.");
      return;
    }
    setHomeProfile({
      homeType,
      address: address.trim(),
      squareFootage,
      yearBuilt,
      bedrooms,
      bathrooms,
      parkingNotes,
      accessNotes,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    toast.success("Home profile saved.");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home Profile</h1>
          <p className="text-sm text-muted-foreground">
            Save your home details once — they auto-fill into every service request.
          </p>
        </div>
      </div>

      {homeProfile && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Profile saved — pros will see these details when you post a request.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-3">
              <Home className="h-4 w-4 text-primary" />
              Property Details
            </div>

            <div className="space-y-2">
              <Label>Property Type</Label>
              <div className="flex flex-wrap gap-2">
                {HOME_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setHomeType(t.value)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      homeType === t.value
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Home Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, Athens, GA 30601"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqft" className="flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5" /> Square Footage
                </Label>
                <Input
                  id="sqft"
                  type="number"
                  placeholder="1800"
                  value={squareFootage}
                  onChange={(e) => setSquareFootage(e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Year Built
                </Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="1998"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  min={1800}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beds" className="flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5" /> Bedrooms
                </Label>
                <Input
                  id="beds"
                  type="number"
                  placeholder="3"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baths" className="flex items-center gap-1.5">
                  <Bath className="h-3.5 w-3.5" /> Bathrooms
                </Label>
                <Input
                  id="baths"
                  type="number"
                  placeholder="2"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  min={0}
                  step={0.5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-3">
              <KeyRound className="h-4 w-4 text-primary" />
              Access &amp; Parking Notes
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              These notes are shared with pros when they arrive for your job. Save them once and never repeat yourself.
            </p>

            <div className="space-y-2">
              <Label htmlFor="parking" className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" /> Parking Instructions
              </Label>
              <Textarea
                id="parking"
                placeholder="Street parking available on Oak Ave. No permit needed."
                value={parkingNotes}
                onChange={(e) => setParkingNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access" className="flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" /> Access Notes
              </Label>
              <Textarea
                id="access"
                placeholder="Gate code is 1234. Friendly dog in backyard — please keep gate closed."
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" className="flex-1" disabled={saved}>
            {saved ? (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Home Profile</>
            )}
          </Button>
          {homeProfile && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              Last updated {new Date(homeProfile.updatedAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </form>

      <p className="text-xs text-center text-muted-foreground pb-4">
        Your home profile is stored on this device. It helps pros understand your property before they arrive.
      </p>
    </div>
  );
}
