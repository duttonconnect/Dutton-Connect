import { useMemo, useState } from "react";
import { useAppStore, type Job } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  InfoWindow,
  Pin,
} from "@vis.gl/react-google-maps";
import { MapPin, Navigation, Phone, ArrowRight, AlertCircle } from "lucide-react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const MAP_ID = "dutton-jobs-map";

const STATUS_COLORS: Record<Job["status"], { bg: string; border: string; glyph: string }> = {
  scheduled:    { bg: "#1d4ed8", border: "#1e3a8a", glyph: "#ffffff" }, // blue
  in_progress:  { bg: "#0ea5e9", border: "#0369a1", glyph: "#ffffff" }, // bright blue
  completed:    { bg: "#374151", border: "#111827", glyph: "#ffffff" }, // gray-black
  cancelled:    { bg: "#9ca3af", border: "#4b5563", glyph: "#ffffff" }, // muted gray
};

function statusLabel(s: Job["status"]) {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDirectionsUrl(job: Job) {
  if (typeof job.latitude === "number" && typeof job.longitude === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;
}

export default function MapView() {
  const { jobs, customers } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Job["status"]>("all");

  const mappableJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          typeof j.latitude === "number" &&
          typeof j.longitude === "number" &&
          (statusFilter === "all" || j.status === statusFilter),
      ),
    [jobs, statusFilter],
  );

  const unmapped = jobs.filter(
    (j) => typeof j.latitude !== "number" || typeof j.longitude !== "number",
  );

  const center = useMemo(() => {
    if (mappableJobs.length === 0) {
      // Default to Athens, GA — Dutton Solutions home base
      return { lat: 33.9519, lng: -83.3576 };
    }
    const avgLat =
      mappableJobs.reduce((acc, j) => acc + (j.latitude || 0), 0) / mappableJobs.length;
    const avgLng =
      mappableJobs.reduce((acc, j) => acc + (j.longitude || 0), 0) / mappableJobs.length;
    return { lat: avgLat, lng: avgLng };
  }, [mappableJobs]);

  const selectedJob = selectedId ? jobs.find((j) => j.id === selectedId) || null : null;
  const selectedCustomer = selectedJob
    ? customers.find((c) => c.id === selectedJob.customerId)
    : null;

  if (!API_KEY) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Map</h1>
          <p className="text-gray-500">Job locations across the service area.</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="font-semibold">Google Maps API key missing</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
              secret with a Google Maps JavaScript API key to enable the map view.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Map</h1>
          <p className="text-gray-500">
            {mappableJobs.length} job{mappableJobs.length === 1 ? "" : "s"} on the map
            {unmapped.length > 0 ? ` • ${unmapped.length} without coordinates` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "scheduled", "in_progress", "completed", "cancelled"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : statusLabel(s)}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-[60vh] min-h-[400px] w-full relative bg-gray-100">
          <APIProvider apiKey={API_KEY}>
            <GMap
              defaultCenter={center}
              defaultZoom={11}
              mapId={MAP_ID}
              gestureHandling="greedy"
              disableDefaultUI={false}
              clickableIcons={false}
              style={{ width: "100%", height: "100%" }}
            >
              {mappableJobs.map((job) => {
                const colors = STATUS_COLORS[job.status];
                return (
                  <AdvancedMarker
                    key={job.id}
                    position={{ lat: job.latitude!, lng: job.longitude! }}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <Pin
                      background={colors.bg}
                      borderColor={colors.border}
                      glyphColor={colors.glyph}
                    />
                  </AdvancedMarker>
                );
              })}

              {selectedJob && typeof selectedJob.latitude === "number" && typeof selectedJob.longitude === "number" && (
                <InfoWindow
                  position={{ lat: selectedJob.latitude, lng: selectedJob.longitude }}
                  onCloseClick={() => setSelectedId(null)}
                  pixelOffset={[0, -36]}
                >
                  <div className="space-y-2 min-w-[220px] max-w-[280px] p-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-gray-900 text-sm leading-tight">
                        {selectedJob.title}
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {statusLabel(selectedJob.status)}
                      </Badge>
                    </div>
                    {selectedCustomer && (
                      <div className="text-xs text-gray-700 font-medium">
                        {selectedCustomer.name}
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 text-xs text-gray-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{selectedJob.address}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(selectedJob.scheduledDate), "EEE, MMM d")}
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <a
                        href={buildDirectionsUrl(selectedJob)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Directions
                      </a>
                      {selectedCustomer?.phone && (
                        <a
                          href={`tel:${selectedCustomer.phone}`}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50"
                        >
                          <Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone}
                        </a>
                      )}
                      <Link href={`/jobs/${selectedJob.id}`}>
                        <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer">
                          Open Job <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GMap>
          </APIProvider>
        </div>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs">
          {(Object.keys(STATUS_COLORS) as Job["status"][]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ background: STATUS_COLORS[s].bg, borderColor: STATUS_COLORS[s].border }}
              />
              <span className="font-medium text-gray-700">{statusLabel(s)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {unmapped.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold text-sm">Jobs without coordinates</div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Edit a job and use the Use My Location button or enter latitude/longitude to place it on the map.
            </p>
            <div className="space-y-2">
              {unmapped.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <div className="flex items-center justify-between text-sm p-2 rounded border hover:bg-accent cursor-pointer">
                    <div>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-xs text-muted-foreground">{j.address}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
