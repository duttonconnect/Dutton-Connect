import { useEffect, useState } from "react";
import { Navigation, MapPin, Save, ExternalLink, Route } from "lucide-react";
import { collection, addDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAppStore, type Job } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type SavedRoute = {
  id: string;
  userId: string;
  startAddress: string;
  endAddress: string;
  stops: string[];
  createdAt: string;
};

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function buildMapsUrl(startAddress: string, endAddress: string, stops: string[]): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  if (startAddress.trim()) params.set("origin", startAddress.trim());
  if (endAddress.trim()) params.set("destination", endAddress.trim());
  if (stops.length > 0) params.set("waypoints", stops.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function JobStopItem({
  job,
  checked,
  onToggle,
}: {
  job: Job;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
        id={`stop-${job.id}`}
      />
      <label htmlFor={`stop-${job.id}`} className="min-w-0 flex-1 cursor-pointer">
        <div className="font-medium text-sm truncate">{job.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{job.address}</span>
        </div>
        {job.scheduledDate && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(job.scheduledDate), "MMM d · h:mm a")} ·{" "}
            {job.status.replace("_", " ")}
          </div>
        )}
      </label>
    </div>
  );
}

export default function RoutePlanner() {
  const { jobs } = useAppStore();
  const { user } = useAuth();

  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set());
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayJobs = jobs.filter(
    (j) => isToday(j.scheduledDate) && j.status !== "cancelled" && j.address,
  );

  const openJobs = jobs.filter(
    (j) =>
      !isToday(j.scheduledDate) &&
      (j.status === "scheduled" || j.status === "in_progress") &&
      j.address,
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    loadSavedRoutes();
  }, [user?.uid]);

  async function loadSavedRoutes() {
    if (!isFirebaseConfigured || !db || !user) return;
    setLoadingRoutes(true);
    try {
      const q = query(
        collection(db, "routes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setSavedRoutes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedRoute, "id">) })),
      );
    } catch (err) {
      console.warn("[RoutePlanner] Failed to load saved routes:", err);
    } finally {
      setLoadingRoutes(false);
    }
  }

  function toggleStop(address: string) {
    setSelectedStops((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  }

  function handleOpenMaps() {
    const stops = Array.from(selectedStops);
    if (!startAddress.trim() && !endAddress.trim() && stops.length === 0) {
      toast.error("Add at least a start address, end address, or one stop.");
      return;
    }
    window.open(buildMapsUrl(startAddress, endAddress, stops), "_blank", "noopener,noreferrer");
  }

  async function handleSaveRoute() {
    if (!isFirebaseConfigured || !db || !user) {
      toast.error("Firebase is not configured. Cannot save routes.");
      return;
    }
    const stops = Array.from(selectedStops);
    if (!startAddress.trim() && !endAddress.trim() && stops.length === 0) {
      toast.error("Add at least a start address, end address, or one stop.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "routes"), {
        userId: user.uid,
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops,
        createdAt: new Date().toISOString(),
      });
      toast.success("Route saved.");
      await loadSavedRoutes();
    } catch (err) {
      console.warn("[RoutePlanner] Save failed:", err);
      toast.error("Failed to save route.");
    } finally {
      setSaving(false);
    }
  }

  const selectedStopsList = Array.from(selectedStops);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Route Planner</h1>
        <p className="text-gray-500">
          Select job stops, set your start and end addresses, then open in Google Maps.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {todayJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Today's Scheduled Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayJobs.map((job) => (
                  <JobStopItem
                    key={job.id}
                    job={job}
                    checked={selectedStops.has(job.address)}
                    onToggle={() => toggleStop(job.address)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {openJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Open / Nearby Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {openJobs.map((job) => (
                  <JobStopItem
                    key={job.id}
                    job={job}
                    checked={selectedStops.has(job.address)}
                    onToggle={() => toggleStop(job.address)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {todayJobs.length === 0 && openJobs.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <div className="text-sm">No jobs available to add as stops.</div>
                <div className="text-xs mt-1">
                  Schedule some jobs first, then come back here.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startAddress">Start Address</Label>
                <Input
                  id="startAddress"
                  placeholder="e.g. 123 Main St, Athens, GA"
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endAddress">End Address</Label>
                <Input
                  id="endAddress"
                  placeholder="e.g. Your home or office address"
                  value={endAddress}
                  onChange={(e) => setEndAddress(e.target.value)}
                />
              </div>

              {selectedStopsList.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Selected Stops ({selectedStopsList.length})
                  </Label>
                  <div className="space-y-1">
                    {selectedStopsList.map((addr) => (
                      <div
                        key={addr}
                        className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{addr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button onClick={handleOpenMaps} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Route in Google Maps
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveRoute}
                  disabled={saving || !isFirebaseConfigured}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving…" : "Save Route"}
                </Button>
                {!isFirebaseConfigured && (
                  <p className="text-xs text-muted-foreground text-center">
                    Firebase is not configured — route saving is unavailable.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Saved Routes</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!isFirebaseConfigured ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Firebase is not configured — saved routes are unavailable.
            </div>
          ) : loadingRoutes ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : savedRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No saved routes yet.</div>
              <div className="text-xs mt-1">Build a route above and press Save Route.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedRoutes.map((route) => {
                const stops = route.stops ?? [];
                const mapsUrl = buildMapsUrl(route.startAddress, route.endAddress, stops);
                return (
                  <div
                    key={route.id}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {route.createdAt
                            ? format(new Date(route.createdAt), "MMM d, yyyy · h:mm a")
                            : "—"}
                        </div>
                        {route.startAddress && (
                          <div className="text-sm">
                            <span className="font-medium">From:</span> {route.startAddress}
                          </div>
                        )}
                        {route.endAddress && (
                          <div className="text-sm">
                            <span className="font-medium">To:</span> {route.endAddress}
                          </div>
                        )}
                        {stops.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">Stops ({stops.length}):</span>{" "}
                            {stops.join(" → ")}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(mapsUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open
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
