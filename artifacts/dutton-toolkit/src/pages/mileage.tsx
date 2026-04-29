import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { toast } from "sonner";
import { Car, MapPin, Play, Square, Trash2, Plus, DollarSign } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const IRS_RATE_PER_MILE = 0.725;
const ACTIVE_TRIP_KEY = "dutton_active_trip";

type ActiveTrip = {
  startedAt: string;
  startLocation: string;
  purpose: string;
  jobCustomer: string;
};

export default function MileageTracker() {
  const { trips, addTrip, deleteTrip } = useAppStore();

  const [purpose, setPurpose] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [jobCustomer, setJobCustomer] = useState("");
  const [manualMiles, setManualMiles] = useState("");

  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TRIP_KEY);
      return stored ? (JSON.parse(stored) as ActiveTrip) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (activeTrip) {
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(activeTrip));
    } else {
      localStorage.removeItem(ACTIVE_TRIP_KEY);
    }
  }, [activeTrip]);

  const tripList = trips ?? [];

  const totalMiles = useMemo(
    () => tripList.reduce((sum, t) => sum + (Number.isFinite(t.miles) ? t.miles : 0), 0),
    [tripList],
  );
  const totalDeduction = totalMiles * IRS_RATE_PER_MILE;

  const sortedTrips = useMemo(
    () =>
      [...tripList].sort(
        (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
      ),
    [tripList],
  );

  const handleStart = () => {
    if (activeTrip) {
      toast.error("A trip is already in progress. End it before starting another.");
      return;
    }
    setActiveTrip({
      startedAt: new Date().toISOString(),
      startLocation: startLocation.trim(),
      purpose: purpose.trim(),
      jobCustomer: jobCustomer.trim(),
    });
    toast.success("Trip started");
  };

  const handleEnd = () => {
    if (!activeTrip) {
      toast.error("No active trip to end. Press Start Trip first.");
      return;
    }

    const miles = parseFloat(manualMiles);
    if (!manualMiles || !Number.isFinite(miles) || miles <= 0) {
      toast.error("Enter the miles driven before ending the trip.");
      return;
    }

    addTrip({
      purpose: (purpose.trim() || activeTrip.purpose || "—"),
      startLocation: (startLocation.trim() || activeTrip.startLocation || "—"),
      endLocation: endLocation.trim() || "—",
      jobCustomer: jobCustomer.trim() || activeTrip.jobCustomer || "",
      miles,
      startedAt: activeTrip.startedAt,
      endedAt: new Date().toISOString(),
    });

    toast.success(`Trip saved · ${miles.toFixed(1)} mi`);
    setActiveTrip(null);
    setPurpose("");
    setStartLocation("");
    setEndLocation("");
    setJobCustomer("");
    setManualMiles("");
  };

  const handleManualLog = () => {
    const miles = parseFloat(manualMiles);
    if (!Number.isFinite(miles) || miles <= 0) {
      toast.error("Enter a valid mileage number.");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Trip purpose is required.");
      return;
    }
    const now = new Date().toISOString();
    addTrip({
      purpose: purpose.trim(),
      startLocation: startLocation.trim() || "—",
      endLocation: endLocation.trim() || "—",
      jobCustomer: jobCustomer.trim(),
      miles,
      startedAt: now,
      endedAt: now,
    });
    toast.success(`Trip logged · ${miles.toFixed(1)} mi`);
    setPurpose("");
    setStartLocation("");
    setEndLocation("");
    setJobCustomer("");
    setManualMiles("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mileage Tracker</h1>
          <p className="text-gray-500">
            Log business driving for IRS deductions. Current rate: ${IRS_RATE_PER_MILE.toFixed(3)} / mi.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Total Business Miles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMiles.toFixed(1)}</div>
            <p className="text-xs opacity-80 mt-1">{tripList.length} trips logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimated Deduction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalDeduction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              At IRS rate of ${IRS_RATE_PER_MILE.toFixed(3)} / mi
            </p>
          </CardContent>
        </Card>
        <Card className={activeTrip ? "border-primary border-2" : "border-dashed"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trip Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTrip ? (
              <>
                <div className="text-lg font-bold text-primary flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  In Progress
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Started {format(new Date(activeTrip.startedAt), "MMM d, h:mm a")}
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-700">Idle</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Press Start Trip to begin tracking
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {activeTrip ? "Active Trip Details" : "New Trip"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="purpose">Trip Purpose</Label>
              <Input
                id="purpose"
                placeholder="e.g. Customer site visit, supply run"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="jobCustomer">Job / Customer</Label>
              <Input
                id="jobCustomer"
                placeholder="e.g. Sarah Jenkins — deck repair"
                value={jobCustomer}
                onChange={(e) => setJobCustomer(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startLocation">Start Location</Label>
              <Input
                id="startLocation"
                placeholder="Office, home, supplier address…"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endLocation">End Location</Label>
              <Input
                id="endLocation"
                placeholder="Customer address, jobsite…"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="miles">Miles Driven (manual entry)</Label>
              <Input
                id="miles"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="e.g. 12.4"
                value={manualMiles}
                onChange={(e) => setManualMiles(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional during driving — required when ending the trip or logging manually.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            {!activeTrip ? (
              <>
                <Button onClick={handleStart} className="w-full sm:w-auto">
                  <Play className="mr-2 h-4 w-4" /> Start Trip
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManualLog}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" /> Log Manually
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEnd}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                <Square className="mr-2 h-4 w-4" /> End Trip & Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Trip Log</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {sortedTrips.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No trips logged yet.</div>
              <div className="text-xs mt-1">
                Start a trip above or log one manually to see it here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTrips.map((trip) => {
                const duration =
                  trip.startedAt !== trip.endedAt
                    ? formatDistanceStrict(
                        new Date(trip.startedAt),
                        new Date(trip.endedAt),
                      )
                    : null;
                return (
                  <div
                    key={trip.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                      <div className="hidden sm:flex h-10 w-10 rounded-full bg-blue-100 text-primary items-center justify-center shrink-0">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate" title={trip.purpose}>
                          {trip.purpose}
                        </div>
                        {trip.jobCustomer && (
                          <div className="text-xs text-primary font-medium truncate">
                            {trip.jobCustomer}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">
                            {trip.startLocation} → {trip.endLocation}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(trip.endedAt), "MMM d, yyyy · h:mm a")}
                          {duration && <> · {duration}</>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6 justify-between md:justify-end">
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {trip.miles.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">mi</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <DollarSign className="h-3 w-3" />
                          {(trip.miles * IRS_RATE_PER_MILE).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          deleteTrip(trip.id);
                          toast.success("Trip deleted");
                        }}
                        aria-label="Delete trip"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
